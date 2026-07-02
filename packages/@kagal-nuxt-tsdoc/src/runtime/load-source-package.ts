// @kagal/nuxt-tsdoc — package loading

/** Loads a parsed package from a `*.api.json` manifest file. */
export type PackageLoader<T> = (file: string) => T;

/**
 * Load a source's package, rethrowing any failure with the offending
 * source name and path while preserving the cause.
 *
 * A configured source whose `*.api.json` cannot be read is a broken
 * build artefact, not an expected absence, so the failure is fatal by
 * design: it aborts the prerender rather than rendering a misleading
 * empty page. (An unmatched `source` *name*, by contrast, is a soft
 * warn-and-empty — see `resolveSource`.)
 */
export function loadSourcePackage<T>(
  source: { name: string; path: string },
  load: PackageLoader<T>,
): T {
  try {
    return load(source.path);
  } catch (error) {
    throw new Error(
      `<APIPackage source="${source.name}"> failed to load ` +
      `manifest "${source.path}".`,
      { cause: error },
    );
  }
}
