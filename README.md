# tsdoc

Monorepo for TSDoc extraction and Nuxt consumption of
`@kagal/*` package API documentation.

## Packages

| Package | Description |
| --- | --- |
| [`@kagal/build-tsdoc`](packages/@kagal-build-tsdoc) | Build-hook adapter for `@microsoft/api-extractor`. Each entry's rolled declarations get a `<entry>.api.json` written next to them. |
| [`@kagal/model-tsdoc`](packages/@kagal-model-tsdoc) | Shared `api-extractor-model` foundation: loads `*.api.json` manifests back into the model graph and carries the multi-entry contract. |
| [`@kagal/nuxt-tsdoc`](packages/@kagal-nuxt-tsdoc) | Nuxt module that consumes `*.api.json` manifests produced by `@kagal/build-tsdoc`. |

The packages form a pipeline: `@kagal/build-tsdoc`
extracts documentation at package build time and ships
`dist/<entry>.api.json` alongside the bundle;
`@kagal/model-tsdoc` loads those manifests back into
the `api-extractor-model` graph; `@kagal/nuxt-tsdoc`
is the Nuxt consumer for those manifests.

## Common commands

```bash
pnpm install
pnpm build              # Build all packages
pnpm clean              # Remove dist/ and node_modules
pnpm dev:prepare        # Stub all packages (bundler --stub)
pnpm test               # Test all packages
pnpm lint               # Lint all (root + packages)
pnpm type-check         # Type-check root tools + packages
pnpm precommit          # dev:prepare → lint → type-check → build → test
pnpm prepack            # lint:root:check → per-package prepack
```

Per-package commands via `--filter`:

```bash
pnpm --filter @kagal/build-tsdoc build
pnpm --filter @kagal/build-tsdoc test
```

## Licence

[MIT](LICENCE.txt)
