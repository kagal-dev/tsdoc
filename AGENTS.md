# AGENTS.md

This file provides guidance to AI coding assistants
(Claude Code, GitHub Copilot, Cody, etc.) when working
with code in the `kagal-dev/tsdoc` monorepo.

## Project Overview

This monorepo contains two MIT-licensed TypeScript
packages for extracting and consuming TSDoc
documentation:

- **`@kagal/build-tsdoc`** — TSDoc extraction hook for
  unbuild. Writes per-export JSON plus a unified
  `api.json` manifest to `_docs/` at package build
  time.
- **`@kagal/nuxt-tsdoc`** — Nuxt module for consuming
  `api.json` manifests in Nuxt applications.

The packages form a strict one-way pipeline:

```text
package source (*.ts)
      │ extracted by
      ▼
@kagal/build-tsdoc (unbuild hook) → _docs/api.json
      │ consumed by
      ▼
@kagal/nuxt-tsdoc (Nuxt module) → Nuxt app
```

`@kagal/build-tsdoc` has no runtime knowledge of Nuxt.
`@kagal/nuxt-tsdoc` depends on `@kagal/build-tsdoc` only
for shared types.

## Monorepo Structure

```text
tsdoc/
├── packages/
│   ├── @kagal-build-tsdoc/    # @kagal/build-tsdoc
│   │   └── src/
│   │       ├── index.ts       # newDocumentsHook(), VERSION
│   │       ├── types.ts       # Manifest types, DocEntry re-export
│   │       ├── extract.ts     # Symbol extraction logic
│   │       └── write.ts       # JSON output and logging
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
pnpm dev:prepare        # Stub all packages (unbuild --stub)
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
pnpm --filter @kagal/nuxt-tsdoc test
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

- `tsconfig.json` — source code (no Node types)
- `tsconfig.tools.json` — adds Node types for
  `build.config.ts`, `vitest.config.ts`
- `tsconfig.tests.json` — test files and compile-time
  type assertions

The root `tsconfig.json` provides shared compiler
options (ESNext, bundler resolution, strict mode).

## Testing

- All packages use Vitest
- Tests run in Node.js (no browser or workerd pool)
- Test files: `*.test.ts` under `src/__tests__/`
- `@kagal/cross-test` (external dep) provides the
  conditional stub helper for `prepare` scripts

## Build

- **unbuild** for all packages (ESM + DTS, sourcemaps)
- `build.config.ts` defines entry points
- `prepare` script: `cross-test -s dist/index.mjs ||
  unbuild --stub` (conditional stubbing)
- `dev:prepare`: `unbuild --stub` (unconditional)

## Publishing

npm packages are published via GitHub Actions using
npm's OIDC trusted publishing with `--provenance`.
No tokens stored as secrets.

1. Push a version tag matching `v[0-9]*` or
   `**/v[0-9]*` (per-package tags) to trigger
   `publish.yml`
2. GitHub Actions authenticates to npm via OIDC
3. `pnpm -r publish:maybe` checks each package —
   publishes only if `$name@$version` is not yet on npm
4. `pkg-pr-new` provides preview publishes on non-tag
   pushes

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
  CA engine for Cloudflare Workers). `@kagal/build-tsdoc`
  was extracted from this repo.
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
