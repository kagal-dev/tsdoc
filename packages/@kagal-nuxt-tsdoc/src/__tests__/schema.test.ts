import * as v from 'valibot';
import { describe, expect, it } from 'vitest';

import { moduleOptionsSchema } from '../schema';

describe('moduleOptionsSchema', () => {
  it('accepts a valid sources array', () => {
    const result = v.safeParse(moduleOptionsSchema, {
      sources: [
        {
          name: '@kagal/build-tsdoc',
          path: './dist/index.api.json',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts an empty sources array', () => {
    const result = v.safeParse(moduleOptionsSchema, {
      sources: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects sources with empty name', () => {
    const result = v.safeParse(moduleOptionsSchema, {
      sources: [{ name: '', path: './api.json' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects sources with empty path', () => {
    const result = v.safeParse(moduleOptionsSchema, {
      sources: [{ name: '@pkg', path: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate source names, naming the offender', () => {
    const result = v.safeParse(moduleOptionsSchema, {
      sources: [
        { name: '@pkg', path: './a.api.json' },
        { name: '@pkg', path: './b.api.json' },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues[0].message).toContain('@pkg');
    }
  });

  it('rejects missing sources field', () => {
    const result = v.safeParse(moduleOptionsSchema, {});
    expect(result.success).toBe(false);
  });

  it('defaults prefix to "api-" when omitted', () => {
    const result = v.safeParse(moduleOptionsSchema, { sources: [] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.prefix).toBe('api-');
    }
  });

  it('accepts a custom prefix', () => {
    const result = v.safeParse(moduleOptionsSchema, {
      sources: [],
      prefix: 'kagal-tsdoc-',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.prefix).toBe('kagal-tsdoc-');
    }
  });

  it('rejects an empty prefix', () => {
    const result = v.safeParse(moduleOptionsSchema, {
      sources: [],
      prefix: '',
    });
    expect(result.success).toBe(false);
  });
});
