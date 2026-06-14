<script setup lang="ts">
/**
 * `APIClassView` — renders an `ApiClass` header (name +
 * heritage clauses + abstract badge + summary) and recurses
 * into members via `APIMemberList`. Members are dispatched back
 * through `APIItemView`, typically resolving to
 * `APIMethodView` / `APIPropertyView` per child kind.
 */
import type { ApiClass } from '@microsoft/api-extractor-model';
import { computed } from 'vue';

import { useAPIClasses } from '../lib/classes';
import { summaryFor } from '../lib/document';

import APIMemberList from './api-member-list.vue';

defineOptions({ name: 'APIClassView' });

const props = defineProps<{ item: ApiClass }>();

const tsdoc = useAPIClasses(props.item.kind);

const summary = computed(() => summaryFor(props.item));
const extendsText = computed(() => props.item.extendsType?.excerpt.text.trim() ?? '');
const implementsText = computed(() => props.item.implementsTypes
  .map((h) => h.excerpt.text.trim())
  .join(', '));
</script>

<template>
  <section :class="tsdoc.section">
    <h3 class="not-prose">
      <span
        v-if="props.item.isAbstract"
        :class="tsdoc.badge"
      >abstract</span>
      <code :class="tsdoc.signature">class {{ props.item.name }}</code>
    </h3>
    <p
      v-if="extendsText"
      class="not-prose"
      :class="tsdoc.heritage"
    >
      extends <code>{{ extendsText }}</code>
    </p>
    <p
      v-if="implementsText"
      class="not-prose"
      :class="tsdoc.heritage"
    >
      implements <code>{{ implementsText }}</code>
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
