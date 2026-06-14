<script setup lang="ts">
import { VERSION } from './index';
import StoryIndex from './stories/index.vue';
</script>

<template>
  <main>
    <header>
      <h1>@kagal/vue-tsdoc — story viewer</h1>
      <p>Library version: {{ VERSION }}</p>
    </header>
    <StoryIndex />
  </main>
</template>
