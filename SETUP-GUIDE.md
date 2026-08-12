# PM Store — Domain, Hosting &amp; Security Setup Guide

This covers the parts I can't do for you directly — I don't have access to
a payment method, a domain registrar account, or any hosting account of
yours. Everything below is written so you (or a developer) can follow it
step by step.

---

## 1. Domain

1. **Pick a registrar.** Namecheap, Google Domains successor (Squarespace
   Domains), Cloudflare Registrar, or GoDaddy all work. Cloudflare sells at
   cost with no markup, which is worth it if you're price-sensitive.
2. **Search and buy** `pmstore.com` or your preferred variant. If it's
   taken, common fallbacks: `pmstore.shop`, `getpmstore.com`,
   `pmstore.store`.
3. **Turn on WHOIS privacy** (usually free or ~$1/mo) so your name/address
   aren't publicly listed against the domain.
4. **Enable two-factor authentication on the registrar account itself** —
   domain theft usually happens through the registrar login, not the site.

## 2. Hosting

You need two things hosted separately: the storefront (static HTML) and
the API (the `backend/` folder).

**Storefront (`frontend/index.html`, `frontend/admin.html`):**
- Cloudflare Pages, Vercel, or Netlify — all have free tiers, automatic
  HTTPS, and a global CDN. Drag-and-drop the `frontend/` folder or connect
  a git repo for auto-deploys.

**API (`backend/`):**
- Render, Railway, or Fly.io — push the `backend/` folder, set the
  environment variables from `.env.example` in their dashboard, done.
  See `backend/README.md` for the exact steps.

## 3. Connecting the domain

Once both are deployed, each platform gives you a set of DNS records to
add (usually a `CNAME` or a few `A` records). At your registrar's DNS
settings:

| Subdomain | Points to | Purpose |
|---|---|---|
| `www.pmstore.com` / `pmstore.com` | Your storefront host | Public site |
| `admin.pmstore.com` | Your storefront host, admin.html | Admin panel — see note below |
| `api.pmstore.com` | Your backend host | The API |

Propagation typically takes anywhere from a few minutes to 24 hours.

**Consider not putting the admin panel on a guessable path.** Options, in
order of effort:
- Simplest: keep `admin.html` off any public nav link (it already is), and
  treat login as the only gate.
- Better: put `admin.pmstore.com` behind your hosting platform's built-in
  password protection (Cloudflare Access, Vercel password protection, or
  Netlify's basic auth add-on) as a second layer in front of the app's own
  login.
- Most robust: restrict `admin.pmstore.com` to specific IP addresses if
  your team works from fixed locations (the "Restrict admin access by IP"
  toggle in the admin panel is a placeholder for this — the real
  enforcement has to happen at the network/hosting level, e.g. Cloudflare
  Access rules).

## 4. SSL / HTTPS

If you use any of the platforms above (Cloudflare Pages, Vercel, Netlify,
Render, Railway, Fly.io), HTTPS is automatic and free — nothing to
configure. If you instead run the backend on a raw VPS, use
[Certbot](https://certbot.eff.org/) to get a free Let's Encrypt certificate
and set it to auto-renew.

Either way: **force HTTPS everywhere** — most of these platforms redirect
HTTP → HTTPS by default, but it's worth confirming in the dashboard.

## 5. Security settings — what's already in the code vs. what you configure

**Already implemented in `backend/server.js`:**
- Security headers (helmet)
- CORS allowlist (only your real domains can call the API)
- Rate limiting (general + a tighter limit on login, to blunt brute-force attempts)
- Passwords hashed with bcrypt, never stored or logged in plaintext
- JWT-based sessions with an expiry
- Input validation on every write endpoint
- Generic error messages in production (no stack traces leaked to users)

**You configure at the platform/account level:**
- [ ] Two-factor authentication on: domain registrar, hosting accounts, and
  your email (email is the recovery path for everything else)
- [ ] A password manager for the admin password and all API keys — not
  saved in chat, notes apps, or spreadsheets
- [ ] Environment variables set in the hosting dashboard, never committed
  to git (`.env` should be in `.gitignore`)
- [ ] Database backups turned on, once you connect a real database
  (see `backend/README.md`)
- [ ] Uptime monitoring (e.g. UptimeRobot, free tier) pointed at
  `api.pmstore.com/api/health`
- [ ] A process for rotating the JWT secret and admin password
  periodically, and immediately if you ever suspect a leak

## 6. What the admin panel's "Security" tab does today

The toggles for two-factor authentication, login alerts, and IP
restriction in `admin.html` are **UI placeholders** — they show the
intended settings and give the store owner a toast confirmation, but
nothing is wired to real enforcement yet. To make them real:

- **2FA**: add TOTP (e.g. `speakeasy` npm package) to the `/api/auth/login`
  flow in `server.js`, requiring a 6-digit code after password.
- **Login alerts**: send an email (e.g. via Resend or SendGrid) from the
  login route whenever a new session is created.
- **IP restriction**: enforce at the network layer (Cloudflare Access
  rule, or an allowlist check in Express) rather than in the front end.

This is intentionally left as a next step rather than faked more deeply —
better to have an honest placeholder than a toggle that looks like it's
protecting you when it isn't.
