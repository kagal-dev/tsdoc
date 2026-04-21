// @kagal/build-tsdoc types

import type { DocEntry } from 'tsdoc-markdown';

export type { DocEntry } from 'tsdoc-markdown';

/** Per-export documentation manifest entry. */
export interface ExportManifest {
  /** Entry file path relative to package root. */
  entryFile: string
  /** Number of documented symbols. */
  symbolCount: number
  /** Extracted TSDoc symbol entries. */
  symbols: DocEntry[]
}

/** Top-level documentation manifest for a package. */
export interface DocumentsManifest {
  /** Export path to manifest mapping. */
  exports: Record<string, ExportManifest>
  /** ISO 8601 generation timestamp. */
  generatedAt: string
  /** Package name from `package.json`. */
  name?: string
  /** Package version from `package.json`. */
  version?: string
}

/**
 * Default output directory for extracted documentation.
 *
 * @see {@link DocumentsHookOptions.outputDirectory}
 */
export const DEFAULT_OUTPUT_DIRECTORY = '_docs';

/** Options for {@link newDocumentsHook}. */
export interface DocumentsHookOptions {
  /**
   * Output directory, relative to the package root.
   *
   * @defaultValue {@link DEFAULT_OUTPUT_DIRECTORY} (`'_docs'`)
   */
  outputDirectory?: string
}
