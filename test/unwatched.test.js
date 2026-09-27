'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const WatchedBitField = require('stremio-watched-bitfield');
const { calculateUnwatched, isReleased, isSpecialVideo } = require('../src/unwatched');

function watchedString(videoIds, watchedIds) {
  const wb = WatchedBitField.constructFromArray(
    videoIds.map((id) => watchedIds.includes(id) ? 1 : 0),
    videoIds
  );
  return wb.serialize();
}

const NOW = new Date('2026-09-26T12:00:00Z');

function video(id, season, released) {
  return { id, season, released };
}

test('future episodes are never counted as released', () => {
  assert.equal(isReleased(video('show:1:1', 1, '2026-09-25T12:00:00Z'), NOW), true);
  assert.equal(isReleased(video('show:1:2', 1, '2026-09-27T12:00:00Z'), NOW), false);
  assert.equal(isReleased(video('show:1:3', 1, null), NOW), false);
});

test('season 0 is treated as special', () => {
  assert.equal(isSpecialVideo(video('show:0:1', 0, '2026-01-01T00:00:00Z')), true);
  assert.equal(isSpecialVideo(video('show:1:1', 1, '2026-01-01T00:00:00Z')), false);
});

test('counts exactly released and unwatched episodes', () => {
  const videos = [
    video('tt1:1:1', 1, '2026-09-01T00:00:00Z'),
    video('tt1:1:2', 1, '2026-09-08T00:00:00Z'),
    video('tt1:1:3', 1, '2026-09-15T00:00:00Z'),
    video('tt1:1:4', 1, '2026-10-01T00:00:00Z'),
  ];
  const item = {
    state: {
      watched: watchedString(videos.map(v => v.id), ['tt1:1:1']),
      video_id: 'tt1:1:1',
      timeOffset: 1400,
      duration: 1500,
    },
  };

  const result = calculateUnwatched(item, { videos }, { now: NOW, threshold: 0.9 });
  assert.equal(result.releasedCount, 3);
  assert.equal(result.pendingCount, 2);
  assert.deepEqual(result.pending.map(v => v.id), ['tt1:1:2', 'tt1:1:3']);
});

test('overrides Stremio watched bit when active episode is only 70-89% complete', () => {
  const videos = [video('tt2:1:1', 1, '2026-09-01T00:00:00Z')];
  const item = {
    state: {
      watched: watchedString(['tt2:1:1'], ['tt2:1:1']),
      video_id: 'tt2:1:1',
      timeOffset: 1050,
      duration: 1400,
    },
  };

  const result = calculateUnwatched(item, { videos }, { now: NOW, threshold: 0.9 });
  assert.equal(result.pendingCount, 1);
  assert.equal(result.activeVideoPending, true);
  assert.equal(result.activeProgress, 0.75);
});

test('active episode at 90% is complete', () => {
  const videos = [video('tt3:1:1', 1, '2026-09-01T00:00:00Z')];
  const item = {
    state: {
      watched: watchedString(['tt3:1:1'], []),
      video_id: 'tt3:1:1',
      timeOffset: 1260,
      duration: 1400,
    },
  };

  const result = calculateUnwatched(item, { videos }, { now: NOW, threshold: 0.9 });
  assert.equal(result.pendingCount, 0);
});

test('specials do not affect the pending count', () => {
  const videos = [
    video('tt4:0:1', 0, '2026-09-01T00:00:00Z'),
    video('tt4:1:1', 1, '2026-09-01T00:00:00Z'),
  ];
  const item = { state: { watched: watchedString(videos.map(v => v.id), []) } };
  const result = calculateUnwatched(item, { videos }, { now: NOW, threshold: 0.9 });
  assert.equal(result.releasedCount, 1);
  assert.equal(result.pendingCount, 1);
  assert.equal(result.pending[0].id, 'tt4:1:1');
});
