// Shared fixtures for the consumer-compiler tests: two probe shapes,
// the consumer TypeScript root they resolve against, and the
// compiler-version constants both engine-selection suites rest on.
// The probe shapes:
//
//   writeSymbolProbe        — a package exporting one plain
//                             declaration; the baseline that extracts
//                             cleanly on either engine.
//   writeStubReExportProbe  — a package whose entry re-exports a
//                             symbol from a dependency shipping only a
//                             jiti *stub* (`export * from
//                             '../src/index.ts'`), so api-extractor
//                             follows the re-export into raw source.
//
// CONSUMER_TS_VERSION and BUNDLED_TS_VERSION expose the two engines,
// and assertDistinctCompilers pins the premise that they differ.
//
// The bundled- and consumer-compiler tests live in separate files
// because the analysis engine is fixed at the first api-extractor
// load in a process.
import {
  mkdirSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { expect } from 'vitest';

import { PKG_DIR } from './built-package';

const REPO_ROOT = path.resolve(PKG_DIR, '../..');

const CONSUMER_TS_PATH = path.join(
  REPO_ROOT, 'examples', 'playground-ts6', 'node_modules', 'typescript',
);

/**
 * The workspace's TypeScript 6.x install, reached through the
 * example that pins it (its `node_modules/typescript` resolves
 * there). A probe symlinks its own `node_modules/typescript` to
 * this path so the helper resolves a genuinely different compiler
 * as the consumer's.
 */
export const CONSUMER_TS_ROOT = resolveConsumerTSRoot();

/**
 * Resolve {@link CONSUMER_TS_PATH} to its canonical location,
 * turning a missing playground install into an actionable error
 * instead of a bare `ENOENT` when this fixture is imported.
 */
function resolveConsumerTSRoot(): string {
  try {
    return realpathSync(CONSUMER_TS_PATH);
  } catch (error) {
    throw new Error(
      `Consumer TypeScript not found at ${CONSUMER_TS_PATH}; run ` +
      '`pnpm install` so examples/playground-ts6 is installed before ' +
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

/**
 * Write the stub-re-export probe into {@link workDir} and return
 * the manifest output path. When {@link consumerTsRoot} is given,
 * the probe gets a `node_modules/typescript` symlink to it, so the
 * helper resolves that compiler as the consumer's.
 */
export function writeStubReExportProbe(
  workDir: string,
  consumerTsRoot?: string,
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
      types: './dist/index.d.mts',
    }),
  );
  // the jiti stub: a declaration file re-exporting raw source
  writeFileSync(
    path.join(depDir, 'dist', 'index.d.mts'),
    'export * from \'../src/index.ts\';\n',
  );
  // an exported function whose body unpacks an array into a local
  // binding (`const [selector, b64Key] = parts`) — the shape
  // of the dependency function that aborted the original publish,
  // which api-extractor cannot determine semantic information for
  // when followed into source.
  writeFileSync(
    path.join(depDir, 'src', 'index.ts'),
    '/** Parse a "selector:base64" secret into its joined parts. */\n' +
    'export const parseSecret = (secret: string): string => {\n' +
    '  const parts = secret.split(\':\');\n' +
    '  const [selector, b64Key] = parts;\n' +
    '  if (!selector || !b64Key) {\n' +
    '    return \'\';\n' +
    '  }\n' +
    '  return selector + b64Key;\n' +
    '};\n',
  );

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
