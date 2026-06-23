<script setup lang="ts">
/**
 * `APIMethodView` — renders an `ApiMethod` or
 * `ApiMethodSignature`: `[static] name(params): returnType`.
 * Typed against `ApiMethod` for the static flag; for a
 * `MethodSignature` the missing `isStatic` getter reads as
 * undefined at runtime and the badge is suppressed.
 */
import type { ApiMethod } from '@microsoft/api-extractor-model';
import { computed } from 'vue';

import { useAPIClasses } from '../lib/classes';
import { summaryFor } from '../lib/document';
import { excerptText } from '../lib/excerpt';

defineOptions({ name: 'APIMethodView' });

const props = defineProps<{ item: ApiMethod }>();

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
      <span
        v-if="props.item.isStatic"
        :class="tsdoc.badge"
      >static</span>
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
