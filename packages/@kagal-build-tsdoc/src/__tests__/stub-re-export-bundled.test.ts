// cspell:words taistamp
// Reproduction of the taistamp explosion on the *bundled* engine:
// api-extractor follows a package re-export into a dependency's
// jiti stub (`export * from '../src/index.ts'`) and lands in raw
// TypeScript source. This file pins NO consumer compiler on the
// probe, so extraction runs on api-extractor's bundled engine.
// Own worker file: the engine is fixed at first api-extractor load.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { extractEntryManifest } from '../extract';
import { writeStubReExportProbe } from './fixtures/stub-re-export';

describe('stub re-export, bundled compiler', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = mkdtempSync(path.join(tmpdir(), 'build-tsdoc-stub-b-'));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('aborts following the stub into source, as taistamp did', () => {
    // Following the stub lands in raw source on the local
    // `const [selector, b64Key] = parts` inside an exported
    // function — the exact construct that aborted taistamp's
    // publish. api-extractor cannot determine semantic
    // information for the binding read from source. A
    // *built* dependency emits split `declare const`s and extracts
    // cleanly; the stub is the trigger, not the compiler version.
    const outputPath = writeStubReExportProbe(workDir);
    expect(() => extractEntryManifest({
      projectFolder: workDir,
      outputPath,
    })).toThrow(/Unable to determine semantic information/);
  });
});
