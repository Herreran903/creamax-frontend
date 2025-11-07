/* eslint-disable no-restricted-globals */
/* SVGLoader dynamically imported only when needed (process path) */
import type {
  SvgPolygon,
  SvgColorGroup,
  SvgProcessResult,
  SvgWorkerMessage,
} from '@/lib/svg/types';
import { normalizeColor, parseFill } from '@/lib/svg/normalizeColor';
import { simplifyPolygons } from '@/lib/svg/simplify';
import { unionPolygonsByColor } from '@/lib/svg/boolean';

// For TS to recognize worker context as a module
export {};

declare const self: DedicatedWorkerGlobalScope & typeof globalThis;

type InMsg =
  | {
      type: 'process';
      svgText: string;
      simplifyTolerance?: number;
      doUnion?: boolean;
      curveSegments?: number;
    }
  | {
      type: 'process-polys';
      colors: SvgColorGroup[];
      width: number;
      height: number;
      viewBox?: [number, number, number, number];
      simplifyTolerance?: number;
      doUnion?: boolean;
    };

const post = (msg: SvgWorkerMessage) => {
  self.postMessage(msg);
};

function parseViewBox(svgText: string): [number, number, number, number] | undefined {
  // naive extraction; covers most SVGs
  const m = svgText.match(
    /viewBox\s*=\s*["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i
  );
  if (!m) return undefined;
  return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])];
}

function parseSize(svgText: string): { width?: number; height?: number } {
  const w = svgText.match(/width\s*=\s*["']\s*([-\d.]+)(px)?\s*["']/i)?.[1];
  const h = svgText.match(/height\s*=\s*["']\s*([-\d.]+)(px)?\s*["']/i)?.[1];
  return {
    width: w ? parseFloat(w) : undefined,
    height: h ? parseFloat(h) : undefined,
  };
}

function shapeToPolygons(shape: any, curveSegments: number): SvgPolygon[] {
  // shape.extractPoints preserves holes
  const { shape: outerPts, holes: holesPts } = shape.extractPoints(curveSegments);
  const toVec2 = (v: any) => [v.x, v.y] as [number, number];
  const outer = (outerPts as any[]).map(toVec2);
  const holes = (holesPts as any[]).map((ring) => (ring as any[]).map(toVec2));
  return [{ outer, holes }];
}

function groupPathsByFill(paths: any[], curveSegments: number) {
  const groups = new Map<string, SvgColorGroup>();
  for (const p of paths) {
    // style may be on userData.style or material
    const style = (p.userData?.style ?? {}) as Partial<{
      fill: string;
      fillOpacity: string | number;
      opacity: string | number;
    }>;
    const fillInfo = parseFill(style) ?? null;

    const hex = fillInfo?.hex ?? normalizeColor((p.userData?.style as any)?.stroke) ?? null;
    if (!hex) {
      // skip shapes without fill; stroke-only SVGs are out-of-scope for v1
      continue;
    }

    const shapes = (p.toShapes?.(true) ?? []) as any[];
    if (!shapes.length) continue;

    const polys: SvgPolygon[] = [];
    for (const s of shapes) {
      const arr = shapeToPolygons(s, curveSegments);
      polys.push(...arr);
    }

    if (!groups.has(hex)) {
      groups.set(hex, { hex, opacity: fillInfo?.opacity, shapes: [] });
    }
    groups.get(hex)!.shapes.push(...polys);
  }
  return groups;
}

self.onmessage = async (ev: MessageEvent<InMsg>) => {
  const data = ev.data;
  if (!data) return;

  // Fast path: receive precomputed polygons from main thread to avoid DOMParser in Worker
  if (data.type === 'process-polys') {
    try {
      post({ type: 'progress', step: 'simplify', progress: 40, note: 'Simplificando…' });

      let colors = data.colors as SvgColorGroup[];

      if (data.simplifyTolerance && data.simplifyTolerance > 0) {
        const tol = data.simplifyTolerance;
        colors = colors.map((cg) => ({
          ...cg,
          shapes: simplifyPolygons(cg.shapes, tol),
        }));
      }

      if (data.doUnion) {
        post({
          type: 'progress',
          step: 'boolean',
          progress: 92,
          note: 'Unión booleana (experimental)…',
        });
        colors = colors.map((cg) => ({
          ...cg,
          shapes: unionPolygonsByColor(cg.shapes),
        }));
      }

      const result: SvgProcessResult = {
        width: data.width,
        height: data.height,
        viewBox: data.viewBox,
        colors,
        warnings: data.doUnion ? ['La unión booleana está en modo experimental (stub).'] : [],
      };

      post({ type: 'progress', step: 'done', progress: 100, note: 'Listo.' });
      post({ type: 'result', result });
    } catch (e: any) {
      post({ type: 'error', error: e?.message || 'Error procesando polígonos' });
    }
    return;
  }

  if (data?.type !== 'process') return;

  const { svgText, simplifyTolerance = 0, doUnion = false, curveSegments = 12 } = data;

  try {
    post({ type: 'progress', step: 'parse', progress: 5, note: 'Leyendo SVG…' });

    if (!svgText || svgText.trim().length < 10) {
      throw new Error('SVG vacío o inválido');
    }

    // DOMParser/SVGLoader no disponible aquí: este camino está deshabilitado.
    // Usa el hilo principal para parsear y envía 'process-polys'.
    post({
      type: 'error',
      error:
        'DOMParser no está disponible en el Worker. Reprocesa el SVG en el hilo principal y envía "process-polys".',
    });
  } catch (e: any) {
    post({ type: 'error', error: e?.message || 'Error procesando SVG' });
  }
};
