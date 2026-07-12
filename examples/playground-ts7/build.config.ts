import { type BuildConfig, defineBuildConfig } from 'obuild/config';

import { newOBuildHooks } from '@kagal/build-tsdoc';

const config: BuildConfig = defineBuildConfig({
  entries: [
    { type: 'bundle', input: ['./src/index.ts'] },
  ],
  hooks: {
    ...newOBuildHooks(),
  },
});

export default config;
