# PM Store — e-commerce storefront + API

A complete store (Arabic + English) built on Express with a REST API.

## Features

- **Storefront** (`/`): bilingual Arabic/English with RTL, multi-currency
  (YER / USD / SAR with editable rates), product images, search, wishlist,
  cart, customer register/login, checkout with Yemeni e-wallets, social
  media links (Facebook / Instagram / TikTok / WhatsApp / YouTube / Telegram)
  and contact phone **+967 775 201 234**.
- **Data**: products, orders, customers and settings persist to **Netlify
  Blobs** when blob credentials are set (`NETLIFY_BLOBS_SITE_ID` +
  `PM_BLOBS_TOKEN` + `NETLIFY_BLOBS_REGION`), and fall back to a local JSON
  file (`data.json`) otherwise. The same blob store can be shared across
  hosts (Netlify, Render, Koyeb...), so data follows the deployment.
- **Security**: helmet CSP, CORS allowlist, rate limiting on login/API,
  bcrypt password hashing, JWT sessions, input validation.
- **Email**: sends an account confirmation to customers on sign-up when
  SMTP is configured.

## Run locally

```bash
npm install
copy .env.example .env     # then fill in real values
npm start
```

Open `http://localhost:4000`.

## API overview

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | — | Customer registration |
| POST | `/api/auth/login/customer` | — | Customer login |
| GET | `/api/site` | — | Public store settings (social, wallets, currencies) |
| GET | `/api/products` | — | Product list |
| POST | `/api/orders` | — | Place an order |
| GET | `/api/health` | — | Health check |

## Deploy 24/7 (free cloud hosting)

The repo ships with three deployment configs:

- `netlify.toml` — storefront + serverless API (already live on Netlify).
- `render.yaml` — Render blueprint (free web service).
- `Dockerfile` + `koyeb.yaml` — Koyeb (free web service, scale-to-zero).

Fastest path on **Render**:

1. Push this folder to GitHub.
2. In the Render dashboard: **New → Blueprint** → select the repo.
   Render reads `render.yaml` (start `node server.js`, health check
   `/api/health`) and creates the service.
3. In the service dashboard add the **secrets** (never commit them):
   - `PM_BLOBS_TOKEN` — Netlify account token (required for shared data).
   - `ADMIN_PASSWORD` — first admin password (seeded only if empty).
4. Health check is exposed at `/api/health`.

Data is durable because it lives in **Netlify Blobs**, not on the host disk —
it survives redeploys and moves with you between hosts.

## Security checklist

- Generate a fresh `JWT_SECRET` for production.
- Set `ALLOWED_ORIGINS` to your real domains.
- Use strong, unique account passwords.
- Run `npm audit` periodically.
