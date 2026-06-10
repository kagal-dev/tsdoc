import { describe, expect, it } from 'vitest';

import pkg from '../../package.json' with { type: 'json' };
import { extractEntryManifest, VERSION } from '../index';

describe('@kagal/build-tsdoc', () => {
  it('exports VERSION matching package.json', () => {
    expect(VERSION).toBe(pkg.version);
  });

  it('exports extractEntryManifest as a function', () => {
    expect(typeof extractEntryManifest).toBe('function');
  });
});
