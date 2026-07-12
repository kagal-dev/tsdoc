import { type BuildConfig, defineBuildConfig } from 'obuild/config';

const config: BuildConfig = defineBuildConfig({
  entries: [
    { type: 'bundle', input: ['./src/index.ts'] },
  ],
});

export default config;
