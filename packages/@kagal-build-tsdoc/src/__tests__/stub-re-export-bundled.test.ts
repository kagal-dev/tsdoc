// cspell:words taistamp
// The taistamp stub-re-export shape on the *bundled* engine.
// api-extractor used to follow a dependency's development stub
// (`export * from '../src/index.ts'`) into raw TypeScript source
// and abort with "Unable to determine semantic information"; the
// redirect now derives declarations from that source and remaps
// the dependency onto them, so extraction completes and documents
// the re-exported symbol — TSDoc included. This file pins NO
// consumer compiler on the probes, so both the derivation and the
// analysis run on api-extractor's bundled engine. Own worker
// file: the engine is fixed at the first api-extractor load in a
// process.
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { UnbuiltDependencyError } from '../errors';
import { extractEntryManifest } from '../extract';
import {
  readEntryPointMembers,
  writeBrokenStubReExportProbe,
  writeBuiltReExportProbe,
  writeDeclarationDirStubReExportProbe,
  writeMalformedTsconfigStubReExportProbe,
  writeModernStubReExportProbe,
  writeSourceTypesReExportProbe,
  writeStubReExportProbe,
} from './fixtures/stub-re-export';

/** The derived-declaration cache the redirect writes under. */
function mirrorCacheDir(workDir: string): string {
  return path.join(
    workDir, 'node_modules', '.cache', 'kagal-build-tsdoc',
  );
}

/** Assert extraction succeeded and documented `parseSecret`. */
function expectParseSecretDocumented(
  outputPath: string,
  result: ReturnType<typeof extractEntryManifest>,
): void {
  expect(result).toBeDefined();
  expect(result?.outputPath).toBe(outputPath);
  expect(result?.warningCount).toBe(0);
  const members = readEntryPointMembers(outputPath);
  expect([...members.keys()]).toContain('parseSecret');
  expect(members.get('parseSecret'))
    .toContain('Parse a "selector:base64" secret');
}

describe('stub re-export, bundled compiler', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = mkdtempSync(path.join(tmpdir(), 'build-tsdoc-stub-b-'));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('redirects a jiti-era stub onto derived declarations', () => {
    // The stub re-exports the source shape that aborted taistamp's
    // publish (`const [selector, b64Key] = parts` in an exported
    // function). The redirect derives a declaration from it, so the
    // symbol is documented instead of the analyser following raw
    // source and aborting.
    const outputPath = writeStubReExportProbe(workDir);
    const result = extractEntryManifest({
      projectFolder: workDir,
      outputPath,
    });
    expectParseSecretDocumented(outputPath, result);
    expect(existsSync(mirrorCacheDir(workDir))).toBe(true);
  });

  it('redirects a modern `.js`-mapped stub the same way', () => {
    // `unbuild --stub` writes the source specifier with a `.js`
    // extension; detection resolves it to the source file rather
    // than pattern-matching the specifier, so this shape redirects
    // identically.
    const outputPath = writeModernStubReExportProbe(workDir);
    const result = extractEntryManifest({
      projectFolder: workDir,
      outputPath,
    });
    expectParseSecretDocumented(outputPath, result);
  });

  it('redirects a stub whose dependency sets declarationDir', () => {
    // The dependency's own tsconfig sets `declarationDir`, which
    // would divert the derived declarations away from the mirror
    // and trip the derived-path check. The redirect clears the
    // knob, so derivation lands under the mirror and the symbol is
    // documented as for any other stub.
    const outputPath = writeDeclarationDirStubReExportProbe(workDir);
    const result = extractEntryManifest({
      projectFolder: workDir,
      outputPath,
    });
    expectParseSecretDocumented(outputPath, result);
  });

  it('redirects a stub whose dependency tsconfig is malformed', () => {
    // `ts.readConfigFile` reports a malformed config through
    // `error` while still returning `{}` — so the guard in
    // `dependencyCompilerOptions` has to inspect `error` to honour
    // the documented "unreadable config falls back to bare options".
    // Either way derivation runs on the forced emit overrides, so
    // this pins the outcome the doc comment promises: a dependency
    // that cannot state its own options still derives and documents.
    const outputPath = writeMalformedTsconfigStubReExportProbe(workDir);
    const result = extractEntryManifest({
      projectFolder: workDir,
      outputPath,
    });
    expectParseSecretDocumented(outputPath, result);
    expect(existsSync(mirrorCacheDir(workDir))).toBe(true);
  });

  it('redirects a `types` entry aimed straight at source', () => {
    // No stub declaration in between: the manifest's `types` IS
    // the source file, and the whole entry is derived.
    const outputPath = writeSourceTypesReExportProbe(workDir);
    const result = extractEntryManifest({
      projectFolder: workDir,
      outputPath,
    });
    expectParseSecretDocumented(outputPath, result);
  });

  it('extracts a built dependency without redirecting', () => {
    // The pass path: built declarations are left entirely alone —
    // extraction succeeds and no mirror cache is written.
    const outputPath = writeBuiltReExportProbe(workDir);
    const result = extractEntryManifest({
      projectFolder: workDir,
      outputPath,
    });
    expectParseSecretDocumented(outputPath, result);
    expect(existsSync(mirrorCacheDir(workDir))).toBe(false);
  });

  it('does not derive when the consumer tsconfig is unreadable', () => {
    // `ts.readConfigFile` returns `{ config: {}, error }` — not
    // `config === undefined` — when the tsconfig cannot be read, so
    // the guard has to inspect `error`. Without it the redirect would
    // proceed under phantom near-default options; with it,
    // resolveCompilerConfig falls back to passthrough and derives
    // nothing. A stub probe with its tsconfig removed exercises the
    // path: api-extractor reports the missing tsconfig on its own
    // terms, and the mirror cache stays unwritten.
    const outputPath = writeStubReExportProbe(workDir);
    rmSync(path.join(workDir, 'tsconfig.json'));
    expect(() =>
      extractEntryManifest({ projectFolder: workDir, outputPath }))
      .toThrow();
    expect(existsSync(mirrorCacheDir(workDir))).toBe(false);
  });

  it('names the dependency when its source cannot be compiled', () => {
    // Source the compiler cannot parse is the one arm the
    // redirect cannot rescue; the error names the offender and
    // the remedy.
    const outputPath = writeBrokenStubReExportProbe(workDir);
    let caught: unknown;
    try {
      extractEntryManifest({ projectFolder: workDir, outputPath });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(UnbuiltDependencyError);
    const failure = caught as UnbuiltDependencyError;
    expect(failure.dependency).toBe('probe-dep');
    expect(failure.message).toContain('build \'probe-dep\' first');
  });
});
