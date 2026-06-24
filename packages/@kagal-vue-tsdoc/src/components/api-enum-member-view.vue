<script setup lang="ts">
/**
 * `APIEnumMemberView` — renders an `ApiEnumMember` as
 * `name = value`, falling back to the bare name when the member
 * carries no initialiser. Leaf node (enum members have no
 * members of their own).
 */
import type { ApiEnumMember } from '@microsoft/api-extractor-model';
import { computed } from 'vue';

import { useAPIClasses } from '../lib/classes';
import { summaryFor } from '../lib/document';
import { initializerText } from '../lib/excerpt';

defineOptions({ name: 'APIEnumMemberView' });

const props = defineProps<{ item: ApiEnumMember }>();

const tsdoc = useAPIClasses(props.item.kind);

const summary = computed(() => summaryFor(props.item));
const value = computed(() => initializerText(props.item));
</script>

<template>
  <section :class="tsdoc.section">
    <h3 class="not-prose">
      <code :class="tsdoc.signature">{{ props.item.name }}<template v-if="value"> = {{ value }}</template></code>
    </h3>
    <p
      v-if="summary"
      :class="tsdoc.summary"
    >
      {{ summary }}
    </p>
  </section>
</template>
