# @kagal/build-tsdoc

Build-hook adapter for `@microsoft/api-extractor`.
Slim wrapper with `dist/<entryName>.*` defaults and a
stub-aware skip so the call is safe from any
`build:done` / `end` / similar hook.

## Usage

```typescript
import { defineBuildConfig } from 'unbuild';
import { extractEntryManifest } from '@kagal/build-tsdoc';

export default defineBuildConfig({
  entries: [{ input: 'src/index', name: 'index' }],
  declaration: true,
  hooks: {
    'build:done'(context) {
      if (context.options.stub) return;
      for (const entry of context.options.entries) {
        extractEntryManifest({
          projectFolder: context.options.rootDir,
          entryName: entry.name,
        });
      }
    },
  },
});
```

Each call writes
`<projectFolder>/dist/<entryName>.api.json` in
`@microsoft/api-extractor-model`'s wire format, loadable
with `ApiPackage.loadFromJsonFile()`.

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
- Collision detection over the entry list is the
  caller's responsibility — only the caller knows the
  entry-name to output-filename mapping.

## Exports

| Export | Description |
| --- | --- |
| `@kagal/build-tsdoc` | `extractEntryManifest`, `ExtractEntryOptions`, `ExtractEntryResult`, `VERSION` |

## Licence

[MIT](../../LICENCE.txt)
