// The same stub-re-export probe as stub-re-export-bundled, but
// with the consumer's newer TypeScript resolved onto the probe, so
// the swap runs the analysis — and the redirect's declaration
// derivation with it — on the consumer's 6.x engine. It bounds the
// engine question the bundled-compiler file leaves open: the
// redirect is engine-independent, deriving with whichever compiler
// the analysis adopted. Own worker file: the engine is fixed at
// the first api-extractor load in a process.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { extractEntryManifest } from '../extract';
import {
  CONSUMER_TS_ROOT,
  readEntryPointMembers,
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

  it('redirects the stub on the adopted 6.x engine too', () => {
    const outputPath = writeStubReExportProbe(workDir, CONSUMER_TS_ROOT);
    const result = extractEntryManifest({
      projectFolder: workDir,
      outputPath,
    });
    expect(result).toBeDefined();
    expect(result?.outputPath).toBe(outputPath);
    expect(result?.warningCount).toBe(0);
    const members = readEntryPointMembers(outputPath);
    expect([...members.keys()]).toContain('parseSecret');
    expect(members.get('parseSecret'))
      .toContain('Parse a "selector:base64" secret');
  });
});
