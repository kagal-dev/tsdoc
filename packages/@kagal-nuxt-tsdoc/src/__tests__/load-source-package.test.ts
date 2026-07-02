import { describe, expect, it, vi } from 'vitest';

import { loadSourcePackage } from '../runtime/load-source-package';

const source = { name: '@pkg', path: '/x.api.json' };

const cause = new Error('ENOENT');
const throwCause = (): never => {
  throw cause;
};

describe('loadSourcePackage', () => {
  it('returns the loader result, passing the source path', () => {
    const load = vi.fn(() => ({ ok: true }));
    expect(loadSourcePackage(source, load)).toEqual({ ok: true });
    expect(load).toHaveBeenCalledWith('/x.api.json');
  });

  it('rethrows a load failure naming the source and path', () => {
    expect(() => loadSourcePackage(source, throwCause)).toThrow(
      '<APIPackage source="@pkg"> failed to load manifest "/x.api.json".',
    );
  });

  it('preserves the underlying cause', () => {
    let thrown: unknown;
    try {
      loadSourcePackage(source, throwCause);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).cause).toBe(cause);
  });
});
