import { defineBuildConfig } from 'unbuild';

import { newUnbuildHooks } from '@kagal/build-tsdoc';

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
