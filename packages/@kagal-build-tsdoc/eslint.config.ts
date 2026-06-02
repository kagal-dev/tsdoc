import {
  type Config,
  defineConfig,
  withAbbreviations,
} from '@poupe/eslint-config';

const config: Config[] = defineConfig(
  {
    ignores: ['_docs', 'coverage'],
  },
  withAbbreviations(['dir', 'doc', 'docs']),
);

export default config;
