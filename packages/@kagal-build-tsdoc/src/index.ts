// @kagal/build-tsdoc — build-hook adapter for @microsoft/api-extractor
//
// Callers (a bundler hook, a CI script, a one-shot probe) invoke
// `extractEntryManifest` once per entry to write a standard
// `<entryName>.api.json` next to the rolled declarations. The
// resulting file is `@microsoft/api-extractor-model`'s wire format,
// loadable with `ApiPackage.loadFromJsonFile()`.

import pkg from '../package.json' with { type: 'json' };

export {
  extractEntryManifest,
  type ExtractEntryOptions,
  type ExtractEntryResult,
} from './extract';

/** Package version from package.json. */
export const VERSION: string = pkg.version;
