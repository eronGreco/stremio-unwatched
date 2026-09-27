'use strict';

const CINEMETA_BASE = 'https://v3-cinemeta.strem.io';
const KITSU_ADDON_BASE = 'https://anime-kitsu.strem.fun';
const KITSU_API_BASE = 'https://kitsu.io/api/edge';

const metaCache = new Map();
const subtypeCache = new Map();
const CACHE_MS = 10 * 60 * 1000;

function cacheGet(cache, key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(cache, key, value) {
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function fetchJson(url, { timeoutMs = 12000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'stremio-unwatched/0.1.0' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function metadataUrl(id) {
  const encoded = encodeURIComponent(id);
  if (id.startsWith('tt')) {
    return `${CINEMETA_BASE}/meta/series/${encoded}.json`;
  }
  if (id.startsWith('kitsu:')) {
    return `${KITSU_ADDON_BASE}/meta/series/${encoded}.json`;
  }
  return null;
}

async function getSeriesMeta(id) {
  const cached = cacheGet(metaCache, id);
  if (cached) return cached;

  const url = metadataUrl(id);
  if (!url) return null;

  const payload = await fetchJson(url);
  return cacheSet(metaCache, id, payload?.meta || null);
}

function kitsuNumericId(id) {
  const match = /^kitsu:(\d+)$/.exec(id);
  return match ? match[1] : null;
}

async function getKitsuSubtype(id) {
  const numericId = kitsuNumericId(id);
  if (!numericId) return null;

  const cached = cacheGet(subtypeCache, numericId);
  if (cached !== null) return cached;

  try {
    const payload = await fetchJson(`${KITSU_API_BASE}/anime/${numericId}`);
    const subtype = payload?.data?.attributes?.subtype || null;
    return cacheSet(subtypeCache, numericId, subtype);
  } catch {
    return null;
  }
}

async function isExcludedKitsuSpecial(id) {
  const subtype = (await getKitsuSubtype(id))?.toLowerCase();
  return subtype === 'ova' || subtype === 'special';
}

module.exports = {
  getSeriesMeta,
  getKitsuSubtype,
  isExcludedKitsuSpecial,
};
