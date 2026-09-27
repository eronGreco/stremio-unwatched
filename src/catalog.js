'use strict';

const { getLibrary } = require('./stremio-api');
const { getSeriesMeta, isExcludedKitsuSpecial } = require('./metadata');
const { calculateUnwatched, hasStarted } = require('./unwatched');

function normalizeLibraryType(type) {
  return type === 'anime' ? 'series' : type;
}

function supportedId(id) {
  return typeof id === 'string' && (id.startsWith('tt') || id.startsWith('kitsu:'));
}

function publicBaseUrl(req, configuredBaseUrl = '') {
  if (configuredBaseUrl) return configuredBaseUrl;
  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol;
  return `${protocol}://${req.get('host')}`;
}

function posterUrl(baseUrl, source, count) {
  if (!source) return undefined;
  const params = new URLSearchParams({ src: source, count: String(count) });
  return `${baseUrl}/poster.jpg?${params.toString()}`;
}

function itemSortValue(result) {
  const partial = result.stats.activeVideoPending ? 1 : 0;
  const release = result.stats.latestReleasedAt?.getTime() || 0;
  const lastWatched = new Date(result.item?.state?.lastWatched || result.item?._mtime || 0).getTime() || 0;
  return [partial, release, lastWatched];
}

function compareResults(a, b) {
  const av = itemSortValue(a);
  const bv = itemSortValue(b);
  for (let i = 0; i < av.length; i += 1) {
    if (av[i] !== bv[i]) return bv[i] - av[i];
  }
  return 0;
}

async function mapWithConcurrency(items, limit, mapper) {
  const output = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      output[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return output;
}

async function buildCatalog(authKey, req, options = {}) {
  const threshold = options.threshold ?? 0.9;
  const now = options.now || new Date();
  const baseUrl = publicBaseUrl(req, options.publicBaseUrl);
  const library = await getLibrary(authKey);

  const candidates = library.filter((item) => {
    if (!item || item.removed) return false;
    if (normalizeLibraryType(item.type) !== 'series') return false;
    if (!supportedId(item._id)) return false;
    return hasStarted(item);
  });

  const results = await mapWithConcurrency(candidates, 6, async (item) => {
    try {
      if (item._id.startsWith('kitsu:') && await isExcludedKitsuSpecial(item._id)) {
        return null;
      }

      const meta = await getSeriesMeta(item._id);
      if (!meta) return null;

      const stats = calculateUnwatched(item, meta, { threshold, now });
      if (stats.pendingCount <= 0) return null;

      return { item, meta, stats };
    } catch (error) {
      console.warn(`[catalog] skipping ${item._id}: ${error.message}`);
      return null;
    }
  });

  return results
    .filter(Boolean)
    .sort(compareResults)
    .map(({ item, meta, stats }) => ({
      id: item._id,
      type: 'series',
      name: meta.name || item.name || item._id,
      poster: posterUrl(baseUrl, meta.poster || item.poster, stats.pendingCount),
      posterShape: 'poster',
      background: meta.background || item.background,
      description: `${stats.pendingCount} episódio${stats.pendingCount === 1 ? '' : 's'} lançado${stats.pendingCount === 1 ? '' : 's'} e ainda não assistido${stats.pendingCount === 1 ? '' : 's'}.`,
      releaseInfo: meta.releaseInfo,
      genres: meta.genres,
    }));
}

module.exports = {
  buildCatalog,
  compareResults,
  posterUrl,
  publicBaseUrl,
};
