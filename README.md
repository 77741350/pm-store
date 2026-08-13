# PM Store — e-commerce storefront + API

A complete store (Arabic + English) built on Express with a REST API.

## Features

- **Storefront** (`/`): bilingual Arabic/English with RTL, multi-currency
  (YER / USD / SAR with editable rates), product images, search, wishlist,
  cart, customer register/login, checkout with Yemeni e-wallets, social
  media links (Facebook / Instagram / TikTok / WhatsApp / YouTube / Telegram)
  and contact phone **+967 775 201 234**.
- **Data**: products, orders, customers and settings persist to a JSON file
  (`data.json`, path via `DATA_FILE`). Swap for Postgres/Mongo when you
  outgrow it.
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

This repo includes a `netlify.toml` (deploy to Netlify) and a `render.yaml`
blueprint. Fastest path:

1. Push this folder to GitHub.
2. **Netlify**: import the repo — `netlify.toml` deploys the storefront and
   the API as a serverless function automatically.
3. In the site's environment, set:
   - `JWT_SECRET` (use the generated value)
   - `NODE_ENV=production`
   - SMTP vars to enable sign-up confirmation emails
     (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`,
     `MAIL_FROM`, `MAIL_LANG`).
4. Health check is exposed at `/api/health`.

Note: on free tiers, `data.json` and uploaded images reset on redeploy. For
durable production data, add a database (Postgres/Mongo) and point
`DATA_FILE`/uploads at it, or switch `store.js` to a real database.

## Security checklist

- Generate a fresh `JWT_SECRET` for production.
- Set `ALLOWED_ORIGINS` to your real domains.
- Use strong, unique account passwords.
- Run `npm audit` periodically.
