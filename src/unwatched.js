'use strict';

const WatchedBitField = require('stremio-watched-bitfield');

function getStateValue(state, ...names) {
  for (const name of names) {
    if (state?.[name] !== undefined && state?.[name] !== null) return state[name];
  }
  return undefined;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getVideoSeason(video) {
  const value = video?.season ?? video?.seriesInfo?.season;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isReleased(video, now = new Date()) {
  const released = normalizeDate(video?.released);
  return Boolean(released && released.getTime() <= now.getTime());
}

function isSpecialVideo(video) {
  return getVideoSeason(video) === 0;
}

function hasStarted(item) {
  const state = item?.state || {};
  const overall = Number(getStateValue(state, 'overallTimeWatched', 'overall_time_watched') || 0);
  const times = Number(getStateValue(state, 'timesWatched', 'times_watched') || 0);
  const offset = Number(getStateValue(state, 'timeOffset', 'time_offset') || 0);
  return overall > 0 || times > 0 || offset > 0 || Boolean(state.watched);
}

function buildWatchedBitfield(serialized, videoIds) {
  if (!serialized || !videoIds.length) return null;
  try {
    return WatchedBitField.constructAndResize(serialized, videoIds);
  } catch {
    return null;
  }
}

function currentProgress(state) {
  const duration = Number(getStateValue(state, 'duration') || 0);
  const offset = Number(getStateValue(state, 'timeOffset', 'time_offset') || 0);
  if (duration <= 0 || offset <= 0) return null;
  return Math.max(0, Math.min(1, offset / duration));
}

function currentVideoId(state) {
  return getStateValue(state, 'video_id', 'videoId') || null;
}

function calculateUnwatched(item, meta, options = {}) {
  const threshold = options.threshold ?? 0.9;
  const now = options.now || new Date();
  const videos = Array.isArray(meta?.videos) ? meta.videos : [];
  const videoIds = videos.map((video) => video?.id).filter(Boolean);
  const state = item?.state || {};
  const bitfield = buildWatchedBitfield(state.watched, videoIds);
  const activeVideoId = currentVideoId(state);
  const progress = currentProgress(state);

  const eligible = videos.filter((video) => {
    if (!video?.id) return false;
    if (isSpecialVideo(video)) return false;
    return isReleased(video, now);
  });

  const pending = [];
  for (const video of eligible) {
    let watched = bitfield ? Boolean(bitfield.getVideo(video.id)) : false;

    if (video.id === activeVideoId && progress !== null) {
      watched = progress >= threshold;
    }

    if (!watched) pending.push(video);
  }

  const activeVideoPending = Boolean(
    activeVideoId &&
    progress !== null &&
    progress > 0 &&
    progress < threshold &&
    pending.some((video) => video.id === activeVideoId)
  );

  const latestReleasedAt = eligible
    .map((video) => normalizeDate(video.released))
    .filter(Boolean)
    .sort((a, b) => b - a)[0] || null;

  return {
    pendingCount: pending.length,
    pending,
    releasedCount: eligible.length,
    activeVideoPending,
    activeProgress: progress,
    latestReleasedAt,
  };
}

module.exports = {
  calculateUnwatched,
  currentProgress,
  currentVideoId,
  getVideoSeason,
  hasStarted,
  isReleased,
  isSpecialVideo,
};
