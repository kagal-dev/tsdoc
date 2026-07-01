// Discovery + regression test for the consumer-TypeScript path:
// api-extractor pins one compiler, but extraction must run on
// whatever TypeScript the *consumer* installed. The alias is primed
// in the shared module cache before api-extractor first loads, so
// this lives in its own file — vitest isolates each file in a fresh
// worker, making the call below the first (and only) api-extractor
// load in the process, the single point at which the engine can be
// selected.
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ApiPackage } from '@microsoft/api-extractor-model';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { extractEntryManifest } from '../extract';
import {
  assertDistinctCompilers,
  BUNDLED_TS_ENTRY,
  CONSUMER_TS_ROOT,
  CONSUMER_TS_VERSION,
  writeSymbolProbe,
} from './fixtures/stub-re-export';

const require_ = createRequire(import.meta.url);

describe('consumer TypeScript selection', () => {
  let workDir: string;

  beforeAll(assertDistinctCompilers);

  beforeEach(() => {
    workDir = mkdtempSync(path.join(tmpdir(), 'build-tsdoc-cts-'));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('analyses with the consumer compiler, not the bundled one', () => {
    // a probe whose node_modules/typescript points at the consumer
    // (newer) install, mirroring how a real consumer resolves it
    writeSymbolProbe(
      workDir,
      '/** Marker symbol. */\nexport declare const flag: boolean;\n',
      CONSUMER_TS_ROOT,
    );

    const outputPath = path.join(workDir, 'index.api.json');
    const result = extractEntryManifest({
      projectFolder: workDir,
      outputPath,
    });

    expect(result).toBeDefined();
    expect(existsSync(outputPath)).toBe(true);

    // the manifest loads back through the consumer's own load path
    const apiPackage = ApiPackage.loadFromJsonFile(outputPath);
    const members = apiPackage.entryPoints
      .flatMap((ep) => ep.members)
      .map((m) => m.displayName);
    expect(members).toContain('flag');

    // the engine actually swapped: api-extractor's typescript cache
    // slot now holds the consumer's compiler, not its pinned one
    const aliased = require_.cache[BUNDLED_TS_ENTRY];
    expect((aliased?.exports as undefined | { version?: string })?.version)
      .toBe(CONSUMER_TS_VERSION);
  });
});
