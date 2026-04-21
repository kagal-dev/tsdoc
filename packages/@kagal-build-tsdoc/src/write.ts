// Document output and logging

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { DocumentsManifest } from './types';
import { DuplicateOutputFileError } from './errors';

const MANIFEST_BASENAME = 'api';

/**
 * Convert an export path into a flat output filename
 * (without extension or `api_` prefix).
 *
 * @internal
 */
export function sanitiseExportPath(
  exportPath: string,
): string {
  if (exportPath === '.') return 'index';
  return exportPath
    .replace(/^\.\//, '')
    .replaceAll('/', '__');
}

/**
 * Write per-export JSON files and a unified manifest.
 *
 * Per-export files are written as `api_<name>.json` so
 * they cannot collide with the `api.json` manifest, even
 * for a package whose exports include `./api`.
 *
 * @internal
 */
export function writeDocuments(
  outputDirectory: string,
  manifest: DocumentsManifest,
) {
  mkdirSync(outputDirectory, { recursive: true });

  const seen = new Map<string, string>();

  for (const [exportPath, entry] of
    Object.entries(manifest.exports)) {
    const fileName =
      `${MANIFEST_BASENAME}_${sanitiseExportPath(exportPath)}`;
    const previous = seen.get(fileName);
    if (previous !== undefined) {
      throw new DuplicateOutputFileError(
        fileName, previous, exportPath,
      );
    }
    seen.set(fileName, exportPath);

    writeFileSync(
      path.resolve(outputDirectory, `${fileName}.json`),
      JSON.stringify(entry.symbols, undefined, 2) + '\n',
    );
  }

  writeFileSync(
    path.resolve(outputDirectory, `${MANIFEST_BASENAME}.json`),
    JSON.stringify(manifest, undefined, 2) + '\n',
  );
}

/**
 * Log extraction summary.
 *
 * @internal
 */
export function logDocuments(
  manifest: DocumentsManifest,
) {
  const exports = Object.keys(manifest.exports).length;
  const symbols = Object.values(manifest.exports)
    .reduce(
      (sum, entry) => sum + entry.symbolCount, 0,
    );

  console.log(
    `[docs] ${exports} exports, ${symbols} symbols`,
  );
}
