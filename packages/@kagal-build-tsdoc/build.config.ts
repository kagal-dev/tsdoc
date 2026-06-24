import { defineBuildConfig } from 'unbuild';

import { newUnbuildHooks } from './src/index';

export default defineBuildConfig({
  entries: [
    { input: 'src/index', name: 'index' },
    { input: 'src/utils', name: 'utils' },
  ],
  declaration: true,
  sourcemap: true,
  hooks: {
    ...newUnbuildHooks(),
  },
});
