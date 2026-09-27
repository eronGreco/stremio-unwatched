'use strict';

const sharp = require('sharp');

const imageCache = new Map();
const MAX_CACHE_ITEMS = 250;

function badgeSvg(count) {
  const text = `+${count}`;
  const width = Math.max(64, 30 + text.length * 24);
  return Buffer.from(`
    <svg width="342" height="507" xmlns="http://www.w3.org/2000/svg">
      <rect x="${342 - width - 14}" y="14" width="${width}" height="50" rx="13" fill="#ffffff" fill-opacity="0.96"/>
      <text x="${342 - width / 2 - 14}" y="49" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="29" font-weight="700" fill="#7357ff">${text}</text>
    </svg>
  `);
}

async function fetchImage(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'stremio-unwatched/0.1.0' },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Poster source returned HTTP ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function setCache(key, value) {
  if (imageCache.size >= MAX_CACHE_ITEMS) {
    const firstKey = imageCache.keys().next().value;
    if (firstKey) imageCache.delete(firstKey);
  }
  imageCache.set(key, value);
}

async function renderPoster(source, count) {
  const key = `${count}|${source}`;
  const cached = imageCache.get(key);
  if (cached) return cached;

  const input = await fetchImage(source);
  const result = await sharp(input)
    .resize(342, 507, { fit: 'cover', position: 'centre' })
    .composite([{ input: badgeSvg(count), top: 0, left: 0 }])
    .jpeg({ quality: 82, progressive: true })
    .toBuffer();

  setCache(key, result);
  return result;
}

module.exports = { renderPoster };
