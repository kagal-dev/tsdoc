<script setup lang="ts">
/**
 * `APIInterfaceView` — renders an `ApiInterface` header (name +
 * `extends` list + summary) and recurses into members via
 * `APIMemberList` (typically property/method signatures).
 */
import type { ApiInterface } from '@microsoft/api-extractor-model';
import { computed } from 'vue';

import { useAPIClasses } from '../lib/classes';
import { summaryFor } from '../lib/document';

import APIMemberList from './api-member-list.vue';

defineOptions({ name: 'APIInterfaceView' });

const props = defineProps<{ item: ApiInterface }>();

const tsdoc = useAPIClasses(props.item.kind);

const summary = computed(() => summaryFor(props.item));
const extendsText = computed(() => props.item.extendsTypes
  .map((h) => h.excerpt.text.trim())
  .join(', '));
</script>

<template>
  <section :class="tsdoc.section">
    <h3 class="not-prose">
      <code :class="tsdoc.signature">interface {{ props.item.name }}</code>
    </h3>
    <p
      v-if="extendsText"
      class="not-prose"
      :class="tsdoc.heritage"
    >
      extends <code>{{ extendsText }}</code>
    </p>
    <p
      v-if="summary"
      :class="tsdoc.summary"
    >
      {{ summary }}
    </p>
    <APIMemberList :members="props.item.members" />
  </section>
</template>
