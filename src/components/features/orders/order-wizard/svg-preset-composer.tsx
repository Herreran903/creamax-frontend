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

// ----- geometry helpers (adapted from SvgExtruder) -----

type MeshPack = {
  hex: string;
  geometry: THREE.BufferGeometry;
};

function polygonToShape(poly: SvgPolygon): THREE.Shape {
  const shape = new THREE.Shape();
  const pts = poly.outer;
  if (pts.length > 0) {
    shape.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
    shape.closePath();
  }
  if (poly.holes) {
    for (const holePts of poly.holes) {
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
      curveSegments: curveSegments ?? 12,
    });
    eg.computeVertexNormals();
    geoms.push(eg);
  }

  // Merge buffer geometries
  const merged = mergeGeometries(geoms, false);
  geoms.forEach((g: THREE.BufferGeometry) => g.dispose());
  return merged;
}

function centerAndOrient(geometry: THREE.BufferGeometry): { size: THREE.Vector3 } {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox!;
  const size = new THREE.Vector3();
  bb.getSize(size);
  const center = new THREE.Vector3();
  bb.getCenter(center);
  const offset = center.multiplyScalar(-1);
  // Center only in X/Y so the shape is centered but keep Z as is (extrusion along +Z)
  geometry.translate(offset.x, offset.y, 0);

  // Ensure the base sits exactly at Z = 0 so it never extrudes backwards
  geometry.computeBoundingBox();
  const bb2 = geometry.boundingBox!;
  const minZ = bb2.min.z;
  if (minZ !== 0) {
    geometry.translate(0, 0, -minZ);
  }

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { size };
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
      // Flip Y: SVG Y-down to Y-up
      const h = data.viewBox ? data.viewBox[3] : data.height || 1000;
      return [p[0], h - p[1]] as [number, number];
    };

    for (const cg of data.colors) {
      const depth = depthMap[cg.hex] ?? 1;
      const shapes: SvgPolygon[] = cg.shapes.map((s) => ({
        outer: s.outer.map(flipY),
        holes: s.holes?.map((hole) => hole.map(flipY)),
      }));

      const merged = buildGeometryForGroup({ ...cg, shapes }, depth, curveSegments);
      if (!merged) continue;
      centerAndOrient(merged);
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
  borderColor = '#7dd3fc',
  result,
  depthMap,
  selectedHex,
  onDepthChange,
  onSelectHex,
}: SvgPresetComposerProps) {
  // same constants used in PresetModelViewer
  const thickness = 0.01;
  const reliefDepth = 0.06;
  const border = 0.05;

  const dims = React.useMemo(() => {
    if (kind === 'rect') return { w: 1.2, h: 0.8, r: 0 };
    if (kind === 'circle') return { w: 1.0, h: 1.0, r: 0.5 };
    return { w: 1.0, h: 1.0, r: 0 };
  }, [kind]);

  // compute target area for SVG (inside border frame)
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

  // Debounce depth map updates to avoid blocking UI on continuous slider drag
  const [debouncedDepthMap, setDebouncedDepthMap] = React.useState(depthMap);
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedDepthMap(depthMap), 120);
    return () => clearTimeout(id);
  }, [depthMap]);

  const curveSegments = 16;
  const packs = useMeshPacks(result, debouncedDepthMap, curveSegments);

  // compute uniform scale to fit result into target area
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

  // User scale multiplier to let the user make the SVG smaller or larger
  const [userScale, setUserScale] = React.useState(1);
  const finalScale = svgScale * userScale;

  // compose group and notify global ActiveModel so stepper can proceed
  const groupRef = React.useRef<THREE.Group>(null);
  const { setReady } = useActiveModel();

  React.useEffect(() => {
    if (!groupRef.current) return;
    // Only set READY when we actually have extruded meshes
    const hasAny = packs.length > 0;
    if (!hasAny) return;

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

  // color materials cache (selection emissive)
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
        {/* Left: composed 3D preview */}
        <div className="relative rounded-xl border-2 border-border bg-white">
          <Canvas camera={{ position: [2, 1.8, 2], fov: 45 }}>
            <Environment preset="city" />
            <ambientLight intensity={0.35} />
            <directionalLight position={[4, 4, 4]} intensity={0.9} />

            <group ref={groupRef} scale={1.8}>
              <MeshComponent
                baseColor={baseColor}
                borderColor={borderColor}
                thickness={thickness}
                border={border}
                reliefDepth={reliefDepth}
              />

              {/* SVG extrusions placed on top (extrude only upwards from Z=0) */}
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

        {/* Right: controls + color list with extrusion heights */}
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
