// cspell:words srclight
import {
  type Config,
  defineConfig,
  withAbbreviations,
} from '@poupe/eslint-config';

const config: Config[] = defineConfig(
  {
    ignores: [
      '.claude/**/memory/**',
      '.srclight/**',
      '.tmp/**',
    ],
  },
  withAbbreviations(['dir', 'doc', 'docs']),
);

export default config;
