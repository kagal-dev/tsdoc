import { existsSync } from 'node:fs';
import path from 'node:path';

import { Extractor, ExtractorConfig } from '@microsoft/api-extractor';
import { defineBuildConfig } from 'obuild/config';
import VueRolldown from 'unplugin-vue/rolldown';

// Vue library build via obuild + Rolldown. SFC parsing is
// handled by unplugin-vue/rolldown; the rolled declaration
// file is emitted by obuild's dts plugin with Vue support enabled.
// The `end` hook then runs api-extractor against the rolled
// declarations to produce `dist/index.api.json`, the typed
// graph format the vue-tsdoc components render.
// Inline prototype: no dependency on @kagal/build-tsdoc.
export default defineBuildConfig({
  entries: [
    {
      type: 'bundle',
      input: './src/index.ts',
      rolldown: {
        plugins: [
          VueRolldown(),
        ],
      },
      dts: {
        vue: true,
        // Point at tsconfig.app.json directly — the root
        // tsconfig.json declares references with `files: []`,
        // which rolldown-plugin-dts reads as "no source files"
        // and refuses to load .vue inputs.
        tsconfig: './tsconfig.app.json',
      },
    },
  ],
  hooks: {
    rolldownOutput(outConfig) {
      outConfig.sourcemap = true;
    },
    end(context) {
      extractAPIModel(context.pkgDir);
    },
  },
});

function extractAPIModel(pkgDirectory: string): void {
  const entryFile = path.join(pkgDirectory, 'dist', 'index.d.mts');
  // Stub builds emit only ./dist/index.mjs; skip extraction.
  if (!existsSync(entryFile)) {
    return;
  }
  const config = ExtractorConfig.prepare({
    configObject: {
      projectFolder: pkgDirectory,
      mainEntryPointFilePath: '<projectFolder>/dist/index.d.mts',
      compiler: {
        // api-extractor only reads compiler options from this
        // tsconfig; it discovers the surface from
        // mainEntryPointFilePath, so the root tsconfig.json (whose
        // references use `files: []`) works fine here — unlike the
        // dts plugin above, which needs tsconfig.app.json because it
        // treats `files: []` as "no inputs".
        tsconfigFilePath: '<projectFolder>/tsconfig.json',
      },
      docModel: {
        enabled: true,
        apiJsonFilePath: '<projectFolder>/dist/index.api.json',
      },
      apiReport: { enabled: false },
      dtsRollup: { enabled: false },
    },
    configObjectFullPath: undefined,
    packageJsonFullPath: path.join(pkgDirectory, 'package.json'),
  });
  const result = Extractor.invoke(config, {
    localBuild: true,
    showVerboseMessages: false,
  });
  if (!result.succeeded) {
    console.warn(
      `[api-extractor] completed with ${result.errorCount} ` +
      `errors and ${result.warningCount} warnings`,
    );
  }
}
