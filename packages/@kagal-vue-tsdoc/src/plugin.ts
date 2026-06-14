// Vue plugin entry. Installs a per-app default class-name prefix
// consumed by every presentational component via `usePrefix`.

import type { App, Plugin } from 'vue';

import { DEFAULT_PREFIX, PREFIX_KEY } from './lib/prefix';

export interface VueTSDocOptions {
  /**
   * Class-name prefix applied to every component's output.
   * Default: `'api-'` (e.g. `api-package`, `api-item api-class`).
   */
  prefix?: string
}

const plugin: Plugin<[VueTSDocOptions?]> = {
  install(app: App, options: VueTSDocOptions = {}) {
    app.provide(PREFIX_KEY, options.prefix ?? DEFAULT_PREFIX);
  },
};

export default plugin;
