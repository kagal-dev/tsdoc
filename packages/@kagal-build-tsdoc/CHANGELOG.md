# Changelog

All notable changes to `@kagal/build-tsdoc` will be
documented in this file.

## [Unreleased]

### Changed (breaking)

- Replaced the `tsdoc-markdown` engine with
  `@microsoft/api-extractor`. Output is now
  `<entryName>.api.json` in api-extractor's wire format,
  loadable via `ApiPackage.loadFromJsonFile()` from
  `@microsoft/api-extractor-model`.
- Removed bundler runtime coupling. No `unbuild` peer
  dep. Single-entry `extractEntryManifest()` is
  bundler-agnostic by data alone; the unbuild hook
  factory matches its context structurally without
  importing unbuild at type or runtime.
- Output lands in `dist/` instead of `_docs/`, so api
  manifests ship with the package via
  `files: ["dist"]`.

### Removed

- `newDocumentsHook()` — replaced by
  `extractEntryManifest()`
- `DocumentsManifest`, `ExportManifest`,
  `DocumentsHookOptions`, `DocEntry` types
- `DuplicateExportPathError`,
  `DuplicateOutputFileError` — replaced by the narrower
  `DuplicateEntryNameError` raised by the bundler hooks
  when two entries resolve to the same `entryName`.
  Single-entry `extractEntryManifest` has no list-level
  checks — callers iterating manually own any collision
  logic for that path.
- `DEFAULT_OUTPUT_DIRECTORY` constant
- `tsdoc-markdown` runtime dependency

### Added

- `extractEntryManifest({ projectFolder, entryName?,
  entryFile?, outDir?, outputPath?, tsconfigPath?,
  packageFullPath? })` — single adapter function on
  top of api-extractor. Returns `undefined` when the
  declaration file is missing (stub builds). Throws on
  api-extractor errors. Runtime dependencies are
  bundled, so symbols re-exported from a dependency
  are documented as part of the package itself.
- `newUnbuildHooks()` — unbuild hook-map factory. Its
  `build:done` hook loops `ctx.options.entries` calling
  `extractEntryManifest` per entry. Keyed by hook name
  so the map spreads straight into `hooks`.
- Entries must be bundler-given: they carry their
  bundler-resolved `name`, stub builds are skipped via
  `options.stub`, and per-entry `outDir` is honoured.
  The hooks detect duplicate entry names, entries
  missing bundler-resolved data, and unrecognised
  contexts.
- `asUnbuildContext` — discriminator cast from
  `unknown` to the matching context type or
  `undefined`. Useful for callers handling untyped
  values.
- Types: `UnbuildBuildHookEntry`,
  `UnbuildBuildHookContext`, `UnbuildHooks`,
  `ExtractEntryOptions`, `ExtractEntryResult`.
- Errors: `DuplicateEntryNameError`,
  `InvalidBuildEntryError`,
  `UnrecognisedBuildContextError`.
- `@microsoft/api-extractor` and
  `@microsoft/api-extractor-model` runtime dependencies
- `api-extractor`, `api-extractor-model`, `build-hook`
  added as `package.json` keywords for discoverability.

## [0.1.0] - 2026-05-03

<!-- cspell:words Sigstore tsdocs -->
First release published via npm OIDC trusted publishing
with Sigstore provenance. Version `0.0.1` was a manual
bootstrap publish needed to register the package on npm
so the trusted-publisher binding could be configured;
its contents are otherwise identical to `0.1.0`.

### Changed

- Migrated from `kagal-dev/pki` monorepo, where the
  package was previously named `@kagal/build-tsdocs`
  (plural).

### Added

- `newDocumentsHook()` — unbuild `build:done` hook for
  TSDoc extraction via `tsdoc-markdown`
- Public types: `DocumentsManifest`, `ExportManifest`,
  `DocumentsHookOptions`, plus `DocEntry` re-exported
  from `tsdoc-markdown`
- Public errors: `DuplicateExportPathError`,
  `DuplicateOutputFileError`
- `DEFAULT_OUTPUT_DIRECTORY` and `VERSION` constants
