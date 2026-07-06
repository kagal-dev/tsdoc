import { type Config, defineConfig } from '@poupe/eslint-config';

const config: Config[] = defineConfig(
  {
    ignores: ['coverage'],
  },
);

export default config;
