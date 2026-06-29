/**
 * Minimal consumer surface used to exercise `@kagal/build-tsdoc`
 * against a TypeScript 6.x toolchain. The shapes here are
 * deliberately ordinary — the point is the extraction, not the
 * API.
 */

/** A 2D point in screen space. */
export interface Point {
  /** Horizontal offset, in pixels. */
  x: number
  /** Vertical offset, in pixels. */
  y: number
}

/**
 * Euclidean distance between two {@link Point}s.
 *
 * @param a - the first point
 * @param b - the second point
 * @returns the straight-line distance between `a` and `b`
 */
export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/**
 * Translate a {@link Point} by the components of another. Pure —
 * returns a fresh point rather than mutating `origin`.
 */
export function translate(origin: Point, by: Point): Point {
  const { x, y } = origin;
  return { x: x + by.x, y: y + by.y };
}
