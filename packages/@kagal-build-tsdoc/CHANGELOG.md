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
- Removed bundler coupling. No `unbuild` peer dep, no
  `BuildContext` parameter. Callers wire their own
  post-build hook and invoke `extractEntryManifest()`
  per entry.
- Output lands in `dist/` instead of `_docs/`, so api
  manifests ship with the package via
  `files: ["dist"]`.

### Removed

- `newDocumentsHook()` — replaced by
  `extractEntryManifest()`
- `DocumentsManifest`, `ExportManifest`,
  `DocumentsHookOptions`, `DocEntry` types
- `DuplicateExportPathError`,
  `DuplicateOutputFileError` — collision detection
  belongs in the caller now (only the caller knows the
  entry-name to output-filename mapping)
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
- `ExtractEntryOptions` and `ExtractEntryResult` types
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
