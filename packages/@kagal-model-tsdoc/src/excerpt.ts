// Plain-text rendering of api-extractor-model type excerpts. The
// model stores a declared type as a token stream; rendering the raw
// `excerpt.text` leaks the bundler's `$n` disambiguation suffix for
// re-exported references (e.g. `Signer$1`). Resolving each Reference
// token through its `canonicalReference` recovers the source name
// (`Signer`), which is what readers expect to see.

import {
  type APIInitializerMixin,
  type Excerpt,
  type ExcerptToken,
  ExcerptTokenKind,
} from './model';

/**
 * Display name for a Reference token, preferring the symbol named by
 * its `canonicalReference` over the token's raw text. api-extractor
 * inlines a re-exported type under the bundler's local alias
 * (`Signer$1`), yet the canonical reference still names the original
 * symbol (`Signer`).
 *
 * The reference reads `@scope/pkg!Symbol:meaning`; take the name
 * between the `!` source separator and the optional `:meaning`
 * suffix, dropping the `~` locals marker api-extractor prefixes onto
 * an unexported symbol, so `!~timestamp` reads as `timestamp`.
 * Type-excerpt references never carry member navigation, so a single
 * component is enough. Fall back to the raw text — minus a trailing
 * `$n` — when no reference resolved, or it carries no such name.
 */
function referenceName(token: ExcerptToken): string {
  const name = token.canonicalReference?.toString().match(/!~?([^:]+)/);
  return name ? name[1] : token.text.replace(/\$\d+$/, '');
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

/**
 * The literal initialiser an item declares, as plain text, or `''`
 * when it has none. A `const` with a literal value (or a valued enum
 * member) carries an `initializerExcerpt`; a declared-type variable
 * or a computed enum member does not. Use to render `name = value`.
 */
export function initializerText(item: APIInitializerMixin): string {
  return item.initializerExcerpt ?
    excerptText(item.initializerExcerpt) :
    '';
}
