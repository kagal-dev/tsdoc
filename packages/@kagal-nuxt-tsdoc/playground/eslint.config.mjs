// @ts-check
import { withPoupe } from '@poupe/eslint-config';
import withNuxt from './.nuxt/eslint.config.mjs';

export default withPoupe(withNuxt(), {
  ignores: [
    '.nuxt',
    '.output',
  ],
}, {
  // ESLint core `no-useless-assignment` runs code-path analysis and
  // crashes on the CSS extracted from SFC `<style>` blocks (no graph
  // to read). Scope it off CSS, where it has no meaning anyway.
  files: ['**/*.css'],
  rules: {
    'no-useless-assignment': 'off',
  },
});
