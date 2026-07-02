<script setup lang="ts">
// `<APIPackage>` is a Nuxt island contributed by
// @kagal/nuxt-tsdoc: it loads the manifest declared in
// nuxt.config.ts and renders it with @kagal/vue-tsdoc at
// prerender time.
</script>

<template>
  <main class="container">
    <h1>@kagal/nuxt-tsdoc playground</h1>
    <APIPackage source="@kagal/build-tsdoc" />
  </main>
</template>

<style>
.container {
  max-width: 52rem;
  margin: 2rem auto;
  padding: 0 1rem;
  font-family: system-ui, sans-serif;
  line-height: 1.5;
}
code {
  font-family: monospace;
}
</style>
