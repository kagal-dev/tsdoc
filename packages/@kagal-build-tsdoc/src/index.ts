// @kagal/build-tsdoc — build-hook adapter for @microsoft/api-extractor
//
// Callers (a bundler hook, a CI script, a one-shot probe) invoke
// `extractEntryManifest` once per entry to write a standard
// `<entryName>.api.json` next to the rolled declarations. The
// resulting file is `@microsoft/api-extractor-model`'s wire format,
// loadable with `ApiPackage.loadFromJsonFile()`. Bundler users
// wire the `newUnbuildHooks()` / `newOBuildHooks()` hook maps
// instead of calling it directly.

import pkg from '../package.json' with { type: 'json' };

export {
  DuplicateEntryNameError,
  HooksNotWiredError,
  InvalidBuildEntryError,
  UnrecognisedBuildContextError,
} from './errors';
export {
  extractEntryManifest,
  type ExtractEntryOptions,
  type ExtractEntryResult,
} from './extract';
export {
  asOBuildContext,
  newOBuildHooks,
  type OBuildBuildHookContext,
  type OBuildBuildHookEntry,
  type OBuildHooks,
} from './obuild';
export {
  asUnbuildContext,
  newUnbuildHooks,
  type UnbuildBuildHookContext,
  type UnbuildBuildHookEntry,
  type UnbuildHooks,
} from './unbuild';
export type { NewlineKind } from './utils';

/** Package version from package.json. */
export const VERSION: string = pkg.version;
