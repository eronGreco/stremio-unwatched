'use strict';

const express = require('express');
const manifest = require('./manifest');
const config = require('./config');
const { buildCatalog } = require('./catalog');
const { renderPoster } = require('./poster');
const { validateAuthKey } = require('./stremio-api');
const { setupPage } = require('./setup-page');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '32kb' }));

function baseUrl(req) {
  if (config.publicBaseUrl) return config.publicBaseUrl;
  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol;
  return `${protocol}://${req.get('host')}`;
}

app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/', (req, res) => {
  res.type('html').send(setupPage(baseUrl(req)));
});

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, version: manifest.version });
});

app.post('/api/test-auth', async (req, res) => {
  const startedAt = Date.now();
  console.log('[auth] Validating Stremio authKey...');
  try {
    const result = await validateAuthKey(req.body?.authKey);
    console.log(`[auth] OK, ${result.libraryItems} library items (${Date.now() - startedAt} ms)`);
    res.json(result);
  } catch (error) {
    console.error(`[auth] FAILED (${Date.now() - startedAt} ms):`, error.message);
    res.status(401).json({ ok: false, error: error.message });
  }
});

app.get('/:authKey/manifest.json', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(manifest);
});

app.get('/:authKey/catalog/series/unwatched.json', async (req, res) => {
  try {
    const metas = await buildCatalog(req.params.authKey, req, {
      threshold: config.watchedThreshold,
      publicBaseUrl: config.publicBaseUrl,
    });
    res.set('Cache-Control', `public, max-age=${config.catalogCacheSeconds}`);
    res.json({ metas });
  } catch (error) {
    console.error('[catalog]', error);
    res.status(502).json({ metas: [], error: error.message });
  }
});

app.get('/poster.jpg', async (req, res) => {
  const source = typeof req.query.src === 'string' ? req.query.src : '';
  const count = Math.max(1, Math.min(999, Number(req.query.count || 0)));
  if (!source || !Number.isFinite(count)) {
    return res.status(400).send('Invalid poster parameters');
  }

  try {
    const buffer = await renderPoster(source, count);
    res.set('Cache-Control', 'public, max-age=86400');
    res.type('jpeg').send(buffer);
  } catch (error) {
    console.warn('[poster]', error.message);
    res.redirect(302, source);
  }
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Unwatched+ listening on http://127.0.0.1:${config.port}`);
});
