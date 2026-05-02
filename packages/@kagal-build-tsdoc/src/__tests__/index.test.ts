import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  DEFAULT_OUTPUT_DIRECTORY,
  type DocumentsManifest,
  newDocumentsHook,
  VERSION,
} from '..';
import { DuplicateOutputFileError } from '../errors';
import { logDocuments, writeDocuments } from '../write';

import pkg from '../../package.json' with { type: 'json' };

const __dirname = path.dirname(
  fileURLToPath(import.meta.url),
);

it('VERSION matches package.json', () => {
  expect(VERSION).toEqual(pkg.version);
});

it('DEFAULT_OUTPUT_DIRECTORY is _docs', () => {
  expect(DEFAULT_OUTPUT_DIRECTORY).toBe('_docs');
});

describe('newDocumentsHook', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a function', () => {
    const hook = newDocumentsHook();
    expect(typeof hook).toBe('function');
  });

  it('skips stub builds', () => {
    const hook = newDocumentsHook();
    const result = hook({
      options: { stub: true },
    } as never);
    expect(result).toBeUndefined();
  });

  it('extracts and writes documents', () => {
    vi.spyOn(console, 'log')
      .mockImplementation(() => {});

    const outputDirectory = mkdtempSync(
      path.join(tmpdir(), 'hook-test-'),
    );

    try {
      const hook = newDocumentsHook({
        outputDirectory,
      });

      hook({
        options: {
          rootDir: path.resolve(__dirname, '../..'),
          entries: [
            {
              input: path.resolve(
                __dirname, 'fixtures/sample.ts',
              ),
              name: 'index',
            },
          ],
        },
        pkg: { name: '@test/hook', version: '1.0.0' },
      } as never);

      expect(
        existsSync(
          path.join(outputDirectory, 'api.json'),
        ),
      ).toBe(true);
      expect(
        existsSync(
          path.join(outputDirectory, 'api_index.json'),
        ),
      ).toBe(true);
    } finally {
      rmSync(outputDirectory, {
        recursive: true,
        force: true,
      });
    }
  });
});

describe('writeDocuments', () => {
  let outputDirectory: string;

  beforeEach(() => {
    outputDirectory = mkdtempSync(
      path.join(tmpdir(), 'build-tsdoc-'),
    );
  });

  afterEach(() => {
    rmSync(outputDirectory, {
      recursive: true,
      force: true,
    });
  });

  const manifest: DocumentsManifest = {
    name: '@test/pkg',
    version: '1.0.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    exports: {
      '.': {
        entryFile: 'src/index.ts',
        symbolCount: 1,
        symbols: [
          { name: 'hello' } as never,
        ],
      },
      './utils': {
        entryFile: 'src/utils/index.ts',
        symbolCount: 0,
        symbols: [],
      },
    },
  };

  it('writes per-export JSON files', () => {
    writeDocuments(outputDirectory, manifest);

    const index = JSON.parse(
      readFileSync(
        path.join(outputDirectory, 'api_index.json'),
        'utf8',
      ),
    );
    expect(index).toEqual([{ name: 'hello' }]);

    const utils = JSON.parse(
      readFileSync(
        path.join(outputDirectory, 'api_utils.json'),
        'utf8',
      ),
    );
    expect(utils).toEqual([]);
  });

  it('writes unified api.json manifest', () => {
    writeDocuments(outputDirectory, manifest);

    const api = JSON.parse(
      readFileSync(
        path.join(outputDirectory, 'api.json'),
        'utf8',
      ),
    );
    expect(api).toEqual(manifest);
  });

  it('flattens nested export paths into filenames', () => {
    const nestedManifest: DocumentsManifest = {
      name: '@test/pkg',
      version: '1.0.0',
      generatedAt: '2026-01-01T00:00:00.000Z',
      exports: {
        '.': {
          entryFile: 'src/index.ts',
          symbolCount: 0,
          symbols: [],
        },
        './foo/index': {
          entryFile: 'src/foo/index.ts',
          symbolCount: 1,
          symbols: [{ name: 'fooThing' } as never],
        },
        './bar/index': {
          entryFile: 'src/bar/index.ts',
          symbolCount: 1,
          symbols: [{ name: 'barThing' } as never],
        },
      },
    };

    writeDocuments(outputDirectory, nestedManifest);

    const foo = JSON.parse(
      readFileSync(
        path.join(outputDirectory, 'api_foo__index.json'),
        'utf8',
      ),
    );
    expect(foo).toEqual([{ name: 'fooThing' }]);

    const bar = JSON.parse(
      readFileSync(
        path.join(outputDirectory, 'api_bar__index.json'),
        'utf8',
      ),
    );
    expect(bar).toEqual([{ name: 'barThing' }]);
  });

  it('writes ./api export alongside api.json without collision', () => {
    const apiManifest: DocumentsManifest = {
      name: '@test/pkg',
      version: '1.0.0',
      generatedAt: '2026-01-01T00:00:00.000Z',
      exports: {
        '.': {
          entryFile: 'src/index.ts',
          symbolCount: 0,
          symbols: [],
        },
        './api': {
          entryFile: 'src/api.ts',
          symbolCount: 1,
          symbols: [{ name: 'apiThing' } as never],
        },
      },
    };

    writeDocuments(outputDirectory, apiManifest);

    const apiExport = JSON.parse(
      readFileSync(
        path.join(outputDirectory, 'api_api.json'),
        'utf8',
      ),
    );
    expect(apiExport).toEqual([{ name: 'apiThing' }]);

    const manifestOnDisk = JSON.parse(
      readFileSync(
        path.join(outputDirectory, 'api.json'),
        'utf8',
      ),
    );
    expect(manifestOnDisk).toEqual(apiManifest);
  });

  it('throws DuplicateOutputFileError on filename collisions', () => {
    const collidingManifest: DocumentsManifest = {
      name: '@test/pkg',
      version: '1.0.0',
      generatedAt: '2026-01-01T00:00:00.000Z',
      exports: {
        './foo__index': {
          entryFile: 'src/foo__index.ts',
          symbolCount: 0,
          symbols: [],
        },
        './foo/index': {
          entryFile: 'src/foo/index.ts',
          symbolCount: 0,
          symbols: [],
        },
      },
    };

    let caught: unknown;
    try {
      writeDocuments(outputDirectory, collidingManifest);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(caught).toBeInstanceOf(DuplicateOutputFileError);
    const error = caught as DuplicateOutputFileError;
    expect(error.name).toBe('DuplicateOutputFileError');
    expect(error.fileName).toBe('api_foo__index');
    expect(error.previousExportPath).toBe('./foo__index');
    expect(error.conflictingExportPath).toBe('./foo/index');
    expect(error.message).toContain('api_foo__index.json');
    expect(error.message).toContain('./foo__index');
    expect(error.message).toContain('./foo/index');
  });
});

describe('logDocuments', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs export and symbol counts', () => {
    const spy = vi.spyOn(console, 'log')
      .mockImplementation(() => {});

    logDocuments({
      name: '@test/pkg',
      generatedAt: '2026-01-01T00:00:00.000Z',
      exports: {
        '.': {
          entryFile: 'src/index.ts',
          symbolCount: 3,
          symbols: [],
        },
        './utils': {
          entryFile: 'src/utils/index.ts',
          symbolCount: 2,
          symbols: [],
        },
      },
    });

    expect(spy).toHaveBeenCalledWith(
      '[docs] 2 exports, 5 symbols',
    );
  });
});
