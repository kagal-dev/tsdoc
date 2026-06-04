import { defineBuildConfig } from 'unbuild';

import { extractEntryManifest } from './src/index';

export default defineBuildConfig({
  entries: [
    { input: 'src/index', name: 'index' },
  ],
  declaration: true,
  sourcemap: true,
  hooks: {
    'build:done'(context) {
      if (context.options.stub) return;
      for (const entry of context.options.entries) {
        extractEntryManifest({
          projectFolder: context.options.rootDir,
          entryName: entry.name,
        });
      }
    },
  },
});
