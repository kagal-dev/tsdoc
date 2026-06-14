<script setup lang="ts">
/**
 * `APIPackageView` — entry component for rendering an
 * `@microsoft/api-extractor-model` typed graph. Walks the
 * package's entry points and delegates each top-level member to
 * the recursive `APIItemView` dispatcher.
 *
 * The `package` prop is optional: when absent (or `null`) the
 * component renders a placeholder so the package can boot in
 * dev stories or playground shells without supplying data.
 */
import type { ApiPackage } from '@microsoft/api-extractor-model';

import { useAPIClasses } from '../lib/classes';

import APIItemView from './api-item-view.vue';

defineOptions({ name: 'APIPackageView' });

const props = defineProps<{ package?: ApiPackage | null }>();

const tsdoc = useAPIClasses();
</script>

<template>
  <section :class="tsdoc.package">
    <template v-if="props.package">
      <header>
        <h2>
          <code
            class="not-prose"
            :class="tsdoc.packageName"
          >{{ props.package.displayName }}</code>
        </h2>
      </header>
      <template
        v-for="entryPoint in props.package.entryPoints"
        :key="entryPoint.containerKey"
      >
        <APIItemView
          v-for="member in entryPoint.members"
          :key="member.containerKey"
          :item="member"
        />
      </template>
    </template>
    <p
      v-else
      :class="tsdoc.empty"
    >
      No API package provided.
    </p>
  </section>
</template>
