import type { Vec2, SvgPolygon } from './types';

/**
 * Ramer–Douglas–Peucker simplification for 2D polylines.
 * Works in O(n log n) average using recursion. Tolerance is measured in the same units as input.
 * Returns a new array (does not mutate).
 */
export function simplifyPath(points: Vec2[], tolerance = 0.5): Vec2[] {
  if (points.length <= 2 || tolerance <= 0) return points.slice();

  const sqTolerance = tolerance * tolerance;

  const sqDist = (p: Vec2, a: Vec2, b: Vec2): number => {
    let x = a[0];
    let y = a[1];
    let dx = b[0] - x;
    let dy = b[1] - y;

    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = b[0];
        y = b[1];
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }

    dx = p[0] - x;
    dy = p[1] - y;
    return dx * dx + dy * dy;
  };

  const simplifyDP = (pts: Vec2[], first: number, last: number, sqTol: number, out: Vec2[]) => {
    let maxSqDist = sqTol;
    let index = -1;

    for (let i = first + 1; i < last; i++) {
      const d = sqDist(pts[i], pts[first], pts[last]);
      if (d > maxSqDist) {
        index = i;
        maxSqDist = d;
      }
    }

    if (index !== -1) {
      if (index - first > 1) simplifyDP(pts, first, index, sqTol, out);
      out.push(pts[index]);
      if (last - index > 1) simplifyDP(pts, index, last, sqTol, out);
    }
  };

  const last = points.length - 1;
  const res: Vec2[] = [points[0]];
  simplifyDP(points, 0, last, sqTolerance, res);
  res.push(points[last]);

  // For closed rings, ensure closure and remove tiny spikes
  if (res.length > 2) {
    const first = res[0];
    const lastP = res[res.length - 1];
    if (first[0] !== lastP[0] || first[1] !== lastP[1]) {
      // if original was closed, re-close
      const wasClosed =
        points.length > 2 && points[0][0] === points[points.length - 1][0] && points[0][1] === points[points.length - 1][1];
      if (wasClosed) res.push([first[0], first[1]]);
    }
  }

  return res;
}

/**
 * Simplify an SVG polygon (outer ring + holes).
 */
export function simplifyPolygon(poly: SvgPolygon, tolerance = 0.5): SvgPolygon {
  const outer = simplifyPath(poly.outer, tolerance);
  const holes = poly.holes?.map((h) => simplifyPath(h, tolerance)) ?? [];
  return { outer, holes };
}

/**
 * Simplify an array of polygons.
 */
export function simplifyPolygons(polys: SvgPolygon[], tolerance = 0.5): SvgPolygon[] {
  if (!tolerance || tolerance <= 0) return polys.slice();
  return polys.map((p) => simplifyPolygon(p, tolerance));
}