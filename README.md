# Exeer Website

Standalone website for Exeer Co. Ltd. / エクシール株式会社.

The site is mostly static and has no database. Static pages live in `public/`; `server.js` serves those files and exposes a small `/api/contact` endpoint that sends form submissions to `management@exeer.com` through Google Workspace SMTP.

## Local Development

```bash
npm install
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
| `SMTP_HOST` | No | `smtp.gmail.com` | Google Workspace SMTP host. |
| `SMTP_PORT` | No | `587` | Use `465` for SMTPS. |
| `SMTP_USER` | No | `management@exeer.com` | Google Workspace mailbox used to send mail. |
| `SMTP_PASS` | Yes for contact form | empty | Google app password for `SMTP_USER`. |
| `CONTACT_TO_EMAIL` | No | `management@exeer.com` | Recipient for website inquiries. |
| `CONTACT_FROM_EMAIL` | No | `Exeer Website <management@exeer.com>` | From header shown in inbox. |

### Google app password setup

1. Sign in to Google Admin or the `management@exeer.com` account.
2. Enable 2-Step Verification for that user if it is not already enabled.
3. Open [Google App Passwords](https://myaccount.google.com/apppasswords).
4. Create an app password for "Mail" / "Other (Exeer website)".
5. Put the generated 16-character password in `SMTP_PASS` on Koyeb.

Remove any old `RESEND_API_KEY` env var from Koyeb if it is still set.

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

Test the contact form at `https://exeer.com/contact`.
