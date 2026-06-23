// Plain-text rendering of api-extractor-model type excerpts. The
// model stores a declared type as a token stream; rendering the raw
// `excerpt.text` leaks the bundler's `$n` disambiguation suffix for
// re-exported references (e.g. `Signer$1`). Resolving each Reference
// token through its `canonicalReference` recovers the source name
// (`Signer`), which is what readers expect to see.

import {
  type Excerpt,
  type ExcerptToken,
  ExcerptTokenKind,
} from '@microsoft/api-extractor-model';

/**
 * Display name for a Reference token, preferring the symbol named by
 * its `canonicalReference` over the token's raw text. api-extractor
 * inlines a re-exported type under the bundler's local alias
 * (`Signer$1`), yet the canonical reference still names the original
 * symbol (`Signer`); fall back to the raw text — minus a trailing
 * `$n` — only when no reference resolved.
 */
function referenceName(token: ExcerptToken): string {
  const reference = token.canonicalReference;
  if (reference) {
    // `@scope/pkg!Symbol:meaning` -> `Symbol`: the symbol sits
    // between the `!` source separator and the trailing `:meaning`.
    // A resolved canonicalReference always carries both, so the
    // `!` and non-empty-symbol guards below never fail in practice
    // — they keep the parse total against a malformed reference.
    const text = reference.toString();
    const separator = text.indexOf('!');
    if (separator !== -1) {
      let symbol = text.slice(separator + 1);
      const meaning = symbol.lastIndexOf(':');
      if (meaning !== -1) {
        symbol = symbol.slice(0, meaning);
      }
      if (symbol) {
        return symbol;
      }
    }
  }
  return token.text.replace(/\$\d+$/, '');
}

/**
 * The declared type an {@link Excerpt} spans, as trimmed plain text,
 * with Reference tokens resolved to their source names. Use in place
 * of `excerpt.text` so re-exported references render cleanly.
 */
export function excerptText(excerpt: Excerpt): string {
  let text = '';
  for (const token of excerpt.spannedTokens) {
    text += token.kind === ExcerptTokenKind.Reference ?
      referenceName(token) :
      token.text;
  }
  return text.trim();
}
