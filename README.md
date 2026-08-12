# PM Store — e-commerce backend + storefront + admin

A complete store (Arabic + English) with a REST API built on Express.

## Features

- **Storefront** (`/`): bilingual Arabic/English with RTL, multi-currency
  (YER / USD / SAR with editable rates), product images, search, wishlist,
  cart, customer register/login, checkout with Yemeni e-wallets, social
  media links (Facebook / Instagram / TikTok / WhatsApp / YouTube / Telegram)
  and contact phone **+967 775 201 234**.
- **Admin panel** (`/admin`): multi-admin staff management (all full
  permission), product CRUD + image upload, orders + status, customers,
  **ad campaign manager** (budgets/spent per platform with direct links to
  each platform's ads manager), 2FA, password change, and a Settings section
  for store info, social links, Yemeni e-wallets and currency rates.
- **Data**: products, orders, customers, admins, settings and ad campaigns
  persist to a JSON file (`data.json`, path via `DATA_FILE`). Swap for
  Postgres/Mongo when you outgrow it.
- **Security**: helmet CSP, CORS allowlist, rate limiting on login/API,
  bcrypt password hashing, JWT sessions, input validation, optional TOTP 2FA.

## Run locally

```bash
npm install
copy .env.example .env     # then fill in real values
npm start
```

Open `http://localhost:4000` (storefront) and `http://localhost:4000/admin`
(admin). Default seeded admin: from `ADMIN_EMAIL` + `ADMIN_PASSWORD` /
`ADMIN_PASSWORD_HASH` in `.env`.

## API overview

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | — | Admin login (JWT, optional 2FA) |
| POST | `/api/auth/login/2fa` | half-token | Complete 2FA sign-in |
| POST | `/api/auth/register` | — | Customer registration |
| POST | `/api/auth/login/customer` | — | Customer login |
| GET | `/api/site` | — | Public store settings (social, wallets, currencies) |
| GET/POST/PUT/DELETE | `/api/products` | admin | Product management |
| POST | `/api/upload` | admin | Upload product image (multipart) |
| POST | `/api/orders` | — | Place an order |
| GET/PUT | `/api/orders` / `/api/orders/:id/status` | admin | Order management |
| GET | `/api/customers` | admin | Registered customers |
| GET/POST/PUT/DELETE | `/api/admins` | admin | Staff management |
| GET/POST/PUT/DELETE | `/api/ads` | admin | Ad campaigns (fund/boost tracking) |
| GET/PUT | `/api/settings` | admin | Store settings, wallets, currencies |
| PUT/DELETE | `/api/auth/password` / `/api/auth/2fa` | admin | Security |

## Deploy 24/7 (free cloud hosting)

This repo includes a `render.yaml` blueprint and a `Procfile`. Fastest path:

1. Push this folder to GitHub.
2. In **Render**, choose **Blueprint** and select the repo — it reads
   `render.yaml` and provisions the free web service automatically.
   (Railway/Fly.io work too; use the `Procfile` and set the same env vars.)
3. In the service's environment, set:
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD` (or `ADMIN_PASSWORD_HASH`)
   - `JWT_SECRET` (use the generated value)
   - `NODE_ENV=production`
4. Health check is exposed at `/api/health`.

Note: free-tier disks are ephemeral — `data.json` and uploaded images reset
on redeploy. For durable production data, add Postgres (Render's free tier)
and point `DATA_FILE`/uploads at it or a bucket, or switch `store.js` to a
real database.

## Local auto-start (optional)

To keep the server running locally on Windows startup:

```powershell
npm i -g pm2
pm2 start server.js --name pm-store
pm2 save
pm2 startup
```

## Security checklist

- Generate a fresh `JWT_SECRET` for production.
- Set `ALLOWED_ORIGINS` to your real domains.
- Use strong, unique admin passwords; enable 2FA in Security.
- Run `npm audit` periodically.
