// Dependency-isolation guard for the `@kagal/build-tsdoc/utils`
// entry. The whole point of the subpath is that a consumer can read
// and serialise manifests without dragging api-extractor — and its
// bundled TypeScript compiler — into the bundle graph. These tests
// read the *built* artifacts and fail if that contract slips: e.g.
// someone re-exports through utils.ts something that transitively
// reaches extract.ts, or imports the heavy `@microsoft/api-extractor`
// where only the lightweight `-model` belongs.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(HERE, '../..', 'dist');
const UTILS_MJS = path.join(DIST, 'utils.mjs');
const UTILS_DTS = path.join(DIST, 'utils.d.mts');

// `@microsoft/api-extractor` is a string prefix of
// `@microsoft/api-extractor-model`, so the closing quote is
// load-bearing: it matches the bare heavy package but not the
// allowed `-model` import.
const HEAVY = /['"]@microsoft\/api-extractor['"]/;
const MODEL = /['"]@microsoft\/api-extractor-model['"]/;

describe('utils: dependency isolation', () => {
  beforeAll(() => {
    for (const f of [UTILS_MJS, UTILS_DTS]) {
      if (!existsSync(f)) {
        throw new Error(
          'Run `pnpm --filter @kagal/build-tsdoc build` before ' +
          `tests; ${f} is missing.`,
        );
      }
    }
  });

  it('keeps api-extractor out of the runtime bundle', () => {
    const source = readFileSync(UTILS_MJS, 'utf8');
    // loadPackage's one allowed heavyweight dependency must still be
    // there — a refactor that drops or stubs it should fail loudly.
    expect(source).toMatch(MODEL);
    expect(source).not.toMatch(HEAVY);
  });

  it('keeps api-extractor out of the declarations', () => {
    const source = readFileSync(UTILS_DTS, 'utf8');
    expect(source).not.toMatch(HEAVY);
  });
});
