import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDocumentation, type DocEntry } from 'tsdoc-markdown';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DuplicateExportPathError } from '../errors';
import {
  resolveDocuments,
  sanitiseFileNames,
} from '../extract';

vi.mock('tsdoc-markdown', { spy: true });

function collectFileNames(symbols: DocEntry[]): string[] {
  const names: string[] = [];
  const visit = (xs: DocEntry[]) => {
    for (const s of xs) {
      if (s.fileName) names.push(s.fileName);
      if (s.parameters) visit(s.parameters);
      if (s.methods) visit(s.methods);
      if (s.properties) visit(s.properties);
      if (s.constructors) {
        for (const c of s.constructors) {
          if (c.parameters) visit(c.parameters);
        }
      }
    }
  };
  visit(symbols);
  return names;
}

const __dirname = path.dirname(
  fileURLToPath(import.meta.url),
);

const rootDirectory = path.resolve(__dirname, '../..');
const fixtureInput = path.resolve(
  __dirname, 'fixtures/sample.ts',
);

function makeContext(
  entries: { input: string; name?: string }[],
) {
  return {
    options: {
      rootDir: rootDirectory,
      entries,
    },
    pkg: { name: '@test/fixture', version: '1.0.0' },
  } as never;
}

describe('resolveDocuments', () => {
  it('extracts symbols from a TypeScript file', () => {
    const manifest = resolveDocuments(
      makeContext([
        { input: fixtureInput, name: 'sample' },
      ]),
    );

    expect(manifest.name).toBe('@test/fixture');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.generatedAt).toBeDefined();

    const entry = manifest.exports['./sample'];
    expect(entry).toBeDefined();
    expect(entry.symbolCount).toBeGreaterThanOrEqual(3);

    const names = entry.symbols.map((s) => s.name);
    expect(names).toContain('SAMPLE');
    expect(names).toContain('SampleOptions');
    expect(names).toContain('greet');
  });

  it('maps index entry to root export path', () => {
    const manifest = resolveDocuments(
      makeContext([
        { input: fixtureInput, name: 'index' },
      ]),
    );

    expect(manifest.exports['.']).toBeDefined();
    expect(manifest.exports['./index']).toBeUndefined();
  });

  it('maps undefined name to root export path', () => {
    const manifest = resolveDocuments(
      makeContext([{ input: fixtureInput }]),
    );

    expect(manifest.exports['.']).toBeDefined();
  });

  it('relativises file paths in symbols', () => {
    const manifest = resolveDocuments(
      makeContext([
        { input: fixtureInput, name: 'sample' },
      ]),
    );

    const entry = manifest.exports['./sample'];
    for (const symbol of entry.symbols) {
      if (symbol.fileName) {
        expect(
          path.isAbsolute(symbol.fileName),
        ).toBe(false);
      }
    }
  });

  it('records entry file path relative to root', () => {
    const manifest = resolveDocuments(
      makeContext([
        { input: fixtureInput, name: 'sample' },
      ]),
    );

    const entry = manifest.exports['./sample'];
    expect(entry.entryFile).not.toContain(rootDirectory);
    expect(
      path.isAbsolute(entry.entryFile),
    ).toBe(false);
  });

  it('emits POSIX separators in manifest paths', () => {
    const manifest = resolveDocuments(
      makeContext([
        { input: fixtureInput, name: 'sample' },
      ]),
    );

    const entry = manifest.exports['./sample'];
    expect(entry.entryFile).not.toContain('\\');

    for (const fileName of collectFileNames(entry.symbols)) {
      expect(fileName).not.toContain('\\');
    }
  });

  it('handles multiple entries', () => {
    const manifest = resolveDocuments(
      makeContext([
        { input: fixtureInput, name: 'index' },
        { input: fixtureInput, name: 'extras' },
      ]),
    );

    expect(manifest.exports['.']).toBeDefined();
    expect(manifest.exports['./extras']).toBeDefined();
    expect(
      Object.keys(manifest.exports),
    ).toHaveLength(2);
  });

  it('throws DuplicateExportPathError on collisions', () => {
    let caught: unknown;
    try {
      resolveDocuments(
        makeContext([
          { input: fixtureInput, name: 'sample' },
          { input: fixtureInput, name: 'sample' },
        ]),
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(caught).toBeInstanceOf(DuplicateExportPathError);
    const error = caught as DuplicateExportPathError;
    expect(error.name).toBe('DuplicateExportPathError');
    expect(error.exportPath).toBe('./sample');
    expect(error.previousEntryFile).toContain('sample.ts');
    expect(error.conflictingInput).toBe(fixtureInput);
    expect(error.message).toContain('./sample');
    expect(error.message).toContain(error.previousEntryFile);
    expect(error.message).toContain(error.conflictingInput);
  });

  it('detects index/undefined name collisions', () => {
    expect(() =>
      resolveDocuments(
        makeContext([
          { input: fixtureInput, name: 'index' },
          { input: fixtureInput },
        ]),
      ),
    ).toThrow(DuplicateExportPathError);
  });

  it('filters symbols tagged with @internal', () => {
    const manifest = resolveDocuments(
      makeContext([
        { input: fixtureInput, name: 'sample' },
      ]),
    );

    const entry = manifest.exports['./sample'];
    const names = entry.symbols.map((s) => s.name);
    expect(names).not.toContain('internalHelper');
  });

  it('extracts class constructors and methods', () => {
    const manifest = resolveDocuments(
      makeContext([
        { input: fixtureInput, name: 'sample' },
      ]),
    );

    const entry = manifest.exports['./sample'];
    const names = entry.symbols.map((s) => s.name);
    expect(names).toContain('Greeter');
  });

  it('records entries with no documented symbols', () => {
    const manifest = resolveDocuments(
      makeContext([
        {
          input: path.join(
            __dirname, 'fixtures/non-existent.ts',
          ),
          name: 'missing',
        },
      ]),
    );

    const entry = manifest.exports['./missing'];
    expect(entry).toBeDefined();
    expect(entry.symbolCount).toBe(0);
  });

  describe('extraction failures', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('logs failure with the resolved exportPath', () => {
      const warnSpy = vi.spyOn(console, 'warn')
        .mockImplementation(() => {});
      vi.mocked(buildDocumentation)
        .mockImplementationOnce(() => {
          throw new Error('boom');
        });

      const manifest = resolveDocuments(
        makeContext([
          { input: fixtureInput, name: 'aliased' },
        ]),
      );

      expect(manifest.exports['./aliased']).toBeDefined();
      expect(
        manifest.exports['./aliased'].symbolCount,
      ).toBe(0);

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const [message, error] = warnSpy.mock.calls[0];
      expect(message).toBe(
        '[docs] Failed for ./aliased:',
      );
      expect(message).not.toContain('./sample');
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('boom');
    });

    it('logs failure with `.` for index entries', () => {
      const warnSpy = vi.spyOn(console, 'warn')
        .mockImplementation(() => {});
      vi.mocked(buildDocumentation)
        .mockImplementationOnce(() => {
          throw new Error('boom');
        });

      resolveDocuments(
        makeContext([
          { input: fixtureInput, name: 'index' },
        ]),
      );

      expect(warnSpy.mock.calls[0][0]).toBe(
        '[docs] Failed for .:',
      );
    });
  });
});

describe('sanitiseFileNames', () => {
  it('rewrites fileName across every recursion branch', () => {
    const root = rootDirectory;
    const inside = (relativePath: string) =>
      path.resolve(root, relativePath);

    const symbols = [{
      name: 'TopLevel',
      fileName: inside('src/top.ts'),
      parameters: [
        { name: 'p1', fileName: inside('src/p1.ts') },
      ],
      methods: [{
        name: 'm1',
        fileName: inside('src/m1.ts'),
        parameters: [
          { name: 'mp1', fileName: inside('src/mp1.ts') },
        ],
      }],
      properties: [
        { name: 'pr1', fileName: inside('src/pr1.ts') },
      ],
      constructors: [{
        parameters: [
          { name: 'cp1', fileName: inside('src/cp1.ts') },
        ],
      }],
    }] as never as DocEntry[];

    sanitiseFileNames(symbols, root);

    const collected = collectFileNames(symbols);
    expect(collected).toHaveLength(6);
    for (const fileName of collected) {
      expect(path.isAbsolute(fileName)).toBe(false);
      expect(fileName).not.toContain('\\');
      expect(fileName.startsWith('src/')).toBe(true);
    }
  });

  it('leaves symbols without fileName untouched', () => {
    const symbols = [
      { name: 'NoFile' },
      { name: 'Empty', fileName: '' },
    ] as never as DocEntry[];

    sanitiseFileNames(symbols, rootDirectory);

    expect(symbols[0].fileName).toBeUndefined();
    expect(symbols[1].fileName).toBe('');
  });
});
