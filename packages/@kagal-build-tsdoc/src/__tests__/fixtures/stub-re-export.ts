// Shared fixture for the consumer-compiler tests: `writeSymbolProbe`
// writes a package exporting one plain declaration, and
// `CONSUMER_TS_ROOT` is the consumer TypeScript install the probes
// resolve against. `CONSUMER_TS_VERSION` / `BUNDLED_TS_VERSION` expose
// the two engines and `assertDistinctCompilers` pins the premise that
// they differ. A probe optionally symlinks its own
// `node_modules/typescript` at that root so the helper under test
// resolves a genuinely different compiler as the consumer's. Each
// consumer-compiler test lives in its own file because the analysis
// engine is fixed at the first api-extractor load in a process.
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
