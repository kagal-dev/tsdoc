// @kagal/model-tsdoc — the shared api-extractor-model foundation
// of the @kagal tsdoc family. build-tsdoc writes `*.api.json`
// manifests, vue-tsdoc renders the model graph, nuxt-tsdoc wires
// the two into Nuxt; this package is where they meet — today,
// loading manifests back into the model; next, the multi-entry
// contract pairing a package's per-entry manifests with the
// subpath each documents.

import pkg from '../package.json' with { type: 'json' };

export * from './model';

export { loadPackage } from './load';

export { excerptText, initializerText } from './excerpt';

/** Package version from `package.json`. */
export const VERSION: string = pkg.version;
