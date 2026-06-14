<script setup lang="ts">
/**
 * `APITypeAliasView` — renders an `ApiTypeAlias` declaration as
 * `type name = aliasedType`. Leaf node.
 */
import type { ApiTypeAlias } from '@microsoft/api-extractor-model';
import { computed } from 'vue';

import { useAPIClasses } from '../lib/classes';
import { summaryFor } from '../lib/document';

defineOptions({ name: 'APITypeAliasView' });

const props = defineProps<{ item: ApiTypeAlias }>();

const tsdoc = useAPIClasses(props.item.kind);

const summary = computed(() => summaryFor(props.item));
const typeText = computed(() => props.item.typeExcerpt.text.trim());
</script>

<template>
  <section :class="tsdoc.section">
    <h3 class="not-prose">
      <code :class="tsdoc.signature">type {{ props.item.name }} = {{ typeText }}</code>
    </h3>
    <p
      v-if="summary"
      :class="tsdoc.summary"
    >
      {{ summary }}
    </p>
  </section>
</template>
