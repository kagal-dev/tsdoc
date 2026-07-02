// @kagal/nuxt-tsdoc — source resolution

/**
 * Resolve the configured source whose `name` matches `name`, or
 * `undefined` when none does.
 *
 * `<APIPackage source>` keys by name. The return value is the signal —
 * a valid source or `undefined` — and the caller decides how to handle
 * a miss; the island throws so the build fails loudly rather than
 * rendering an empty page.
 */
export function resolveSource<T extends { name: string }>(
  sources: readonly T[],
  name: string,
): T | undefined {
  return sources.find((entry) => entry.name === name);
}
