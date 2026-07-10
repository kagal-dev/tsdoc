// cspell:words deserialiser
// File-based loader for the api-extractor-model typed graph. Wraps
// `ApiPackage.loadFromJsonFile` so a consumer depends on
// `@kagal/model-tsdoc` alone to read `*.api.json` manifests back
// into the model.

import { APIPackage } from './model';

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
 * @returns The loaded package.
 */
export function loadPackage(file: string): APIPackage {
  return APIPackage.loadFromJsonFile(file);
}
