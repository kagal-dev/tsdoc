import { type BuildConfig, defineBuildConfig } from 'unbuild';

import { newUnbuildHooks } from '@kagal/build-tsdoc';

const config: BuildConfig[] = defineBuildConfig({
  entries: [
    { input: 'src/index', name: 'index' },
  ],
  declaration: true,
  sourcemap: true,
  hooks: {
    ...newUnbuildHooks(),
  },
});

export default config;
