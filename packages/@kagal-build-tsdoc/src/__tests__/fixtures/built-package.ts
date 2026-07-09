// The built `@kagal/build-tsdoc` package: its root, the `dist`
// locations that suites extract or read against, and a guard that the
// build has run — so a forgotten build surfaces as an actionable
// message rather than a downstream failure.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** The `@kagal/build-tsdoc` package root. */
export const PKG_DIR = path.resolve(HERE, '../../..');

/** The package's built `dist` directory. */
export const DIST = path.join(PKG_DIR, 'dist');

/** The package's built ESM entry declaration. */
export const DIST_ENTRY = path.join(DIST, 'index.d.mts');

/**
 * Throw an actionable "build first" error if any of the given built
 * artefacts is absent, so a forgotten build fails loudly instead of
 * resurfacing as a downstream error.
 */
export function assertBuilt(...artefacts: string[]): void {
  for (const artefact of artefacts) {
    if (!existsSync(artefact)) {
      throw new Error(
        'Run `pnpm --filter @kagal/build-tsdoc build` before tests; ' +
        `${artefact} is missing.`,
      );
    }
  }
}

/** Guard that the package's own index declaration is built. */
export function assertPackageBuilt(): void {
  assertBuilt(DIST_ENTRY);
}
