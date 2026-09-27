# Stremio Library+

Library+ fixes the Stremio Library instead of adding yet another parallel catalog.

The project started as a normal Stremio catalog addon. That architecture could calculate a better `+N`, but it could not change the native **Library** screen, its misleading watched badge, or its broken watched/not-watched semantics. The project has therefore pivoted to a **WebMod / UI mod**.

## The problem

Stremio's current Library has three confusing behaviours:

1. **Watched / Not Watched are sorts, not filters.** They reorder the same library instead of removing items that do not match.
2. For series, the poster can receive the purple watched check as soon as `times_watched > 0`. Watching one episode can therefore make a 74-episode series look completed.
3. Stremio's native watched threshold is 70%, which is too early for many movies and anime episodes.

## What Library+ does

Inside the real **Library** screen it adds a true **Assistindo** mode.

An item appears in Assistindo only when all of the following are true:

- it is still in the user's Stremio Library;
- the user has actually started it;
- it still has something already released that is not completed by Library+'s rules.

### Movies

- Never started: hidden from Assistindo.
- Started and below 90%: shown.
- 90% or more: considered completed and hidden.

### Series / anime

- Never started: hidden from Assistindo.
- Only episodes already released are considered.
- Season 0 / specials are ignored.
- Kitsu OVA / Special entries are ignored.
- Episode watched state comes from Stremio's real per-episode watched bitfield.
- The currently active episode is corrected using a 90% threshold, even if Stremio already marked it watched at 70%.
- If every currently released regular episode is watched, the title is hidden from Assistindo.
- When a new episode actually releases, the title automatically becomes eligible again.

### Badges

Library+ replaces misleading semantics with useful ones:

- series/anime with pending released episodes: `+N`;
- series/anime caught up: `EM DIA`;
- partially watched movie: real percentage;
- the native purple series check is hidden because it does not mean "series completed".

## Architecture

A normal Stremio addon cannot modify the Library UI. Stremio's Addon SDK is for content resources such as catalogs, metadata, streams and subtitles. Library+ therefore uses the UI-mod route used by current Stremio interface projects.

The first supported host is **Stremio Community v5 5.0.20+**, whose WebMods feature loads custom JavaScript/CSS from:

```text
portable_config/webmods/<mod>/
```

This still uses the same Stremio account, synced library and installed addons. Torrentio, Cinemeta, Anime Kitsu, subtitles and the normal detail/player pages continue to work normally.

The WebMod is in `webmod/`.

## Current development target

V0.2 focuses on one thing and does it correctly:

> Open Library → click **Assistindo** → see only movies/series/anime that you actually started and still have released content left to watch.

The old catalog-addon implementation is still in `src/` temporarily as reference while the migration is completed. It is no longer the product direction.

## Research / inspiration

- Stremio official `stremio-core` and `stremio-web` source for Library/watch semantics.
- `Redfloor/stremio-plugins`, especially its stable DOM-selector strategy for modern Stremio WebMods.
- `Zaarrg/stremio-community-v5`, which provides the WebMods host.

## Privacy

Library+ reads the Stremio account datastore in the same WebView session in order to calculate the real library state. No Stremio auth key is committed to this repository.

## License

MIT
