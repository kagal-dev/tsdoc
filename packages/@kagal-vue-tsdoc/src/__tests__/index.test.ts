import path from 'node:path';
import url from 'node:url';

import { describe, expect, it } from 'vitest';

import { APIPackageView, loadPackage, VERSION } from '../index';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, 'fixtures', 'shapes.api.json');

describe('@kagal/vue-tsdoc', () => {
  it('exports VERSION as a semver-shaped string', () => {
    expect(typeof VERSION).toBe('string');
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('exports APIPackageView as a named component', () => {
    expect(APIPackageView.name).toBe('APIPackageView');
  });
});

describe('loadPackage', () => {
  it('loads an APIPackage from a *.api.json manifest', () => {
    const pkg = loadPackage(FIXTURE);
    expect(pkg.kind).toBe('Package');
    expect(pkg.displayName.length).toBeGreaterThan(0);
    expect(pkg.entryPoints.length).toBeGreaterThan(0);
  });
});
