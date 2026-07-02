// @kagal/nuxt-tsdoc — Nuxt module entry

import path from 'node:path';

import {
  addComponent,
  createResolver,
  defineNuxtModule,
} from '@nuxt/kit';
import * as v from 'valibot';

import pkg from '../package.json' with { type: 'json' };

import type { ModuleOptions } from './types';
import { moduleOptionsSchema } from './schema';

export type {
  ModuleOptions,
  Source,
} from './types';

export {
  moduleOptionsSchema,
  sourceSchema,
} from './schema';

/** Package version from `package.json`. */
export const VERSION: string = pkg.version;

/**
 * `@kagal/nuxt-tsdoc` Nuxt module.
 *
 * Registers the `<APIPackage>` component, which renders a
 * `@microsoft/api-extractor-model` manifest with
 * `@kagal/vue-tsdoc`. Each configured source is resolved to an
 * absolute manifest path and exposed through the private runtime
 * config for the component to load.
 *
 * Rendering is server-only (a Nuxt island): the heavy
 * `@microsoft/api-extractor-model` dependency never reaches the
 * client bundle, so pages using `<APIPackage>` must be
 * prerendered.
 *
 * @example
 * ```ts
 * // nuxt.config.ts
 * export default defineNuxtConfig({
 *   modules: ['@kagal/nuxt-tsdoc'],
 *   tsdoc: {
 *     sources: [
 *       {
 *         name: '@kagal/build-tsdoc',
 *         path: '/path/to/build-tsdoc/dist/index.api.json',
 *       },
 *     ],
 *   },
 * });
 * ```
 *
 * ```vue
 * <template>
 *   <APIPackage source="@kagal/build-tsdoc" />
 * </template>
 * ```
 */
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@kagal/nuxt-tsdoc',
    configKey: 'tsdoc',
    version: pkg.version,
  },
  defaults: {
    sources: [],
  },
  setup(options, nuxt) {
    const result = v.safeParse(moduleOptionsSchema, options);
    if (!result.success) {
      throw new Error(
        '[nuxt-tsdoc] Invalid module options: ' +
        JSON.stringify(result.issues, undefined, 2),
      );
    }

    // Resolve each manifest path to absolute (relative paths
    // resolve against the Nuxt root) and expose the list through
    // the private runtime config for the server component. Stored
    // as an array — a name-keyed object would make Nuxt infer a
    // literal-key type with no string index signature.
    const sources = result.output.sources.map((source) => ({
      name: source.name,
      path: path.isAbsolute(source.path) ?
        source.path :
        path.resolve(nuxt.options.rootDir, source.path),
    }));
    nuxt.options.runtimeConfig.tsdoc = {
      sources,
      prefix: result.output.prefix,
    };

    // The renderer is a server island, keeping `@kagal/vue-tsdoc`
    // and its `@microsoft/api-extractor-model` dependency out of
    // the client bundle.
    nuxt.options.experimental.componentIslands = true;

    // Keep `@microsoft/api-extractor-model` external in the server
    // build. It is CommonJS and resolves schema files via
    // `__dirname`, which is undefined once Vite inlines it into an
    // ESM chunk; externalising lets Node load it natively.
    nuxt.options.vite.ssr ??= {};
    const ssrExternal = nuxt.options.vite.ssr.external;
    // `external: true` already externalises everything; only extend
    // the array form so an explicit list is preserved, not clobbered.
    if (ssrExternal !== true) {
      nuxt.options.vite.ssr.external = [
        ...(Array.isArray(ssrExternal) ? ssrExternal : []),
        '@microsoft/api-extractor-model',
      ];
    }

    const { resolve } = createResolver(import.meta.url);
    addComponent({
      name: 'APIPackage',
      filePath: resolve('./runtime/components/api-package.server.vue'),
      mode: 'server',
    });
  },
});
