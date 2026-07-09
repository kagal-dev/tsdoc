import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Most tests invoke api-extractor end to end — each spins a
    // full TypeScript program, and several files running in
    // parallel starve CPU past the 5s default.
    testTimeout: 30_000,
    exclude: [
      ...configDefaults.exclude,
      '**/fixtures/**',
    ],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/__tests__/**',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
      },
    },
  },
});
