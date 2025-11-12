'use client';

import * as React from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { cn } from '@/lib/utils';
import {
  KeychainCircle,
  KeychainRect,
  KeychainSquare,
} from '@/components/shared/3d/keychain-meshes';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { SvgProcessResult, SvgPolygon, SvgColorGroup, DepthMap } from '@/lib/svg/types';
import { useActiveModel } from '@/stores/active-model';

// ----- geometry helpers -----

type MeshPack = {
  hex: string;
  geometry: THREE.BufferGeometry;
};

/** Orientación (Earcut entiende holes si outer=CCW y hole=CW) */
function ringSignedArea(pts: [number, number][]): number {
  let sum = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [x0, y0] = pts[j];
    const [x1, y1] = pts[i];
    sum += x0 * y1 - x1 * y0;
  }
  return 0.5 * sum;
}
function isCCW(pts: [number, number][]) {
  return ringSignedArea(pts) > 0;
}
function ensureWinding(pts: [number, number][], wantCCW: boolean): [number, number][] {
  if (pts.length < 3) return pts;
  const ccw = isCCW(pts);
  return ccw === wantCCW ? pts : pts.slice().reverse();
}

function polygonToShape(poly: SvgPolygon): THREE.Shape {
  const shape = new THREE.Shape();
  const outer = ensureWinding(poly.outer, true);
  if (outer.length > 0) {
    shape.moveTo(outer[0][0], outer[0][1]);
    for (let i = 1; i < outer.length; i++) shape.lineTo(outer[i][0], outer[i][1]);
    shape.closePath();
  }
  if (poly.holes) {
    for (const holePts0 of poly.holes) {
      const holePts = ensureWinding(holePts0, false);
      const hole = new THREE.Path();
      if (holePts.length > 0) {
        hole.moveTo(holePts[0][0], holePts[0][1]);
        for (let i = 1; i < holePts.length; i++) hole.lineTo(holePts[i][0], holePts[i][1]);
        hole.closePath();
      }
      shape.holes.push(hole);
    }
  }
  return shape;
}

/** BBox + PIP + cruce de segmentos (para solapes “raros”) */
type BBox = { minX: number; minY: number; maxX: number; maxY: number };
function ringBBox(pts: [number, number][]): BBox {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}
function bboxContains(a: BBox, b: BBox, eps = 1e-4): boolean {
  return (
    b.minX >= a.minX - eps &&
    b.maxX <= a.maxX + eps &&
    b.minY >= a.minY - eps &&
    b.maxY <= a.maxY + eps
  );
}
function pointOnSegment(p: [number, number], a: [number, number], b: [number, number], eps = 1e-6) {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const vx = bx - ax,
    vy = by - ay;
  const wx = px - ax,
    wy = py - ay;
  const cross = Math.abs(vx * wy - vy * wx);
  const segLen2 = vx * vx + vy * vy;
  if (segLen2 < eps) return Math.hypot(wx, wy) < eps;
  const t = (wx * vx + wy * vy) / segLen2;
  if (t < -eps || t > 1 + eps) return false;
  const dist = cross / Math.sqrt(segLen2);
  return dist <= eps;
}
function pointInPolygonInclusive(
  p: [number, number],
  ring: [number, number][],
  eps = 1e-6
): boolean {
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    if (pointOnSegment(p, ring[j], ring[i], eps)) return true;
  }
  const [x, y] = p;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
function ringCentroid(ring: [number, number][]): [number, number] {
  let x = 0,
    y = 0,
    a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x0, y0] = ring[j];
    const [x1, y1] = ring[i];
    const f = x0 * y1 - x1 * y0;
    a += f;
    x += (x0 + x1) * f;
    y += (y0 + y1) * f;
  }
  if (Math.abs(a) < 1e-8) {
    let sx = 0,
      sy = 0;
    for (const [xi, yi] of ring) {
      sx += xi;
      sy += yi;
    }
    return [sx / ring.length, sy / ring.length];
  }
  a *= 0.5;
  return [x / (6 * a), y / (6 * a)];
}
function ringContainsRing(
  outer: [number, number][],
  inner: [number, number][],
  eps = 1e-4
): boolean {
  const A = ringBBox(outer),
    B = ringBBox(inner);
  if (!bboxContains(A, B, eps)) return false;
  const c = ringCentroid(inner);
  return pointInPolygonInclusive(c, outer, eps);
}
function anyPointInRing(ringA: [number, number][], ringB: [number, number][], eps = 1e-6): boolean {
  for (const p of ringB) if (pointInPolygonInclusive(p, ringA, eps)) return true;
  return false;
}

/** cruce de segmentos */
function segIntersects(
  a1: [number, number],
  a2: [number, number],
  b1: [number, number],
  b2: [number, number]
) {
  const cross = (p: [number, number], q: [number, number], r: [number, number]) =>
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const onSeg = (p: [number, number], q: [number, number], r: [number, number]) =>
    Math.min(p[0], r[0]) - 1e-8 <= q[0] &&
    q[0] <= Math.max(p[0], r[0]) + 1e-8 &&
    Math.min(p[1], r[1]) - 1e-8 <= q[1] &&
    q[1] <= Math.max(p[1], r[1]) + 1e-8;
  const o1 = cross(a1, a2, b1),
    o2 = cross(a1, a2, b2),
    o3 = cross(b1, b2, a1),
    o4 = cross(b1, b2, a2);
  if (((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0)))
    return true;
  if (Math.abs(o1) < 1e-8 && onSeg(a1, b1, a2)) return true;
  if (Math.abs(o2) < 1e-8 && onSeg(a1, b2, a2)) return true;
  if (Math.abs(o3) < 1e-8 && onSeg(b1, a1, b2)) return true;
  if (Math.abs(o4) < 1e-8 && onSeg(b1, a2, b2)) return true;
  return false;
}
function ringsCross(rA: [number, number][], rB: [number, number][]) {
  for (let i = 0; i < rA.length; i++) {
    const a1 = rA[i],
      a2 = rA[(i + 1) % rA.length];
    for (let j = 0; j < rB.length; j++) {
      const b1 = rB[j],
        b2 = rB[(j + 1) % rB.length];
      if (segIntersects(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

/** Extrusión simple por color */
function buildGeometryForGroup(
  group: SvgColorGroup,
  depth: number,
  curveSegments?: number
): THREE.BufferGeometry | null {
  const shapes: THREE.Shape[] = [];
  for (const poly of group.shapes) {
    if (!poly.outer || poly.outer.length < 3) continue;
    shapes.push(polygonToShape(poly));
  }
  if (shapes.length === 0) return null;

  const geoms: THREE.BufferGeometry[] = [];
  for (const s of shapes) {
    const eg = new THREE.ExtrudeGeometry(s, {
      depth: Math.max(0, depth),
      bevelEnabled: false,
      curveSegments: curveSegments ?? 16,
    });
    eg.computeVertexNormals();
    geoms.push(eg);
  }

  const merged = mergeGeometries(geoms, false);
  geoms.forEach((g) => g.dispose());
  return merged;
}

function useMeshPacks(
  data: SvgProcessResult | null,
  depthMap: DepthMap,
  curveSegments: number
): MeshPack[] {
  return React.useMemo(() => {
    if (!data) return [];
    const packs: MeshPack[] = [];

    const flipY = (p: [number, number]) => {
      const h = data.viewBox ? data.viewBox[3] : data.height || 1000;
      return [p[0], h - p[1]] as [number, number];
    };

    // 1) Copia flip Y por grupo
    const groups = data.colors.map((cg) => {
      const flipped: SvgPolygon[] = cg.shapes.map((s) => ({
        outer: s.outer.map(flipY),
        holes: s.holes?.map((hole) => hole.map(flipY)),
      }));
      return { hex: cg.hex, shapes: flipped, opacity: cg.opacity } as SvgColorGroup;
    });

    // 2) Índice plano con bbox+depth
    type Item = {
      gid: number;
      sid: number;
      hex: string;
      depth: number;
      poly: SvgPolygon;
      bbox: BBox;
    };
    const items: Item[] = [];
    for (let gi = 0; gi < groups.length; gi++) {
      const cg = groups[gi];
      const d = depthMap[cg.hex] ?? 1;
      for (let si = 0; si < cg.shapes.length; si++) {
        const poly = cg.shapes[si];
        if (!poly.outer || poly.outer.length < 3) continue;
        items.push({ gid: gi, sid: si, hex: cg.hex, depth: d, poly, bbox: ringBBox(poly.outer) });
      }
    }

    // 3) Tallado: si A es más profundo que B y hay contención/solape/cruce, B.outer se vuelve hole de A.
    for (let ia = 0; ia < items.length; ia++) {
      const A = items[ia];
      for (let ib = 0; ib < items.length; ib++) {
        if (ia === ib) continue;
        const B = items[ib];
        if (B.depth >= A.depth) continue;

        const contains = ringContainsRing(A.poly.outer, B.poly.outer);
        const overlapP = !contains && anyPointInRing(A.poly.outer, B.poly.outer);
        const overlapSeg = !contains && !overlapP && ringsCross(A.poly.outer, B.poly.outer);
        if (!(contains || overlapP || overlapSeg)) continue;

        if (!A.poly.holes) A.poly.holes = [];
        // B como cavidad
        A.poly.holes.push(B.poly.outer);
        // Paridad evenodd: si B tenía holes, los añadimos para “rellenar” dentro del agujero
        if (B.poly.holes?.length) {
          for (const hh of B.poly.holes) A.poly.holes.push(hh);
        }
      }
    }

    // 4) Centro global XY (mantiene alineados todos los colores)
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const cg of groups) {
      for (const poly of cg.shapes) {
        const rings = [poly.outer, ...(poly.holes ?? [])];
        for (const r of rings) {
          if (!r?.length) continue;
          for (const [x, y] of r) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
    }
    const hasBounds = isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY);
    const cx = hasBounds ? (minX + maxX) / 2 : 0;
    const cy = hasBounds ? (minY + maxY) / 2 : 0;

    // 5) Extrusión por color
    for (const cg of groups) {
      const depth = depthMap[cg.hex] ?? 1;
      const merged = buildGeometryForGroup(cg, depth, curveSegments);
      if (!merged) continue;
      // Centrado XY y base Z=0 (si hizo falta)
      merged.translate(-cx, -cy, 0);
      merged.computeBoundingBox();
      const bb = merged.boundingBox!;
      if (bb.min.z !== 0) merged.translate(0, 0, -bb.min.z);
      merged.computeBoundingBox();
      merged.computeBoundingSphere();
      packs.push({ hex: cg.hex, geometry: merged });
    }

    return packs;
  }, [data, depthMap, curveSegments]);
}

// ----- viewer -----

export interface SvgPresetComposerProps {
  className?: string;
  kind?: 'circle' | 'rect' | 'square';
  baseColor?: string;
  backColor?: string;
  borderColor?: string;
  result: SvgProcessResult | null;
  depthMap: DepthMap;
  selectedHex?: string | null;
  onDepthChange?: (hex: string, v: number) => void;
  onSelectHex?: (hex: string) => void;
}

export default function SvgPresetComposer({
  className,
  kind = 'square',
  baseColor = '#7dd3fc',
  backColor = baseColor,
  borderColor = '#7dd3fc',
  result,
  depthMap,
  selectedHex,
  onDepthChange,
  onSelectHex,
}: SvgPresetComposerProps) {
  // Constantes del llavero
  const thickness = 0.01;
  const reliefDepth = 0.06;
  const border = 0.05;

  const dims = React.useMemo(() => {
    if (kind === 'rect') return { w: 1.2, h: 0.8, r: 0 };
    if (kind === 'circle') return { w: 1.0, h: 1.0, r: 0.5 };
    return { w: 1.0, h: 1.0, r: 0 };
  }, [kind]);

  // Área interna disponible para el SVG (dentro del borde)
  const targetArea = React.useMemo(() => {
    if (kind === 'circle') {
      const innerR = Math.max(dims.r - border, 0.0001);
      return { w: innerR * 2, h: innerR * 2 };
    } else {
      const iw = Math.max(dims.w - 2 * border, 0.0001);
      const ih = Math.max(dims.h - 2 * border, 0.0001);
      return { w: iw, h: ih };
    }
  }, [kind, dims, border]);

  // Debounce a los grosores por color
  const [debouncedDepthMap, setDebouncedDepthMap] = React.useState(depthMap);
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedDepthMap(depthMap), 120);
    return () => clearTimeout(id);
  }, [depthMap]);

  const curveSegments = 20; // un poco más fino para bordes suaves
  const packs = useMeshPacks(result, debouncedDepthMap, curveSegments);

  // Escalado uniforme para encajar el SVG en el área
  const svgDims = React.useMemo(
    () => ({
      w: result?.viewBox?.[2] ?? result?.width ?? 1024,
      h: result?.viewBox?.[3] ?? result?.height ?? 1024,
    }),
    [result]
  );
  const svgScale = React.useMemo(() => {
    const sx = targetArea.w / (svgDims.w || 1);
    const sy = targetArea.h / (svgDims.h || 1);
    return Math.min(sx, sy);
  }, [targetArea, svgDims]);

  // Control de escala del usuario
  const [userScale, setUserScale] = React.useState(1);
  const finalScale = svgScale * userScale;

  // Reporte al ActiveModel
  const groupRef = React.useRef<THREE.Group>(null);
  const { setReady } = useActiveModel();
  React.useEffect(() => {
    if (!groupRef.current) return;
    const any = packs.length > 0;
    if (!any) return;

    let triangles = 0;
    let materials = 0;
    groupRef.current.traverse((obj: any) => {
      if (obj.isMesh) {
        const g = obj.geometry as THREE.BufferGeometry | undefined;
        if (g) {
          const index = g.getIndex();
          const pos = g.getAttribute('position');
          if (index) triangles += index.count / 3;
          else if (pos) triangles += (pos as any).count / 3;
        }
        if (obj.material) {
          materials += Array.isArray(obj.material) ? obj.material.length : 1;
        }
      }
    });

    setReady(groupRef.current, {
      name: 'Modelo SVG',
      format: 'procedural',
      triangles,
      materials,
      sizeMB: undefined,
      source: 'svg',
      createdAt: Date.now(),
    });
  }, [packs, setReady]);

  // Cache de materiales con polygonOffset para evitar z-fighting
  const materialsRef = React.useRef(new Map<string, THREE.MeshStandardMaterial>());
  React.useEffect(() => {
    return () => {
      materialsRef.current.forEach((m) => m.dispose());
      materialsRef.current.clear();
    };
  }, []);
  const getMat = React.useCallback(
    (hex: string) => {
      let m = materialsRef.current.get(hex);
      if (!m) {
        m = new THREE.MeshStandardMaterial({
          color: new THREE.Color(hex),
          metalness: 0.15,
          roughness: 0.5,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        });
        materialsRef.current.set(hex, m);
      }
      if (selectedHex && selectedHex === hex) {
        m.emissive = new THREE.Color(hex);
        m.emissiveIntensity = 0.15;
      } else {
        m.emissive = new THREE.Color(0x000000);
        m.emissiveIntensity = 0.0;
      }
      return m;
    },
    [selectedHex]
  );

  const MeshComponent =
    kind === 'circle' ? KeychainCircle : kind === 'rect' ? KeychainRect : KeychainSquare;

  return (
    <div
      className={cn(
        'h-full relative overflow-hidden rounded-xl grid bg-[#F2F2F2]',
        'outline-4 outline-dashed outline-[#E5E5E5]',
        'bg-[radial-gradient(110%_80%_at_10%_10%,rgba(0,0,0,0.05),transparent),radial-gradient(110%_80%_at_90%_90%,rgba(0,0,0,0.05),transparent)]',
        className
      )}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-2">
        {/* Left: preview compuesto */}
        <div className="relative rounded-xl border-2 border-border bg-white">
          <Canvas camera={{ position: [2, 1.8, 2], fov: 45 }}>
            <Environment preset="city" />
            <ambientLight intensity={0.35} />
            <directionalLight position={[4, 4, 4]} intensity={0.9} />

            <group ref={groupRef} scale={1.8}>
              <MeshComponent
                baseColor={baseColor}
                backColor={backColor}
                borderColor={borderColor}
                thickness={thickness}
                border={border}
                reliefDepth={reliefDepth}
              />

              {/* SVG extruido arriba del plano (solo +Z) */}
              <group
                position={[0, 0, thickness / 2 + 0.001]}
                scale={[finalScale, finalScale, finalScale]}
              >
                {packs.map((p) => (
                  <mesh
                    key={p.hex}
                    geometry={p.geometry}
                    material={getMat(p.hex)}
                    castShadow
                    receiveShadow
                  />
                ))}
              </group>
            </group>

            <OrbitControls
              enableZoom={false}
              autoRotate={false}
              enableDamping
              dampingFactor={0.08}
            />
          </Canvas>
        </div>

        {/* Right: controles */}
        <div className="rounded-xl border-2 border-border bg-white p-3 overflow-hidden">
          <div className="mb-3">
            <label className="text-xs font-semibold">Escala del SVG</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0.2}
                max={1.5}
                step={0.01}
                value={userScale}
                onChange={(e) => setUserScale(parseFloat(e.target.value))}
                className="w-full"
                aria-label="Escala del SVG"
              />
              <span className="text-[11px] text-muted-foreground">
                {Math.round(userScale * 100)}%
              </span>
            </div>
          </div>
          <p className="text-xs font-semibold mb-2">Colores detectados</p>
          <div className="h-[48vh] lg:h-full overflow-y-auto pr-1 space-y-2">
            {result?.colors?.length ? (
              result.colors.map((c) => {
                const depth = depthMap[c.hex] ?? 1.0;
                return (
                  <div
                    key={c.hex}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectHex?.(c.hex)}
                    onKeyDown={(e) => e.key === 'Enter' && onSelectHex?.(c.hex)}
                    className={`rounded-lg border p-2 ${
                      selectedHex === c.hex
                        ? 'border-[#0B4D67] shadow-[1.5px_1.5px_0_0_#0B4D67]'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-4 w-4 rounded"
                        style={{ backgroundColor: c.hex }}
                        aria-label={`Color ${c.hex}`}
                      />
                      <span className="text-xs font-medium">{c.hex}</span>
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        {depth.toFixed(1)}mm
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={0.1}
                      value={depth}
                      onChange={(e) => onDepthChange?.(c.hex, parseFloat(e.target.value))}
                      className="w-full mt-2"
                      aria-label={`Altura para ${c.hex}`}
                    />
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground">
                Cargue un SVG para listar y ajustar grosores por color.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
