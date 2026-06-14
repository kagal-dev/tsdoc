<script setup lang="ts">
/**
 * `APIVariableView` — renders an `ApiVariable` declaration: name,
 * declared type, optional `readonly` badge, and the doc summary.
 * Leaf node (variables carry no `members`).
 */
import type { ApiVariable } from '@microsoft/api-extractor-model';
import { computed } from 'vue';

import { useAPIClasses } from '../lib/classes';
import { summaryFor } from '../lib/document';

defineOptions({ name: 'APIVariableView' });

const props = defineProps<{ item: ApiVariable }>();

const tsdoc = useAPIClasses(props.item.kind);

const summary = computed(() => summaryFor(props.item));
const type = computed(() => props.item.variableTypeExcerpt.text.trim());
</script>

<template>
  <section :class="tsdoc.section">
    <h3 class="not-prose">
      <code :class="tsdoc.signature">{{ props.item.name }}: {{ type }}</code>
      <span
        v-if="props.item.isReadonly"
        :class="tsdoc.badge"
      >readonly</span>
    </h3>
    <p
      v-if="summary"
      :class="tsdoc.summary"
    >
      {{ summary }}
    </p>
  </section>
</template>
