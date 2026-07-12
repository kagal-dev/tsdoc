// Regression for the engine gate: a consumer on TypeScript 7 must
// NOT have its compiler aliased into api-extractor's cache. TS7's
// main export is a version stub, not the classic compiler, so the
// gate declines it and extraction falls back to the bundled engine.
// The mirror of consumer-typescript.test.ts — same probe, opposite
// cache outcome: the bundled slot is left untouched. Own worker
// file: the engine is fixed at the first api-extractor load, so a
// TS7 row here cannot poison, or be poisoned by, the ts6 alias.
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ApiPackage } from '@microsoft/api-extractor-model';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { extractEntryManifest } from '../extract';
import {
  BUNDLED_TS_ENTRY,
  BUNDLED_TS_VERSION,
  CONSUMER_TS7_ROOT,
  CONSUMER_TS7_VERSION,
  writeSymbolProbe,
} from './fixtures/stub-re-export';

const require_ = createRequire(import.meta.url);

describe('consumer TypeScript 7 gate', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = mkdtempSync(path.join(tmpdir(), 'build-tsdoc-ts7-'));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('keeps the bundled compiler, not the TS7 stub', () => {
    // premise: the probe resolves a genuine TS7 install, whose
    // version is outside the adoptable range and differs from the
    // bundled pin — so a swap, had it fired, would be observable.
    expect(CONSUMER_TS7_VERSION.startsWith('7.')).toBe(true);
    expect(CONSUMER_TS7_VERSION).not.toBe(BUNDLED_TS_VERSION);

    // a probe whose node_modules/typescript points at the TS7
    // install, mirroring how a real TS7 consumer resolves it
    writeSymbolProbe(
      workDir,
      '/** Marker symbol. */\nexport declare const flag: boolean;\n',
      CONSUMER_TS7_ROOT,
    );

    const outputPath = path.join(workDir, 'index.api.json');
    const result = extractEntryManifest({
      projectFolder: workDir,
      outputPath,
    });

    // extraction still succeeds — on the bundled engine, over the
    // probe's built declaration
    expect(result).toBeDefined();
    expect(existsSync(outputPath)).toBe(true);

    const apiPackage = ApiPackage.loadFromJsonFile(outputPath);
    const members = apiPackage.entryPoints
      .flatMap((ep) => ep.members)
      .map((m) => m.displayName);
    expect(members).toContain('flag');

    // the gate held: api-extractor's typescript cache slot still
    // holds its pinned compiler, not the consumer's TS7 stub
    const slot = require_.cache[BUNDLED_TS_ENTRY];
    expect((slot?.exports as undefined | { version?: string })?.version)
      .toBe(BUNDLED_TS_VERSION);
  });
});
