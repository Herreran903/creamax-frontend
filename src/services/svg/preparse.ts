'use client';

import type { SvgColorGroup, SvgPolygon } from '@/lib/svg/types';
import { normalizeColor, parseFill } from '@/lib/svg/normalizeColor';

/**
 * Extract viewBox if present.
 */
function parseViewBox(svgText: string): [number, number, number, number] | undefined {
  const m = svgText.match(
    /viewBox\s*=\s*["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i
  );
  if (!m) return undefined;
  return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])];
}

/**
 * Extract width/height if present (px or unitless).
 */
function parseSize(svgText: string): { width?: number; height?: number } {
  const w = svgText.match(/width\s*=\s*["']\s*([-\d.]+)(px)?\s*["']/i)?.[1];
  const h = svgText.match(/height\s*=\s*["']\s*([-\d.]+)(px)?\s*["']/i)?.[1];
  return {
    width: w ? parseFloat(w) : undefined,
    height: h ? parseFloat(h) : undefined,
  };
}

function shapeToPolygons(shape: any, curveSegments: number): SvgPolygon[] {
  const { shape: outerPts, holes: holesPts } = shape.extractPoints(curveSegments);
  const toVec2 = (v: any) => [v.x, v.y] as [number, number];
  const outer = (outerPts as any[]).map(toVec2);
  const holes = (holesPts as any[]).map((ring) => (ring as any[]).map(toVec2));
  return [{ outer, holes }];
}

function groupPathsByFill(paths: any[], curveSegments: number) {
  const groups = new Map<string, SvgColorGroup>();
  for (const p of paths) {
    const style = (p.userData?.style ?? {}) as Partial<{
      fill: string;
      fillOpacity: string | number;
      opacity: string | number;
      stroke: string;
    }>;
    const fillInfo = parseFill(style) ?? null;

    // Prefer fill, fallback to stroke color when there is no fill
    const hex = fillInfo?.hex ?? normalizeColor(style.stroke) ?? null;
    if (!hex) continue;

    const shapes = (p.toShapes?.(true) ?? []) as any[];
    if (!shapes.length) continue;

    const polys: SvgPolygon[] = [];
    for (const s of shapes) polys.push(...shapeToPolygons(s, curveSegments));

    if (!groups.has(hex)) groups.set(hex, { hex, opacity: fillInfo?.opacity, shapes: [] });
    groups.get(hex)!.shapes.push(...polys);
  }
  return groups;
}

/**
 * Parse SVG text on the main thread and group polygons by color.
 * Returns color groups and the effective width/height and viewBox if present.
 */
export async function computeColorsFromSvgText(
  svgText: string,
  curveSegments = 12
): Promise<{
  colors: SvgColorGroup[];
  width: number;
  height: number;
  viewBox?: [number, number, number, number];
}> {
  const { SVGLoader } = await import('three/examples/jsm/loaders/SVGLoader.js');
  const loader = new SVGLoader();
  const parsed = loader.parse(svgText);
  const paths = parsed.paths || [];
  if (!paths.length) throw new Error('No se encontraron paths en el SVG');

  const grouped = groupPathsByFill(paths, curveSegments);
  if (grouped.size === 0) {
    throw new Error(
      'No se detectaron colores de relleno (fill). Asegúrate de que el SVG tenga "fill" o "stroke".'
    );
  }

  const colors: SvgColorGroup[] = [];
  for (const g of grouped.values())
    colors.push({ hex: g.hex, opacity: g.opacity, shapes: g.shapes });

  const vb = parseViewBox(svgText);
  const size = parseSize(svgText);
  const width = (size.width ?? vb?.[2] ?? 1024) | 0;
  const height = (size.height ?? vb?.[3] ?? 1024) | 0;

  return { colors, width, height, viewBox: vb };
}
