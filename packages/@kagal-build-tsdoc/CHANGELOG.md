# Changelog

All notable changes to `@kagal/build-tsdoc` will be
documented in this file.

## [Unreleased]

<!-- cspell:words tsdocs -->
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
