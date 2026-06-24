// @kagal/build-tsdoc/utils — manifest helpers
//
// The dependency-light companion to the root entry. Where `.` runs
// api-extractor to *produce* manifests, this subpath holds the small
// pure helpers for working with them — JSON serialisation matching
// api-extractor's on-disk format, and the line-ending resolution it
// builds on. It imports no build tooling, so a consumer can pull it
// in without dragging api-extractor into its bundle graph.

import { EOL } from 'node:os';

/**
 * Line-ending policy for the emitted manifest, mirroring
 * api-extractor's `newlineKind`. `'os'` writes the host's native
 * endings, `'lf'`/`'crlf'` force one regardless of platform.
 */
export type NewlineKind = 'crlf' | 'lf' | 'os';

/**
 * A {@link NewlineKind} with `'os'` already resolved to the host's
 * concrete ending — the return type of {@link resolveNewlineKind}.
 */
export type ConcreteNewlineKind = Exclude<NewlineKind, 'os'>;

/**
 * Resolve a requested line ending to a concrete `'crlf'`/`'lf'`.
 * Only `'lf'` and `'crlf'` are honoured verbatim; `'os'`, an
 * omitted option, and any unexpected value (empty string, an
 * untyped caller's typo) all fall back to the host default. `EOL`
 * is `'\r\n'` on Windows and `'\n'` everywhere else (modern macOS
 * included), so it maps cleanly onto `'crlf'`/`'lf'`.
 */
export function resolveNewlineKind(
  kind: NewlineKind | undefined,
): ConcreteNewlineKind {
  if (kind === 'lf' || kind === 'crlf') {
    return kind;
  }
  return EOL === '\r\n' ? 'crlf' : 'lf';
}

/**
 * Serialise a value as JSON text the way api-extractor writes its
 * files: 2-space indent, trailing newline, and the line endings of
 * {@link newlineKind} — resolved via {@link resolveNewlineKind}, so
 * `'os'`, an omitted argument, and any unexpected value follow the
 * host. `JSON.stringify` escapes newlines within string values, so
 * the only raw breaks are structural — and the CRLF pass normalises
 * any `\r?\n` to a single `\r\n` rather than a bare `\n`→`\r\n`
 * swap, so it can never emit `\r\r\n` even if fed already-CRLF'd
 * text.
 */
export function serialiseJSON(
  value: unknown,
  newlineKind?: NewlineKind,
): string {
  const json = JSON.stringify(value, undefined, 2) + '\n';
  return resolveNewlineKind(newlineKind) === 'crlf' ?
    json.replaceAll(/\r?\n/g, '\r\n') :
    json;
}
