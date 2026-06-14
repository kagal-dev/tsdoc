// @kagal/vue-tsdoc — Vue components for rendering
// api-extractor-model graphs.

import pkg from '../package.json' with { type: 'json' };

export { default as APIItemView } from './components/api-item-view.vue';
export { default as APIPackageView } from './components/api-package-view.vue';

export { default } from './plugin';
export type { VueTSDocOptions } from './plugin';

export { useAPIClasses } from './lib/classes';
export type { APIClasses } from './lib/classes';

export { providePrefix } from './lib/prefix';

export { loadPackage } from './lib/load';

// Re-export the model types consumers need to type their props.
// Keeps the `@microsoft/api-extractor-model` dependency the single
// source of truth for the typed graph.
export type {
  ApiItem as APIItem,
  ApiPackage as APIPackage,
} from '@microsoft/api-extractor-model';

/** Package version from `package.json`. */
export const VERSION: string = pkg.version;
