# @kagal/model-tsdoc

The shared `@microsoft/api-extractor-model` foundation of the
@kagal tsdoc family. `@kagal/build-tsdoc` writes `*.api.json`
manifests, `@kagal/vue-tsdoc` renders the model graph, and
`@kagal/nuxt-tsdoc` wires the two into Nuxt; this package is
where they meet — loading manifests back into the model graph.

The read side is in place: loading manifests, the excerpt
helpers, and the model surface re-exported with proper-cased
acronyms (`APIPackage` rather than upstream's `ApiPackage`).
The multi-entry contract migrates here next.

## Exports

| Export | Purpose |
| ------ | ------- |
| `loadPackage` | Load a `*.api.json` manifest into an `APIPackage` |
| `excerptText`, `initializerText` | Plain text for type and initialiser excerpts, resolving re-exported references to their source names |
| `API*` model surface | `@microsoft/api-extractor-model` re-exported as `API*` (`APIPackage`, `APIItemKind`, `APINameMixin`, …) |
| `VERSION` | Package version string |

## Licence

MIT
