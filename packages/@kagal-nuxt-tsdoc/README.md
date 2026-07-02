# @kagal/nuxt-tsdoc

Nuxt module that renders
[`@kagal/build-tsdoc`](../@kagal-build-tsdoc/) API manifests as
documentation, built on
[`@kagal/vue-tsdoc`](../@kagal-vue-tsdoc/).

The module contributes a single `<APIPackage>` component — a
Nuxt **server island** that loads a `*.api.json` manifest at
prerender time and renders it with `@kagal/vue-tsdoc`. The
`@microsoft/api-extractor-model` graph is read on the server
only and never ships to the client bundle, so pages using
`<APIPackage>` must be prerendered.

## Install

```bash
pnpm add -D @kagal/nuxt-tsdoc
```

The module depends on `@kagal/vue-tsdoc`; you do not depend on
`@microsoft/api-extractor-model` directly.

## Usage

### 1. Register the module and declare sources

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@kagal/nuxt-tsdoc'],
  tsdoc: {
    sources: [
      {
        name: '@kagal/build-tsdoc',
        path: './node_modules/@kagal/build-tsdoc/dist/index.api.json',
      },
    ],
  },
});
```

Each `path` is absolute or relative to the Nuxt root; the
module resolves it and exposes the lookup to `<APIPackage>`.

### 2. Render a source

```vue
<template>
  <APIPackage source="@kagal/build-tsdoc" />
</template>
```

`source` matches a configured `name`. Because `<APIPackage>`
is a server island, the page must be prerendered:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    prerender: {
      routes: ['/'],
    },
  },
});
```

### 3. Style the output

Every rendered element carries a prefixed CSS class
(`api-package`, `api-item api-class`, `api-badge`, …); target
those from your own stylesheet. Change the namespace with the
`prefix` option:

```ts
// nuxt.config.ts
tsdoc: {
  prefix: 'kagal-tsdoc-', // → kagal-tsdoc-package, kagal-tsdoc-item, …
  sources: [/* … */],
},
```

## Failure handling

`<APIPackage>` fails loudly so the consumer handles a misconfiguration
rather than ships an empty page. Both failure modes throw and abort
the prerender:

- An unmatched `source` name (no `tsdoc.sources` entry with that
  name) throws.
- A matched source whose `*.api.json` cannot be loaded (missing or
  corrupt) is rethrown naming the source and path, preserving the
  underlying cause.

## Module options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `sources` | `{ name, path }[]` | `[]` | Manifests to expose. `name` is the `<APIPackage source>` key; `path` is an absolute or Nuxt-root-relative `*.api.json`. |
| `prefix` | `string` | `'api-'` | CSS class-name prefix for the rendered output. |

## Exports

| Export | Description |
| --- | --- |
| `default` | Nuxt module (`defineNuxtModule`) |
| `VERSION` | Package version string |
| `ModuleOptions`, `Source` | Option type definitions |
| `moduleOptionsSchema`, `sourceSchema` | valibot schemas |

## Licence

[MIT](../../LICENCE.txt)
