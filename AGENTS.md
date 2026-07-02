# AGENTS.md

This file provides guidance to AI coding assistants
(Claude Code, GitHub Copilot, Cody, etc.) when working
with code in the `kagal-dev/tsdoc` monorepo.

## Project Overview

This monorepo contains MIT-licensed TypeScript
packages for extracting, rendering, and consuming TSDoc
documentation:

- **`@kagal/build-tsdoc`** — build-hook adapter for
  `@microsoft/api-extractor`. Thin wrapper with
  `dist/<entryName>.*` defaults and a stub-aware skip.
  Bundler users wire the `newUnbuildHooks()` /
  `newOBuildHooks()` hook maps into their build config;
  each entry gets a standard `<entryName>.api.json`
  written next to its rolled declarations.
  `extractEntryManifest()` is the per-entry primitive
  for direct callers.
- **`@kagal/model-tsdoc`** — shared
  `api-extractor-model` foundation the consumers
  converge on: loading `*.api.json` manifests back
  into the model graph. The read side has migrated —
  `loadPackage`, the excerpt helpers, and the `API*`
  model surface; the multi-entry contract, pairing a
  package's per-entry manifests with the subpath each
  documents, migrates here next.
- **`@kagal/vue-tsdoc`** — Vue components that render
  the `@microsoft/api-extractor-model` typed graph from
  a `*.api.json` manifest. `APIPackageView` walks a
  loaded package and dispatches each item to a per-kind
  view; `loadPackage()` reads a manifest from disk.
  Nuxt-agnostic — depends only on Vue.
- **`@kagal/nuxt-tsdoc`** — Nuxt module that renders
  `*.api.json` manifests in a Nuxt app through the
  `<APIPackage>` server island, built on
  `@kagal/vue-tsdoc`. The manifest is loaded at prerender
  time and the model never ships to the client.

The packages form a strict one-way pipeline:

```text
package source (*.ts)
      │ extracted by
      ▼
@kagal/build-tsdoc → dist/<entry>.api.json
      │ loaded by
      ▼
@kagal/model-tsdoc → api-extractor-model graph
      │ rendered by
      ▼
@kagal/vue-tsdoc (Vue components)
      │ integrated by
      ▼
@kagal/nuxt-tsdoc (Nuxt module) → Nuxt app
```

`@kagal/build-tsdoc` has no runtime dependency on Nuxt
or any bundler. Its bundler-context interfaces
(`UnbuildBuildHookContext`, `OBuildBuildHookContext`)
are narrow structural shapes, never imports — the
helpers match real bundler contexts by shape.
`@kagal/model-tsdoc` and `@kagal/vue-tsdoc` depend on
`@microsoft/api-extractor-model` to load and render the
manifests. `@kagal/nuxt-tsdoc` depends on
`@kagal/vue-tsdoc`, which owns `loadPackage()` and the
`@microsoft/api-extractor-model` dependency; the module
itself never imports the model library.

## Monorepo Structure

```text
tsdoc/
├── packages/
│   ├── @kagal-build-tsdoc/    # @kagal/build-tsdoc
│   │   └── src/
│   │       ├── index.ts       # public re-exports, VERSION
│   │       ├── extract.ts     # api-extractor invocation + option types
│   │       ├── utils.ts       # manifest serialisation and loading helpers
│   │       ├── errors.ts      # shared error classes
│   │       ├── unbuild.ts     # unbuild shim + newUnbuildHooks factory
│   │       └── obuild.ts      # obuild shim + newOBuildHooks factory
│   ├── @kagal-model-tsdoc/    # @kagal/model-tsdoc
│   │   └── src/
│   │       ├── index.ts       # public exports, VERSION
│   │       ├── model.ts       # API* façade over api-extractor-model
│   │       ├── load.ts        # manifest loader
│   │       └── excerpt.ts     # excerpt plain-text rendering
│   ├── @kagal-vue-tsdoc/      # @kagal/vue-tsdoc
│   │   └── src/
│   │       ├── index.ts       # public re-exports, VERSION, loadPackage
│   │       ├── plugin.ts      # Vue plugin (class-name prefix)
│   │       ├── components/    # per-kind presentational views
│   │       └── lib/           # non-component rendering helpers
│   └── @kagal-nuxt-tsdoc/     # @kagal/nuxt-tsdoc
│       └── src/
│           ├── index.ts       # Nuxt module entry
│           ├── schema.ts      # valibot validators
│           ├── types.ts       # ModuleOptions, re-exports
│           └── runtime/       # Nuxt runtime
├── .github/workflows/         # CI/CD
├── pnpm-workspace.yaml
└── package.json               # Root (private)
```

## Common Commands

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
pnpm test:coverage      # test with istanbul coverage report
```

Per-package commands via `--filter`:

```bash
pnpm --filter @kagal/build-tsdoc build
pnpm --filter @kagal/build-tsdoc test
```

## Code Style Guidelines

Guided by `.editorconfig` and `@poupe/eslint-config`
(indentation, line endings, quotes, semicolons, final
newline, and trailing whitespace are enforced; line
length, comment format, naming, and spelling are
conventions):

- **Indentation**: 2 spaces
- **Line Endings**: Unix (LF)
- **Charset**: UTF-8
- **Quotes**: Single quotes
- **Semicolons**: Always
- **Module System**: ES modules (`type: "module"`)
- **Line Length**: Max 78 characters preferred
- **Comments**: TSDoc format
- **Naming**: camelCase for variables/functions,
  PascalCase for types/interfaces
- **Spelling**: British English (serialisable,
  behaviour, colour)
- **Final Newline**: Always insert
- **Trailing Whitespace**: Always trim

### Factory functions

Prefer `new` or `make` prefix, not `create`
(e.g. `newFoo()`, `makeFoo()`).

### Handling cspell findings

`pnpm lint` runs `cspell` against the tree using
`internal/build/cspell.json`. When cspell flags a
word, prefer fixing over whitelisting:

- US spelling → British equivalent.
- Concatenated compound → hyphenate so cspell sees
  the dictionary parts.
- Inconsistent identifier → harmonise to the
  canonical form already used elsewhere in the
  codebase.

If the word is genuinely correct (brand, package
name, RFC term, our own type name, or real English
missing from cspell's dictionary), whitelist it at
the right scope:

- **Single file** — `cspell:words` for *named terms*
  you want recognised across the file, placed near
  the section heading or docstring it applies to;
  `cspell:disable-next-line` for *opaque literals*
  (test-vector strings, fixture filenames) where
  naming the substring would just be noise.
- **Multi-file** — promote to `words` in
  `internal/build/cspell.json`.
- **Comment-less format** (JSON, etc.) — extend the
  `overrides` block in `internal/build/cspell.json`
  with a per-filename rule so the term stays
  file-scoped without polluting the global list.

Don't put `cspell:disable-next-line` directly above
a TSDoc/JSDoc comment — use `cspell:words` for the
specific term. Don't break tables or bullet lists
with inline annotations; place directives at the
preceding section heading.

## Development Practices

### Pre-commit (MANDATORY)

Before committing any changes, ALWAYS run:

1. `pnpm precommit`
2. Fix any issues found

### DO

- Use workspace protocol (`workspace:^`) for internal
  dependencies
- Write tests for all new functionality
- Check existing code patterns before creating new ones
- Follow strict TypeScript practices
- Read design docs before making architectural changes
- Run `dev:prepare` (stub) before lint/type-check so
  cross-package imports resolve via stubs; the full
  build runs after lint/type-check, before tests

### DON'T

- Create files unless necessary — prefer editing
  existing ones
- Add external dependencies without careful
  consideration
- Ignore TypeScript errors or ESLint warnings
- Add Nuxt/Vue imports to `@kagal/build-tsdoc` — it
  must remain a pure build-time Node.js tool
- Use relative imports between packages (use workspace
  deps)
- **NEVER use `git add .` or `git add -A`**
- **NEVER commit without explicitly listing files**
- **NEVER use `cd`** — use `pnpm --filter`, relative
  paths, or `git -C <relative-or-sibling-path>` (avoid
  absolute paths in `git -C`/`pnpm --dir` wrappers)

## Git Workflow

### Commits

- Always use `-s` flag for sign-off
- Write clear messages describing actual changes
- No AI advertising in commit messages
- Focus on the final result, not the iterations

### Direct Commits (MANDATORY)

ALWAYS list files explicitly in the commit command.
Use `git add` only for new/untracked files, then pass
all files (new and modified) to `git commit`.

```bash
git add src/new-file.ts
git commit -sF .tmp/commit-<slug>.txt -- src/new-file.ts src/changed.ts
```

Temporary files use `.tmp/` with a shared prefix:

- Commit messages: `.tmp/commit-<slug>.txt`
- PR descriptions: `.tmp/pr-<slug>.md`

### Commit Message Guidelines

- First line: type(scope): brief description (50 chars)
- Blank line
- Body: what and why, not how (wrap at 72 chars)
- Use bullet points for multiple changes
- Reference issues/PRs when relevant

## TypeScript Configuration

Each package has multiple tsconfig files:

- `tsconfig.json` — source code (kept free of
  Node-specific wiring by convention)
- `tsconfig.tools.json` — adds Node types for
  `build.config.ts`, `vitest.config.ts`
- `tsconfig.tests.json` — test files and compile-time
  type assertions

The root `tsconfig.json` provides shared compiler
options (ESNext, bundler resolution, strict mode).

<!-- cspell:words workerd -->
## Testing

- All packages use Vitest
- build-tsdoc runs in Node.js (no browser or workerd
  pool); vue-tsdoc runs under the jsdom environment so
  its components mount against a DOM
- Test files: `*.test.ts` under `src/__tests__/`;
  vue-tsdoc also co-locates per-component specs as
  `*.spec.ts` under `src/components/__tests__/`
- `@kagal/cross-test` (external dep) provides the
  conditional stub helper for `prepare` scripts

## Build

- **unbuild** (`@kagal/build-tsdoc`); `@kagal/model-tsdoc`
  and `@kagal/vue-tsdoc` build through **obuild**. ESM +
  DTS either way; unbuild emits sourcemaps, obuild's
  sourcemaps await proper integration (the naive
  `sourcemap` toggle ships a dangling declaration-map
  pointer).
- `build.config.ts` defines entry points
- `prepare` script: `cross-test -s dist/index.mjs ||
  pnpm dev:prepare` (conditional stubbing)
- `dev:prepare`: `unbuild --stub` / `obuild --stub`
  (unconditional)
- Every package dogfoods the extraction hooks: its
  `build.config.ts` spreads `newUnbuildHooks()` or
  `newOBuildHooks()` into its `hooks`, so every build
  produces `dist/<entry>.api.json` alongside the
  bundle. In `@kagal/build-tsdoc` itself the config
  imports from `./src/index` — jiti resolves TS
  sources at config-load time, and the stub guard
  short-circuits the hook so `dev:prepare` never needs
  a built dist.

## Publishing

npm packages are published via GitHub Actions using
npm's OIDC trusted publishing with `--provenance`.
No tokens stored as secrets.

1. Push a per-package tag in the standard npm form
   `@scope/name@version` (e.g.
   `@kagal/build-tsdoc@0.1.0`) to trigger
   `publish.yml`. The tag name is matched by
   `@*/*@[0-9]*`.
2. GitHub Actions authenticates to npm via OIDC
3. The workflow extracts the package name from the
   tag and runs
   `pnpm --filter <name> publish:maybe`, which
   publishes the package only if `$name@$version`
   is not yet on npm
4. Independent package tags release concurrently —
   the workflow's concurrency group is per-ref, so
   one package's release does not queue behind
   another
5. `pkg-pr-new` provides preview publishes on
   non-tag pushes

<!-- cspell:words npmjs -->
### Setup (per package on npmjs.com)

Each `@kagal/*` package must be configured as a
trusted publisher on npmjs.com:

- **Repository**: `kagal-dev/tsdoc`
- **Workflow**: `publish.yml`
- **Environment**: (none)

## Sibling Repositories

This repo has siblings under the same org:

- **kagal-dev/pki** — monorepo hosting `@kagal/acme`
  (ACME protocol, RFC 8555) and `@kagal/ca` (private
  CA engine for Cloudflare Workers).
- **kagal-dev/kagal** — agent fleet management library
  for Cloudflare's edge.
- **kagal-dev/cross-test** — `@kagal/cross-test`:
  cross-platform shell conditions and file tests for
  npm scripts.
- **kagal-dev/json-template** — `@kagal/json-template`:
  JSON template engine with shell-style
  `${var:-default}` substitution.

Conventions (commit style, tooling, CI patterns) stay
consistent across all `kagal-dev/*` repos.
