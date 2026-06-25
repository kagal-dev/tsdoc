import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { extractEntryManifest } from '../extract';
import { loadPackage } from '../utils';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG_DIR = path.resolve(HERE, '../..');
const DIST_ENTRY = path.join(PKG_DIR, 'dist', 'index.d.mts');

describe('utils: loadPackage', () => {
  let workDir: string;

  beforeAll(() => {
    if (!existsSync(DIST_ENTRY)) {
      throw new Error(
        'Run `pnpm --filter @kagal/build-tsdoc build` before tests; ' +
        `${DIST_ENTRY} is missing.`,
      );
    }
  });

  beforeEach(() => {
    workDir = mkdtempSync(path.join(tmpdir(), 'build-tsdoc-utils-'));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('rehydrates a manifest extractEntryManifest wrote', () => {
    // round-trip the public surface: the root entry's
    // extractEntryManifest writes the wire format, the /utils
    // entry's loadPackage reads it back into the model graph — so a
    // consumer never reaches for @microsoft/api-extractor-model.
    const outputPath = path.join(workDir, 'index.api.json');
    extractEntryManifest({ projectFolder: PKG_DIR, outputPath });

    const apiPackage = loadPackage(outputPath);
    expect(apiPackage.displayName).toBe('@kagal/build-tsdoc');

    const exported = apiPackage.entryPoints
      .flatMap((ep) => ep.members)
      .map((m) => m.displayName);
    expect(exported).toContain('extractEntryManifest');
  });

  it('throws when the manifest file is missing', () => {
    expect(() => loadPackage(path.join(workDir, 'absent.api.json')))
      .toThrow();
  });
});
