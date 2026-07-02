// cspell:words mkdist
import { newUnbuildHooks } from '@kagal/build-tsdoc';
import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: [
    { input: 'src/index', name: 'module' },
    {
      input: 'src/runtime/',
      name: 'runtime',
      outDir: 'dist/runtime',
      builder: 'mkdist',
      declaration: true,
      // Ship `.vue` runtime components raw — the host Nuxt build
      // compiles them, and `addComponent` resolves the same path
      // in dev (src) and prod (dist). Excluding the `vue` loader
      // copies SFCs verbatim and avoids mkdist's SFC transform
      // (which needs `vue-sfc-transformer` and crashes without it).
      loaders: ['js'],
    },
  ],
  declaration: true,
  sourcemap: true,
  externals: [
    '#imports',
    '@nuxt/kit',
    '@nuxt/schema',
    'nuxt',
    'valibot',
    'vue',
  ],
  hooks: {
    ...newUnbuildHooks(),
  },
});
