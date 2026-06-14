<script setup lang="ts">
/**
 * `APIGenericItemView` — fallback presentational component for
 * `ApiItem` kinds without a dedicated view. Shows kind + display
 * name + doc summary, and recurses into members so unknown
 * container kinds still render their subtree. The section class
 * reflects the actual item kind (e.g. `api-item api-enum-member`)
 * rather than a generic catch-all — consumers can still target
 * specific kinds without a per-kind view existing.
 */
import type { ApiItem } from '@microsoft/api-extractor-model';
import { computed } from 'vue';

import { useAPIClasses } from '../lib/classes';
import { summaryFor } from '../lib/document';

import APIMemberList from './api-member-list.vue';

defineOptions({ name: 'APIGenericItemView' });

const props = defineProps<{ item: ApiItem }>();

const tsdoc = useAPIClasses(props.item.kind);

const summary = computed(() => summaryFor(props.item));
</script>

<template>
  <section :class="tsdoc.section">
    <h3 class="not-prose">
      <span :class="tsdoc.kind">{{ props.item.kind }}</span>
      {{ props.item.displayName }}
    </h3>
    <p
      v-if="summary"
      :class="tsdoc.summary"
    >
      {{ summary }}
    </p>
    <APIMemberList :members="props.item.members" />
  </section>
</template>
