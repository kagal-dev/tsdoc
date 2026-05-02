# @kagal/build-tsdoc

TSDoc extraction hook for unbuild. Extracts documented
symbols from each entry point at build time and writes
per-export `api_<name>.json` files plus a unified
`api.json` manifest.

## Usage

```typescript
import { newDocumentsHook } from '@kagal/build-tsdoc';
import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: [
    { input: 'src/index', name: 'index' },
    { input: 'src/types/index', name: 'types' },
    { input: 'src/schema/index', name: 'schema' },
  ],
  hooks: {
    'build:done': newDocumentsHook(),
  },
});
```

By default, output goes to `_docs/` at the package root
(not inside `dist/`, so it does not ship to npm). To
override:

```typescript
newDocumentsHook({ outputDirectory: 'docs/api' })
```

## Output

For a package with `index`, `types`, and `schema`
entries:

```text
_docs/
  api.json          # unified manifest
  api_index.json    # symbols from src/index
  api_types.json    # symbols from src/types/index
  api_schema.json   # symbols from src/schema/index
```

Per-export files each contain a `DocEntry[]` array from
`tsdoc-markdown`. The unified `api.json` manifest wraps
them with package name, version, generation timestamp,
and per-export metadata. The `api_` prefix on per-export
files keeps them in a separate filename namespace from
the manifest, so packages whose exports include `./api`
do not collide with `api.json`.

## Exports

| Export | Description | Deps |
|--------|-------------|------|
| `@kagal/build-tsdoc` | `newDocumentsHook()`, `DEFAULT_OUTPUT_DIRECTORY`, types, `VERSION` | tsdoc-markdown, unbuild (peer) |

## Licence

[MIT](../../LICENCE.txt)
