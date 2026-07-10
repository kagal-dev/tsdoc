# Changelog

All notable changes to `@kagal/model-tsdoc` will be
documented in this file.

## [Unreleased]

### Added

- The read-side surface: `loadPackage` to read a `*.api.json`
  manifest back into the model, the `excerptText` /
  `initializerText` excerpt helpers, and the
  `@microsoft/api-extractor-model` reader surface re-exported
  with proper-cased acronyms (`APIPackage`, `APIItemKind`, …),
  with api-extractor-model as the sole runtime dependency
- Package scaffold: toolchain wiring and the `VERSION` constant
- Manifest extraction on build via `@kagal/build-tsdoc`'s obuild
  hooks, emitting `dist/index.api.json`
- Cross-runtime compatibility probe (`test:compat`)
