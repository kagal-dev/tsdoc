// Error classes for the bundler shims, plus the guard helper
// that raises the duplicate-name error. Leaf module: imports
// nothing internal so the shims can depend on it.

/**
 * Thrown when two entries in the same build resolve to the
 * same `entryName`. The bundler hooks own this check because
 * only they see the full entry list with derived names
 * applied.
 */
export class DuplicateEntryNameError extends Error {
  constructor(public readonly entryName: string) {
    super(`duplicate entry name: ${entryName}`);
    this.name = 'DuplicateEntryNameError';
  }
}

/**
 * Thrown by the `end` hook of the obuild hook-pair factory
 * when the paired `entries` hook never fired. The factory
 * must be wired to both hooks: only the `entries` hook sees
 * the bundler-resolved entries (absolute paths, effective
 * `stub` flags) that extraction detects from.
 */
export class HooksNotWiredError extends Error {
  constructor() {
    super(
      'obuild `entries` hook did not fire before `end`; ' +
      'wire both hooks from newOBuildHooks()',
    );
    this.name = 'HooksNotWiredError';
  }
}

/**
 * Thrown when an entry is not a bundler-given build entry —
 * missing the bundler-resolved data the helper reads (unbuild
 * fills `name` in before hooks fire; obuild entries carry
 * `input`). Hand-written name lists are rejected by design:
 * only the bundler's own entries carry real paths and the
 * effective `stub` flag.
 */
export class InvalidBuildEntryError extends Error {
  constructor(public readonly entry: unknown) {
    super(
      'build entry is missing bundler-resolved data; ' +
      'pass the bundler\'s own entries',
    );
    this.name = 'InvalidBuildEntryError';
  }
}

/**
 * Thrown when the passed context matches no known bundler
 * shape. Surfaces misroutes at the boundary instead of as a
 * cryptic `TypeError` from the helper reading `rootDir` or
 * `pkgDir` on the unmatched argument.
 */
export class UnrecognisedBuildContextError extends Error {
  constructor() {
    super(
      'build-hook context does not match a supported bundler',
    );
    this.name = 'UnrecognisedBuildContextError';
  }
}

/** Record a resolved entry name, throwing on collision. */
export function checkDuplicateName(
  seen: Set<string>,
  entryName: string,
): void {
  if (seen.has(entryName)) {
    throw new DuplicateEntryNameError(entryName);
  }
  seen.add(entryName);
}
