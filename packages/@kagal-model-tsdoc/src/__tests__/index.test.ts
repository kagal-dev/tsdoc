// Smoke test: the module loads and exposes the scaffold surface.
import { describe, expect, it } from 'vitest';

import pkg from '../../package.json' with { type: 'json' };
import * as model from '../index';

describe('@kagal/model-tsdoc', () => {
  it('exposes VERSION from package.json', () => {
    expect(model.VERSION).toBe(pkg.version);
  });
});
