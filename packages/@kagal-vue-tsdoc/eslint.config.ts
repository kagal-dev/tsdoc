import {
  type Config,
  defineConfig,
  withAbbreviations,
} from '@poupe/eslint-config';

const config: Config[] = defineConfig(
  {
    ignores: [
      'coverage',
      'dist',
    ],
  },
  withAbbreviations(['doc', 'docs']),
);

export default config;
