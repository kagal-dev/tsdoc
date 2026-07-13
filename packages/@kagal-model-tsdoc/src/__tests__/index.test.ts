// Smoke test: the module loads and exposes the reader surface.
import { describe, expect, it } from 'vitest';

import pkg from '../../package.json' with { type: 'json' };
import * as model from '../index';

describe('@kagal/model-tsdoc', () => {
  it('exposes VERSION from package.json', () => {
    expect(model.VERSION).toBe(pkg.version);
  });

  it('exposes the reader helpers', () => {
    expect(typeof model.loadPackage).toBe('function');
    expect(typeof model.excerptText).toBe('function');
    expect(typeof model.initializerText).toBe('function');
  });

  it('re-exports the model with proper-cased acronyms', () => {
    expect(typeof model.APIPackage).toBe('function');
    expect(typeof model.APIItemKind).toBe('object');
    expect(typeof model.APINameMixin.isBaseClassOf).toBe('function');
  });
});
