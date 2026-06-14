import Vue from 'unplugin-vue/vite';
import { defineConfig } from 'vite';

// Dev server only — serves the in-house story viewer
// (src/app.vue → src/stories/index.vue) for component
// development. The library build runs through obuild
// (build.config.ts).
export default defineConfig({
  plugins: [Vue()],
});
