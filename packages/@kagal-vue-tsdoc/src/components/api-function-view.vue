<script setup lang="ts">
/**
 * `APIFunctionView` — renders an `ApiFunction` signature:
 * `name(params): returnType`, reconstructed from the parameter
 * list and return-type excerpts rather than the full declaration
 * excerpt so callers see a cleaner signature line.
 */
import type { ApiFunction } from '@microsoft/api-extractor-model';
import { computed } from 'vue';

import { useAPIClasses } from '../lib/classes';
import { summaryFor } from '../lib/document';
import { excerptText } from '../lib/excerpt';

defineOptions({ name: 'APIFunctionView' });

const props = defineProps<{ item: ApiFunction }>();

const tsdoc = useAPIClasses(props.item.kind);

const summary = computed(() => summaryFor(props.item));
const params = computed(() => props.item.parameters
  .map((p) => `${p.name}${p.isOptional ? '?' : ''}: ${excerptText(p.parameterTypeExcerpt)}`)
  .join(', '));
const returnType = computed(() => excerptText(props.item.returnTypeExcerpt));
</script>

<template>
  <section :class="tsdoc.section">
    <h3 class="not-prose">
      <code :class="tsdoc.signature">{{ props.item.name }}({{ params }}): {{ returnType }}</code>
    </h3>
    <p
      v-if="summary"
      :class="tsdoc.summary"
    >
      {{ summary }}
    </p>
  </section>
</template>
