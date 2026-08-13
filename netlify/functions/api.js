const serverless = require('serverless-http');
const store = require('../../store');

let initPromise = null;

function getHandler() {
  if (!initPromise) {
    initPromise = (async () => {
      await store.loadFromBlob();
      const app = require('../../server');
      return serverless(app);
    })();
  }
  return initPromise;
}

function normalizeEvent(event) {
  const p = event.path || '';
  const rawUrl = event.rawUrl || event.rawQuery || '';
  const prefix = '/.netlify/functions/api';
  if (p.startsWith(prefix)) {
    event.path = p.slice(prefix.length) || '/';
  }
  if (rawUrl && (event.path === '/' || event.path === '')) {
    try {
      const u = new URL(rawUrl);
      if (u.pathname) event.path = u.pathname;
    } catch {}
  }
  console.log('[pm]', event.httpMethod, 'path=' + event.path, 'rawUrl=' + rawUrl, 'origin=' + (event.headers && event.headers.origin));
  return event;
}

exports.handler = async (event, context) => {
  const handler = await getHandler();
  return handler(normalizeEvent(event), context);
};
