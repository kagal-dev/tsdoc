// @kagal/nuxt-tsdoc — valibot schemas

import * as v from 'valibot';

/** Schema for a single documentation source. */
export const sourceSchema = v.object({
  /** Display name (usually the npm package name). */
  name: v.pipe(v.string(), v.minLength(1)),
  /**
   * Path to the source's `*.api.json` manifest — absolute, or
   * relative to the Nuxt root (resolved by the module).
   */
  path: v.pipe(v.string(), v.minLength(1)),
});

/** Schema for the `@kagal/nuxt-tsdoc` module options. */
export const moduleOptionsSchema = v.object({
  /**
   * Documentation sources. Each entry points at an
   * `*.api.json` manifest produced by `@kagal/build-tsdoc`.
   * The module resolves every path to absolute and exposes
   * the lookup to the `<APIPackage>` server component, which
   * loads the matching manifest at render time.
   *
   * Names must be unique: `<APIPackage source>` resolves by
   * name, so a duplicate would be unreachable. Repeats are
   * rejected, naming the offender.
   */
  sources: v.pipe(
    v.array(sourceSchema),
    v.rawCheck(({ dataset, addIssue }) => {
      if (!dataset.typed) return;
      const seen = new Set<string>();
      for (const { name } of dataset.value) {
        if (seen.has(name)) {
          addIssue({ message: `duplicate source name: "${name}"` });
        }
        seen.add(name);
      }
    }),
  ),
  /**
   * CSS class-name prefix for the rendered output. `<APIPackage>`
   * applies it to the `@kagal/vue-tsdoc` component subtree
   * (e.g. `api-package`, `api-item api-class`). Default `api-`.
   */
  prefix: v.optional(v.pipe(v.string(), v.minLength(1)), 'api-'),
});
