# Changelog

All notable changes to `@kagal/build-tsdoc` will be
documented in this file.

## [Unreleased]

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
