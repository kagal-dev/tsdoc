# @kagal/model-tsdoc

The shared `@microsoft/api-extractor-model` foundation of the
@kagal tsdoc family. `@kagal/build-tsdoc` writes `*.api.json`
manifests, `@kagal/vue-tsdoc` renders the model graph, and
`@kagal/nuxt-tsdoc` wires the two into Nuxt; this package is
where they meet — loading manifests back into the model, and
the multi-entry contract pairing a package's per-entry
manifests with the subpath each documents.

Scaffold state: the toolchain is wired and the surface is
limited to `VERSION`; the shared helpers migrate here from
the siblings.

## Exports

| Export | Purpose |
| ------ | ------- |
| `VERSION` | Package version string |

## Licence

MIT
