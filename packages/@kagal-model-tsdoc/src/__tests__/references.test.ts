// Characterisation of the canonical-reference shapes Reference tokens
// carry in real manifests. `referenceName` (via `excerptText`) parses
// these, so its regex is only as safe as the shapes it will meet.
// Across the taistamp fixture and the package's own built manifest, a
// type-excerpt Reference token carries only an optional `~` locals
// marker and an optional `:meaning` suffix — never member navigation
// (`#`, `.`), an empty symbol, or a missing `!` source. These rows
// pin that: a future api-extractor that emits one of those flips a
// row and sends us back to `referenceName`.

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  APIDeclaredItem,
  type APIItem,
  APIItemContainerMixin,
  APIPackage,
  Excerpt,
  excerptText,
  type ExcerptToken,
  ExcerptTokenKind,
  loadPackage,
} from '../index';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, 'fixtures');
const MANIFEST = path.resolve(HERE, '..', '..', 'dist', 'index.api.json');

// The shapes `referenceName` handles cleanly: an optional leading `~`
// and either a `:meaning` suffix or none. Anything outside this set
// is navigation or malformed input the regex does not special-case.
const HANDLED = new Set([
  'has-:meaning',
  'no-:meaning',
  'leading-~ has-:meaning',
  'leading-~ no-:meaning',
]);

function loadTaistamp(): APIPackage {
  return loadPackage(path.join(FIXTURES, 'taistamp.api.json'));
}

function loadOwnManifest(): APIPackage {
  if (!existsSync(MANIFEST)) {
    throw new Error(
      'Run `pnpm --filter @kagal/model-tsdoc build` before ' +
      `tests; ${MANIFEST} is missing.`,
    );
  }
  return loadPackage(MANIFEST);
}

function collectReferenceTokens(pkg: APIPackage): ExcerptToken[] {
  const tokens: ExcerptToken[] = [];
  const visit = (item: APIItem): void => {
    if (item instanceof APIDeclaredItem) {
      for (const token of item.excerptTokens) {
        if (token.kind === ExcerptTokenKind.Reference) {
          tokens.push(token);
        }
      }
    }
    if (APIItemContainerMixin.isBaseClassOf(item)) {
      for (const member of item.members) {
        visit(member);
      }
    }
  };
  visit(pkg);
  return tokens;
}

// The character class a reference exercises after `!`: the locals
// marker, member navigation, and the meaning suffix — the axes
// `referenceName` either parses or deliberately ignores.
function shapeOf(reference: string): string {
  const separator = reference.indexOf('!');
  if (separator === -1) {
    return 'no-!';
  }
  const symbol = reference.slice(separator + 1);
  if (symbol === '') {
    return 'empty-symbol';
  }
  const flags: string[] = [];
  if (symbol.startsWith('~')) {
    flags.push('leading-~');
  }
  if (symbol.includes('#')) {
    flags.push('has-#');
  }
  if (symbol.split(':')[0].includes('.')) {
    flags.push('has-.');
  }
  flags.push(symbol.includes(':') ? 'has-:meaning' : 'no-:meaning');
  return flags.join(' ');
}

function shapesIn(pkg: APIPackage): Set<string> {
  const shapes = new Set<string>();
  for (const token of collectReferenceTokens(pkg)) {
    const reference = token.canonicalReference?.toString();
    shapes.add(reference === undefined ? 'undefined-reference' : shapeOf(reference));
  }
  return shapes;
}

function excerptOf(token: ExcerptToken): Excerpt {
  return new Excerpt([token], { startIndex: 0, endIndex: 1 });
}

describe('reference-token shapes', () => {
  it('taistamp: only handled shapes, and a locals marker is present', () => {
    const shapes = shapesIn(loadTaistamp());
    for (const shape of shapes) {
      expect(HANDLED, shape).toContain(shape);
    }
    expect([...shapes].some((s) => s.startsWith('leading-~'))).toBe(true);
  });

  it('own manifest: only handled shapes, exercising both meaning variants', () => {
    const shapes = shapesIn(loadOwnManifest());
    for (const shape of shapes) {
      expect(HANDLED, shape).toContain(shape);
    }
    expect(shapes).toContain('has-:meaning');
    // The locals marker without a meaning — the `initializerText`
    // parameter type — is what earlier leaked its `~`.
    expect(shapes).toContain('leading-~ no-:meaning');
  });

  it('renders a locals-marked reference as its bare source name', () => {
    const token = collectReferenceTokens(loadTaistamp()).find(
      (t) => t.canonicalReference?.toString().includes('!~'),
    );
    expect(token).toBeDefined();
    const rendered = excerptText(excerptOf(token!));
    expect(rendered.startsWith('~')).toBe(false);
    expect(rendered).toBe('timestamp');
  });
});
