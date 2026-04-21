// Error types thrown by the documents pipeline

/**
 * Thrown when two build entries resolve to the same
 * manifest export path.
 */
export class DuplicateExportPathError extends Error {
  constructor(
    /** Resolved export path that collided. */
    readonly exportPath: string,
    /** POSIX-relative path of the entry already recorded. */
    readonly previousEntryFile: string,
    /** Input of the entry that triggered the collision. */
    readonly conflictingInput: string,
  ) {
    super(
      `[docs] Duplicate export path '${exportPath}' ` +
      `(entries '${previousEntryFile}' and ` +
      `'${conflictingInput}')`,
    );
    this.name = 'DuplicateExportPathError';
  }
}

/**
 * Thrown when two export paths sanitise to the same
 * output filename.
 */
export class DuplicateOutputFileError extends Error {
  constructor(
    /** Filename (without `.json`) that collided. */
    readonly fileName: string,
    /** Export path already recorded with this filename. */
    readonly previousExportPath: string,
    /** Export path that triggered the collision. */
    readonly conflictingExportPath: string,
  ) {
    super(
      '[docs] Duplicate output filename ' +
      `'${fileName}.json' (export paths ` +
      `'${previousExportPath}' and ` +
      `'${conflictingExportPath}')`,
    );
    this.name = 'DuplicateOutputFileError';
  }
}
