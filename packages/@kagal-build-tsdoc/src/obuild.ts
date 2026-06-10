// obuild shim: structural types for obuild's hook context and
// entries, the casts that validate them, the extraction loop
// over bundler-given entries, and the hook-pair factory that
// captures them from the `entries` hook for the `end` hook.
//
// obuild is not imported at type or runtime. Each interface
// is the minimum subset the helper reads; consumers pass
// their real BuildContext and entries directly because they
// satisfy these shapes structurally.

import path from 'node:path';

import {
  checkDuplicateName,
  HooksNotWiredError,
  InvalidBuildEntryError,
  UnrecognisedBuildContextError,
} from './errors';
import { extractEntryManifest } from './extract';

/**
 * Minimum subset of obuild's `BuildEntry` the helper reads.
 * Entries must be bundler-given — captured from obuild's
 * `entries` hook via {@link newOBuildHooks} — so `input` and
 * the effective `stub` flag are real. `type` is read only to
 * skip `'transform'` entries, which emit per-file declarations
 * rather than a single rollup.
 */
export interface OBuildBuildHookEntry {
  input: string | string[]
  outDir?: string
  stub?: boolean
  type?: string
}

/**
 * Minimum subset of obuild's `BuildContext` consumed by the
 * `end` hook of {@link newOBuildHooks}. obuild's hook context
 * does not carry entries — the paired `entries` hook captures
 * them.
 */
export interface OBuildBuildHookContext {
  pkg: object
  pkgDir: string
}

/**
 * Cast a value to {@link OBuildBuildHookContext} if it
 * structurally matches, otherwise `undefined`. Discriminator
 * is `pkgDir` being a string and `pkg` being a non-null
 * object — obuild's `BuildContext` always carries both.
 */
export function asOBuildContext(
  context: unknown,
): OBuildBuildHookContext | undefined {
  if (
    typeof context === 'object' &&
    context !== null &&
    'pkgDir' in context &&
    typeof context.pkgDir === 'string' &&
    'pkg' in context &&
    typeof context.pkg === 'object' &&
    context.pkg !== null
  ) {
    return context as OBuildBuildHookContext;
  }
  return undefined;
}

/**
 * Cast a value to {@link OBuildBuildHookEntry} if it carries a
 * usable `input` (a string, or a non-empty array of strings),
 * otherwise `undefined`. Entries failing this are not
 * bundler-given — e.g. hand-written name lists or raw string
 * entries, neither of which can carry the effective `stub`
 * flag.
 */
function asOBuildEntry(
  entry: unknown,
): OBuildBuildHookEntry | undefined {
  if (
    typeof entry !== 'object' ||
    entry === null ||
    !('input' in entry)
  ) {
    return undefined;
  }
  const { input } = entry;
  if (typeof input === 'string') {
    return entry as OBuildBuildHookEntry;
  }
  if (
    Array.isArray(input) &&
    input.length > 0 &&
    input.every((p) => typeof p === 'string')
  ) {
    return entry as OBuildBuildHookEntry;
  }
  return undefined;
}

/**
 * Derive an entry name the way rolldown names chunks: input
 * basename minus the final extension (`./src/bin.ts` → `bin`).
 * obuild entries carry no `name`, so this is the only mapping
 * from inputs to the dist files rolldown emits.
 */
function entryNameFromInput(input: string): string {
  const base = path.basename(input);
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(0, dot) : base;
}

/**
 * Extraction loop behind the `end` hook of
 * {@link newOBuildHooks}: validates the hook
 * context and each bundler-given entry, skips stub and
 * `'transform'` entries, and extracts every input of each
 * bundle entry via {@link extractEntryManifest}, honouring
 * per-entry `outDir`.
 *
 * @throws DuplicateEntryNameError - two inputs resolved to
 *   the same entry name
 * @throws InvalidBuildEntryError - an entry carries no usable
 *   `input`
 * @throws UnrecognisedBuildContextError - the context does
 *   not match obuild's shape
 */
export function extractOBuildEntries(
  entries: readonly OBuildBuildHookEntry[],
  context: unknown,
): void {
  const obuild = asOBuildContext(context);
  if (!obuild) {
    throw new UnrecognisedBuildContextError();
  }
  const seen = new Set<string>();
  for (const rawEntry of entries) {
    const entry = asOBuildEntry(rawEntry);
    if (!entry) {
      throw new InvalidBuildEntryError(rawEntry);
    }
    if (entry.stub || entry.type === 'transform') {
      continue;
    }
    const inputs = Array.isArray(entry.input) ?
      entry.input :
      [entry.input];
    for (const input of inputs) {
      const entryName = entryNameFromInput(input);
      checkDuplicateName(seen, entryName);
      extractEntryManifest({
        projectFolder: obuild.pkgDir,
        entryName,
        outDir: entry.outDir,
      });
    }
  }
}

/** Hook pair returned by {@link newOBuildHooks}. */
export interface OBuildHooks {
  /**
   * Wire to obuild's `entries` hook. Captures the
   * bundler-resolved entries (real paths, effective `stub`
   * flags) for the paired `end` hook.
   */
  entries: (entries: OBuildBuildHookEntry[]) => void

  /**
   * Wire to obuild's `end` hook. Validates the context,
   * skips stub and `'transform'` entries, and extracts
   * every input of each captured bundle entry via
   * {@link extractEntryManifest}.
   *
   * @throws HooksNotWiredError when the paired `entries` hook
   *   never fired
   */
  end: (context: OBuildBuildHookContext) => void
}

/**
 * Build the obuild hook pair for API extraction. obuild's `end`
 * hook does not carry entries, and only the `entries` hook sees
 * them bundler-resolved (absolute paths, effective `stub`
 * flags), so extraction needs both: the returned `entries`
 * callback captures them in a closure and `end` extracts the
 * capture. Keyed by hook name so the pair spreads straight
 * into `hooks`:
 *
 * ```ts
 * export default defineBuildConfig({
 *   entries: [{ type: 'bundle', input: ['./src/index.ts'] }],
 *   hooks: { ...newOBuildHooks() },
 * });
 * ```
 *
 * To combine extraction with other post-build steps, keep the
 * pair in a variable and call its hooks from your own wrappers.
 */
export function newOBuildHooks(): OBuildHooks {
  let captured: OBuildBuildHookEntry[] | undefined;
  return {
    entries(entries: OBuildBuildHookEntry[]): void {
      captured = entries;
    },
    end(context: OBuildBuildHookContext): void {
      if (!captured) {
        throw new HooksNotWiredError();
      }
      extractOBuildEntries(captured, context);
    },
  };
}
