// Per-tree CSS-class prefix exposed by the Vue plugin and consumed
// by every presentational component. Lets a host app override the
// default `api-` namespace via `app.use(VueTSDoc, { prefix: '…' })`
// without prop-drilling through the recursive renderer.

import { inject, type InjectionKey, provide } from 'vue';

export const DEFAULT_PREFIX = 'api-';

export const PREFIX_KEY: InjectionKey<string> = Symbol('vue-tsdoc:prefix');

/**
 * The active class-name prefix for the current component subtree.
 * Falls back to {@link DEFAULT_PREFIX} when no plugin has been
 * installed (e.g. when a component is mounted stand-alone in a
 * unit test).
 */
export function usePrefix(): string {
  return inject(PREFIX_KEY, DEFAULT_PREFIX);
}

/**
 * Set the class-name prefix for the calling component's subtree.
 * Call from a host component's `setup` to override the default
 * without installing the plugin app-wide — useful where an
 * app-level `provide` does not reach the render tree, such as a
 * Nuxt server island. Descendants resolve it through
 * {@link usePrefix}.
 */
export function providePrefix(prefix: string): void {
  provide(PREFIX_KEY, prefix);
}
