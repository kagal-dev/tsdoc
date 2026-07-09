// Investigation + regression for api-extractor's supported
// `typescriptCompilerFolder` option, the obvious alternative to the
// module-cache swap in extract.ts. The option sounds like it points
// api-extractor at the consumer's compiler, but the source tells a
// narrower story:
//
//   CompilerState._createCompilerHost:
//     compilerHost.getDefaultLibLocation = () =>
//       path.join(typescriptCompilerFolder, 'lib');
//
// It redirects only the default `lib.*.d.ts` *system typings*. The
// analysing engine remains api-extractor's bundled `typescript` —
// which is why Extractor logs "the *bundled* TypeScript version"
// and still emits its version-mismatch notice. So the option cannot
// move the engine off the bundled compiler; only the cache swap in
// extract.ts does that, and clearing that notice is its one
// demonstrated effect. This test pins the distinction, and flips to
// red if a future api-extractor ever promotes the option to a real
// engine swap — the signal to drop our own.
//
// Own worker file: it loads api-extractor without ever calling
// extractEntryManifest, so the cache swap never runs and the engine
// here is the genuinely bundled one.
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  Extractor,
  ExtractorConfig,
  type ExtractorMessage,
} from '@microsoft/api-extractor';
import { ApiPackage } from '@microsoft/api-extractor-model';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  assertDistinctCompilers,
  BUNDLED_TS_VERSION,
  CONSUMER_TS_ROOT,
  CONSUMER_TS_VERSION,
  writeSymbolProbe,
} from './fixtures/stub-re-export';

/**
 * Run api-extractor directly on a probe, passing the supported
 * `typescriptCompilerFolder`, and report the engine version it
 * announces in its preamble plus where the manifest landed.
 */
function invokeWithCompilerFolder(
  projectFolder: string,
  compilerFolder: string,
): { engineVersion: string | undefined; outputPath: string; succeeded: boolean } {
  const outputPath = path.join(projectFolder, 'index.api.json');
  const config = ExtractorConfig.prepare({
    configObject: {
      projectFolder,
      mainEntryPointFilePath: path.join(projectFolder, 'dist', 'index.d.mts'),
      compiler: { tsconfigFilePath: path.join(projectFolder, 'tsconfig.json') },
      docModel: { enabled: true, apiJsonFilePath: outputPath },
      apiReport: { enabled: false },
      dtsRollup: { enabled: false },
    },
    configObjectFullPath: undefined,
    packageJsonFullPath: path.join(projectFolder, 'package.json'),
  });

  let engineVersion: string | undefined;
  const result = Extractor.invoke(config, {
    localBuild: true,
    showVerboseMessages: false,
    typescriptCompilerFolder: compilerFolder,
    messageCallback: (message: ExtractorMessage): void => {
      const match = /bundled TypeScript version (\d+\.\d+\.\d+)/
        .exec(message.text);
      if (match !== null) {
        engineVersion = match[1];
        message.handled = true;
      }
    },
  });

  return { engineVersion, outputPath, succeeded: result.succeeded };
}

describe('api-extractor typescriptCompilerFolder option', () => {
  let workDir: string;

  beforeAll(assertDistinctCompilers);

  beforeEach(() => {
    workDir = mkdtempSync(path.join(tmpdir(), 'build-tsdoc-cfo-'));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('redirects system typings but keeps the bundled engine', () => {
    writeSymbolProbe(
      workDir,
      '/** Marker symbol. */\nexport declare const flag: boolean;\n',
    );

    const { engineVersion, outputPath, succeeded } =
      invokeWithCompilerFolder(workDir, CONSUMER_TS_ROOT);

    // The option does not throw and produces a valid manifest...
    expect(succeeded).toBe(true);
    expect(existsSync(outputPath)).toBe(true);
    const members = ApiPackage.loadFromJsonFile(outputPath).entryPoints
      .flatMap((ep) => ep.members)
      .map((m) => m.displayName);
    expect(members).toContain('flag');

    // ...but the analysing engine is still api-extractor's bundled
    // compiler, not the consumer's. The option moves only the system
    // typings; moving the engine onto the consumer's compiler — which
    // is what clears the version-mismatch notice — takes the cache
    // swap in extract.ts.
    expect(engineVersion).toBe(BUNDLED_TS_VERSION);
    expect(engineVersion).not.toBe(CONSUMER_TS_VERSION);
  });
});
