// cspell:words taistamp

import path from 'node:path';
import url from 'node:url';

import {
  type ApiInterface,
  ApiItemKind,
  ApiPackage,
  type ApiPropertyItem,
  Excerpt,
  ExcerptToken,
  ExcerptTokenKind,
} from '@microsoft/api-extractor-model';
import { describe, expect, it } from 'vitest';

import { excerptText } from '../lib/excerpt';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, 'fixtures');

function excerptOf(...tokens: ExcerptToken[]): Excerpt {
  return new Excerpt(tokens, { startIndex: 0, endIndex: tokens.length });
}

describe('excerptText (fixture)', () => {
  it('resolves a re-exported reference to its source name, not the bundler alias', () => {
    const pkg = ApiPackage.loadFromJsonFile(
      path.join(FIXTURES, 'taistamp.api.json'),
    );
    const config = pkg.entryPoints[0].members.find(
      (m): m is ApiInterface =>
        m.kind === ApiItemKind.Interface &&
        m.displayName === 'TaistampHandlerConfig',
    );
    expect(config).toBeDefined();
    const signer = config!.members.find(
      (m) => m.displayName === 'signer',
    ) as ApiPropertyItem | undefined;
    expect(signer).toBeDefined();
    // The raw excerpt carries the bundler's disambiguation suffix…
    expect(signer!.propertyTypeExcerpt.text).toContain('Signer$1');
    // …which excerptText resolves back to the source symbol.
    expect(excerptText(signer!.propertyTypeExcerpt)).toBe('Signer');
  });
});

describe('excerptText (constructed)', () => {
  it('concatenates content tokens and trims surrounding whitespace', () => {
    const excerpt = excerptOf(
      new ExcerptToken(ExcerptTokenKind.Content, ' string '),
    );
    expect(excerptText(excerpt)).toBe('string');
  });

  it('strips a trailing $n from an unresolved reference token', () => {
    // No canonicalReference (an unresolved external symbol), so the
    // fallback path drops the bundler suffix from the raw text.
    const excerpt = excerptOf(
      new ExcerptToken(ExcerptTokenKind.Reference, 'Signer$1'),
    );
    expect(excerptText(excerpt)).toBe('Signer');
  });

  it('leaves a reference token with no $n suffix untouched', () => {
    const excerpt = excerptOf(
      new ExcerptToken(ExcerptTokenKind.Reference, 'Signer'),
    );
    expect(excerptText(excerpt)).toBe('Signer');
  });

  it('preserves internal spacing across mixed content and reference tokens', () => {
    // The ordinary shape: references interleaved with content. Internal
    // spacing is kept and only the ends trim; the reference token still
    // has the $n stripped mid-stream.
    const excerpt = excerptOf(
      new ExcerptToken(ExcerptTokenKind.Content, ' Record<string, '),
      new ExcerptToken(ExcerptTokenKind.Reference, 'Signer$1'),
      new ExcerptToken(ExcerptTokenKind.Content, '>'),
    );
    expect(excerptText(excerpt)).toBe('Record<string, Signer>');
  });
});
