import {
  type Config,
  defineConfig,
  withAbbreviations,
} from '@poupe/eslint-config';

const config: Config[] = defineConfig(
  withAbbreviations(['dir', 'doc', 'docs']),
);

export default config;
