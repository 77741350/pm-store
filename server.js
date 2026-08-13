/**
 * PM Store â€” backend API
 * ---------------------------------------------------------------------------
 * Multi-admin authentication (JWT), products, orders, customers, settings
 * (social links, Yemeni e-wallets, multi-currency), ad campaign manager,
 * staff management, 2FA, and image uploads. Data persists to a JSON file
 * via store.js â€” swap for Postgres/Mongo when you scale.
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const multer = require('multer');
const { body, validationResult } = require('express-validator');

const store = require('./store');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.warn('JWT_SECRET not set - using insecure fallback. Set JWT_SECRET in production.');
  return 'pm-store-insecure-fallback-secret-change-me';
})();

store.load();

// Seed the first admin account from environment variables (once)
const seedAdmin = async () => {
  const s = store.load();
  if (s.admins.length === 0) {
    const email = (process.env.ADMIN_EMAIL || 'admin@pmstore.com').toLowerCase();
    const hash = process.env.ADMIN_PASSWORD_HASH;
    const password = process.env.ADMIN_PASSWORD;
    let passwordHash = hash;
    if (!passwordHash && password) passwordHash = await bcrypt.hash(password, 12);
    if (!passwordHash) passwordHash = await bcrypt.hash('admin12345', 12);
    s.admins.push({
      id: store.nextId('admin'),
      name: 'Administrator',
      email,
      passwordHash,
      twoFactorSecret: null,
      twoFactorEnabled: false,
      createdAt: new Date().toISOString(),
    });
    store.save();
    console.log(`Seeded admin account: ${email}`);
  }
  if (s.products.length === 0) {
    s.products.push(
      { id: store.nextId('product'), name: 'Aura Smart Speaker', nameAr: 'ظ…ظƒط¨ط± طµظˆطھ ط°ظƒظٹ ط£ظˆط±ط§', category: 'smart', price: 89000, stock: 42, sku: 'PMS-1001', image: null, oldPrice: null },
      { id: store.nextId('product'), name: 'Guardian Security Camera', nameAr: 'ظƒط§ظ…ظٹط±ط§ ظ…ط±ط§ظ‚ط¨ط© ط¬ط§ط±ط¯ظٹط§ظ†', category: 'smart', price: 64000, stock: 5, sku: 'PMS-1002', image: null, oldPrice: null },
      { id: store.nextId('product'), name: 'Halo Smart Lamp', nameAr: 'ظ…طµط¨ط§ط­ ظ‡ط§ظ„ظˆ ط§ظ„ط°ظƒظٹ', category: 'smart', price: 42000, stock: 60, sku: 'PMS-1003', image: null, oldPrice: null },
    );
    store.save();
  }
};
seedAdmin();

// ---------------------------------------------------------------------------
// Core middleware
// ---------------------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      fontSrc: ["'self'", 'https:', 'data:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
}));
app.use(express.json({ limit: '200kb' }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const host = req.get('host');
  if (!origin || origin === `${req.protocol}://${host}` || origin === `http://${host}` || origin === `https://${host}`) return next();
  cors({
    origin(o, callback) {
      if (allowedOrigins.includes(o) || isProd) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })(req, res, next);
});

app.use(morgan(isProd ? 'combined' : 'dev'));

const ipKey = (req) => req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket.remoteAddress || 'unknown';
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, keyGenerator: ipKey, validate: false });
app.use(apiLimiter);

const loginLimiter = rateLimit({
  windowMs: (Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES) || 15) * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 20,
  keyGenerator: ipKey,
  validate: false,
  message: { error: 'Too many login attempts. Try again later.' },
});

// Static uploads (product images)
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing auth token' });
  try {
    req.adminPayload = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminById(id) {
  return store.load().admins.find(a => a.id === Number(id));
}

// ---------------------------------------------------------------------------
// Admin login (multi-account), 2FA, password
// ---------------------------------------------------------------------------
app.post(
  '/api/auth/login',
  loginLimiter,
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid email or password format' });

    const email = req.body.email.toLowerCase();
    const admin = store.load().admins.find(a => a.email === email);
    if (!admin) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(req.body.password, admin.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    if (admin.twoFactorEnabled && admin.twoFactorSecret) {
      const halfToken = jwt.sign({ adminId: admin.id, email: admin.email, role: 'admin', pending2fa: true }, JWT_SECRET, { expiresIn: '10m' });
      return res.json({ token: halfToken, requires2fa: true });
    }

    const token = signToken({ adminId: admin.id, email: admin.email, role: 'admin' });
    res.json({ token, expiresIn: process.env.JWT_EXPIRES_IN || '8h', admin: { name: admin.name, email: admin.email } });
  }
);

app.post(
  '/api/auth/login/2fa',
  loginLimiter,
  body('token').isString(),
  body('code').isString().isLength({ min: 6, max: 6 }),
  async (req, res) => {
    try {
      const payload = jwt.verify(req.body.token, JWT_SECRET);
      if (!payload.pending2fa) return res.status(401).json({ error: 'Invalid session' });
      const admin = adminById(payload.adminId);
      if (!admin || !admin.twoFactorEnabled || !admin.twoFactorSecret) return res.status(401).json({ error: 'Invalid session' });
      const ok = speakeasy.totp.verify({ secret: admin.twoFactorSecret, code: req.body.code, window: 1 });
      if (!ok) return res.status(401).json({ error: 'Invalid code' });
      const token = signToken({ adminId: admin.id, email: admin.email, role: 'admin' });
      res.json({ token, expiresIn: process.env.JWT_EXPIRES_IN || '8h', admin: { name: admin.name, email: admin.email } });
    } catch {
      return res.status(401).json({ error: 'Invalid session' });
    }
  }
);

app.put(
  '/api/auth/password',
  requireAdmin,
  body('currentPassword').isString(),
  body('password').isString().isLength({ min: 8 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const admin = adminById(req.adminPayload.adminId);
    if (!admin) return res.status(401).json({ error: 'Not found' });
    const ok = await bcrypt.compare(req.body.currentPassword, admin.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

    admin.passwordHash = await bcrypt.hash(req.body.password, 12);
    store.save();
    res.json({ ok: true });
  }
);

// --- 2FA setup / verify (per admin) ---
app.get('/api/auth/2fa/setup', requireAdmin, (req, res) => {
  const admin = adminById(req.adminPayload.adminId);
  if (!admin) return res.status(404).json({ error: 'Not found' });
  const secret = speakeasy.generateSecret({ name: `PM Store â€” ${admin.email}`, length: 20 });
  admin.twoFactorSecret = secret.base32;
  store.save();
  QRCode.toDataURL(secret.otpauth_url, (err, dataUrl) => {
    res.json({ qr: dataUrl, secret: secret.base32 });
  });
});

app.post(
  '/api/auth/2fa/verify',
  requireAdmin,
  body('code').isString().isLength({ min: 6, max: 6 }),
  (req, res) => {
    const admin = adminById(req.adminPayload.adminId);
    if (!admin || !admin.twoFactorSecret) return res.status(400).json({ error: 'No 2FA secret generated' });
    const ok = speakeasy.totp.verify({ secret: admin.twoFactorSecret, code: req.body.code, window: 1 });
    if (!ok) return res.status(401).json({ error: 'Invalid code' });
    admin.twoFactorEnabled = true;
    store.save();
    res.json({ ok: true });
  }
);

app.delete('/api/auth/2fa', requireAdmin, (req, res) => {
  const admin = adminById(req.adminPayload.adminId);
  if (!admin) return res.status(404).json({ error: 'Not found' });
  admin.twoFactorEnabled = false;
  admin.twoFactorSecret = null;
  store.save();
  res.json({ ok: true });
});

// --- Staff management (all admins have full permissions) ---
app.get('/api/admins', requireAdmin, (req, res) => {
  res.json(store.load().admins.map(a => ({ id: a.id, name: a.name, email: a.email, twoFactorEnabled: a.twoFactorEnabled, createdAt: a.createdAt })));
});

app.post(
  '/api/admins',
  requireAdmin,
  body('name').isString().trim().isLength({ min: 1, max: 120 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 8 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const s = store.load();
    const email = req.body.email.toLowerCase();
    if (s.admins.find(a => a.email === email)) return res.status(409).json({ error: 'Email already exists' });

    const admin = {
      id: store.nextId('admin'),
      name: req.body.name,
      email,
      passwordHash: await bcrypt.hash(req.body.password, 12),
      twoFactorSecret: null,
      twoFactorEnabled: false,
      createdAt: new Date().toISOString(),
    };
    s.admins.push(admin);
    store.save();
    res.status(201).json({ id: admin.id, name: admin.name, email: admin.email });
  }
);

app.put(
  '/api/admins/:id',
  requireAdmin,
  body('name').optional().isString().trim().isLength({ min: 1, max: 120 }),
  body('password').optional().isString().isLength({ min: 8 }),
  async (req, res) => {
    const admin = adminById(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    if (req.body.name) admin.name = req.body.name;
    if (req.body.password) admin.passwordHash = await bcrypt.hash(req.body.password, 12);
    store.save();
    res.json({ id: admin.id, name: admin.name, email: admin.email });
  }
);

app.delete('/api/admins/:id', requireAdmin, (req, res) => {
  const s = store.load();
  const target = adminById(req.params.id);
  if (!target) return res.status(404).json({ error: 'Admin not found' });
  if (target.id === req.adminPayload.adminId) return res.status(400).json({ error: 'You cannot remove yourself' });
  if (s.admins.length === 1) return res.status(400).json({ error: 'Cannot remove the last admin' });
  s.admins = s.admins.filter(a => a.id !== target.id);
  store.save();
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Customers â€” register/login for storefront users
// ---------------------------------------------------------------------------
app.post(
  '/api/auth/register',
  body('name').isString().trim().isLength({ min: 1, max: 120 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 8 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const s = store.load();
    const { name, email, password } = req.body;
    if (s.customers.find(c => c.email === email)) return res.status(409).json({ error: 'Email already registered' });

    const customer = {
      id: store.nextId('customer'),
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      createdAt: new Date().toISOString(),
    };
    s.customers.push(customer);
    store.save();
    const token = jwt.sign({ customerId: customer.id, email: customer.email, role: 'customer' }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
    res.status(201).json({ token, expiresIn: process.env.JWT_EXPIRES_IN || '8h', customer: { name: customer.name, email: customer.email } });
  }
);

app.post(
  '/api/auth/login/customer',
  loginLimiter,
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid email or password format' });

    const s = store.load();
    const email = req.body.email.toLowerCase();
    const customer = s.customers.find(c => c.email === email);
    if (!customer) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(req.body.password, customer.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ customerId: customer.id, email: customer.email, role: 'customer' }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
    res.json({ token, expiresIn: process.env.JWT_EXPIRES_IN || '8h', customer: { name: customer.name, email: customer.email } });
  }
);

app.get('/api/customers', requireAdmin, (req, res) => {
  const s = store.load();
  res.json(s.customers.map(c => ({ id: c.id, name: c.name, email: c.email, createdAt: c.createdAt })));
});

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
const CATEGORIES = ['smart', 'electronics', 'appliances', 'care'];

app.get('/api/products', (req, res) => {
  res.json(store.load().products);
});

app.post(
  '/api/products',
  requireAdmin,
  body('name').isString().trim().isLength({ min: 1, max: 120 }),
  body('nameAr').optional().isString().trim().isLength({ max: 120 }),
  body('category').isIn(CATEGORIES),
  body('price').isFloat({ min: 0 }),
  body('stock').isInt({ min: 0 }),
  body('image').optional().isString(),
  body('oldPrice').optional({ nullable: true }).isFloat({ min: 0 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const s = store.load();
    const product = {
      id: store.nextId('product'),
      name: req.body.name,
      nameAr: req.body.nameAr || null,
      category: req.body.category,
      price: req.body.price,
      stock: req.body.stock,
      sku: 'PMS-' + (1000 + s.products.length + 1),
      image: req.body.image || null,
      oldPrice: req.body.oldPrice || null,
    };
    s.products.push(product);
    store.save();
    res.status(201).json(product);
  }
);

app.put('/api/products/:id', requireAdmin, (req, res) => {
  const s = store.load();
  const idx = s.products.findIndex(p => p.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  const allowed = ['name', 'nameAr', 'category', 'price', 'stock', 'image', 'oldPrice'];
  allowed.forEach(k => { if (req.body[k] !== undefined) s.products[idx][k] = req.body[k]; });
  store.save();
  res.json(s.products[idx]);
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const s = store.load();
  const before = s.products.length;
  s.products = s.products.filter(p => p.id !== Number(req.params.id));
  if (s.products.length === before) return res.status(404).json({ error: 'Product not found' });
  store.save();
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Image upload (product images from admin)
// ---------------------------------------------------------------------------
const storage = multer.diskStorage({
  destination(req, file, cb) { cb(null, UPLOAD_DIR); },
  filename(req, file, cb) {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    cb(null, 'img-' + Date.now() + '-' + Math.round(Math.random() * 1e6) + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ok = /^image\/(jpe?g|png|webp|gif)$/i.test(file.mimetype);
    cb(ok ? null : new Error('Only image files are allowed'), ok);
  },
});

app.post('/api/upload', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.status(201).json({ url: '/uploads/' + req.file.filename });
});

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
app.post(
  '/api/orders',
  body('items').isArray({ min: 1 }),
  body('shipping.email').isEmail(),
  body('shipping.name').isString().trim().isLength({ min: 1 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const s = store.load();
    const total = req.body.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    const order = {
      id: 'PM-' + String(100000 + store.nextId('order')),
      items: req.body.items,
      shipping: req.body.shipping,
      total,
      currency: req.body.currency || 'YER',
      paymentMethod: req.body.paymentMethod || 'cod',
      paymentNote: req.body.paymentNote || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    s.orders.push(order);
    store.save();
    res.status(201).json(order);
  }
);

app.get('/api/orders', requireAdmin, (req, res) => {
  res.json(store.load().orders);
});

app.put(
  '/api/orders/:id/status',
  requireAdmin,
  body('status').isIn(['pending', 'paid', 'shipped', 'cancelled']),
  (req, res) => {
    const s = store.load();
    const order = s.orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.status = req.body.status;
    store.save();
    res.json(order);
  }
);

// ---------------------------------------------------------------------------
// Settings (site info, social links, wallets, currencies) + Ads manager
// ---------------------------------------------------------------------------
app.get('/api/site', (req, res) => {
  const s = store.load();
  const st = s.settings;
  res.json({
    siteName: st.siteName,
    tagline: st.tagline,
    phone: st.phone,
    whatsapp: st.whatsapp,
    email: st.email,
    address: st.address,
    announcement: st.announcement,
    social: st.social,
    wallets: st.wallets.filter(w => w.enabled),
    currencies: st.currencies,
    defaultCurrency: st.defaultCurrency,
  });
});

app.get('/api/settings', requireAdmin, (req, res) => {
  res.json(store.load().settings);
});

app.put('/api/settings', requireAdmin, (req, res) => {
  const s = store.load();
  const incoming = req.body || {};
  ['siteName', 'tagline', 'phone', 'whatsapp', 'email', 'address', 'announcement', 'defaultCurrency'].forEach(k => {
    if (typeof incoming[k] === 'string' || (k === 'defaultCurrency' && incoming[k])) s.settings[k] = incoming[k];
  });
  if (incoming.social && typeof incoming.social === 'object') s.settings.social = { ...s.settings.social, ...incoming.social };
  if (incoming.wallets && Array.isArray(incoming.wallets)) s.settings.wallets = incoming.wallets;
  if (incoming.currencies && typeof incoming.currencies === 'object') {
    Object.keys(incoming.currencies).forEach(code => {
      const c = incoming.currencies[code];
      if (s.settings.currencies[code]) {
        if (Number(c.rate) > 0) s.settings.currencies[code].rate = Number(c.rate);
        if (typeof c.symbol === 'string') s.settings.currencies[code].symbol = c.symbol;
        if (typeof c.label === 'string') s.settings.currencies[code].label = c.label;
        if (typeof c.labelAr === 'string') s.settings.currencies[code].labelAr = c.labelAr;
      }
    });
  }
  store.save();
  res.json(s.settings);
});

// --- Ad campaign manager (fund/boost social ads from one place) ---
const AD_PLATFORMS = ['facebook', 'instagram', 'tiktok', 'whatsapp', 'youtube', 'telegram'];

app.get('/api/ads', requireAdmin, (req, res) => {
  res.json(store.load().ads);
});

app.post(
  '/api/ads',
  requireAdmin,
  body('platform').isIn(AD_PLATFORMS),
  body('name').isString().trim().isLength({ min: 1, max: 120 }),
  body('budget').optional({ nullable: true }).isFloat({ min: 0 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const s = store.load();
    const ad = {
      id: store.nextId('ad'),
      platform: req.body.platform,
      name: req.body.name,
      budget: Number(req.body.budget) || 0,
      spent: Number(req.body.spent) || 0,
      status: req.body.status || 'active',
      startDate: req.body.startDate || new Date().toISOString().slice(0, 10),
      endDate: req.body.endDate || '',
      link: req.body.link || '',
      notes: req.body.notes || '',
      createdAt: new Date().toISOString(),
    };
    s.ads.push(ad);
    store.save();
    res.status(201).json(ad);
  }
);

app.put('/api/ads/:id', requireAdmin, (req, res) => {
  const s = store.load();
  const ad = s.ads.find(a => a.id === Number(req.params.id));
  if (!ad) return res.status(404).json({ error: 'Campaign not found' });
  ['name', 'platform', 'budget', 'spent', 'status', 'startDate', 'endDate', 'link', 'notes'].forEach(k => {
    if (req.body[k] !== undefined) ad[k] = req.body[k];
  });
  store.save();
  res.json(ad);
});

app.delete('/api/ads/:id', requireAdmin, (req, res) => {
  const s = store.load();
  const before = s.ads.length;
  s.ads = s.ads.filter(a => a.id !== Number(req.params.id));
  if (s.ads.length === before) return res.status(404).json({ error: 'Campaign not found' });
  store.save();
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Health + frontend + 404 + errors
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/admin' || req.path === '/admin/' || req.path.endsWith('.html')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/admin/', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: isProd ? 'Something went wrong' : err.message });
});

if (require.main === module && !process.env.NETLIFY) {
  app.listen(PORT, () => {
    console.log(`PM Store API listening on port ${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

module.exports = app;

