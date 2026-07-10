// Dogfood guard over the package's own emitted manifest
// (`dist/index.api.json`): the read surface loads back what the
// build's write side produced, the façade names survive extraction,
// and no unexported-symbol references creep in beyond the one known
// upstream mis-model.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  type APIFunction,
  APIItemKind,
  excerptText,
  loadPackage,
} from '../index';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST = path.resolve(HERE, '../..', 'dist', 'index.api.json');

describe('dogfood: dist/index.api.json', () => {
  beforeAll(() => {
    if (!existsSync(MANIFEST)) {
      throw new Error(
        'Run `pnpm --filter @kagal/model-tsdoc build` before ' +
        `tests; ${MANIFEST} is missing.`,
      );
    }
  });

  it('loads back through loadPackage', () => {
    const pkg = loadPackage(MANIFEST);
    expect(pkg.displayName).toBe('@kagal/model-tsdoc');
    expect(pkg.kind).toBe(APIItemKind.Package);
    expect(pkg.entryPoints).toHaveLength(1);
  });

  it('documents the façade names, never upstream lazy title-case', () => {
    const names = loadPackage(MANIFEST).entryPoints[0].members.map(
      (m) => m.displayName,
    );
    expect(names).toContain('APIPackage');
    expect(names).toContain('loadPackage');
    expect(names.filter((n) => /^Api[A-Z]/.test(n))).toEqual([]);
  });

  it('models a mixin as its merged declarations', () => {
    // The alias carries every meaning of the upstream symbol, so the
    // manifest documents one mixin as three co-named members.
    const kinds = loadPackage(MANIFEST)
      .entryPoints[0].members.filter(
        (m) => m.displayName === 'APINameMixin',
      )
      .map((m) => m.kind)
      .toSorted();
    expect(kinds).toEqual([
      APIItemKind.Function,
      APIItemKind.Interface,
      APIItemKind.Namespace,
    ]);
  });

  it('records the parameter type of initializerText as the known unexported reference', () => {
    // api-extractor's `bundledPackages` cannot tell a re-export from
    // a reference: the parameter type of `initializerText` records
    // the *referenced* APIInitializerMixin as an unexported local
    // (`!~`) even though the same symbol is exported. The tracked
    // upstream mis-model — pinned here so a behaviour change flips
    // this row deliberately.
    const fn = loadPackage(MANIFEST).entryPoints[0].members.find(
      (m): m is APIFunction =>
        m.kind === APIItemKind.Function &&
        m.displayName === 'initializerText',
    );
    expect(fn).toBeDefined();
    const typeExcerpt = fn!.parameters[0].parameterTypeExcerpt;
    expect(typeExcerpt.spannedTokens[0].canonicalReference?.toString()).toBe(
      '@kagal/model-tsdoc!~APIInitializerMixin',
    );
    // …and `excerptText` renders it without the leaked `~` marker.
    expect(excerptText(typeExcerpt)).toBe('APIInitializerMixin');
  });

  it('carries no other unexported-symbol references', () => {
    const raw = readFileSync(MANIFEST, 'utf8');
    const unexported = new Set(
      [...raw.matchAll(/"@kagal\/model-tsdoc!~([^"]*)"/g)].map((m) => m[1]),
    );
    expect([...unexported]).toEqual(['APIInitializerMixin']);
  });
});
