# Changelog

All notable changes to `@kagal/vue-tsdoc` will be
documented in this file.

## [Unreleased]

### Added

- Vue components that render
  `@microsoft/api-extractor-model` typed graphs
- `APIPackageView` plus a recursive per-kind component set
  (class, interface, function, method, property, enum,
  type-alias, variable) with a generic fallback —
  dispatches each `ApiItem` to its view and recurses into
  members
- `APIItemView` — the recursive dispatcher, exported for
  rendering a subtree directly
- `VueTSDoc` plugin (default export) and `VueTSDocOptions`
  — `app.use(VueTSDoc, { prefix })` sets the CSS class
  prefix applied across the tree (`api-` by default)
- `useAPIClasses(kind?)` and the `APIClasses` type — the
  CSS class strings the components emit
- `VERSION` constant
- `ApiItem` and `ApiPackage` re-exported from
  `@microsoft/api-extractor-model` for typing component
  props
- Inline obuild + api-extractor build hook — emits
  `dist/index.api.json` alongside the bundle and
  declarations. Prototype lives in this package; no
  dependency on `@kagal/build-tsdoc`
- Enum members render their initialiser (`Red = 0`), and
  a `const` with a literal initialiser renders its value
  (`MAX = 5`) — including the inferred-type case where the
  model carries the value but no separate type excerpt
