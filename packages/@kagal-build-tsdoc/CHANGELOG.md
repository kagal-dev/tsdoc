# Changelog

All notable changes to `@kagal/build-tsdoc` will be
documented in this file.

## [Unreleased]

## [0.3.1] - 2026-07-13

### Added

- TypeScript 7 support for consumers — the `typescript`
  peer range widens to `^5.9.0 || ^6.0.0 || ^7.0.0`. A TS7
  consumer's `typescript` is a version stub, not the
  classic compiler, so its extraction runs on the bundled
  engine deliberately (see Fixed).
- `examples/playground-ts7` — a runnable TypeScript 7.x
  consumer exercising extraction through the obuild hooks.
- `UnbuiltDependencyError` — thrown when a stubbed
  dependency's declarations cannot be derived from its
  source (see Fixed); the message names the dependency to
  build first.

### Fixed

- A TypeScript 7 consumer no longer crashes extraction
  with `ts.parseJsonConfigFileContent is not a function`.
  The consumer-compiler swap now validates the resolved
  `typescript` before aliasing it — adopting only a
  compiler in the classic-API range (`>=5.9 <7`) that
  exposes `createProgram` and `version` — so a TS7 version
  stub is left alone and extraction falls back to the
  bundled engine.
- A bundled dependency left in its development-stub state
  (`types` re-exporting TypeScript source, as
  `unbuild --stub` writes) no longer aborts extraction
  with api-extractor's "Unable to determine semantic
  information" error. Declarations are derived from the
  stubbed source with the analysis compiler into
  `node_modules/.cache/kagal-build-tsdoc/` and the
  dependency is remapped onto them, so the re-exported
  symbols are documented — TSDoc included — as if the
  dependency were built.

## [0.3.0] - 2026-07-09

### Added

- `@kagal/build-tsdoc/utils` subpath — dependency-light
  helpers for the emitted manifests, importable without
  pulling in api-extractor:
  - `loadPackage(file)` reads a `*.api.json` manifest
    back into an `ApiPackage` (the api-extractor-model
    graph), the inverse of `extractEntryManifest`. It
    depends on `@microsoft/api-extractor-model` alone, so
    a renderer or SSR consumer reads manifests without
    the build tooling in its bundle graph.
  - `serialiseJSON(value, newlineKind?)`,
    `resolveNewlineKind`, and the `NewlineKind` /
    `ConcreteNewlineKind` types — JSON serialisation
    matching api-extractor's manifest output (2-space
    indent, trailing newline, `NewlineKind` line endings).
- Optional `typescript` peer dependency
  (`^5.9.0 || ^6.0.0`) declaring the supported consumer
  compiler range without forcing an install.
- `examples/playground-ts6` — a runnable TypeScript 6.x
  consumer exercising extraction through the unbuild
  hooks.

### Changed

- Extraction now analyses declarations with the
  consumer's installed `typescript` instead of
  api-extractor's bundled compiler, so a package built
  on a newer TypeScript is parsed by the engine that
  emitted its `.d.ts` and no version-mismatch notice is
  printed. A no-op when the consumer ships no TypeScript
  or it already matches the bundled compiler.
- Marked the package free of side effects
  (`"sideEffects": false`), so a consumer's bundler may
  tree-shake unused entries — every published module body is
  declarations and re-exports only.
- Pinned `rollup` to `^4.62.2` through a workspace
  pnpm override so the build and test toolchains
  resolve a single 4.x, keeping the lockfile
  deterministic.
- Overrode `@typescript-eslint/utils` to `^8.62.0`
  under `eslint-plugin-tsdoc` so its transitive
  typescript-estree supports TypeScript 6.x, clearing
  the unsupported-version warning during linting.

## [0.2.1] - 2026-06-16

### Changed

- Generated `.api.json` now follows the host's native
  line endings by default instead of api-extractor's
  CRLF, so the manifest matches whatever the consuming
  repo normalises to.

### Added

- `newlineKind` option on `extractEntryManifest` /
  `ExtractEntryOptions` (`'os' | 'crlf' | 'lf'`,
  default `'os'`), plus the `NewlineKind` type. Force
  `'lf'`/`'crlf'` to pin the ending regardless of
  platform; an omitted or unexpected value falls back
  to the host default.

## [0.2.0] - 2026-06-09

### Changed (breaking)

- Replaced the `tsdoc-markdown` engine with
  `@microsoft/api-extractor`. Output is now
  `<entryName>.api.json` in api-extractor's wire format,
  loadable via `ApiPackage.loadFromJsonFile()` from
  `@microsoft/api-extractor-model`.
- Removed bundler runtime coupling. No `unbuild` peer
  dep. Single-entry `extractEntryManifest()` is
  bundler-agnostic by data alone; the per-bundler hook
  factories match unbuild and obuild contexts
  structurally without importing either at type or
  runtime.
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
- `newOBuildHooks()` — obuild hook-pair factory, same
  spreadable shape. obuild's `end` hook carries no
  entries, so the `entries` callback captures the
  bundler-resolved ones in a closure and `end` extracts
  them, throwing `HooksNotWiredError` when `entries`
  never fired.
- Entries must be bundler-given: unbuild entries carry
  their bundler-resolved `name`, obuild entry names
  derive from each `input` basename, stub builds are
  skipped via unbuild's `options.stub` or obuild's
  per-entry `stub`, obuild `transform` entries are
  skipped, and per-entry `outDir` is honoured. The
  hooks detect duplicate entry names, entries missing
  bundler-resolved data, and unrecognised contexts.
- `asUnbuildContext`, `asOBuildContext` — discriminator
  casts from `unknown` to the matching context type or
  `undefined`. Useful for callers handling untyped
  values.
- Types: `UnbuildBuildHookEntry`,
  `UnbuildBuildHookContext`, `UnbuildHooks`,
  `OBuildBuildHookEntry`, `OBuildBuildHookContext`,
  `OBuildHooks`, `ExtractEntryOptions`,
  `ExtractEntryResult`.
- Errors: `DuplicateEntryNameError`,
  `HooksNotWiredError`, `InvalidBuildEntryError`,
  `UnrecognisedBuildContextError`.
- `@microsoft/api-extractor` and
  `@microsoft/api-extractor-model` runtime dependencies
- `api-extractor`, `api-extractor-model`, `build-hook`,
  `obuild` added as `package.json` keywords for
  discoverability.

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
