/**
 * PM Store — lightweight JSON persistence layer.
 * ---------------------------------------------------------------------------
 * Stores all mutable data (products, orders, customers, admins, settings,
 * ad campaigns) in a single data file so nothing is lost on restart.
 * Data file path is configurable via DATA_FILE (default ./data.json).
 * In production on free hosts (Render/Railway) the disk is ephemeral — use a
 * managed database (Postgres/Mongo) when you need durable storage across
 * redeploys; this file keeps the app fully functional for local/self-host use.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');
// Netlify injects the Blobs context per invocation (not at module load), so the
// store is created lazily the first time it is actually used. When the context
// is unavailable (plain local runs), getStore() throws and we fall back to the
// local data file.
// IMPORTANT: Netlify also injects NETLIFY_BLOBS_TOKEN for v1 functions, but it
// is scoped to the current deploy — writes under it vanish on the next deploy.
// We therefore prefer PM_BLOBS_TOKEN (the durable account token) whenever it is
// set, and only fall back to the injected variable for local dev.
let blobStore = null;
let blobStoreInitialized = false;
// The store is created lazily. When the Netlify runtime injects the Blobs
// context (Functions v2, `netlify dev`, build plugins) the plain `getStore`
// call picks it up automatically. On hosts that do not inject a context
// (plain Functions v1 deploys, custom runtimes), we build the store from
// explicit credentials supplied via env vars (NETLIFY_BLOBS_SITE_ID,
// PM_BLOBS_TOKEN, NETLIFY_BLOBS_REGION).
function getBlobStore() {
  if (blobStoreInitialized) return blobStore;
  blobStoreInitialized = true;
  try {
    const netlifyBlobs = require('@netlify/blobs');
    const siteID = process.env.NETLIFY_BLOBS_SITE_ID;
    const token = process.env.PM_BLOBS_TOKEN || process.env.NETLIFY_BLOBS_TOKEN;
    const region = process.env.NETLIFY_BLOBS_REGION;
    if (siteID && token) {
      const options = { name: 'pm-store-data', siteID, token };
      if (region) options.region = region;
      blobStore = netlifyBlobs.getStore(options);
    } else {
      blobStore = netlifyBlobs.getStore('pm-store-data');
    }
  } catch (err) {
    blobStore = null;
  }
  return blobStore;
}
const SEED_RATE = { YER: 1, USD: 1750, SAR: 466 };

function defaultSettings() {
  return {
    siteName: 'PM Store',
    tagline: 'Smart Life · Care · Home · Innovation',
    phone: '+967775201234',
    whatsapp: '967775201234',
    email: 'info@pmstore.com',
    address: 'Sana\'a, Yemen',
    announcement: '',
    social: {
      facebook: '',
      instagram: '',
      tiktok: '',
      whatsapp: 'https://wa.me/967775201234',
      youtube: '',
      telegram: '',
    },
    wallets: [
      { id: 'wlt-1', name: 'Jib', nameAr: 'جيب', number: '', owner: '', type: 'mobile', enabled: true },
      { id: 'wlt-2', name: 'Jawali', nameAr: 'جوالي', number: '', owner: '', type: 'mobile', enabled: true },
      { id: 'wlt-3', name: 'Al-Kuraimi Bank', nameAr: 'بنك الكريمي', number: '', owner: '', type: 'bank', enabled: true },
    ],
    currencies: {
      YER: { rate: 1, symbol: '﷼', label: 'Yemeni Rial', labelAr: 'ريال يمني', decimals: 0 },
      USD: { rate: 1750, symbol: '$', label: 'US Dollar', labelAr: 'دولار أمريكي', decimals: 2 },
      SAR: { rate: 466, symbol: 'ر.س', label: 'Saudi Riyal', labelAr: 'ريال سعودي', decimals: 2 },
    },
    defaultCurrency: 'YER',
  };
}

function defaultState() {
  return {
    admins: [],
    products: [],
    orders: [],
    customers: [],
    ads: [],
    settings: defaultSettings(),
    nextIds: { admin: 1, product: 1, order: 1, customer: 1, ad: 1, wallet: 1 },
  };
}

let state = null;
let lastBlobError = null;

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (sv && typeof sv === 'object' && !Array.isArray(sv) && tv && typeof tv === 'object' && !Array.isArray(tv)) {
      deepMerge(tv, sv);
    } else {
      target[key] = sv;
    }
  }
  return target;
}

function load() {
  if (state) return state;
  if (fs.existsSync(DATA_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      const base = defaultState();
      state = {
        ...base,
        ...parsed,
        settings: deepMerge(base.settings, parsed.settings || {}),
      };
      if (!state.nextIds) state.nextIds = base.nextIds;
      return state;
    } catch (err) {
      console.error('Failed to read data file, starting fresh:', err.message);
    }
  }
  state = defaultState();
  return state;
}

async function loadFromBlob() {
  const s = getBlobStore();
  if (!s) return;
  try {
    const data = await s.get('data.json', { type: 'text' });
    if (!data) return;
    const parsed = JSON.parse(data);
    const base = defaultState();
    state = {
      ...base,
      ...parsed,
      settings: deepMerge(base.settings, parsed.settings || {}),
    };
    if (!state.nextIds) state.nextIds = base.nextIds;
    console.log('Loaded data from Netlify Blobs');
  } catch (err) {
    console.error('Failed to load data from Netlify Blobs:', err.message);
  }
}

async function save() {
  if (!state) return;
  // Best-effort local file write (fails harmlessly on read-only hosts like
  // Netlify Functions; the Blobs write below is the source of truth there).
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmp, DATA_FILE);
  } catch (err) {
    console.error('Failed to save data file:', err.message);
  }
  const s = getBlobStore();
  if (s) {
    try {
      // Awaited so the write finishes before the serverless instance can be
      // frozen (fire-and-forget writes may never complete after a response).
      await s.set('data.json', JSON.stringify(state));
      lastBlobError = null;
    } catch (err) {
      lastBlobError = err.message;
      console.error('Failed to save data to Netlify Blobs:', err.message);
    }
  }
}

function nextId(key) {
  state.nextIds[key] = (state.nextIds[key] || 0) + 1;
  return state.nextIds[key];
}

function reset() {
  state = defaultState();
  return state;
}

module.exports = { load, save, loadFromBlob, nextId, reset, defaultSettings, DATA_FILE, SEED_RATE, lastBlobError };
