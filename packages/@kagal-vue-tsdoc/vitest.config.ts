import Vue from 'unplugin-vue/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [Vue()],
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/__tests__/**',
        'src/app.vue',
        'src/main.ts',
        'src/stories/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
      },
    },
  },
});
