/**
 * PM Store — Backend v2
 * Full features: multi-admin, wallets, social/ads, i18n, currencies, images
 * Data: in-memory (swap to DB via marked sections). See README.
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

const app = express();
const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';

// ---------- Middleware ----------
// Fix: allow inline scripts (admin.html/index.html use inline <script>) — otherwise helmet CSP blocks them and login never fires
app.use(helmet({ contentSecurityPolicy:false, crossOriginResourcePolicy:false }));
app.use(express.json({ limit: '5mb' })); // larger for base64 images
app.use(express.urlencoded({ extended:true, limit:'5mb' }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s=>s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, cb){
    if(!origin || allowedOrigins.length===0 || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return cb(null,true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials:true,
}));
app.use(morgan(isProd?'combined':'dev'));
// Serve static files but never cache HTML (so admin edits show immediately in the browser)
app.use(express.static(path.join(__dirname), {
  etag:false,
  maxAge:0,
  setHeaders(res, filePath){
    if(filePath.endsWith('.html')) res.setHeader('Cache-Control','no-store');
  }
}));

app.use(rateLimit({ windowMs:15*60*1000, max:400 }));
const loginLimiter = rateLimit({
  windowMs:(Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES)||15)*60*1000,
  max:Number(process.env.LOGIN_RATE_LIMIT_MAX)||10,
  message:{ error:'Too many login attempts. Try again later.' }
});

// ---------- In-memory DB (replace with real DB) ----------
// Users / Admins - multi-admin with roles
let users = [];
let nextUserId = 1;
async function seedAdmin(){
  const hash = process.env.ADMIN_PASSWORD_HASH || await bcrypt.hash('Admin12345', 10);
  const email = (process.env.ADMIN_EMAIL || 'admin@pmstore.com').toLowerCase();
  if(!users.find(u=>u.email===email)){
    users.push({ id: nextUserId++, name:'Super Admin', email, passwordHash: hash, role:'super_admin', permissions:['*'], active:true, createdAt:new Date().toISOString() });
  }
}
seedAdmin();

// Wallets - Yemeni e-wallets, editable from admin, shown on client
let wallets = [
  { id:1, name_ar:'محفظة جيب', name_en:'Jeeb Wallet', slug:'jeeb', account:'775201234', instructions_ar:'حول المبلغ ثم أرسل صورة الإشعار', instructions_en:'Transfer then send receipt', icon:'💳', active:true, sort:1 },
  { id:2, name_ar:'محفظة جوالي', name_en:'Jawali Wallet', slug:'jawali', account:'775201234', instructions_ar:'الدفع عبر جوالي - أدخل الرقم', instructions_en:'Pay via Jawali', icon:'📱', active:true, sort:2 },
  { id:3, name_ar:'بنك الكريمي', name_en:'Al-Kuraimi Bank', slug:'kuraimi', account:'100200300 - باسم PM Store', instructions_ar:'الحوالة عبر الكريمي - يرجى الاحتفاظ بالإشعار', instructions_en:'Transfer via Kuraimi', icon:'🏦', active:true, sort:3 },
  { id:4, name_ar:'ون كاش', name_en:'One Cash', slug:'onecash', account:'', instructions_ar:'', instructions_en:'', icon:'💰', active:false, sort:4 },
  { id:5, name_ar:'فلوسك', name_en:'Floosak', slug:'floosak', account:'', instructions_ar:'', instructions_en:'', icon:'💸', active:false, sort:5 },
];
let nextWalletId = 6;

// Site Settings
let settings = {
  phone: '+967775201234',
  whatsapp: '+967775201234',
  email: 'info@pmstore.com',
  address_ar: 'صنعاء، اليمن',
  address_en: 'Sanaa, Yemen',
  social:{
    facebook:'https://facebook.com/pmstore',
    instagram:'https://instagram.com/pmstore',
    tiktok:'https://tiktok.com/@pmstore',
    whatsappChannel:'https://wa.me/967775201234',
    metaPixelId: process.env.META_PIXEL_ID || '',
    tiktokPixelId: process.env.TIKTOK_PIXEL_ID || '',
  },
  ads:{
    meta:{ enabled:false, budget:0, campaignName:'' },
    tiktok:{ enabled:false, budget:0, campaignName:'' },
    google:{ enabled:false, budget:0, campaignName:'' },
    snapchat:{ enabled:false, budget:0, campaignName:'' },
  },
  languages:['ar','en'],
  defaultLang:'ar',
  currencies:[
    { code:'YER', symbol:'﷼', name_ar:'ريال يمني', name_en:'Yemeni Rial', rate:1, isDefault:true },
    { code:'SAR', symbol:'ر.س', name_ar:'ريال سعودي', name_en:'Saudi Riyal', rate:0.0025, isDefault:false },
    { code:'USD', symbol:'$', name_ar:'دولار أمريكي', name_en:'US Dollar', rate:0.0019, isDefault:false },
  ],
  showWalletsInCategories:true,
  showWalletsInFooter:true,
  // Store-level promo badges shown at top of storefront (label + optional emoji + link)
  storeBadges:[],
};

let products = [
  { id:1, name_ar:'سماعة أورا الذكية', name_en:'Aura Smart Speaker', name:'Aura Smart Speaker', category:'smart', price:89, priceYER:47000, stock:42, sku:'PMS-1001', images:[], active:true },
  { id:2, name_ar:'كاميرا المراقبة جارديان', name_en:'Guardian Security Camera', name:'Guardian Security Camera', category:'smart', price:64, priceYER:34000, stock:5, sku:'PMS-1002', images:[], active:true },
  { id:3, name_ar:'مصباح هالو الذكي', name_en:'Halo Smart Lamp', name:'Halo Smart Lamp', category:'smart', price:42, priceYER:22000, stock:60, sku:'PMS-1003', images:[], active:true },
  { id:4, name_ar:'لابتوب فوياجر 14 بوصة', name_en:'Voyager 14" Laptop', name:'Voyager 14\" Laptop', category:'electronics', price:749, priceYER:395000, stock:2, sku:'PMS-1004', images:[], active:true },
  { id:5, name_ar:'جوال نوفا', name_en:'Nova Smartphone', name:'Nova Smartphone', category:'electronics', price:399, priceYER:210000, stock:30, sku:'PMS-1005', images:[], active:true },
];
let nextProductId = 6;

let orders = [];
let nextOrderId = 1;

// ---------- Auth helpers ----------
function signToken(payload){ return jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret-change-me-please-32chars', { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }); }

function requireAuth(req,res,next){
  const h = req.headers.authorization||'';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if(!token) return res.status(401).json({ error:'Missing auth token' });
  try{
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me-please-32chars');
    const user = users.find(u=>u.email===decoded.email && u.active);
    if(!user) return res.status(401).json({ error:'User not found or disabled' });
    req.user = user;
    req.tokenPayload = decoded;
    next();
  }catch{ return res.status(401).json({ error:'Invalid or expired token' }); }
}
function requireRole(...roles){
  return (req,res,next)=>{
    if(req.user.role==='super_admin') return next();
    if(roles.includes(req.user.role)) return next();
    if(req.user.permissions && req.user.permissions.includes('*')) return next();
    return res.status(403).json({ error:'Forbidden' });
  };
}

// ---------- Health ----------
app.get('/api/health', (req,res)=> res.json({ status:'ok', time:new Date().toISOString(), version:'2.0' }));

// Public settings & wallets (for storefront)
app.get('/api/settings', (req,res)=> res.json(settings));
app.get('/api/wallets', (req,res)=> {
  const list = wallets.filter(w=>w.active).sort((a,b)=>a.sort-b.sort);
  res.json(list);
});
app.get('/api/wallets/all', requireAuth, (req,res)=> res.json(wallets.sort((a,b)=>a.sort-b.sort)));

// Products public
app.get('/api/products', (req,res)=>{
  const q = (req.query.search||'').toLowerCase();
  let list = products.filter(p=>p.active!==false);
  if(q) list = list.filter(p=> (p.name_ar&&p.name_ar.includes(q)) || (p.name_en&&p.name_en.toLowerCase().includes(q)) || p.name.toLowerCase().includes(q) );
  if(req.query.category && req.query.category!=='all') list = list.filter(p=>p.category===req.query.category);
  res.json(list);
});
app.get('/api/products/:id', (req,res)=>{
  const p = products.find(x=>x.id===Number(req.params.id));
  if(!p) return res.status(404).json({ error:'Product not found' });
  res.json(p);
});

// ---------- Auth ----------
app.post('/api/auth/login', loginLimiter,
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({min:1}),
  async (req,res)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ error:'Invalid email or password format' });
    const { email, password } = req.body;
    const user = users.find(u=>u.email===email.toLowerCase() && u.active);
    if(!user) return res.status(401).json({ error:'Invalid email or password' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if(!ok) return res.status(401).json({ error:'Invalid email or password' });
    const token = signToken({ email:user.email, role:user.role, id:user.id, name:user.name });
    res.json({ token, user:{ id:user.id, name:user.name, email:user.email, role:user.role, permissions:user.permissions }, expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
  }
);
app.get('/api/auth/me', requireAuth, (req,res)=>{
  res.json({ id:req.user.id, name:req.user.name, email:req.user.email, role:req.user.role, permissions:req.user.permissions });
});

// ---------- Users management ----------
app.get('/api/users', requireAuth, requireRole('super_admin','admin'), (req,res)=>{
  res.json(users.map(u=>({ id:u.id, name:u.name, email:u.email, role:u.role, permissions:u.permissions, active:u.active, createdAt:u.createdAt })));
});
app.post('/api/users', requireAuth, requireRole('super_admin'),
  body('name').isString().trim().isLength({min:2,max:80}),
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({min:8}),
  body('role').isIn(['admin','editor','super_admin']),
  async (req,res)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const { name,email,password,role,permissions } = req.body;
    if(users.find(u=>u.email===email.toLowerCase())) return res.status(409).json({ error:'Email already exists' });
    const hash = await bcrypt.hash(password, 10);
    const u = { id:nextUserId++, name, email:email.toLowerCase(), passwordHash:hash, role, permissions:permissions|| (role==='admin'?['*']:['products:read','products:write','orders:read']), active:true, createdAt:new Date().toISOString() };
    users.push(u);
    res.status(201).json({ id:u.id, name:u.name, email:u.email, role:u.role });
  }
);
app.put('/api/users/:id', requireAuth, requireRole('super_admin'),
  body('name').optional().isString().trim().isLength({min:2}),
  body('role').optional().isIn(['admin','editor','super_admin']),
  async (req,res)=>{
    const u = users.find(x=>x.id===Number(req.params.id));
    if(!u) return res.status(404).json({ error:'User not found' });
    if(req.body.name) u.name = req.body.name;
    if(req.body.role) u.role = req.body.role;
    if(req.body.permissions) u.permissions = req.body.permissions;
    if(typeof req.body.active==='boolean') u.active = req.body.active;
    if(req.body.password) u.passwordHash = await bcrypt.hash(req.body.password,10);
    res.json({ id:u.id, name:u.name, email:u.email, role:u.role, active:u.active });
  }
);
app.delete('/api/users/:id', requireAuth, requireRole('super_admin'), (req,res)=>{
  const idx = users.findIndex(x=>x.id===Number(req.params.id));
  if(idx===-1) return res.status(404).json({ error:'User not found' });
  if(users[idx].email===req.user.email) return res.status(400).json({ error:'Cannot delete yourself' });
  users.splice(idx,1);
  res.status(204).end();
});

// ---------- Wallets CRUD ----------
app.post('/api/wallets', requireAuth,
  body('name_ar').isString().trim().isLength({min:1}),
  body('name_en').isString().trim().isLength({min:1}),
  body('slug').isString().trim().isLength({min:2}),
  (req,res)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ error:errors.array()[0].msg });
    const w = { id:nextWalletId++, name_ar:req.body.name_ar, name_en:req.body.name_en, slug:req.body.slug.toLowerCase().replace(/\s+/g,'-'), account:req.body.account||'', instructions_ar:req.body.instructions_ar||'', instructions_en:req.body.instructions_en||'', icon:req.body.icon||'💳', active: req.body.active!==false, sort: wallets.length+1 };
    wallets.push(w);
    res.status(201).json(w);
  }
);
app.put('/api/wallets/:id', requireAuth, (req,res)=>{
  const w = wallets.find(x=>x.id===Number(req.params.id));
  if(!w) return res.status(404).json({ error:'Wallet not found' });
  Object.assign(w, req.body, { id:w.id });
  res.json(w);
});
app.delete('/api/wallets/:id', requireAuth, (req,res)=>{
  const before=wallets.length;
  wallets=wallets.filter(x=>x.id!==Number(req.params.id));
  if(wallets.length===before) return res.status(404).json({ error:'Wallet not found' });
  res.status(204).end();
});
app.post('/api/wallets/reorder', requireAuth, (req,res)=>{
  const order = req.body.order; // [id,...]
  if(!Array.isArray(order)) return res.status(400).json({ error:'Invalid order' });
  order.forEach((id,idx)=>{
    const w=wallets.find(x=>x.id===Number(id));
    if(w) w.sort=idx+1;
  });
  res.json(wallets.sort((a,b)=>a.sort-b.sort));
});

// ---------- Settings ----------
app.put('/api/settings', requireAuth, (req,res)=>{
  // allow partial update
  const b=req.body;
  if(b.phone) settings.phone=b.phone;
  if(b.whatsapp) settings.whatsapp=b.whatsapp;
  if(b.email) settings.email=b.email;
  if(b.social) settings.social={ ...settings.social, ...b.social };
  if(b.ads) settings.ads={ ...settings.ads, ...b.ads };
  if(b.currencies && Array.isArray(b.currencies)) settings.currencies=b.currencies;
  if(b.languages) settings.languages=b.languages;
  if(b.defaultLang) settings.defaultLang=b.defaultLang;
  if(typeof b.showWalletsInCategories==='boolean') settings.showWalletsInCategories=b.showWalletsInCategories;
  if(typeof b.showWalletsInFooter==='boolean') settings.showWalletsInFooter=b.showWalletsInFooter;
  if(b.address_ar) settings.address_ar=b.address_ar;
  if(b.address_en) settings.address_en=b.address_en;
  if(b.storeBadges) settings.storeBadges=Array.isArray(b.storeBadges)? b.storeBadges.slice(0,6) : [];
  res.json(settings);
});

// Ads funding - unified
app.post('/api/ads/fund', requireAuth, body('platform').isIn(['meta','tiktok','google','snapchat']), body('amount').isFloat({min:1}), (req,res)=>{
  const errors=validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json({ error:errors.array()[0].msg });
  const { platform, amount } = req.body;
  if(!settings.ads[platform]) return res.status(400).json({ error:'Platform not configured' });
  settings.ads[platform].budget = (settings.ads[platform].budget||0) + Number(amount);
  settings.ads[platform].lastFundedAt = new Date().toISOString();
  res.json({ message:`Funded ${amount} to ${platform}`, ads:settings.ads });
});
app.get('/api/ads', requireAuth, (req,res)=> res.json(settings.ads));

// ---------- Products CRUD (with images) ----------
app.post('/api/products', requireAuth,
  body('name_ar').optional().isString().trim().isLength({min:1,max:120}),
  body('name_en').optional().isString().trim().isLength({min:1,max:120}),
  body('name').optional().isString().trim().isLength({min:1,max:120}),
  body('category').isIn(['smart','electronics','appliances','care']),
  body('price').isFloat({min:0}),
  body('stock').isInt({min:0}),
  (req,res)=>{
    const errors=validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ error:errors.array()[0].msg });
    const p = {
      id: nextProductId++,
      name: req.body.name || req.body.name_ar || req.body.name_en,
      name_ar: req.body.name_ar || req.body.name || '',
      name_en: req.body.name_en || req.body.name || '',
      category: req.body.category,
      price: Number(req.body.price),
      priceYER: req.body.priceYER ? Number(req.body.priceYER) : Math.round(Number(req.body.price)*530),
      stock: Number(req.body.stock),
      sku: req.body.sku || 'PMS-'+(1000+nextProductId),
      images: Array.isArray(req.body.images)? req.body.images.slice(0,5) : [],
      badge: req.body.badge || (req.body.badge==='' ? '' : undefined),
      active: req.body.active!==false,
    };
    products.push(p);
    res.status(201).json(p);
  }
);
app.put('/api/products/:id', requireAuth, (req,res)=>{
  const p=products.find(x=>x.id===Number(req.params.id));
  if(!p) return res.status(404).json({ error:'Product not found' });
  Object.assign(p, req.body, { id:p.id });
  if(req.body.name_ar) p.name_ar=req.body.name_ar;
  if(req.body.name_en) p.name_en=req.body.name_en;
  if(req.body.images) p.images=req.body.images.slice(0,5);
  res.json(p);
});
app.delete('/api/products/:id', requireAuth, (req,res)=>{
  const before=products.length;
  products=products.filter(x=>x.id!==Number(req.params.id));
  if(products.length===before) return res.status(404).json({ error:'Product not found' });
  res.status(204).end();
});

// ---------- Orders ----------
app.post('/api/orders',
  body('items').isArray({min:1}),
  body('shipping.email').isEmail(),
  body('shipping.name').isString().trim().isLength({min:1}),
  (req,res)=>{
    const errors=validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ error:errors.array()[0].msg });
    const { items, shipping, paymentMethod, walletId, currency } = req.body;
    const total = items.reduce((s,it)=> s + (Number(it.price)||0)*(Number(it.qty)||1),0);
    const order={
      id:'PM-'+String(100000+nextOrderId++),
      items, shipping, paymentMethod: paymentMethod||'cod', walletId: walletId||null,
      currency: currency||'YER',
      total, status:'pending', createdAt:new Date().toISOString()
    };
    orders.push(order);
    res.status(201).json(order);
  }
);
app.get('/api/orders', requireAuth, (req,res)=> res.json(orders));
app.put('/api/orders/:id/status', requireAuth, body('status').isIn(['pending','paid','shipped','cancelled']), (req,res)=>{
  const o=orders.find(x=>x.id===req.params.id);
  if(!o) return res.status(404).json({ error:'Order not found' });
  o.status=req.body.status;
  res.json(o);
});

// Fallback - serve index for SPA routes
app.get('*', (req,res)=>{
  if(req.path.startsWith('/api')) return res.status(404).json({ error:'Not found' });
  res.sendFile(path.join(__dirname,'index.html'));
});

app.use((req,res)=> res.status(404).json({ error:'Not found' }));
app.use((err,req,res,next)=>{
  console.error(err);
  res.status(err.status||500).json({ error: isProd ? 'Something went wrong' : err.message });
});

app.listen(PORT, ()=> console.log(`PM Store API v2 listening on ${PORT} (${isProd?'production':'development'}) Phone:+967775201234`));

// ---------- Keep-alive (Render free tier) ----------
// Render spins down after 15 min of inactivity, wiping in-memory data.
// Ping ourselves more often than that so the service never sleeps.
if (isProd && process.env.RENDER_EXTERNAL_URL) {
  const selfUrl = process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
  const ping = () => fetch(selfUrl + '/api/health').catch(() => {});
  setInterval(ping, 10 * 60 * 1000); // every 10 min (< 15 min idle threshold)
  console.log(`Keep-alive enabled -> ${selfUrl}/api/health`);
}
