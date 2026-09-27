'use strict';

const API_BASE = 'https://api.strem.io/api';

async function postJson(url, body, { timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'stremio-unwatched/0.1.1',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`Stremio API returned non-JSON (HTTP ${response.status})`);
    }

    if (!response.ok) {
      const message = data?.error?.message || data?.message || `HTTP ${response.status}`;
      throw new Error(`Stremio API request failed: ${message}`);
    }
    if (data?.error) {
      throw new Error(`Stremio API error: ${data.error.message || JSON.stringify(data.error)}`);
    }
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Stremio API timed out after 15 seconds');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function getLibrary(authKey) {
  const cleanAuthKey = typeof authKey === 'string' ? authKey.trim().replace(/^['"]|['"]$/g, '') : '';
  if (!cleanAuthKey) {
    throw new Error('Missing Stremio authKey');
  }

  // For a full import Stremio expects `all: true`; `ids` should be omitted.
  const payload = await postJson(`${API_BASE}/datastoreGet`, {
    authKey: cleanAuthKey,
    collection: 'libraryItem',
    all: true,
  });

  if (!Array.isArray(payload?.result)) {
    throw new Error('Unexpected datastoreGet response');
  }

  return payload.result;
}

async function validateAuthKey(authKey) {
  const library = await getLibrary(authKey);
  return { ok: true, libraryItems: library.length };
}

module.exports = {
  getLibrary,
  validateAuthKey,
};
