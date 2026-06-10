import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ApiPackage } from '@microsoft/api-extractor-model';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { extractEntryManifest } from '../extract';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG_DIR = path.resolve(HERE, '../..');
const DIST_ENTRY = path.join(PKG_DIR, 'dist', 'index.d.mts');

describe('extractEntryManifest', () => {
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
    workDir = mkdtempSync(
      path.join(tmpdir(), 'build-tsdoc-test-'),
    );
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('writes a loadable .api.json against the package\'s own dist', () => {
    const outputPath = path.join(workDir, 'index.api.json');
    const result = extractEntryManifest({
      projectFolder: PKG_DIR,
      outputPath,
    });

    expect(result).toBeDefined();
    expect(result?.outputPath).toBe(outputPath);
    expect(existsSync(outputPath)).toBe(true);

    const apiPackage = ApiPackage.loadFromJsonFile(outputPath);
    expect(apiPackage.displayName).toBe('@kagal/build-tsdoc');

    const exported = apiPackage.entryPoints
      .flatMap((ep) => ep.members)
      .map((m) => m.displayName);
    expect(exported).toContain('extractEntryManifest');
    expect(exported).toContain('VERSION');
    expect(exported).toContain('ExtractEntryOptions');
    expect(exported).toContain('ExtractEntryResult');
  });

  it('returns undefined when entryFile is missing (stub builds)', () => {
    const result = extractEntryManifest({
      projectFolder: PKG_DIR,
      entryFile: path.join(workDir, 'does-not-exist.d.mts'),
    });
    expect(result).toBeUndefined();
  });

  it('derives entryFile from an absolute `outDir`', () => {
    // workDir holds no rollup; success here would mean
    // the helper ignored outDir and read the package's dist.
    const result = extractEntryManifest({
      projectFolder: PKG_DIR,
      outDir: workDir,
    });
    expect(result).toBeUndefined();
  });

  it('resolves a relative `outDir` against projectFolder, not cwd', () => {
    // cwd is the package dir; if `outDir` resolved against cwd
    // the real dist/index.d.mts would be found and extraction
    // would succeed. Resolving against the empty projectFolder
    // must return undefined.
    const result = extractEntryManifest({
      projectFolder: workDir,
      outDir: 'dist',
    });
    expect(result).toBeUndefined();
  });

  it('honours an explicit entryFile override', () => {
    const outputPath = path.join(workDir, 'override.api.json');
    const result = extractEntryManifest({
      projectFolder: PKG_DIR,
      entryFile: DIST_ENTRY,
      outputPath,
    });
    expect(result?.outputPath).toBe(outputPath);
    expect(existsSync(outputPath)).toBe(true);
  });

  it('documents dependency re-exports as package members', () => {
    // a probe project whose entry re-exports from a runtime
    // dependency: the symbol is part of the package contract
    // and must land in the doc model with its docs, not be
    // dropped as foreign
    const depDir = path.join(
      workDir, 'node_modules', 'probe-dep',
    );
    mkdirSync(depDir, { recursive: true });
    writeFileSync(
      path.join(depDir, 'package.json'),
      JSON.stringify({
        name: 'probe-dep',
        version: '1.0.0',
        types: 'index.d.ts',
      }),
    );
    writeFileSync(
      path.join(depDir, 'index.d.ts'),
      '/** Shared flag re-exported downstream. */\n' +
      'export declare const sharedFlag: boolean;\n',
    );
    mkdirSync(path.join(workDir, 'dist'));
    writeFileSync(
      path.join(workDir, 'dist', 'index.d.mts'),
      'export { sharedFlag } from \'probe-dep\';\n',
    );
    writeFileSync(
      path.join(workDir, 'package.json'),
      JSON.stringify({
        name: '@kagal/probe',
        version: '0.0.0',
        dependencies: { 'probe-dep': '1.0.0' },
      }),
    );
    writeFileSync(
      path.join(workDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'ESNext',
          moduleResolution: 'Bundler',
          strict: true,
        },
      }),
    );

    const outputPath = path.join(workDir, 'bundled.api.json');
    const result = extractEntryManifest({
      projectFolder: workDir,
      outputPath,
    });
    expect(result?.outputPath).toBe(outputPath);

    const apiPackage = ApiPackage.loadFromJsonFile(outputPath);
    const members = apiPackage.entryPoints
      .flatMap((ep) => ep.members)
      .map((m) => m.displayName);
    expect(members).toContain('sharedFlag');
  });

  it('grafts a non-index entry name onto the import path', () => {
    // a two-entry probe: the default `index` entry keeps the bare
    // `@scope/pkg!` reference, while `utils` is disambiguated as a
    // subpath so a consumer merging both models keeps each entry
    writeFileSync(
      path.join(workDir, 'package.json'),
      JSON.stringify({ name: '@kagal/probe', version: '0.0.0' }),
    );
    writeFileSync(
      path.join(workDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'ESNext',
          moduleResolution: 'Bundler',
          strict: true,
        },
      }),
    );
    mkdirSync(path.join(workDir, 'dist'));
    writeFileSync(
      path.join(workDir, 'dist', 'index.d.mts'),
      '/** Index marker. */\nexport declare const indexFlag: boolean;\n',
    );
    writeFileSync(
      path.join(workDir, 'dist', 'utils.d.mts'),
      '/** Utils marker. */\nexport declare const utilsFlag: boolean;\n',
    );

    const indexOut = path.join(workDir, 'index.api.json');
    extractEntryManifest({
      projectFolder: workDir,
      entryName: 'index',
      outputPath: indexOut,
    });
    const utilsOut = path.join(workDir, 'utils.api.json');
    extractEntryManifest({
      projectFolder: workDir,
      entryName: 'utils',
      outputPath: utilsOut,
    });

    const indexPkg = ApiPackage.loadFromJsonFile(indexOut);
    const utilsPkg = ApiPackage.loadFromJsonFile(utilsOut);

    // the package keeps its real identity in both models
    expect(indexPkg.name).toBe('@kagal/probe');
    expect(utilsPkg.name).toBe('@kagal/probe');

    // the default entry stays bare; the named entry carries the
    // import path, so the model rebuilds distinct references
    expect(indexPkg.entryPoints[0].importPath).toBe('');
    expect(utilsPkg.entryPoints[0].importPath).toBe('utils');

    const indexReference = indexPkg.entryPoints[0].members[0]
      .canonicalReference.toString();
    const utilsReference = utilsPkg.entryPoints[0].members[0]
      .canonicalReference.toString();
    expect(indexReference).toBe('@kagal/probe!indexFlag:var');
    expect(utilsReference).toBe('@kagal/probe/utils!utilsFlag:var');
    // two api-extractor passes (index + utils) overrun the
    // default 5s budget under load
  }, 30_000);

  it('honours an explicit packageFullPath override', () => {
    // a renamed manifest copy: the displayName proves the
    // override, not the default package.json, was read
    const packageFullPath = path.join(workDir, 'package.json');
    writeFileSync(packageFullPath, JSON.stringify({
      name: '@kagal/probe',
      version: '0.0.0',
    }));
    const outputPath = path.join(workDir, 'pkg-override.api.json');
    const result = extractEntryManifest({
      projectFolder: PKG_DIR,
      outputPath,
      packageFullPath,
    });
    expect(result?.outputPath).toBe(outputPath);

    const apiPackage = ApiPackage.loadFromJsonFile(outputPath);
    expect(apiPackage.displayName).toBe('@kagal/probe');
  });
});
