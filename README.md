# tsdoc

Monorepo for TSDoc extraction and Nuxt consumption of
`@kagal/*` package API documentation.

## Packages

| Package | Description |
|---------|-------------|
| [`@kagal/build-tsdoc`](packages/@kagal-build-tsdoc) | TSDoc extraction hook for unbuild; writes per-export JSON plus a unified `api.json` manifest to `_docs/` at build time. |
| [`@kagal/nuxt-tsdoc`](packages/@kagal-nuxt-tsdoc) | Nuxt module that consumes `api.json` manifests produced by `@kagal/build-tsdoc`. |

The two packages form a pipeline: `@kagal/build-tsdoc`
extracts documentation at package build time and ships
`_docs/api.json` alongside the source; `@kagal/nuxt-tsdoc`
is the Nuxt consumer for those manifests.

## Origin

`@kagal/build-tsdoc` was extracted from the
[`kagal-dev/pki`](https://github.com/kagal-dev/pki)
monorepo so it can be paired with its Nuxt consumer
and evolve independently of the PKI codebase.

## Common commands

```bash
pnpm install
pnpm build              # Build all packages
pnpm clean              # Remove dist/ and node_modules
pnpm dev:prepare        # Stub all packages (unbuild --stub)
pnpm test               # Test all packages
pnpm lint               # Lint all (root + packages)
pnpm type-check         # Type-check root tools + packages
pnpm precommit          # dev:prepare → lint → type-check → build → test
pnpm prepack            # lint:root:check → per-package prepack
```

Per-package commands via `--filter`:

```bash
pnpm --filter @kagal/build-tsdoc build
pnpm --filter @kagal/nuxt-tsdoc test
```

## Licence

[MIT](LICENCE.txt)
