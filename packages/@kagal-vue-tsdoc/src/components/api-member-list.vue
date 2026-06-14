<script setup lang="ts">
/**
 * `APIMemberList` — the recursion hub. Renders an unordered list
 * of `APIItemView` instances, one per member. Container
 * presentational components delegate their member rendering here
 * so the recursive dispatch loop stays in a single place.
 */
import type { ApiItem } from '@microsoft/api-extractor-model';

import { useAPIClasses } from '../lib/classes';

import APIItemView from './api-item-view.vue';

defineOptions({ name: 'APIMemberList' });

defineProps<{ members: ReadonlyArray<ApiItem> }>();

const tsdoc = useAPIClasses();
</script>

<template>
  <ul
    v-if="members.length > 0"
    :class="tsdoc.members"
  >
    <li
      v-for="member in members"
      :key="member.containerKey"
    >
      <APIItemView :item="member" />
    </li>
  </ul>
</template>
