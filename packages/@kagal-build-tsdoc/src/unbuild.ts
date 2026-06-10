// unbuild shim: structural types for unbuild's `build:done`
// hook context, the cast that validates it, the extraction
// loop over its entries, and the hook-map factory.
//
// unbuild is not imported at type or runtime. Each interface
// is the minimum subset the helper reads; consumers pass
// their real BuildContext directly because it satisfies
// these shapes structurally.

import {
  checkDuplicateName,
  InvalidBuildEntryError,
  UnrecognisedBuildContextError,
} from './errors';
import { extractEntryManifest } from './extract';

/**
 * Minimum subset of unbuild's `BuildEntry` the helper reads.
 * unbuild resolves `name` itself during option normalisation
 * (relative input minus the `src/` prefix and the extension)
 * and resolves `outDir` to an absolute path — both before any
 * hook fires — so bundler-given entries always carry them.
 */
export interface UnbuildBuildHookEntry {
  name?: string
  outDir?: string
}

/**
 * Minimum subset of unbuild's `BuildContext` consumed by the
 * `build:done` hook of {@link newUnbuildHooks}. `options.stub`
 * is unbuild's
 * workspace-wide stub flag — when `true`, the helper skips the
 * entire call because stub builds emit re-export shims rather
 * than real rolled declarations.
 */
export interface UnbuildBuildHookContext {
  options: {
    entries: UnbuildBuildHookEntry[]
    rootDir: string
    stub: boolean
  }
}

/**
 * Cast a value to {@link UnbuildBuildHookContext} if it
 * structurally matches, otherwise `undefined`. Verifies
 * `options.entries` is an array, `options.rootDir` is a
 * string, and `options.stub` is a boolean — the three
 * fields the `build:done` hook of {@link newUnbuildHooks}
 * reads — so misroutes surface here instead of as a cryptic
 * `TypeError` from the loop or per-entry call.
 */
export function asUnbuildContext(
  context: unknown,
): UnbuildBuildHookContext | undefined {
  if (
    typeof context === 'object' &&
    context !== null &&
    'options' in context &&
    typeof context.options === 'object' &&
    context.options !== null &&
    'entries' in context.options &&
    Array.isArray(context.options.entries) &&
    'rootDir' in context.options &&
    typeof context.options.rootDir === 'string' &&
    'stub' in context.options &&
    typeof context.options.stub === 'boolean'
  ) {
    return context as UnbuildBuildHookContext;
  }
  return undefined;
}

/**
 * Resolve an unbuild entry's name. Bundler-given entries
 * always carry one — unbuild fills `name` in before any hook
 * fires — so a missing name means the entry is not
 * bundler-given.
 *
 * @throws InvalidBuildEntryError when `name` is absent
 */
function unbuildEntryName(entry: UnbuildBuildHookEntry): string {
  if (typeof entry.name === 'string') {
    return entry.name;
  }
  throw new InvalidBuildEntryError(entry);
}

/**
 * Extraction loop behind the `build:done` hook of
 * {@link newUnbuildHooks}: validates the hook context,
 * short-circuits stub builds, and extracts every entry via
 * {@link extractEntryManifest}, honouring per-entry `outDir`.
 *
 * @throws DuplicateEntryNameError - two entries resolved to
 *   the same entry name
 * @throws InvalidBuildEntryError - an entry carries no
 *   bundler-resolved `name`
 * @throws UnrecognisedBuildContextError - the context does
 *   not match unbuild's shape
 */
export function extractUnbuildEntries(context: unknown): void {
  const unbuild = asUnbuildContext(context);
  if (!unbuild) {
    throw new UnrecognisedBuildContextError();
  }
  if (unbuild.options.stub) {
    return;
  }
  const projectFolder = unbuild.options.rootDir;
  const seen = new Set<string>();
  for (const entry of unbuild.options.entries) {
    const entryName = unbuildEntryName(entry);
    checkDuplicateName(seen, entryName);
    extractEntryManifest({
      projectFolder,
      entryName,
      outDir: entry.outDir,
    });
  }
}

/** Hook map returned by {@link newUnbuildHooks}. */
export interface UnbuildHooks {
  /**
   * Wire to unbuild's `build:done` hook. Validates the
   * context, skips stub builds, and extracts every
   * bundler-resolved entry in `ctx.options.entries` via
   * {@link extractEntryManifest}.
   */
  'build:done': (context: UnbuildBuildHookContext) => void
}

/**
 * Build the unbuild hook map for API extraction. unbuild's
 * `build:done` context carries everything extraction needs
 * (`options.entries`, `options.rootDir`, `options.stub`), so
 * the map holds a single self-contained hook. Keyed by hook
 * name so it spreads straight into `hooks`:
 *
 * ```ts
 * export default defineBuildConfig({
 *   entries: [{ input: 'src/index', name: 'index' }],
 *   declaration: true,
 *   hooks: { ...newUnbuildHooks() },
 * });
 * ```
 *
 * To combine extraction with other post-build steps, keep the
 * map in a variable and call its hook from your own wrapper.
 */
export function newUnbuildHooks(): UnbuildHooks {
  return {
    'build:done': extractUnbuildEntries,
  };
}
