<script setup lang="ts">
/**
 * `APIItemView` — recursive dispatcher over an `ApiItem`. Resolves
 * the presentational component for the item's kind via
 * `componentForKind` and renders it with `:item`. Container
 * presentational components (Class, Interface, Enum) reach back
 * here through `APIMemberList` to recurse into their members.
 */
import type { ApiItem } from '@microsoft/api-extractor-model';

import { componentForKind } from '../lib/dispatch';

defineOptions({ name: 'APIItemView' });

const props = defineProps<{ item: ApiItem }>();
</script>

<template>
  <component
    :is="componentForKind(props.item.kind)"
    :item="props.item"
  />
</template>
