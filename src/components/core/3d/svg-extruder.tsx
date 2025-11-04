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
      curveSegments: opts.curveSegments ?? 12,
    });
    eg.computeVertexNormals();
    geoms.push(eg);
  }
  const merged = mergeGeometries(geoms, false);
  geoms.forEach((g) => g.dispose());
  return merged;
}

function centerAndOrient(geometry: THREE.BufferGeometry): { offset: THREE.Vector3; size: THREE.Vector3 } {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox!;
  const size = new THREE.Vector3();
  bb.getSize(size);
  const center = new THREE.Vector3();
  bb.getCenter(center);
  const offset = center.multiplyScalar(-1);
  geometry.translate(offset.x, offset.y, offset.z);
  // orient: rotate -90deg on X so Z becomes "up"
  const rotX = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  geometry.applyMatrix4(rotX);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { offset, size };
}

function useMeshPacks(
  data: SvgProcessResult | null,
  depthMap: DepthMap,
  opts: { curveSegments?: number }
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

      const merged = buildGeometryForGroup({ ...cg, shapes }, depth, opts);
      if (!merged) continue;
      // Center and orient each color geometry independently
      centerAndOrient(merged);
      packs.push({ hex: cg.hex, geometry: merged });
    }
    return packs;
  }, [data, depthMap, opts]);
}

function ExtrudedGroups({
  packs,
  selectedHex,
}: {
  packs: MeshPack[];
  selectedHex?: string | null;
}) {
  // Reuse materials per color
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
      });
      materialsRef.current.set(hex, m);
    }
    // selection hint
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

  const computedPacks = useMeshPacks(result, depthMap, { curveSegments: 16 });

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
      <Canvas shadows camera={{ position: [2.4, 2.2, 2.4], fov: 45 }} onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), 0)}>
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