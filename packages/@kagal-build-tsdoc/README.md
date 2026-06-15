# @kagal/build-tsdoc

Build-hook adapter for `@microsoft/api-extractor`.
Slim wrapper with `dist/<entryName>.*` defaults, a
stub-aware skip, and per-bundler hook factories for
unbuild and obuild.

## Usage

Each factory returns a map keyed by the bundler's own
hook names, so the result spreads straight into
`hooks`. For unbuild:

```typescript
import { defineBuildConfig } from 'unbuild';
import { newUnbuildHooks } from '@kagal/build-tsdoc';

export default defineBuildConfig({
  entries: [{ input: 'src/index', name: 'index' }],
  declaration: true,
  hooks: { ...newUnbuildHooks() },
});
```

obuild's `end` hook does not carry entries, and only
its `entries` hook sees them bundler-resolved (absolute
paths, effective `stub` flags), so `newOBuildHooks()`
returns a pair that captures from one and extracts
from the other:

```typescript
import { defineBuildConfig } from 'obuild/config';
import { newOBuildHooks } from '@kagal/build-tsdoc';

export default defineBuildConfig({
  entries: [{ type: 'bundle', input: ['./src/index.ts'] }],
  hooks: { ...newOBuildHooks() },
});
```

Both obuild hooks must be wired — `end` throws
`HooksNotWiredError` when `entries` never fired.

To combine extraction with other post-build steps,
keep the map in a variable and call its hooks from
your own wrappers:

```typescript
import { copyFileSync } from 'node:fs';

import { defineBuildConfig } from 'obuild/config';
import { newOBuildHooks } from '@kagal/build-tsdoc';

const tsdoc = newOBuildHooks();

export default defineBuildConfig({
  entries: [{ type: 'bundle', input: ['./src/index.ts'] }],
  hooks: {
    entries: tsdoc.entries,
    end(context) {
      tsdoc.end(context);
      copyFileSync('dist/index.d.mts', 'dist/index.d.ts');
    },
  },
});
```

unbuild entries carry their bundler-resolved `name`;
obuild entry names derive from each `input` basename.
Stub builds are skipped via unbuild's `options.stub`
or obuild's per-entry `stub`; per-entry `outDir` is
honoured. Entries missing that data — e.g.
hand-written name lists — are rejected with
`InvalidBuildEntryError`: only the bundler's own
entries carry the data extraction detects from.

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

`newlineKind` selects the manifest's line endings
(`'os' | 'crlf' | 'lf'`, default `'os'`). The default
follows the host, so the file matches whatever the
consuming repo normalises to; pin `'lf'` or `'crlf'`
to override. An omitted or unexpected value falls back
to the host default.

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

### Functions

- `extractEntryManifest` — extract one entry's
  `.api.json`
- `newUnbuildHooks`, `newOBuildHooks` — per-bundler
  hook-map factories
- `asUnbuildContext`, `asOBuildContext` — narrow an
  `unknown` context to the matching bundler shape

### Types

- `ExtractEntryOptions`, `ExtractEntryResult` — the
  helper's options and result
- `NewlineKind` — manifest line-ending policy
  (`'os' | 'crlf' | 'lf'`)
- `UnbuildHooks`, `UnbuildBuildHookContext`,
  `UnbuildBuildHookEntry` — unbuild shapes
- `OBuildHooks`, `OBuildBuildHookContext`,
  `OBuildBuildHookEntry` — obuild shapes

### Errors

- `DuplicateEntryNameError`, `HooksNotWiredError`,
  `InvalidBuildEntryError`,
  `UnrecognisedBuildContextError`

### Constant

- `VERSION` — package version

## Licence

[MIT](../../LICENCE.txt)
