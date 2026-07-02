import {
  type Config,
  defineConfig,
  withAbbreviations,
} from '@poupe/eslint-config';

const config: Config[] = defineConfig(
  {
    ignores: [
      'coverage',
      'playground',
    ],
  },
  withAbbreviations(['dir', 'doc', 'docs']),
);

export default config;
