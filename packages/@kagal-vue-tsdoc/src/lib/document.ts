// Plain-text helpers over the `@microsoft/tsdoc` node graph that
// api-extractor-model attaches to documented items. Used by the
// presentational components to render the `@summary` prose.

import type { DocExcerpt, DocNode } from '@microsoft/tsdoc';
import { ApiDocumentedItem, type ApiItem } from '@microsoft/api-extractor-model';

/**
 * Concatenated plain text of a TSDoc node subtree.
 *
 * In the parser scenario `api-extractor-model` uses to parse
 * `docComment` strings, every literal character of the original
 * comment is carried by a `DocExcerpt` leaf — summing their content
 * reproduces the source prose.
 */
function documentNodeText(node: DocNode): string {
  let text = '';
  if (node.kind === 'Excerpt') {
    text += (node as DocExcerpt).content.toString();
  }
  for (const child of node.getChildNodes()) {
    text += documentNodeText(child);
  }
  return text;
}

/**
 * The `@summary` prose of an API item as trimmed plain text, with
 * runs of whitespace collapsed. Returns `''` when the item carries
 * no doc comment.
 */
export function summaryFor(item: ApiItem): string {
  if (item instanceof ApiDocumentedItem && item.tsdocComment) {
    return documentNodeText(item.tsdocComment.summarySection)
      .replaceAll(/\s+/g, ' ')
      .trim();
  }
  return '';
}
