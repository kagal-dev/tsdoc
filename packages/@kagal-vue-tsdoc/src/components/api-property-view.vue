<script setup lang="ts">
/**
 * `APIPropertyView` — renders an `ApiPropertyItem` (covers both
 * `ApiProperty` on classes and `ApiPropertySignature` on
 * interfaces): name, optional `?` marker, declared type, and a
 * `readonly` badge when set. Leaf node.
 */
import type { ApiPropertyItem } from '@microsoft/api-extractor-model';
import { computed } from 'vue';

import { useAPIClasses } from '../lib/classes';
import { summaryFor } from '../lib/document';
import { excerptText } from '../lib/excerpt';

defineOptions({ name: 'APIPropertyView' });

const props = defineProps<{ item: ApiPropertyItem }>();

const tsdoc = useAPIClasses(props.item.kind);

const summary = computed(() => summaryFor(props.item));
const type = computed(() => excerptText(props.item.propertyTypeExcerpt));
</script>

<template>
  <section :class="tsdoc.section">
    <h3 class="not-prose">
      <code :class="tsdoc.signature">{{ props.item.name }}<template v-if="props.item.isOptional">?</template>: {{ type }}</code>
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
