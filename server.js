/**
 * PM Store — Backend v3 (PostgreSQL-backed)
 * Data persists in PostgreSQL. Falls back to in-memory only if DATABASE_URL is unset (dev).
 * See README.
 */
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, param, validationResult } = require('express-validator');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';
const USE_DB = !!process.env.DATABASE_URL;

const pool = USE_DB
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      family: 4,
    })
  : null;

// ---------- Middleware ----------
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(morgan(isProd ? 'combined' : 'dev'));
app.use(
  express.static(path.join(__dirname), {
    etag: false,
    maxAge: 0,
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-store');
    },
  })
);

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 400 }));
const loginLimiter = rateLimit({
  windowMs: (Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES) || 15) * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
  message: { error: 'Too many login attempts. Try again later.' },
});

// ---------- In-memory fallback (only when DATABASE_URL is not set) ----------
let mem = null;
function initMem() {
  mem = {
    users: [],
    nextUserId: 1,
    wallets: [
      { id: 1, name_ar: 'محفظة جيب', name_en: 'Jeeb Wallet', slug: 'jeeb', account: '775201234', instructions_ar: 'حول المبلغ ثم أرسل صورة الإشعار', instructions_en: 'Transfer then send receipt', icon: '💳', active: true, sort: 1 },
      { id: 2, name_ar: 'محفظة جوالي', name_en: 'Jawali Wallet', slug: 'jawali', account: '775201234', instructions_ar: 'الدفع عبر جوالي - أدخل الرقم', instructions_en: 'Pay via Jawali', icon: '📱', active: true, sort: 2 },
      { id: 3, name_ar: 'بنك الكريمي', name_en: 'Al-Kuraimi Bank', slug: 'kuraimi', account: '100200300 - باسم PM Store', instructions_ar: 'الحوالة عبر الكريمي - يرجى الاحتفاظ بالإشعار', instructions_en: 'Transfer via Kuraimi', icon: '🏦', active: true, sort: 3 },
      { id: 4, name_ar: 'ون كاش', name_en: 'One Cash', slug: 'onecash', account: '', instructions_ar: '', instructions_en: '', icon: '💰', active: false, sort: 4 },
      { id: 5, name_ar: 'فلوسك', name_en: 'Floosak', slug: 'floosak', account: '', instructions_ar: '', instructions_en: '', icon: '💸', active: false, sort: 5 },
    ],
    nextWalletId: 6,
    settings: {
      phone: '+967775201234', whatsapp: '+967775201234', email: 'info@pmstore.com',
      address_ar: 'صنعاء، اليمن', address_en: 'Sanaa, Yemen',
      social: { facebook: 'https://facebook.com/pmstore', instagram: 'https://instagram.com/pmstore', tiktok: 'https://tiktok.com/@pmstore', whatsappChannel: 'https://wa.me/967775201234', metaPixelId: process.env.META_PIXEL_ID || '', tiktokPixelId: process.env.TIKTOK_PIXEL_ID || '' },
      ads: { meta: { enabled: false, budget: 0, campaignName: '' }, tiktok: { enabled: false, budget: 0, campaignName: '' }, google: { enabled: false, budget: 0, campaignName: '' }, snapchat: { enabled: false, budget: 0, campaignName: '' } },
      languages: ['ar', 'en'], defaultLang: 'ar',
      currencies: [
        { code: 'YER', symbol: '﷼', name_ar: 'ريال يمني', name_en: 'Yemeni Rial', rate: 1, isDefault: true },
        { code: 'SAR', symbol: 'ر.س', name_ar: 'ريال سعودي', name_en: 'Saudi Riyal', rate: 0.0025, isDefault: false },
        { code: 'USD', symbol: '$', name_ar: 'دولار أمريكي', name_en: 'US Dollar', rate: 0.0019, isDefault: false },
      ],
      showWalletsInCategories: true, showWalletsInFooter: true, storeBadges: [],
    },
    products: [
      { id: 1, name_ar: 'سماعة أورا الذكية', name_en: 'Aura Smart Speaker', name: 'Aura Smart Speaker', category: 'smart', price: 89, priceYER: 47000, stock: 42, sku: 'PMS-1001', images: [], active: true },
      { id: 2, name_ar: 'كاميرا المراقبة جارديان', name_en: 'Guardian Security Camera', name: 'Guardian Security Camera', category: 'smart', price: 64, priceYER: 34000, stock: 5, sku: 'PMS-1002', images: [], active: true },
      { id: 3, name_ar: 'مصباح هالو الذكي', name_en: 'Halo Smart Lamp', name: 'Halo Smart Lamp', category: 'smart', price: 42, priceYER: 22000, stock: 60, sku: 'PMS-1003', images: [], active: true },
      { id: 4, name_ar: 'لابتوب فوياجر 14 بوصة', name_en: 'Voyager 14" Laptop', name: 'Voyager 14" Laptop', category: 'electronics', price: 749, priceYER: 395000, stock: 2, sku: 'PMS-1004', images: [], active: true },
      { id: 5, name_ar: 'جوال نوفا', name_en: 'Nova Smartphone', name: 'Nova Smartphone', category: 'electronics', price: 399, priceYER: 210000, stock: 30, sku: 'PMS-1005', images: [], active: true },
    ],
    nextProductId: 6,
    orders: [],
    nextOrderId: 1,
  };
}

// ---------- DB bootstrap ----------
async function setupDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'editor',
      permissions TEXT[] NOT NULL DEFAULT '{}',
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS wallets (
      id SERIAL PRIMARY KEY,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      account TEXT NOT NULL DEFAULT '',
      instructions_ar TEXT NOT NULL DEFAULT '',
      instructions_en TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '💳',
      active BOOLEAN NOT NULL DEFAULT true,
      sort INT NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS settings (
      id INT PRIMARY KEY DEFAULT 1,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name_ar TEXT, name_en TEXT, name TEXT, category TEXT,
      price NUMERIC, price_yer INT, stock INT, sku TEXT,
      images JSONB NOT NULL DEFAULT '[]', badge TEXT, active BOOLEAN DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      items JSONB NOT NULL DEFAULT '[]',
      shipping JSONB NOT NULL DEFAULT '{}',
      payment_method TEXT, wallet_id INT, currency TEXT,
      total NUMERIC, status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Seed admin
  const email = (process.env.ADMIN_EMAIL || 'admin@pmstore.com').toLowerCase();
  const hash = process.env.ADMIN_PASSWORD_HASH || (await bcrypt.hash('Admin12345', 10));
  const exists = await pool.query('SELECT 1 FROM users WHERE email=$1', [email]);
  if (exists.rows.length === 0) {
    await pool.query(
      'INSERT INTO users(name,email,password_hash,role,permissions,active) VALUES($1,$2,$3,$4,$5,true)',
      [process.env.ADMIN_NAME || 'Super Admin', email, hash, 'super_admin', ['*']]
    );
  }

  // Seed wallets
  const wCount = await pool.query('SELECT COUNT(*) AS c FROM wallets');
  if (Number(wCount.rows[0].c) === 0) {
    const seed = [
      ['محفظة جيب', 'Jeeb Wallet', 'jeeb', '775201234', 'حول المبلغ ثم أرسل صورة الإشعار', 'Transfer then send receipt', '💳', 1],
      ['محفظة جوالي', 'Jawali Wallet', 'jawali', '775201234', 'الدفع عبر جوالي - أدخل الرقم', 'Pay via Jawali', '📱', 2],
      ['بنك الكريمي', 'Al-Kuraimi Bank', 'kuraimi', '100200300 - باسم PM Store', 'الحوالة عبر الكريمي - يرجى الاحتفاظ بالإشعار', 'Transfer via Kuraimi', '🏦', 3],
      ['ون كاش', 'One Cash', 'onecash', '', '', '', '💰', 4],
      ['فلوسك', 'Floosak', 'floosak', '', '', '', '💸', 5],
    ];
    for (const w of seed) {
      await pool.query(
        'INSERT INTO wallets(name_ar,name_en,slug,account,instructions_ar,instructions_en,icon,sort) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        w
      );
    }
  }

  // Seed settings
  const sCount = await pool.query('SELECT 1 FROM settings WHERE id=1');
  if (sCount.rows.length === 0) {
    await pool.query('INSERT INTO settings(id,data) VALUES(1,$1)', [JSON.stringify(defaultSettings())]);
  }

  // Seed products
  const pCount = await pool.query('SELECT COUNT(*) AS c FROM products');
  if (Number(pCount.rows[0].c) === 0) {
    const seed = [
      ['سماعة أورا الذكية', 'Aura Smart Speaker', 'Aura Smart Speaker', 'smart', 89, 47000, 42, 'PMS-1001'],
      ['كاميرا المراقبة جارديان', 'Guardian Security Camera', 'Guardian Security Camera', 'smart', 64, 34000, 5, 'PMS-1002'],
      ['مصباح هالو الذكي', 'Halo Smart Lamp', 'Halo Smart Lamp', 'smart', 42, 22000, 60, 'PMS-1003'],
      ['لابتوب فوياجر 14 بوصة', 'Voyager 14" Laptop', 'Voyager 14" Laptop', 'electronics', 749, 395000, 2, 'PMS-1004'],
      ['جوال نوفا', 'Nova Smartphone', 'Nova Smartphone', 'electronics', 399, 210000, 30, 'PMS-1005'],
    ];
    for (const p of seed) {
      await pool.query(
        'INSERT INTO products(name_ar,name_en,name,category,price,price_yer,stock,sku) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        p
      );
    }
  }
}

function defaultSettings() {
  return {
    phone: '+967775201234', whatsapp: '+967775201234', email: 'info@pmstore.com',
    address_ar: 'صنعاء، اليمن', address_en: 'Sanaa, Yemen',
    social: { facebook: 'https://facebook.com/pmstore', instagram: 'https://instagram.com/pmstore', tiktok: 'https://tiktok.com/@pmstore', whatsappChannel: 'https://wa.me/967775201234', metaPixelId: process.env.META_PIXEL_ID || '', tiktokPixelId: process.env.TIKTOK_PIXEL_ID || '' },
    ads: { meta: { enabled: false, budget: 0, campaignName: '' }, tiktok: { enabled: false, budget: 0, campaignName: '' }, google: { enabled: false, budget: 0, campaignName: '' }, snapchat: { enabled: false, budget: 0, campaignName: '' } },
    languages: ['ar', 'en'], defaultLang: 'ar',
    currencies: [
      { code: 'YER', symbol: '﷼', name_ar: 'ريال يمني', name_en: 'Yemeni Rial', rate: 1, isDefault: true },
      { code: 'SAR', symbol: 'ر.س', name_ar: 'ريال سعودي', name_en: 'Saudi Riyal', rate: 0.0025, isDefault: false },
      { code: 'USD', symbol: '$', name_ar: 'دولار أمريكي', name_en: 'US Dollar', rate: 0.0019, isDefault: false },
    ],
    showWalletsInCategories: true, showWalletsInFooter: true, storeBadges: [],
  };
}

// ---------- Data access helpers ----------
async function getSettings() {
  if (dbLive) {
    const r = await pool.query('SELECT data FROM settings WHERE id=1');
    return r.rows[0]?.data || defaultSettings();
  }
  return mem.settings;
}
async function saveSettings(data) {
  if (USE_DB) await pool.query('UPDATE settings SET data=$1 WHERE id=1', [JSON.stringify(data)]);
  else mem.settings = data;
  return data;
}

// ---------- Auth helpers ----------
function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret-change-me-please-32chars', { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
}
async function findByEmail(email) {
  if (dbLive) {
    const r = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
    return r.rows[0] || null;
  }
  return mem.users.find((u) => u.email === email.toLowerCase()) || null;
}
async function findUserById(id) {
  if (dbLive) {
    const r = await pool.query('SELECT * FROM users WHERE id=$1', [id]);
    return r.rows[0] || null;
  }
  return mem.users.find((u) => u.id === id) || null;
}
function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing auth token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me-please-32chars');
    findByEmail(decoded.email)
      .then((user) => {
        if (!user || !user.active) return res.status(401).json({ error: 'User not found or disabled' });
        req.user = user;
        next();
      })
      .catch(() => res.status(401).json({ error: 'Invalid or expired token' }));
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (req.user.role === 'super_admin') return next();
    if (roles.includes(req.user.role)) return next();
    if (req.user.permissions && req.user.permissions.includes('*')) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
}

// ---------- Health ----------
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString(), version: '3.0', db: dbLive ? 'postgres' : 'memory', dbError: dbError, hasDbUrl: !!process.env.DATABASE_URL }));

// Public settings & wallets
app.get('/api/settings', async (req, res) => res.json(await getSettings()));
app.get('/api/wallets', async (req, res) => {
  let list;
  if (dbLive) {
    const r = await pool.query('SELECT * FROM wallets WHERE active=true ORDER BY sort ASC');
    list = r.rows;
  } else {
    list = mem.wallets.filter((w) => w.active).sort((a, b) => a.sort - b.sort);
  }
  res.json(list);
});
app.get('/api/wallets/all', requireAuth, async (req, res) => {
  if (dbLive) {
    const r = await pool.query('SELECT * FROM wallets ORDER BY sort ASC');
    return res.json(r.rows);
  }
  res.json(mem.wallets.sort((a, b) => a.sort - b.sort));
});

// Products public
app.get('/api/products', async (req, res) => {
  const q = (req.query.search || '').toLowerCase();
  let list;
  if (dbLive) {
    const r = await pool.query('SELECT * FROM products WHERE active=true');
    list = r.rows;
  } else {
    list = mem.products.filter((p) => p.active !== false);
  }
  if (q) list = list.filter((p) => (p.name_ar && p.name_ar.includes(q)) || (p.name_en && p.name_en.toLowerCase().includes(q)) || p.name.toLowerCase().includes(q));
  if (req.query.category && req.query.category !== 'all') list = list.filter((p) => p.category === req.query.category);
  res.json(list);
});
app.get('/api/products/:id', async (req, res) => {
  let p;
  if (dbLive) {
    const r = await pool.query('SELECT * FROM products WHERE id=$1', [Number(req.params.id)]);
    p = r.rows[0];
  } else {
    p = mem.products.find((x) => x.id === Number(req.params.id));
  }
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json(p);
});

// ---------- Auth ----------
app.post('/api/auth/login', loginLimiter,
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid email or password format' });
    const { email, password } = req.body;
    const user = await findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
    const token = signToken({ email: user.email, role: user.role, id: user.id, name: user.name });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, permissions: user.permissions }, expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
  }
);
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role, permissions: req.user.permissions });
});

// ---------- Users management ----------
app.get('/api/users', requireAuth, requireRole('super_admin', 'admin'), async (req, res) => {
  let users;
  if (dbLive) {
    const r = await pool.query('SELECT id,name,email,role,permissions,active,created_at FROM users');
    users = r.rows;
  } else {
    users = mem.users;
  }
  res.json(users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, permissions: u.permissions, active: u.active, createdAt: u.created_at || u.createdAt })));
});
app.post('/api/users', requireAuth, requireRole('super_admin'),
  body('name').isString().trim().isLength({ min: 2, max: 80 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 8 }),
  body('role').isIn(['admin', 'editor', 'super_admin']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const { name, email, password, role, permissions } = req.body;
    if (await findByEmail(email)) return res.status(409).json({ error: 'Email already exists' });
    const hash = await bcrypt.hash(password, 10);
    const perms = permissions || (role === 'admin' ? ['*'] : ['products:read', 'products:write', 'orders:read']);
    if (dbLive) {
      const r = await pool.query(
        'INSERT INTO users(name,email,password_hash,role,permissions,active) VALUES($1,$2,$3,$4,$5,true) RETURNING id,name,email,role',
        [name, email.toLowerCase(), hash, role, perms]
      );
      return res.status(201).json(r.rows[0]);
    }
    const u = { id: mem.nextUserId++, name, email: email.toLowerCase(), passwordHash: hash, role, permissions: perms, active: true, createdAt: new Date().toISOString() };
    mem.users.push(u);
    res.status(201).json({ id: u.id, name: u.name, email: u.email, role: u.role });
  }
);
app.put('/api/users/:id', requireAuth, requireRole('super_admin'),
  body('name').optional().isString().trim().isLength({ min: 2 }),
  body('role').optional().isIn(['admin', 'editor', 'super_admin']),
  async (req, res) => {
    const u = await findUserById(Number(req.params.id));
    if (!u) return res.status(404).json({ error: 'User not found' });
    const fields = [];
    const vals = [];
    let i = 1;
    if (req.body.name) { fields.push(`name=$${i++}`); vals.push(req.body.name); }
    if (req.body.role) { fields.push(`role=$${i++}`); vals.push(req.body.role); }
    if (req.body.permissions) { fields.push(`permissions=$${i++}`); vals.push(req.body.permissions); }
    if (typeof req.body.active === 'boolean') { fields.push(`active=$${i++}`); vals.push(req.body.active); }
    if (req.body.password) { fields.push(`password_hash=$${i++}`); vals.push(await bcrypt.hash(req.body.password, 10)); }
    if (dbLive) {
      vals.push(u.id);
      const r = await pool.query(`UPDATE users SET ${fields.join(',')} WHERE id=$${i} RETURNING id,name,email,role,active`, vals);
      return res.json(r.rows[0]);
    }
    if (req.body.name) u.name = req.body.name;
    if (req.body.role) u.role = req.body.role;
    if (req.body.permissions) u.permissions = req.body.permissions;
    if (typeof req.body.active === 'boolean') u.active = req.body.active;
    if (req.body.password) u.passwordHash = await bcrypt.hash(req.body.password, 10);
    res.json({ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active });
  }
);
app.delete('/api/users/:id', requireAuth, requireRole('super_admin'), async (req, res) => {
  const u = await findUserById(Number(req.params.id));
  if (!u) return res.status(404).json({ error: 'User not found' });
  if (u.email === req.user.email) return res.status(400).json({ error: 'Cannot delete yourself' });
  if (USE_DB) await pool.query('DELETE FROM users WHERE id=$1', [u.id]);
  else mem.users = mem.users.filter((x) => x.id !== u.id);
  res.status(204).end();
});

// ---------- Wallets CRUD ----------
app.post('/api/wallets', requireAuth,
  body('name_ar').isString().trim().isLength({ min: 1 }),
  body('name_en').isString().trim().isLength({ min: 1 }),
  body('slug').isString().trim().isLength({ min: 2 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const { name_ar, name_en, slug, account, instructions_ar, instructions_en, icon, active } = req.body;
    const sort = req.body.sort != null ? req.body.sort : (await maxSort()) + 1;
    if (dbLive) {
      const r = await pool.query(
        'INSERT INTO wallets(name_ar,name_en,slug,account,instructions_ar,instructions_en,icon,active,sort) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
        [name_ar, name_en, slug.toLowerCase().replace(/\s+/g, '-'), account || '', instructions_ar || '', instructions_en || '', icon || '💳', active !== false, sort]
      );
      return res.status(201).json(r.rows[0]);
    }
    const w = { id: mem.nextWalletId++, name_ar, name_en, slug: slug.toLowerCase().replace(/\s+/g, '-'), account: account || '', instructions_ar: instructions_ar || '', instructions_en: instructions_en || '', icon: icon || '💳', active: active !== false, sort };
    mem.wallets.push(w);
    res.status(201).json(w);
  }
);
app.put('/api/wallets/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (dbLive) {
    const cur = await pool.query('SELECT * FROM wallets WHERE id=$1', [id]);
    if (!cur.rows[0]) return res.status(404).json({ error: 'Wallet not found' });
    const w = { ...cur.rows[0], ...req.body, id };
    const r = await pool.query(
      'UPDATE wallets SET name_ar=$1,name_en=$2,slug=$3,account=$4,instructions_ar=$5,instructions_en=$6,icon=$7,active=$8,sort=$9 WHERE id=$10 RETURNING *',
      [w.name_ar, w.name_en, w.slug, w.account, w.instructions_ar, w.instructions_en, w.icon, w.active, w.sort, id]
    );
    return res.json(r.rows[0]);
  }
  const w = mem.wallets.find((x) => x.id === id);
  if (!w) return res.status(404).json({ error: 'Wallet not found' });
  Object.assign(w, req.body, { id });
  res.json(w);
});
app.delete('/api/wallets/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (dbLive) {
    const r = await pool.query('DELETE FROM wallets WHERE id=$1', [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Wallet not found' });
    return res.status(204).end();
  }
  const before = mem.wallets.length;
  mem.wallets = mem.wallets.filter((x) => x.id !== id);
  if (mem.wallets.length === before) return res.status(404).json({ error: 'Wallet not found' });
  res.status(204).end();
});
app.post('/api/wallets/reorder', requireAuth, async (req, res) => {
  const order = req.body.order;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'Invalid order' });
  if (dbLive) {
    for (let i = 0; i < order.length; i++) await pool.query('UPDATE wallets SET sort=$1 WHERE id=$2', [i + 1, Number(order[i])]);
    const r = await pool.query('SELECT * FROM wallets ORDER BY sort ASC');
    return res.json(r.rows);
  }
  order.forEach((id, idx) => { const w = mem.wallets.find((x) => x.id === Number(id)); if (w) w.sort = idx + 1; });
  res.json(mem.wallets.sort((a, b) => a.sort - b.sort));
});
async function maxSort() {
  if (dbLive) { const r = await pool.query('SELECT COALESCE(MAX(sort),0) AS m FROM wallets'); return Number(r.rows[0].m); }
  return mem.wallets.length;
}

// ---------- Settings ----------
app.put('/api/settings', requireAuth, async (req, res) => {
  const b = req.body;
  const s = await getSettings();
  if (b.phone) s.phone = b.phone;
  if (b.whatsapp) s.whatsapp = b.whatsapp;
  if (b.email) s.email = b.email;
  if (b.social) s.social = { ...s.social, ...b.social };
  if (b.ads) s.ads = { ...s.ads, ...b.ads };
  if (b.currencies && Array.isArray(b.currencies)) s.currencies = b.currencies;
  if (b.languages) s.languages = b.languages;
  if (b.defaultLang) s.defaultLang = b.defaultLang;
  if (typeof b.showWalletsInCategories === 'boolean') s.showWalletsInCategories = b.showWalletsInCategories;
  if (typeof b.showWalletsInFooter === 'boolean') s.showWalletsInFooter = b.showWalletsInFooter;
  if (b.address_ar) s.address_ar = b.address_ar;
  if (b.address_en) s.address_en = b.address_en;
  if (b.storeBadges) s.storeBadges = Array.isArray(b.storeBadges) ? b.storeBadges.slice(0, 6) : [];
  await saveSettings(s);
  res.json(s);
});

// Ads funding
app.post('/api/ads/fund', requireAuth, body('platform').isIn(['meta', 'tiktok', 'google', 'snapchat']), body('amount').isFloat({ min: 1 }), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  const { platform, amount } = req.body;
  const s = await getSettings();
  if (!s.ads[platform]) return res.status(400).json({ error: 'Platform not configured' });
  s.ads[platform].budget = (s.ads[platform].budget || 0) + Number(amount);
  s.ads[platform].lastFundedAt = new Date().toISOString();
  await saveSettings(s);
  res.json({ message: `Funded ${amount} to ${platform}`, ads: s.ads });
});
app.get('/api/ads', requireAuth, async (req, res) => res.json((await getSettings()).ads));

// ---------- Products CRUD ----------
app.post('/api/products', requireAuth,
  body('name_ar').optional().isString().trim().isLength({ min: 1, max: 120 }),
  body('name_en').optional().isString().trim().isLength({ min: 1, max: 120 }),
  body('name').optional().isString().trim().isLength({ min: 1, max: 120 }),
  body('category').isIn(['smart', 'electronics', 'appliances', 'care']),
  body('price').isFloat({ min: 0 }),
  body('stock').isInt({ min: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const b = req.body;
    const name = b.name || b.name_ar || b.name_en;
    const images = Array.isArray(b.images) ? b.images.slice(0, 5) : [];
    const priceYER = b.priceYER ? Number(b.priceYER) : Math.round(Number(b.price) * 530);
    if (dbLive) {
      const r = await pool.query(
        'INSERT INTO products(name_ar,name_en,name,category,price,price_yer,stock,sku,images,badge,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
        [b.name_ar || name, b.name_en || name, name, b.category, Number(b.price), priceYER, Number(b.stock), b.sku || null, JSON.stringify(images), b.badge || null, b.active !== false]
      );
      return res.status(201).json(r.rows[0]);
    }
    const p = { id: mem.nextProductId++, name, name_ar: b.name_ar || name, name_en: b.name_en || name, category: b.category, price: Number(b.price), priceYER, stock: Number(b.stock), sku: b.sku || 'PMS-' + (1000 + mem.nextProductId), images, badge: b.badge, active: b.active !== false };
    mem.products.push(p);
    res.status(201).json(p);
  }
);
app.put('/api/products/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (dbLive) {
    const cur = await pool.query('SELECT * FROM products WHERE id=$1', [id]);
    if (!cur.rows[0]) return res.status(404).json({ error: 'Product not found' });
    const p = cur.rows[0];
    const name = req.body.name || req.body.name_ar || req.body.name_en || p.name;
    const r = await pool.query(
      'UPDATE products SET name_ar=$1,name_en=$2,name=$3,category=$4,price=$5,price_yer=$6,stock=$7,sku=$8,images=$9,badge=$10,active=$11 WHERE id=$12 RETURNING *',
      [
        req.body.name_ar || p.name_ar, req.body.name_en || p.name_en, name, req.body.category || p.category,
        req.body.price != null ? Number(req.body.price) : p.price, req.body.priceYER != null ? Number(req.body.priceYER) : p.price_yer,
        req.body.stock != null ? Number(req.body.stock) : p.stock, req.body.sku || p.sku,
        req.body.images ? JSON.stringify(req.body.images.slice(0, 5)) : JSON.stringify(p.images), req.body.badge !== undefined ? req.body.badge : p.badge,
        req.body.active !== undefined ? req.body.active !== false : p.active, id,
      ]
    );
    return res.json(r.rows[0]);
  }
  const p = mem.products.find((x) => x.id === id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  Object.assign(p, req.body, { id });
  if (req.body.name_ar) p.name_ar = req.body.name_ar;
  if (req.body.name_en) p.name_en = req.body.name_en;
  if (req.body.images) p.images = req.body.images.slice(0, 5);
  res.json(p);
});
app.delete('/api/products/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (dbLive) {
    const r = await pool.query('DELETE FROM products WHERE id=$1', [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
    return res.status(204).end();
  }
  const before = mem.products.length;
  mem.products = mem.products.filter((x) => x.id !== id);
  if (mem.products.length === before) return res.status(404).json({ error: 'Product not found' });
  res.status(204).end();
});

// ---------- Orders ----------
app.post('/api/orders',
  body('items').isArray({ min: 1 }),
  body('shipping.email').isEmail(),
  body('shipping.name').isString().trim().isLength({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const { items, shipping, paymentMethod, walletId, currency } = req.body;
    const total = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 1), 0);
    const id = 'PM-' + String(100000 + (await nextOrderNum()));
    const order = { id, items, shipping, paymentMethod: paymentMethod || 'cod', walletId: walletId || null, currency: currency || 'YER', total, status: 'pending', createdAt: new Date().toISOString() };
    if (dbLive) {
      await pool.query(
        'INSERT INTO orders(id,items,shipping,payment_method,wallet_id,currency,total,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [id, JSON.stringify(items), JSON.stringify(shipping), order.paymentMethod, order.walletId, order.currency, total, 'pending']
      );
      return res.status(201).json(order);
    }
    mem.orders.push(order);
    res.status(201).json(order);
  }
);
app.get('/api/orders', requireAuth, async (req, res) => {
  if (dbLive) {
    const r = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    return res.json(r.rows);
  }
  res.json(mem.orders);
});
app.put('/api/orders/:id/status', requireAuth, body('status').isIn(['pending', 'paid', 'shipped', 'cancelled']), async (req, res) => {
  const id = req.params.id;
  if (dbLive) {
    const r = await pool.query('UPDATE orders SET status=$1 WHERE id=$2 RETURNING *', [req.body.status, id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Order not found' });
    return res.json(r.rows[0]);
  }
  const o = mem.orders.find((x) => x.id === id);
  if (!o) return res.status(404).json({ error: 'Order not found' });
  o.status = req.body.status;
  res.json(o);
});
async function nextOrderNum() {
  if (dbLive) { const r = await pool.query('SELECT COUNT(*) AS c FROM orders'); return Number(r.rows[0].c) + 1; }
  return mem.nextOrderId++;
}

// Fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: isProd ? 'Something went wrong' : err.message });
});

// ---------- Keep-alive (Render free tier) ----------
if (isProd && process.env.RENDER_EXTERNAL_URL) {
  const selfUrl = process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
  setInterval(() => {
    fetch(selfUrl + '/api/health').catch(() => {});
    if (dbLive) pool.query('SELECT 1').catch(() => {}); // keep Supabase free tier from pausing
  }, 10 * 60 * 1000);
  console.log(`Keep-alive enabled -> ${selfUrl}/api/health`);
}

// ---------- Start ----------
let dbLive = USE_DB;
let dbError = null;
async function start() {
  if (dbLive) {
    try {
      await setupDB();
    } catch (e) {
      console.error('DB setup failed, falling back to memory:', e.message);
      dbError = e.message;
      dbLive = false;
      initMem();
    }
  } else {
    initMem();
  }
  app.listen(PORT, () => console.log(`PM Store API v3 listening on ${PORT} (${isProd ? 'production' : 'development'}) db=${dbLive ? 'postgres' : 'memory'} Phone:+967775201234`));
}
start();
