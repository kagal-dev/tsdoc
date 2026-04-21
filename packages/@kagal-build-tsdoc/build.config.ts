import { defineBuildConfig } from 'unbuild';

import { newDocumentsHook } from './src/index';

export default defineBuildConfig({
  entries: [
    { input: 'src/index', name: 'index' },
  ],
  declaration: true,
  sourcemap: true,
  hooks: {
    'build:done': newDocumentsHook(),
  },
});
