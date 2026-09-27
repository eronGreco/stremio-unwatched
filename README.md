# Unwatched+

A Stremio addon that fixes a confusing part of Continue Watching: the `+N` badge in Stremio does **not** mean “N released episodes you still have to watch”. Unwatched+ adds its own catalog where the number means exactly that.

## Current scope (v0.1)

- Counts only episodes whose release date is in the past.
- Ignores Season 0 / specials.
- Ignores Kitsu entries whose subtype is `OVA` or `special`.
- Uses a 90% completion threshold for the currently active episode, instead of Stremio's 70% watched threshold.
- Reads your real Stremio library state, including the per-episode watched bitfield.
- Supports IMDb/Cinemeta series IDs (`tt...`).
- Supports Kitsu anime IDs (`kitsu:...`).
- Keeps the original series/anime IDs, so installed metadata and stream addons such as Cinemeta, Anime Kitsu and Torrentio continue to handle playback.
- Generates a poster badge such as `+6` for the real pending count.

This first version is intentionally **catalog-only**. It does not replace stream addons and does not merge anime franchises yet.

## Why 90%?

Stremio currently marks an item watched after roughly 70% of its duration. That can mark a 24-minute anime episode complete with several minutes still left. Unwatched+ re-checks the active episode using its saved `timeOffset / duration` and considers it complete at 90% by default.

## Local test

Requirements: Node.js 20+ and the Stremio desktop app.

```bash
npm install
npm test
npm start
```

Open:

```text
http://127.0.0.1:7000
```

Paste your Stremio `authKey`, validate it, then click **Install in Stremio**.

To find the key in Stremio Web: DevTools → Application → Local Storage → `authKey`.

> The v0.1 local-test manifest URL contains the authKey. Do not share that URL. A public hosted version should replace this with an opaque addon token.

## Environment variables

See `.env.example`.

- `PORT` defaults to `7000`
- `PUBLIC_BASE_URL` can force poster URLs to use a public HTTPS host
- `WATCHED_THRESHOLD` defaults to `0.90`
- `CATALOG_CACHE_SECONDS` defaults to `60`

## How it works

1. Reads `libraryItem` from Stremio's account datastore.
2. Fetches metadata from Cinemeta for IMDb IDs and Anime Kitsu for Kitsu IDs.
3. Reconstructs the per-episode watched state with `stremio-watched-bitfield`.
4. Filters out unreleased episodes and specials.
5. Corrects the current episode using a 90% completion threshold.
6. Returns only titles with at least one released, unfinished episode in the `Unwatched+` catalog.

## Planned

- Opaque-token configuration for safe public hosting.
- Better diagnostics for metadata mismatches.
- Optional franchise merging for anime while preserving Kitsu episode IDs for stream compatibility.
- Configurable sorting and completion threshold.

## Privacy

Unwatched+ needs a Stremio authKey to read the account library. The v0.1 server does not write the key to disk or a database. Do not expose local logs or share the personalized manifest URL.

## License

MIT
