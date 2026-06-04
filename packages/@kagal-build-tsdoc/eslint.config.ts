import {
  type Config,
  defineConfig,
  withAbbreviations,
} from '@poupe/eslint-config';

const config: Config[] = defineConfig(
  {
    ignores: ['coverage'],
  },
  withAbbreviations(['dir', 'doc', 'docs']),
);

export default config;
