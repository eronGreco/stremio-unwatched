'use strict';

const API_BASE = 'https://api.strem.io/api';

async function postJson(url, body, { timeoutMs = 12000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'stremio-unwatched/0.1.0',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.error?.message || data?.message || `HTTP ${response.status}`;
      throw new Error(`Stremio API request failed: ${message}`);
    }
    if (data?.error) {
      throw new Error(`Stremio API error: ${data.error.message || JSON.stringify(data.error)}`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function getLibrary(authKey) {
  if (!authKey || typeof authKey !== 'string') {
    throw new Error('Missing Stremio authKey');
  }

  const payload = await postJson(`${API_BASE}/datastoreGet`, {
    authKey,
    collection: 'libraryItem',
    ids: [],
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
