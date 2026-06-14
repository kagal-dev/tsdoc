<script setup lang="ts">
/**
 * `APIEnumView` — renders an `ApiEnum` header and recurses into
 * its `ApiEnumMember` children via `APIMemberList`. Members fall
 * back to `APIGenericItemView` (no per-kind view yet).
 */
import type { ApiEnum } from '@microsoft/api-extractor-model';
import { computed } from 'vue';

import { useAPIClasses } from '../lib/classes';
import { summaryFor } from '../lib/document';

import APIMemberList from './api-member-list.vue';

defineOptions({ name: 'APIEnumView' });

const props = defineProps<{ item: ApiEnum }>();

const tsdoc = useAPIClasses(props.item.kind);

const summary = computed(() => summaryFor(props.item));
</script>

<template>
  <section :class="tsdoc.section">
    <h3 class="not-prose">
      <code :class="tsdoc.signature">enum {{ props.item.name }}</code>
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
