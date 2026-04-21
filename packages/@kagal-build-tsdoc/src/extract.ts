// Symbol extraction from TypeScript sources

import path from 'node:path';

import type { BuildContext } from 'unbuild';
import {
  buildDocumentation,
  type DocEntry,
} from 'tsdoc-markdown';

import type { DocumentsManifest } from './types';
import { DuplicateExportPathError } from './errors';

function resolveExportPath(name: string | undefined) {
  return name === 'index' || !name ?
    '.' :
    `./${name}`;
}

function relative(from: string, to: string): string {
  return path.relative(from, to).split(path.sep).join('/');
}

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

function extractSymbols(
  inputFile: string,
  rootDirectory: string,
  exportPath: string,
) {
  try {
    const symbols = buildDocumentation({
      inputFiles: [inputFile],
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

    const symbols = extractSymbols(
      entry.input, rootDirectory, exportPath,
    );

    manifest.exports[exportPath] = {
      entryFile: relative(rootDirectory, entry.input),
      symbols,
      symbolCount: symbols.length,
    };
  }

  return manifest;
}
