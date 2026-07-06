# Exeer Website

Standalone website for Exeer Co. Ltd. / エクシール株式会社.

The site is mostly static and has no database. Static pages live in `public/`; `server.js` serves those files and exposes a small `/api/contact` endpoint that sends form submissions to `management@exeer.com` through Resend.

## Local Development

```bash
npm start
```

Then open `http://localhost:8080`.

Run a syntax check:

```bash
npm run check
```

## Environment Variables

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `PORT` | No | `8080` | Koyeb service port. |
| `RESEND_API_KEY` | Yes for contact form | empty | API key used by `/api/contact`. |
| `CONTACT_TO_EMAIL` | No | `management@exeer.com` | Recipient for website inquiries. |
| `CONTACT_FROM_EMAIL` | Recommended | `Exeer Website <onboarding@resend.dev>` | Use a verified Resend sender, ideally on `exeer.com`. |

For production, set `CONTACT_FROM_EMAIL` to a verified sender such as `Exeer Website <management@exeer.com>` after the domain is verified in Resend.

## Koyeb Deployment

Create a new Koyeb Web Service from the GitHub repository for this codebase.

Recommended settings:

| Setting | Value |
| --- | --- |
| Builder | Dockerfile |
| Work directory | repository root |
| Dockerfile path | `Dockerfile` |
| Region | Tokyo (`tyo`) |
| Exposed port | `8080` / HTTP |
| Public URL path | `/` |
| Health check | HTTP `GET /healthz` on port `8080` |

Set the environment variables listed above, then deploy.

## Domain Wiring

In Koyeb, add the custom domains:

- `exeer.com`
- `www.exeer.com`

Point DNS to the targets Koyeb provides. Keep existing Google Workspace MX records unchanged.

Typical DNS intent:

| Host | Type | Target |
| --- | --- | --- |
| `@` | Koyeb-supported apex record | Koyeb custom domain target |
| `www` | `CNAME` | Koyeb custom domain target |
| `@` | `MX` | Google Workspace records, unchanged |

After DNS verifies, confirm:

```bash
curl -i https://exeer.com/healthz
curl -i https://exeer.com/
```
