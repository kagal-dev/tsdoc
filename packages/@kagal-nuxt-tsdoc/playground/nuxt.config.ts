// https://nuxt.com/docs/api/configuration/nuxt-config
import path from 'node:path';

const buildTsdocDocuments = path.resolve(
  import.meta.dirname,
  '../../@kagal-build-tsdoc/dist/index.api.json',
);

export default defineNuxtConfig({
  modules: [
    '@kagal/nuxt-tsdoc',
    '@nuxt/eslint',
  ],
  devtools: { enabled: true },
  compatibilityDate: '2026-04-21',
  nitro: {
    prerender: {
      routes: ['/'],
    },
  },
  watchers: {
    chokidar: {
      followSymlinks: false,
      ignored: ['**/node_modules/**'],
    },
  },
  tsdoc: {
    sources: [
      { name: '@kagal/build-tsdoc', path: buildTsdocDocuments },
    ],
    // Non-default prefix to exercise the `prefix` option end-to-end.
    prefix: 'kagal-tsdoc-',
  },
});
