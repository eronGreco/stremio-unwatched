'use strict';

const port = Number(process.env.PORT || 7000);
const watchedThreshold = Number(process.env.WATCHED_THRESHOLD || 0.9);
const catalogCacheSeconds = Number(process.env.CATALOG_CACHE_SECONDS || 60);

if (!Number.isFinite(watchedThreshold) || watchedThreshold <= 0 || watchedThreshold > 1) {
  throw new Error('WATCHED_THRESHOLD must be a number greater than 0 and at most 1');
}

module.exports = {
  port,
  watchedThreshold,
  catalogCacheSeconds,
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, ''),
};
