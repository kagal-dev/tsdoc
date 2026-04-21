// @kagal/build-tsdoc — TSDoc extraction hook for unbuild

import path from 'node:path';

import type { BuildContext } from 'unbuild';

import pkg from '../package.json' with { type: 'json' };

import { resolveDocuments } from './extract';
import {
  DEFAULT_OUTPUT_DIRECTORY,
  type DocumentsHookOptions,
} from './types';
import { logDocuments, writeDocuments } from './write';

export {
  DuplicateExportPathError,
  DuplicateOutputFileError,
} from './errors';
export {
  DEFAULT_OUTPUT_DIRECTORY,
  type DocEntry,
  type DocumentsHookOptions,
  type DocumentsManifest,
  type ExportManifest,
} from './types';

/** Package version from package.json. */
export const VERSION: string = pkg.version;

/**
 * Create an unbuild `build:done` hook that extracts
 * TSDoc symbols from each entry point and writes
 * per-export JSON files plus a unified `api.json`
 * manifest.
 *
 * @param options - hook configuration
 * @returns unbuild `build:done` hook handler
 *
 * @example
 * ```typescript
 * import { newDocumentsHook } from '@kagal/build-tsdoc';
 * import { defineBuildConfig } from 'unbuild';
 *
 * export default defineBuildConfig({
 *   entries: [
 *     { input: 'src/index', name: 'index' },
 *     { input: 'src/types/index', name: 'types' },
 *   ],
 *   hooks: {
 *     'build:done': newDocumentsHook(),
 *   },
 * });
 * ```
 */
export function newDocumentsHook(
  options?: DocumentsHookOptions,
) {
  const target = options?.outputDirectory ?? DEFAULT_OUTPUT_DIRECTORY;

  return (context: BuildContext) => {
    if (context.options.stub) return;

    const manifest = resolveDocuments(context);
    const outputDirectory = path.resolve(
      context.options.rootDir, target,
    );

    writeDocuments(outputDirectory, manifest);
    logDocuments(manifest);
  };
}
