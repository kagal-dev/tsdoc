// Single registry of every CSS class the presentational components
// emit. A component calls `useAPIClasses(kind?)` once at setup
// and binds the returned object's fields directly in its template
// (`:class="tsdoc.section"`, `:class="tsdoc.signature"`, etc.).

import type { ApiItemKind } from '@microsoft/api-extractor-model';

import { usePrefix } from './prefix';

export interface APIClasses {
  /** Modifier badges (`abstract`, `static`, `readonly`). */
  badge: string
  /** Placeholder shown when no package is supplied. */
  empty: string
  /** `extends` / `implements` lines. */
  heritage: string
  /** Kind label rendered by the generic fallback view. */
  kind: string
  /** Member list rendered by `APIMemberList`. */
  members: string
  /** Root of `APIPackageView`. */
  package: string
  /** The package's display name. */
  packageName: string
  /**
   * Composite section class for a per-kind view, e.g.
   * `'api-item api-class'`. Empty string when {@link useAPIClasses}
   * was called with no kind (i.e. by `APIPackageView` /
   * `APIMemberList`, which don't render a section themselves).
   */
  section: string
  /** Signature line inside a per-kind section. */
  signature: string
  /** TSDoc `@summary` prose. */
  summary: string
}

function kebabCase(value: string): string {
  return value
    .replaceAll(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * All CSS class strings for the current component subtree. Pass the
 * `ApiItemKind` of the item being rendered to populate
 * {@link APIClasses.section}; omit it for non-section components
 * (`APIPackageView`, `APIMemberList`).
 */
export function useAPIClasses(kind?: ApiItemKind): APIClasses {
  const p = usePrefix();
  const item = `${p}item`;
  const section = kind ? `${item} ${p}${kebabCase(kind)}` : '';
  return {
    package: `${p}package`,
    packageName: `${p}package-name`,
    empty: `${p}empty`,
    members: `${p}members`,
    signature: `${p}signature`,
    badge: `${p}badge`,
    kind: `${p}kind`,
    heritage: `${p}heritage`,
    summary: `${p}summary`,
    section,
  };
}
