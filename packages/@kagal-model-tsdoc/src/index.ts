// @kagal/model-tsdoc — the shared api-extractor-model foundation
// of the @kagal tsdoc family. build-tsdoc writes `*.api.json`
// manifests, vue-tsdoc renders the model graph, nuxt-tsdoc wires
// the two into Nuxt; this package is where they meet — loading
// manifests back into the model, and the multi-entry contract
// pairing a package's per-entry manifests with the subpath each
// documents.
//
// Scaffold: the surface is limited to `VERSION` while the shared
// helpers migrate here from the siblings.

import pkg from '../package.json' with { type: 'json' };

/** Package version from `package.json`. */
export const VERSION: string = pkg.version;
