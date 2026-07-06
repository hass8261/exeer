import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { readFile } from "node:fs/promises";

const PORT = Number.parseInt(process.env.PORT || "8080", 10);
const PUBLIC_DIR = resolve("public");
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || "management@exeer.com";
const CONTACT_FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || "Exeer Website <onboarding@resend.dev>";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function applySecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

async function readRequestJson(req) {
  const chunks = [];
  let length = 0;

  for await (const chunk of req) {
    length += chunk.length;
    if (length > 64 * 1024) {
      throw new Error("request_too_large");
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function normalizeField(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function handleContact(req, res) {
  let payload;
  try {
    payload = await readRequestJson(req);
  } catch (error) {
    sendJson(res, error.message === "request_too_large" ? 413 : 400, {
      ok: false,
      message: "送信内容を確認してください。"
    });
    return;
  }

  const name = normalizeField(payload.name);
  const company = normalizeField(payload.company);
  const email = normalizeField(payload.email);
  const phone = normalizeField(payload.phone);
  const message = normalizeField(payload.message);
  const honeypot = normalizeField(payload.website);

  if (honeypot) {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (!name || !email || !message || !isValidEmail(email)) {
    sendJson(res, 422, {
      ok: false,
      message: "お名前、メールアドレス、お問い合わせ内容をご確認ください。"
    });
    return;
  }

  if (!RESEND_API_KEY) {
    console.error("[contact] RESEND_API_KEY is not configured");
    sendJson(res, 503, {
      ok: false,
      message: "現在フォームを送信できません。management@exeer.com まで直接ご連絡ください。"
    });
    return;
  }

  const submittedAt = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  const html = `
    <h1>Exeer Webサイトからのお問い合わせ</h1>
    <p><strong>送信日時:</strong> ${escapeHtml(submittedAt)}</p>
    <p><strong>お名前:</strong> ${escapeHtml(name)}</p>
    <p><strong>会社名:</strong> ${escapeHtml(company || "-")}</p>
    <p><strong>メール:</strong> ${escapeHtml(email)}</p>
    <p><strong>電話番号:</strong> ${escapeHtml(phone || "-")}</p>
    <hr>
    <p>${escapeHtml(message).replaceAll("\n", "<br>")}</p>
  `;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: CONTACT_FROM_EMAIL,
      to: [CONTACT_TO_EMAIL],
      reply_to: email,
      subject: `Exeer Webサイトお問い合わせ: ${name}`,
      html
    })
  });

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text().catch(() => "");
    console.error("[contact] Resend API error", resendResponse.status, errorText);
    sendJson(res, 502, {
      ok: false,
      message: "送信に失敗しました。時間をおいて再度お試しください。"
    });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    message: "お問い合わせを送信しました。確認後、担当者よりご連絡いたします。"
  });
}

async function serveStatic(req, res) {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  let pathname = decodeURIComponent(requestUrl.pathname);

  if (pathname.endsWith("/")) {
    pathname += "index.html";
  } else if (!extname(pathname)) {
    pathname += ".html";
  }

  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    const extension = extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
      "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=31536000, immutable"
    });
    res.end(file);
  } catch {
    const notFound = await readFile(join(PUBLIC_DIR, "404.html"));
    res.writeHead(404, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache"
    });
    res.end(notFound);
  }
}

const server = createServer(async (req, res) => {
  applySecurityHeaders(res);

  try {
    if (req.method === "GET" && req.url === "/healthz") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && req.url === "/api/contact") {
      await handleContact(req, res);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { ok: false, message: "Method Not Allowed" });
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    console.error("[server] unexpected error", error);
    sendJson(res, 500, { ok: false, message: "Internal Server Error" });
  }
});

server.listen(PORT, () => {
  console.log(`Exeer site listening on :${PORT}`);
});
