// @kagal/nuxt-tsdoc types

import type { InferOutput } from 'valibot';

import type { moduleOptionsSchema, sourceSchema } from './schema';

/** A single documentation source. */
export type Source = InferOutput<typeof sourceSchema>;

/** Options for the `@kagal/nuxt-tsdoc` module. */
export type ModuleOptions = InferOutput<
  typeof moduleOptionsSchema
>;

/** Private runtime config contributed by the module. */
interface TSDocRuntimeConfig {
  /** CSS class-name prefix applied to the rendered output. */
  prefix: string
  /**
   * Resolved documentation sources. Each `name` is an
   * `<APIPackage source>` key; each `path` is the absolute
   * `*.api.json` manifest the server component loads at render
   * time.
   */
  sources: Source[]
}

// `useRuntimeConfig()` resolves against `nuxt/schema`; `@nuxt/schema`
// extends it (and re-exports it upstream), so augmenting the base
// here also types the module's own `nuxt.options.runtimeConfig`.
// Without this, Nuxt's generated runtime-config types infer the
// array element as `{}`.
declare module 'nuxt/schema' {
  interface RuntimeConfig {
    tsdoc: TSDocRuntimeConfig
  }
}
