// The same stub-re-export probe as stub-re-export-bundled, but with
// the consumer's newer TypeScript resolved onto the probe, so the
// swap runs the analysis on 6.0.3. It bounds the scope of the
// consumer-compiler swap: following a stub into source aborts
// identically on 6.0.3 — confirmed against the *real* construct,
// not a proxy — so the abort is an api-extractor
// limitation on source, not a compiler-version gap, and the swap
// does NOT rescue it. Supporting this use case needs a separate
// mechanism (resolve the dependency's built declaration rather than
// follow its stub into source), tracked apart from this slice. Own
// worker file: the engine is fixed at first api-extractor load.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { extractEntryManifest } from '../extract';
import {
  CONSUMER_TS_ROOT,
  writeStubReExportProbe,
} from './fixtures/stub-re-export';

describe('stub re-export, consumer compiler', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = mkdtempSync(path.join(tmpdir(), 'build-tsdoc-stub-c-'));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('still aborts on the 6.0.3 engine — swap does not cover stubs', () => {
    const outputPath = writeStubReExportProbe(workDir, CONSUMER_TS_ROOT);
    expect(() => extractEntryManifest({
      projectFolder: workDir,
      outputPath,
    })).toThrow(/Unable to determine semantic information/);
  });
});
