# @kagal/vue-tsdoc

Vue components that render
[`@microsoft/api-extractor-model`][aem] typed graphs
produced by [`@kagal/build-tsdoc`](../@kagal-build-tsdoc/).

`APIPackageView` takes a loaded `APIPackage`, walks its entry
points, and recurses over members — dispatching each `APIItem`
to a per-kind component, with a generic fallback for kinds
without a dedicated view.

## Build artifacts

`pnpm build` produces:

- `dist/index.mjs` — Rolldown bundle
- `dist/index.d.mts` — rolled declarations (Vue SFC
  types inlined by [`rolldown-plugin-dts`][rpd])
- `dist/index.api.json` — typed graph emitted inline
  by [`@microsoft/api-extractor`][ae] against the
  rolled `.d.mts` — the same manifest format the
  components render.

## Install

```bash
pnpm add @kagal/vue-tsdoc vue
```

`vue` is declared as a peer dependency.

## Usage

```vue
<script setup lang="ts">
import type { APIPackage } from '@kagal/vue-tsdoc';
import { APIPackageView } from '@kagal/vue-tsdoc';

// `pkg` is an APIPackage loaded from a `*.api.json`
// manifest (e.g. via loadPackage() in a Node context).
defineProps<{ pkg: APIPackage }>();
</script>

<template>
  <APIPackageView :package="pkg" />
</template>
```

The default `api-` class prefix is overridable via
`app.use(VueTSDoc, { prefix })`.

Loading is Node-only — `loadPackage` reads from the
filesystem. In a browser or build pipeline, load the
manifest where the filesystem is available and pass the
resulting `APIPackage` down as a prop.

## Exports

| Export | Description |
| --- | --- |
| `default` | Vue plugin (`import VueTSDoc from …`); `app.use(VueTSDoc, { prefix })` sets the class prefix |
| `VueTSDocOptions` | Plugin option type (`{ prefix? }`) |
| `APIPackageView` | Renders a loaded `APIPackage` (prop `package?`) |
| `APIItemView` | Recursive per-kind dispatcher for one `APIItem` (prop `item`) |
| `useAPIClasses` | CSS-class registry composable, honouring the prefix |
| `APIClasses` | Return type of `useAPIClasses` |
| `loadPackage` | Load an `APIPackage` from a `*.api.json` file (Node) |
| `APIPackage`, `APIItem` | Model types re-exported from api-extractor-model |
| `VERSION` | Package version string |

## Relationship to `@kagal/nuxt-tsdoc`

`@kagal/vue-tsdoc` owns rendering and is Nuxt-agnostic.
`@kagal/nuxt-tsdoc` will integrate this
library with Nuxt — auto-imports, content-collection
wiring, SSR concerns — while delegating the actual
component surface here.

## Licence

[MIT](../../LICENCE.txt)

[aem]: https://www.npmjs.com/package/@microsoft/api-extractor-model
[ae]: https://api-extractor.com/
[rpd]: https://github.com/sxzz/rolldown-plugin-dts
