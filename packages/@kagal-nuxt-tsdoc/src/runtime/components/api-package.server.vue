<script setup lang="ts">
/**
 * `<APIPackage>` — server island that renders a package's
 * `@microsoft/api-extractor-model` manifest with
 * `@kagal/vue-tsdoc`. Resolves the `source` name against the
 * manifests configured in `tsdoc.sources`, loads the matching
 * `*.api.json` from disk, and hands it to `APIPackageView`.
 *
 * Server-only by design: `loadPackage` and the model library it
 * wraps never reach the client bundle. Host pages must be
 * prerendered.
 */
import { APIPackageView, loadPackage, providePrefix } from '@kagal/vue-tsdoc';

import { useRuntimeConfig } from '#imports';

import { loadSourcePackage } from '../load-source-package';
import { resolveSource } from '../resolve-source';

const props = defineProps<{ source: string }>();

const { tsdoc } = useRuntimeConfig();

// Provide the configured prefix to this island's subtree. An
// app-level plugin's `provide` does not reach island render trees,
// so set it here where `<APIPackageView>` and its descendants resolve
// it through `usePrefix`.
providePrefix(tsdoc.prefix);

// The return value is the signal: a configured source or undefined.
// Fail loudly on either misconfiguration so the consumer sees a build
// error instead of an empty page — an unmatched `source` name throws
// here, and a manifest that fails to load is rethrown by
// `loadSourcePackage` with context. Both abort the prerender.
const source = resolveSource(tsdoc.sources, props.source);
if (!source) {
  throw new Error(
    `<APIPackage source="${props.source}"> matches no configured ` +
    'tsdoc.sources entry.',
  );
}
const pkg = loadSourcePackage(source, loadPackage);
</script>

<template>
  <APIPackageView :package="pkg" />
</template>
