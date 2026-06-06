import { defineBuildConfig } from 'unbuild';

import { newUnbuildHooks } from './src/index';

export default defineBuildConfig({
  entries: [
    { input: 'src/index', name: 'index' },
  ],
  declaration: true,
  sourcemap: true,
  hooks: {
    ...newUnbuildHooks(),
  },
});
