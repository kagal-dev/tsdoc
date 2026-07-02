import { describe, expect, it } from 'vitest';

import { resolveSource } from '../runtime/resolve-source';

const sources = [
  { name: 'a', path: '/a.api.json' },
  { name: 'b', path: '/b.api.json' },
];

describe('resolveSource', () => {
  it('returns the matching source', () => {
    expect(resolveSource(sources, 'b')).toEqual({
      name: 'b',
      path: '/b.api.json',
    });
  });

  it('returns undefined when no source matches', () => {
    expect(resolveSource(sources, 'missing')).toBeUndefined();
  });
});
