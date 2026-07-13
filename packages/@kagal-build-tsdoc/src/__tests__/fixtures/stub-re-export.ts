// cspell:words taistamp
// Shared fixtures for the consumer-compiler tests: the probe
// shapes, the consumer TypeScript roots they resolve against, and
// the compiler-version constants the engine-selection suites rest
// on. The probe shapes:
//
//   writeSymbolProbe    — a package exporting one plain
//                         declaration; the baseline that extracts
//                         cleanly on either engine.
//   write*ReExportProbe — a package whose entry re-exports a
//                         symbol from a dependency, in the variant
//                         each factory names: the dependency left
//                         as a development stub re-exporting raw
//                         source (jiti-era `.ts` specifier, modern
//                         `.js`-mapped specifier, `types` aimed
//                         straight at source, or source that does
//                         not parse) or genuinely built.
//
// CONSUMER_TS_VERSION and BUNDLED_TS_VERSION expose the two engines,
// and assertDistinctCompilers pins the premise that they differ;
// CONSUMER_TS7_ROOT / CONSUMER_TS7_VERSION add the TS7 stub the gate
// declines to alias, falling back to the bundled engine.
//
// The bundled- and consumer-compiler tests live in separate files
// because the analysis engine is fixed at the first api-extractor
// load in a process.
import {
  mkdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { expect } from 'vitest';

import { PKG_DIR } from './built-package';

const REPO_ROOT = path.resolve(PKG_DIR, '../..');

/**
 * The workspace's TypeScript 6.x install, reached through the
 * example that pins it (its `node_modules/typescript` resolves
 * there). A probe symlinks its own `node_modules/typescript` to
 * this path so the helper resolves a genuinely different compiler
 * as the consumer's.
 */
export const CONSUMER_TS_ROOT = resolveExampleTSRoot('playground-ts6');

/**
 * The workspace's TypeScript 7.x install, reached through
 * `examples/playground-ts7`. Its main export is a version stub, not
 * the classic compiler, so a probe pointing here is what the engine
 * gate must decline to alias — falling back to the bundled compiler.
 */
export const CONSUMER_TS7_ROOT = resolveExampleTSRoot('playground-ts7');

/**
 * Resolve the `typescript` install pinned by the named example to
 * its canonical location, turning a missing playground install into
 * an actionable error instead of a bare `ENOENT` when this fixture
 * is imported.
 */
function resolveExampleTSRoot(example: string): string {
  const tsPath = path.join(
    REPO_ROOT, 'examples', example, 'node_modules', 'typescript',
  );
  try {
    return realpathSync(tsPath);
  } catch (error) {
    throw new Error(
      `Consumer TypeScript not found at ${tsPath}; run ` +
      `\`pnpm install\` so examples/${example} is installed before ` +
      'running these tests.',
      { cause: error },
    );
  }
}

const require_ = createRequire(import.meta.url);

/**
 * The consumer compiler the engine-selection suites analyse with:
 * the workspace example pins TypeScript 6.x, and {@link
 * CONSUMER_TS_ROOT} resolves there.
 */
export const CONSUMER_TS_VERSION =
  (require_(path.join(CONSUMER_TS_ROOT, 'package.json')) as {
    version: string
  }).version;

/**
 * The TypeScript 7.x version the ts7 example pins, read from {@link
 * CONSUMER_TS7_ROOT}. The gate reads the same field to decide the
 * install is outside the adoptable range and must not be aliased.
 */
export const CONSUMER_TS7_VERSION =
  (require_(path.join(CONSUMER_TS7_ROOT, 'package.json')) as {
    version: string
  }).version;

/**
 * api-extractor's own pinned compiler entry — the module-cache slot
 * the swap in extract.ts aliases onto the consumer's install.
 */
export const BUNDLED_TS_ENTRY = createRequire(
  require_.resolve('@microsoft/api-extractor'),
).resolve('typescript');

/**
 * The version api-extractor bundles, read from {@link
 * BUNDLED_TS_ENTRY}.
 */
export const BUNDLED_TS_VERSION =
  (require_(BUNDLED_TS_ENTRY) as { version: string }).version;

/**
 * Assert the consumer compiler genuinely differs from
 * api-extractor's pin — the premise both engine-selection suites
 * rest on. If the two ever converge the alias is a no-op and the
 * suites prove nothing, so fail loudly.
 */
export function assertDistinctCompilers(): void {
  expect(CONSUMER_TS_VERSION).not.toBe(BUNDLED_TS_VERSION);
}

/**
 * Symlink {@link workDir}'s `node_modules/typescript` at
 * {@link consumerTsRoot}, so the helper under test resolves that
 * install as the consumer's compiler.
 */
function linkConsumerTypeScript(
  workDir: string,
  consumerTsRoot: string,
): void {
  mkdirSync(path.join(workDir, 'node_modules'), { recursive: true });
  symlinkSync(
    consumerTsRoot,
    path.join(workDir, 'node_modules', 'typescript'),
    'junction',
  );
}

/**
 * Write a single-declaration probe package (`@kagal/probe`) into
 * {@link dir} whose entry is {@link declaration}. When
 * {@link consumerTsRoot} is given, symlink the probe's
 * `node_modules/typescript` to it so the helper resolves that
 * compiler as the consumer's.
 */
export function writeSymbolProbe(
  dir: string,
  declaration: string,
  consumerTsRoot?: string,
): void {
  if (consumerTsRoot !== undefined) {
    linkConsumerTypeScript(dir, consumerTsRoot);
  }
  writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: '@kagal/probe', version: '0.0.0' }),
  );
  writeFileSync(
    path.join(dir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
      },
    }),
  );
  mkdirSync(path.join(dir, 'dist'));
  writeFileSync(path.join(dir, 'dist', 'index.d.mts'), declaration);
}

// An exported function whose body unpacks an array into a local
// binding (`const [selector, b64Key] = parts`) — the shape of the
// dependency function that aborted the original taistamp publish
// when api-extractor followed the stub into raw source.
const PARSE_SECRET_SOURCE =
  '/** Parse a "selector:base64" secret into its joined parts. */\n' +
  'export const parseSecret = (secret: string): string => {\n' +
  '  const parts = secret.split(\':\');\n' +
  '  const [selector, b64Key] = parts;\n' +
  '  if (!selector || !b64Key) {\n' +
  '    return \'\';\n' +
  '  }\n' +
  '  return selector + b64Key;\n' +
  '};\n';

// The same symbol as a built declaration, for the built-dependency
// baseline — what the redirect derives from the source above.
const PARSE_SECRET_DECLARATION =
  '/** Parse a "selector:base64" secret into its joined parts. */\n' +
  'export declare const parseSecret: (secret: string) => string;\n';

/** The dependency's files a re-export probe variant writes. */
interface ReExportDepFiles {
  /** `src/index.ts` content; omitted for a built dependency. */
  source?: string
  /**
   * `compilerOptions` of the dependency's own `tsconfig.json`. When
   * given, the redirect derives declarations under it — the way the
   * dependency would compile itself. Omitted for a dependency with
   * no tsconfig.
   */
  tsconfigOptions?: Record<string, unknown>
  /**
   * Raw `tsconfig.json` text, for shapes
   * {@link ReExportDepFiles.tsconfigOptions} cannot express — a
   * malformed config the compiler reports rather than parses.
   * Takes precedence when both are given.
   */
  tsconfigText?: string
  /**
   * `dist/index.d.mts` content — a stub or a built declaration.
   * Omitted when {@link ReExportDepFiles.typesEntry} points
   * elsewhere.
   */
  types?: string
  /**
   * The manifest's `types` value.
   *
   * @defaultValue `'./dist/index.d.mts'`
   */
  typesEntry?: string
}

/**
 * Write a probe whose entry re-exports `parseSecret` from a
 * `probe-dep` dependency shaped by {@link dep}, returning the
 * manifest output path. When {@link consumerTsRoot} is given, the
 * probe gets a `node_modules/typescript` symlink to it, so the
 * helper resolves that compiler as the consumer's.
 */
function writeReExportProbe(
  workDir: string,
  consumerTsRoot: string | undefined,
  dep: ReExportDepFiles,
): string {
  if (consumerTsRoot !== undefined) {
    linkConsumerTypeScript(workDir, consumerTsRoot);
  }

  const depDir = path.join(workDir, 'node_modules', 'probe-dep');
  mkdirSync(path.join(depDir, 'dist'), { recursive: true });
  mkdirSync(path.join(depDir, 'src'), { recursive: true });
  writeFileSync(
    path.join(depDir, 'package.json'),
    JSON.stringify({
      name: 'probe-dep',
      version: '1.0.0',
      types: dep.typesEntry ?? './dist/index.d.mts',
    }),
  );
  if (dep.tsconfigText !== undefined) {
    writeFileSync(path.join(depDir, 'tsconfig.json'), dep.tsconfigText);
  } else if (dep.tsconfigOptions !== undefined) {
    writeFileSync(
      path.join(depDir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: dep.tsconfigOptions }),
    );
  }
  if (dep.types !== undefined) {
    writeFileSync(path.join(depDir, 'dist', 'index.d.mts'), dep.types);
  }
  if (dep.source !== undefined) {
    writeFileSync(path.join(depDir, 'src', 'index.ts'), dep.source);
  }

  mkdirSync(path.join(workDir, 'dist'));
  writeFileSync(
    path.join(workDir, 'dist', 'index.d.mts'),
    'export { parseSecret } from \'probe-dep\';\n',
  );
  writeFileSync(
    path.join(workDir, 'package.json'),
    JSON.stringify({
      name: '@kagal/main',
      version: '0.0.0',
      dependencies: { 'probe-dep': '1.0.0' },
    }),
  );
  writeFileSync(
    path.join(workDir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        module: 'ESNext',
        moduleResolution: 'Bundler',
        allowImportingTsExtensions: true,
        strict: true,
      },
    }),
  );
  return path.join(workDir, 'index.api.json');
}

/**
 * The jiti-era stub: a declaration re-exporting raw source by its
 * literal `.ts` extension — the shape that aborted the original
 * taistamp publish, now redirected onto derived declarations.
 */
export function writeStubReExportProbe(
  workDir: string,
  consumerTsRoot?: string,
): string {
  return writeReExportProbe(workDir, consumerTsRoot, {
    source: PARSE_SECRET_SOURCE,
    types: 'export * from \'../src/index.ts\';\n',
  });
}

/**
 * The modern unbuild stub: the source specifier is written with a
 * `.js` extension (`unbuild --stub` maps `.ts` → `.js`), so only
 * compiler resolution — not specifier pattern-matching — reveals
 * that it lands on raw source.
 */
export function writeModernStubReExportProbe(
  workDir: string,
  consumerTsRoot?: string,
): string {
  return writeReExportProbe(workDir, consumerTsRoot, {
    source: PARSE_SECRET_SOURCE,
    types: 'export * from \'../src/index.js\';\n',
  });
}

/**
 * A jiti-era stub whose dependency carries a tsconfig setting
 * `declarationDir` — the emit knob that, left in place, would divert
 * the derived declarations away from the mirror. The redirect must
 * clear it so derivation still lands under the mirror and the symbol
 * is documented.
 */
export function writeDeclarationDirStubReExportProbe(
  workDir: string,
  consumerTsRoot?: string,
): string {
  return writeReExportProbe(workDir, consumerTsRoot, {
    source: PARSE_SECRET_SOURCE,
    tsconfigOptions: {
      module: 'ESNext',
      moduleResolution: 'Bundler',
      declaration: true,
      declarationDir: './types',
    },
    types: 'export * from \'../src/index.ts\';\n',
  });
}

/**
 * A jiti-era stub whose dependency carries a *malformed* tsconfig.
 * `ts.readConfigFile` reports it through `error` while still
 * returning a `{}` config, so the dependency's options fall back to
 * bare — derivation proceeds on the forced emit overrides alone and
 * the symbol is still documented.
 */
export function writeMalformedTsconfigStubReExportProbe(
  workDir: string,
  consumerTsRoot?: string,
): string {
  return writeReExportProbe(workDir, consumerTsRoot, {
    source: PARSE_SECRET_SOURCE,
    // a truncated object — valid UTF-8, invalid JSON
    tsconfigText: '{ "compilerOptions": {\n',
    types: 'export * from \'../src/index.ts\';\n',
  });
}

/**
 * A stub whose source does not parse: the arm where declarations
 * cannot be derived and the redirect gives way to the actionable
 * `UnbuiltDependencyError`.
 */
export function writeBrokenStubReExportProbe(
  workDir: string,
  consumerTsRoot?: string,
): string {
  return writeReExportProbe(workDir, consumerTsRoot, {
    // a truncated declaration — nothing after the arrow
    source: 'export const parseSecret = (secret: string): string =>\n',
    types: 'export * from \'../src/index.ts\';\n',
  });
}

/**
 * A dependency whose `types` aims straight at raw source, with no
 * stub declaration in between — the whole entry is the derivation
 * target.
 */
export function writeSourceTypesReExportProbe(
  workDir: string,
  consumerTsRoot?: string,
): string {
  return writeReExportProbe(workDir, consumerTsRoot, {
    source: PARSE_SECRET_SOURCE,
    typesEntry: './src/index.ts',
  });
}

/**
 * The built dependency: real declarations, no source in sight —
 * the redirect's pass path, extracting with nothing rewritten.
 */
export function writeBuiltReExportProbe(
  workDir: string,
  consumerTsRoot?: string,
): string {
  return writeReExportProbe(workDir, consumerTsRoot, {
    types: PARSE_SECRET_DECLARATION,
  });
}

/**
 * Entry-point members of a written manifest, name → docComment,
 * so rows assert both the documented symbol and its preserved
 * TSDoc without dragging api-extractor-model in.
 */
export function readEntryPointMembers(
  outputPath: string,
): Map<string, string> {
  const root = JSON.parse(readFileSync(outputPath, 'utf8')) as {
    members?: { members?: { docComment?: string; name?: string }[] }[]
  };
  const members = new Map<string, string>();
  for (const member of root.members?.[0]?.members ?? []) {
    if (member.name !== undefined) {
      members.set(member.name, member.docComment ?? '');
    }
  }
  return members;
}
