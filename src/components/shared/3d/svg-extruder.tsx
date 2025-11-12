'use client';

import * as React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { cn } from '@/lib/utils';
import type { SvgProcessResult, SvgPolygon, SvgColorGroup, DepthMap } from '@/lib/svg/types';

type MeshPack = {
  hex: string;
  geometry: THREE.BufferGeometry;
};

/* --------------------------- Orientación / Earcut --------------------------- */
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

  // outer CCW, holes CW para que Earcut triangule correctamente
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

/* ----------------------- BBox / PIP / Intersección segs --------------------- */
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
  const [px, py] = p,
    [ax, ay] = a,
    [bx, by] = b;
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
    const [xi, yi] = ring[i],
      [xj, yj] = ring[j];
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
    const [x0, y0] = ring[j],
      [x1, y1] = ring[i];
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
function ringContainsRing(outer: [number, number][], inner: [number, number][], eps = 1e-4) {
  const A = ringBBox(outer),
    B = ringBBox(inner);
  if (!bboxContains(A, B, eps)) return false;
  const c = ringCentroid(inner);
  return pointInPolygonInclusive(c, outer, eps);
}
function anyPointInRing(ringA: [number, number][], ringB: [number, number][], eps = 1e-6) {
  for (const p of ringB) if (pointInPolygonInclusive(p, ringA, eps)) return true;
  return false;
}
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

/* ------------------------------ Extrusión por color ------------------------------ */
function buildGeometryForGroup(
  group: SvgColorGroup,
  depth: number,
  opts: { curveSegments?: number }
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
      curveSegments: opts.curveSegments ?? 20,
    });
    eg.computeVertexNormals();
    geoms.push(eg);
  }
  const merged = mergeGeometries(geoms, false);
  geoms.forEach((g) => g.dispose());
  return merged;
}

/* ------------------------------- Construcción packs ------------------------------- */
function useMeshPacks(
  data: SvgProcessResult | null,
  depthMap: DepthMap,
  opts: { curveSegments?: number }
): MeshPack[] {
  return React.useMemo(() => {
    if (!data) return [];
    const packs: MeshPack[] = [];

    const flipY = (p: [number, number]) => {
      const h = data.viewBox ? data.viewBox[3] : data.height || 1000;
      return [p[0], h - p[1]] as [number, number];
    };

    // 1) Copia Y-up por color
    const groups = data.colors.map((cg) => {
      const flipped: SvgPolygon[] = cg.shapes.map((s) => ({
        outer: s.outer.map(flipY),
        holes: s.holes?.map((hole) => hole.map(flipY)),
      }));
      return { hex: cg.hex, shapes: flipped, opacity: cg.opacity } as SvgColorGroup;
    });

    // 1.5) Dentro del mismo color, si un shape está contenido por otro → vuelve hole (repara anillos)
    for (const cg of groups) {
      const shapes = cg.shapes;
      const remove = new Array(shapes.length).fill(false);
      for (let i = 0; i < shapes.length; i++) {
        const A = shapes[i];
        if (!A?.outer || A.outer.length < 3) continue;
        for (let j = 0; j < shapes.length; j++) {
          if (i === j || remove[j]) continue;
          const B = shapes[j];
          if (!B?.outer || B.outer.length < 3) continue;
          if (ringContainsRing(A.outer, B.outer)) {
            if (!A.holes) A.holes = [];
            A.holes.push(B.outer);
            remove[j] = true;
          }
        }
      }
      cg.shapes = shapes.filter((_, idx) => !remove[idx]);
    }

    // 2) Índice plano (bbox + profundidad)
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

    // 3) Tallado cross-color:
    //    Si A tiene más profundidad que B y hay contención/solape o cruce → B.outer es hole de A.
    //    Además, copiamos B.holes para mantener paridad tipo evenodd.
    for (let ia = 0; ia < items.length; ia++) {
      const A = items[ia];
      for (let ib = 0; ib < items.length; ib++) {
        if (ia === ib) continue;
        const B = items[ib];
        if (B.depth >= A.depth) continue;

        const contains = ringContainsRing(A.poly.outer, B.poly.outer);
        const overlapPt = !contains && anyPointInRing(A.poly.outer, B.poly.outer);
        const overlapSeg = !contains && !overlapPt && ringsCross(A.poly.outer, B.poly.outer);
        if (!(contains || overlapPt || overlapSeg)) continue;

        if (!A.poly.holes) A.poly.holes = [];
        A.poly.holes.push(B.poly.outer);
        if (B.poly.holes?.length) {
          for (const hh of B.poly.holes) A.poly.holes.push(hh);
        }
      }
    }

    // 4) Centro global XY para alinear todos los colores
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

    // 5) Extrusión por color + centrado XY + base Z=0
    for (const cg of groups) {
      const depth = depthMap[cg.hex] ?? 1;
      const merged = buildGeometryForGroup(cg, depth, opts);
      if (!merged) continue;

      merged.translate(-cx, -cy, 0);
      merged.computeBoundingBox();
      const bb = merged.boundingBox!;
      if (bb.min.z !== 0) merged.translate(0, 0, -bb.min.z);
      merged.computeBoundingBox();
      merged.computeBoundingSphere();

      // Orientar a Z-arriba (si trabajabas Y-arriba originalmente)
      const rotX = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
      merged.applyMatrix4(rotX);
      merged.computeBoundingBox();
      merged.computeBoundingSphere();

      packs.push({ hex: cg.hex, geometry: merged });
    }

    return packs;
  }, [data, depthMap, opts]);
}

/* ------------------------------- Render por packs ------------------------------- */
function ExtrudedGroups({
  packs,
  selectedHex,
}: {
  packs: MeshPack[];
  selectedHex?: string | null;
}) {
  const materialsRef = React.useRef(new Map<string, THREE.MeshStandardMaterial>());

  React.useEffect(() => {
    return () => {
      materialsRef.current.forEach((m) => m.dispose());
      materialsRef.current.clear();
    };
  }, []);

  const getMat = (hex: string) => {
    let m = materialsRef.current.get(hex);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex),
        metalness: 0.15,
        roughness: 0.5,
        polygonOffset: true, // anti z-fighting
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
  };

  return (
    <group>
      {packs.map((p) => (
        <mesh key={p.hex} geometry={p.geometry} material={getMat(p.hex)} castShadow receiveShadow />
      ))}
    </group>
  );
}

/* --------------------------------- Canvas wrapper -------------------------------- */
export function SvgExtruderCanvas({
  result,
  depthMap,
  selectedHex,
  className,
  onGroupReady,
}: {
  result: SvgProcessResult | null;
  depthMap: DepthMap;
  selectedHex?: string | null;
  className?: string;
  onGroupReady?: (group: THREE.Group | null) => void;
}) {
  const [packs, setPacks] = React.useState<MeshPack[]>([]);
  const groupRef = React.useRef<THREE.Group>(null);

  const computedPacks = useMeshPacks(result, depthMap, { curveSegments: 20 });

  React.useEffect(() => {
    setPacks(computedPacks);
  }, [computedPacks]);
  React.useEffect(() => {
    onGroupReady?.(groupRef.current);
  }, [groupRef.current, onGroupReady]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/40 dark:border-white/10 bg-[#F2F2F2] w-full h-[300px] md:h-[420px]',
        className
      )}
    >
      <Canvas
        shadows
        camera={{ position: [2.4, 2.2, 2.4], fov: 45 }}
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), 0)}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 6, 4]} intensity={0.9} castShadow />
        <Environment preset="city" />

        <group ref={groupRef}>
          <ExtrudedGroups packs={packs} selectedHex={selectedHex} />
        </group>

        <OrbitControls makeDefault enablePan={false} autoRotate autoRotateSpeed={0.6} />
      </Canvas>
    </div>
  );
}

/* ----------------------------------- Export default ----------------------------------- */
export default function SvgExtruder({
  result,
  depthMap,
  selectedHex,
  className,
  onGroupReady,
}: {
  result: SvgProcessResult | null;
  depthMap: DepthMap;
  selectedHex?: string | null;
  className?: string;
  onGroupReady?: (group: THREE.Group | null) => void;
}) {
  return (
    <SvgExtruderCanvas
      result={result}
      depthMap={depthMap}
      selectedHex={selectedHex}
      className={className}
      onGroupReady={onGroupReady}
    />
  );
}
