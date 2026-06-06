# @kagal/build-tsdoc

Build-hook adapter for `@microsoft/api-extractor`.
Slim wrapper with `dist/<entryName>.*` defaults, a
stub-aware skip, and a hook factory for unbuild.

## Usage

The factory returns a map keyed by the bundler's own
hook names, so the result spreads straight into
`hooks`:

```typescript
import { defineBuildConfig } from 'unbuild';
import { newUnbuildHooks } from '@kagal/build-tsdoc';

export default defineBuildConfig({
  entries: [{ input: 'src/index', name: 'index' }],
  declaration: true,
  hooks: { ...newUnbuildHooks() },
});
```

To combine extraction with other post-build steps,
keep the map in a variable and call its hook from
your own wrapper.

Entries must be the bundler's own — they carry their
bundler-resolved `name`, stub builds are skipped via
`options.stub`, and per-entry `outDir` is honoured.
Entries missing that data — e.g. hand-written name
lists — are rejected with `InvalidBuildEntryError`:
only the bundler's own entries carry the data
extraction detects from.

Each entry writes
`<projectFolder>/<outDir>/<entryName>.api.json` in
`@microsoft/api-extractor-model`'s wire format,
loadable with `ApiPackage.loadFromJsonFile()`. For
finer control, call
`extractEntryManifest({ projectFolder, entryName })`
yourself per entry — the hooks are a loop over it.

## Defaults

Paths derive from `projectFolder`, `outDir`, and
`entryName`:

| Option | Default |
| --- | --- |
| `outDir` | `dist`, resolved against `<projectFolder>` |
| `entryFile` | `<outDir>/<entryName>.d.mts` |
| `outputPath` | `<outDir>/<entryName>.api.json` |
| `tsconfigPath` | `<projectFolder>/tsconfig.json` |
| `packageFullPath` | `<projectFolder>/package.json` |

Override any of them individually for non-standard
layouts.

## Behaviour

- Returns `undefined` when `entryFile` is missing — stub
  builds emit only the JS bundle, no declarations, so
  the call is safe to make unconditionally.
- Runtime dependencies are passed to api-extractor as
  `bundledPackages`: a symbol re-exported from a
  dependency is part of the package contract, so it is
  documented as a member of the package itself.
  Dependencies the entry never references are a no-op.
- Throws when api-extractor reports any error. Warnings
  surface in the returned `warningCount`.
- The bundler hooks reject duplicate entry names
  with `DuplicateEntryNameError`, entries missing
  their bundler-resolved data with
  `InvalidBuildEntryError`, and contexts that match
  no supported bundler shape with
  `UnrecognisedBuildContextError`. The single-entry
  `extractEntryManifest` has no list-level checks —
  callers iterating directly own any collision logic.

## Exports

| Export | Description |
| --- | --- |
| `@kagal/build-tsdoc` | Helpers (`extractEntryManifest`, `newUnbuildHooks`, `asUnbuildContext`); types (`UnbuildBuildHookEntry`, `UnbuildBuildHookContext`, `UnbuildHooks`, `ExtractEntryOptions`, `ExtractEntryResult`); errors (`DuplicateEntryNameError`, `InvalidBuildEntryError`, `UnrecognisedBuildContextError`); `VERSION` |

## Licence

[MIT](../../LICENCE.txt)
