<!-- cspell:words unbuild rollup -->
# playground-ts6

The smallest consumer that builds a declaration bundle under
`typescript@^6` and runs `@kagal/build-tsdoc` extraction over it —
a working example on the unbuild toolchain and the last JS-based
TypeScript compiler. Everything is wired end to end: the build
emits declarations, the extraction hook turns them into an
api-extractor manifest, and lint and type-check pass. It is the
reference the native-compiler transition is measured against — the
point where the classic `import 'typescript'` toolchain still holds
together.

6.0 is the last JS-based line: its main export is still the classic
compiler namespace, so `rollup-plugin-dts`, `typescript-eslint`,
and api-extractor all load against it unchanged. The native port
that follows — TypeScript 7 — moves that surface behind a version
stub and breaks each of those in turn; characterising that break is
a separate exercise.

## The engine swap it exercises

api-extractor bundles its own TypeScript — a 5.9.x pin from the
terminal JS era — and, left alone, analyses a package's
declarations with that compiler, printing a version-mismatch notice
when the consumer built on something newer. `@kagal/build-tsdoc`
aliases the consumer's installed `typescript` into api-extractor's
module cache before analysis, so the `.d.ts` is parsed by the same
compiler that emitted it. Here that is TypeScript 6.0.3: the build
log reads "Analysis will use the bundled TypeScript version 6.0.3",
not the bundled 5.9.3. This example is where that swap runs against
a real consumer compiler that genuinely differs from the bundled
one.

## The unbuild toolchain

unbuild rolls declarations through `rollup-plugin-dts`, which
imports `typescript` and reads `ts.sys` at module load — fine on
the 6.x line, where the classic namespace is still the main export.
`declaration: true` emits `dist/index.d.mts` with TSDoc preserved,
`newUnbuildHooks()` from `@kagal/build-tsdoc` adds a `build:done`
hook that runs extraction per entry, and `@poupe/eslint-config`
lints cleanly because `typescript-eslint` resolves its compiler
internals off a real TS6 install. So the package keeps the full
working script set:

- `build` (`unbuild`) emits `dist/index.mjs`, `dist/index.d.mts`,
  and `dist/index.api.json` — the extraction manifest.
- `dev:prepare` (`unbuild --stub`) writes a re-export stub pointing
  `dist` back at the source; the stub build skips extraction.
- `lint` (`eslint`) and `type-check` (both `tsconfig.json` and
  `tsconfig.tools.json`) pass clean; `tsc --version` reports
  `6.0.3`.

## Toolchain snapshot

Captured against `typescript@6.0.3`, `unbuild@3.6.1`, on Node 24.
Nothing here needs a workaround: this is the toolchain generation
`@kagal/build-tsdoc` was built for, running end to end on the last
compiler that still ships the classic programmatic API. When the
native compiler becomes the only one installed, this whole path has
to be re-characterised against it — re-run the scripts above to see
where the picture stands.
