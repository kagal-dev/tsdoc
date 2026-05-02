// Symbol extraction from TypeScript sources
// cspell:words dirents

import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import type { BuildContext } from 'unbuild';
import {
  buildDocumentation,
  type DocEntry,
} from 'tsdoc-markdown';

import type { DocumentsManifest } from './types';
import { DuplicateExportPathError } from './errors';

const SOURCE_FILE_PATTERN = /\.tsx?$/;
const DECLARATION_FILE_PATTERN = /\.d\.tsx?$/;
const TEST_FILE_PATTERN = /\.(test|spec)\.tsx?$/;
const EXCLUDED_DIRECTORY_NAMES = new Set([
  '__tests__',
  '__mocks__',
  'node_modules',
]);

/**
 * Recursively list TypeScript source files under
 * `directory`, skipping declarations, test files, and
 * conventional non-source subdirectories.
 *
 * @internal
 */
export function listSourceFiles(directory: string): string[] {
  const dirents = readdirSync(directory, {
    recursive: true,
    withFileTypes: true,
  });

  const files: string[] = [];
  for (const dirent of dirents) {
    if (!dirent.isFile()) continue;
    if (!SOURCE_FILE_PATTERN.test(dirent.name)) continue;
    if (DECLARATION_FILE_PATTERN.test(dirent.name)) continue;
    if (TEST_FILE_PATTERN.test(dirent.name)) continue;

    const parent = dirent.parentPath;
    const relative = path.relative(directory, parent);
    const segments = relative ? relative.split(path.sep) : [];
    if (segments.some((s) => EXCLUDED_DIRECTORY_NAMES.has(s))) {
      continue;
    }

    files.push(path.join(parent, dirent.name));
  }
  return files.toSorted();
}

/**
 * Map an unbuild entry `name` to its package.json
 * `exports` key. `undefined` and `'index'` collapse
 * to the root export `'.'`.
 *
 * @internal
 */
function resolveExportPath(name: string | undefined) {
  return name === 'index' || !name ?
    '.' :
    `./${name}`;
}

/**
 * Compute the POSIX-style relative path from `from`
 * to `to`. Wrapper around `path.relative` that
 * normalises platform separators to `/`.
 *
 * @internal
 */
function relative(from: string, to: string): string {
  return path.relative(from, to).split(path.sep).join('/');
}

/**
 * Test whether a documented symbol carries the
 * `@internal` JSDoc tag.
 *
 * @internal
 */
function isInternal(symbol: DocEntry) {
  return symbol.jsDocs?.some(
    (tag) => tag.name === 'internal',
  ) ?? false;
}

/**
 * Recursively rewrite every `fileName` on a symbol tree
 * to a POSIX path relative to `rootDirectory`.
 *
 * @internal
 */
export function sanitiseFileNames(
  symbols: DocEntry[],
  rootDirectory: string,
) {
  for (const symbol of symbols) {
    if (symbol.fileName) {
      symbol.fileName = relative(
        rootDirectory, symbol.fileName,
      );
    }

    if (symbol.parameters) {
      sanitiseFileNames(
        symbol.parameters, rootDirectory,
      );
    }

    if (symbol.methods) {
      sanitiseFileNames(
        symbol.methods, rootDirectory,
      );
    }

    if (symbol.properties) {
      sanitiseFileNames(
        symbol.properties, rootDirectory,
      );
    }

    if (symbol.constructors) {
      for (const constructor of symbol.constructors) {
        if (constructor.parameters) {
          sanitiseFileNames(
            constructor.parameters, rootDirectory,
          );
        }
      }
    }
  }
}

/**
 * Extract documented symbols for a single entry. The
 * `inputFile` may point at a file or a directory; a
 * directory is expanded via {@link listSourceFiles}.
 * Symbols tagged `@internal` are filtered out and any
 * absolute paths are sanitised relative to
 * `rootDirectory`. Returns `[]` and warns on failure
 * so a single broken entry never aborts the build.
 *
 * @internal
 */
function extractSymbols(
  inputFile: string,
  rootDirectory: string,
  exportPath: string,
) {
  try {
    let stat;
    try {
      stat = statSync(inputFile);
    } catch {
      // Path may not exist or omit an extension —
      // delegate handling to buildDocumentation.
    }

    const inputFiles = stat?.isDirectory() ?
      listSourceFiles(inputFile) :
      [inputFile];

    if (inputFiles.length === 0) return [];

    const symbols = buildDocumentation({
      inputFiles,
      options: { explore: true, types: true },
    });

    const visible = symbols.filter((s) => !isInternal(s));
    sanitiseFileNames(visible, rootDirectory);
    return visible;
  } catch (error) {
    console.warn(
      `[docs] Failed for ${exportPath}:`, error,
    );
    return [];
  }
}

/**
 * Extract documentation from all build entries.
 *
 * @internal
 */
export function resolveDocuments(
  context: BuildContext,
): DocumentsManifest {
  const rootDirectory = context.options.rootDir;

  const manifest: DocumentsManifest = {
    name: context.pkg.name,
    version: context.pkg.version,
    generatedAt: new Date().toISOString(),
    exports: {},
  };

  for (const entry of context.options.entries) {
    const exportPath = resolveExportPath(entry.name);
    const previous = manifest.exports[exportPath];
    if (previous) {
      throw new DuplicateExportPathError(
        exportPath, previous.entryFile, entry.input,
      );
    }

    const inputFile = path.resolve(rootDirectory, entry.input);

    const symbols = extractSymbols(
      inputFile, rootDirectory, exportPath,
    );

    manifest.exports[exportPath] = {
      entryFile: relative(rootDirectory, inputFile),
      symbols,
      symbolCount: symbols.length,
    };
  }

  return manifest;
}
