# Changelog

All notable changes to `@kagal/nuxt-tsdoc` will be
documented in this file.

## [Unreleased]

### Added

- Initial Nuxt module (`defineNuxtModule`) with the `tsdoc`
  config key and valibot option validation
- `<APIPackage source>` server island that loads a
  `*.api.json` manifest at prerender time and renders it with
  `@kagal/vue-tsdoc`; the `@microsoft/api-extractor-model`
  graph never reaches the client bundle
- `sources` option mapping a name to an absolute or
  Nuxt-root-relative manifest path
- `prefix` option for the rendered output's CSS class
  namespace (default `api-`)
- `VERSION` constant
- valibot schemas: `sourceSchema`, `moduleOptionsSchema`
