'use strict';

const manifest = {
  id: 'com.erongreco.stremio-unwatched',
  version: '0.1.0',
  name: 'Unwatched+',
  description: 'Shows series with the real number of released episodes you have not finished yet.',
  resources: ['catalog'],
  types: ['series'],
  catalogs: [
    {
      type: 'series',
      id: 'unwatched',
      name: 'Unwatched+',
    },
  ],
  behaviorHints: {
    adult: false,
    p2p: false,
  },
};

module.exports = manifest;
