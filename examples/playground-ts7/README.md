<!-- cspell:words unbuild obuild oxc rolldown rushstack -->
# playground-ts7

The smallest consumer that builds a declaration bundle under
`typescript@^7` — a working TypeScript 7 example on the obuild +
oxc toolchain, kept as the fixture the `@kagal/build-tsdoc`
integration will later sit on. Right now it stands on its own: it
builds, stubs, and type-checks with no `@kagal/build-tsdoc`
integration wired in, so the toolchain baseline is established
before the integration work begins.

Its sibling `playground-ts6` is the same surface on unbuild and the
last JS-based compiler (6.x); this package is the TS7 counterpart,
proving which parts of the declaration toolchain survive the move to
the native compiler and which do not.

## The one cause

TypeScript 7's main export is a version stub (`lib/version.cjs`),
not the compiler — the programmatic surface moved to a separate,
explicitly `./unstable/*` export family that bridges to the native
binary. So any tool that does `import ... from 'typescript'` and
uses it as a library receives a stub where it expected the classic
compiler namespace, and reaches for a property that isn't there.
Everything below follows from that single fact.

## Why obuild + oxc builds where unbuild does not

unbuild rolls declarations through `rollup-plugin-dts`, which reads
`ts.sys` at module load — `undefined` on the stub, an immediate
crash. obuild rolls through `rolldown-plugin-dts`, which offers an
**oxc** generator: a Rust implementation of isolated declarations
that never imports `typescript`. Setting `isolatedDeclarations: true`
in `tsconfig.json` selects that generator, and the declaration
bundle (`dist/index.d.mts`, TSDoc preserved) is emitted without ever
touching the stub.

The flag is load-bearing: obuild pins `rolldown-plugin-dts@^0.26.0`,
whose default generator is the `tsc` one — it imports `typescript`
and dies on the stub the same way unbuild does.
`isolatedDeclarations` is what routes around it, at the cost of
requiring every exported symbol to carry an inferable type (which
this source already does).

So the package keeps the full working script set:

- `build` (`obuild`) emits `dist/index.mjs` and `dist/index.d.mts`.
- `dev:prepare` (`obuild --stub`) writes a re-export stub pointing
  `dist` back at the source.
- `type-check` (both `tsconfig.json` and `tsconfig.tools.json`)
  passes clean; `tsc --version` reports `7.0.2`, the native
  Go-based compiler.

## What is deliberately absent

**No `@kagal/build-tsdoc` integration.** Wiring in the extraction
hook belongs to the integration milestone, not here. This example
first proves the plain obuild + oxc path is green under TS7; the
integration then builds on that baseline.

**No `eslint`.** `@poupe/eslint-config` pulls in `typescript-eslint`,
whose `ts-api-utils` reads a compiler-internal enum off the imported
`typescript` while the config loads:

```text
ts-api-utils/lib/index.cjs:787
TypeError: Cannot read properties of undefined (reading 'Intrinsic')
```

Same stub, a different missing property — and it fires before any
file is checked, so there is no lint configuration that survives it.
The lint scripts are therefore omitted rather than left to crash;
`pnpm -r lint` skips this package and the repo-wide gate stays green.

## The peer-level picture

Installing `typescript@7` surfaces the wall at the manifest level
too — the toolchain generation this example draws on caps its
`typescript` peer below 7:

- `obuild > rolldown-plugin-dts`: `^5.0.0 || ^6.0.0` (the one
  warning this package still draws — the oxc path sidesteps the
  library import, but the peer range is declared regardless).
- `@poupe/eslint-config` and the `@typescript-eslint/*` stack:
  `>=4.8.4 <6.1.0` — the reason eslint is absent above.

## Toolchain snapshot

Captured against `typescript@7.0.2`, `obuild@0.4.37`,
`rolldown-plugin-dts@0.26.0`, on Node 24. TS7 is the native compiler
port; the JS-based programmatic API the classic tooling is built on
ends at the stable 6.0 line. When upstream (`rolldown-plugin-dts`'s
`tsgo` generator, rushstack's native-API work) runs against the
native compiler, this picture moves — re-run the scripts above to
re-characterise it.
