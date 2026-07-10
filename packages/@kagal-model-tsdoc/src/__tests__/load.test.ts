import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { APIItemKind, APIPackage, loadPackage } from '../index';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, 'fixtures');

describe('loadPackage', () => {
  it('loads a *.api.json manifest into an APIPackage', () => {
    const pkg = loadPackage(path.join(FIXTURES, 'taistamp.api.json'));
    expect(pkg).toBeInstanceOf(APIPackage);
    expect(pkg.kind).toBe(APIItemKind.Package);
    expect(pkg.displayName).toBe('@kagal/taistamp');
    expect(pkg.entryPoints).toHaveLength(1);
  });

  it('throws on a missing manifest', () => {
    const missing = path.join(FIXTURES, 'missing.api.json');
    expect(() => loadPackage(missing)).toThrow(/ENOENT/);
  });
});
