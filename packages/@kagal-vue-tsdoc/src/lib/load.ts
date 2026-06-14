// cspell:words deserialiser
// File-based loader for the api-extractor-model typed graph the
// components render. Wraps `ApiPackage.loadFromJsonFile` so consumers
// depend on `@kagal/vue-tsdoc` alone for both loading and rendering,
// keeping `@microsoft/api-extractor-model` the single source of truth
// for the model here.

import {
  ApiPackage,
  type ApiPackage as APIPackage,
} from '@microsoft/api-extractor-model';

/**
 * Load an {@link APIPackage} from a `*.api.json` manifest on disk.
 *
 * File-based by necessity: api-extractor-model exposes
 * `ApiPackage.loadFromJsonFile` but keeps its deserialiser context
 * (`DeserializerContext`, `ApiJsonSchemaVersion`) off the public
 * surface, so there is no supported way to rehydrate a package from
 * an in-memory object — only from a path. Node-only, as it reads the
 * filesystem.
 *
 * @param file - Path to the `*.api.json` manifest.
 * @returns The loaded package, ready to pass to `APIPackageView`.
 */
export function loadPackage(file: string): APIPackage {
  return ApiPackage.loadFromJsonFile(file);
}
