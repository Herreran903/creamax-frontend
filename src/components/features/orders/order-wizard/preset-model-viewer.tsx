'use client';
import * as React from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import {
  KeychainCircle,
  KeychainRect,
  KeychainSquare,
} from '@/components/shared/3d/keychain-meshes';
import { cn } from '@/lib/utils';
import { TextureInlay } from '@/components/shared';

export interface PresetModelViewerProps {
  className?: string;
  kind?: 'circle' | 'rect' | 'square';
  baseColor?: string;
  backColor?: string;
  borderColor?: string;
  textureUrl?: string | null;
}

export default function PresetModelViewer({
  className,
  kind = 'square',
  baseColor = '#7dd3fc',
  backColor = baseColor,
  borderColor = '#7dd3fc',
  textureUrl = null,
}: PresetModelViewerProps) {
  const thickness = 0.01;
  const reliefDepth = 0.06;
  const border = 0.05;

  const dims = React.useMemo(() => {
    if (kind === 'rect') return { w: 1.2, h: 0.8, r: 0 };
    if (kind === 'circle') return { w: 1.0, h: 1.0, r: 0.5 };
    return { w: 1.0, h: 1.0, r: 0 };
  }, [kind]);

  const makeInlayShape = React.useCallback(() => {
    if (kind === 'circle') {
      const innerR = Math.max(dims.r - border, 0.0001);
      const s = new THREE.Shape();
      s.absarc(0, 0, innerR, 0, Math.PI * 2, false);
      return s;
    } else {
      const iw = Math.max(dims.w - 2 * border, 0.0001);
      const ih = Math.max(dims.h - 2 * border, 0.0001);
      const hw = iw / 2,
        hh = ih / 2;
      const s = new THREE.Shape();
      s.moveTo(-hw, -hh);
      s.lineTo(hw, -hh);
      s.lineTo(hw, hh);
      s.lineTo(-hw, hh);
      s.closePath();
      return s;
    }
  }, [kind, dims, border]);

  function applyUVsToShapeGeometry(geom: THREE.ShapeGeometry) {
    geom.computeBoundingBox();
    const bb = geom.boundingBox!;
    const size = new THREE.Vector2(bb.max.x - bb.min.x, bb.max.y - bb.min.y);
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const uvs: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        y = pos.getY(i);
      const u = size.x > 0 ? (x - bb.min.x) / size.x : 0;
      const v = size.y > 0 ? 1 - (y - bb.min.y) / size.y : 0;
      uvs.push(u, v);
    }
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  }

  const inlayGeom = React.useMemo(() => {
    const shape = makeInlayShape();
    const g = new THREE.ShapeGeometry(shape);
    applyUVsToShapeGeometry(g);
    return g;
  }, [makeInlayShape]);

  const MeshComponent =
    kind === 'circle' ? KeychainCircle : kind === 'rect' ? KeychainRect : KeychainSquare;

  const controlsRef = React.useRef<any>(null);

  return (
    <div
      className={cn(
        'h-full relative overflow-hidden rounded-xl grid bg-[#F2F2F2]',
        'outline-4 outline-dashed outline-[#E5E5E5]',
        'bg-[radial-gradient(110%_80%_at_10%_10%,rgba(0,0,0,0.05),transparent),radial-gradient(110%_80%_at_90%_90%,rgba(0,0,0,0.05),transparent)]',
        className
      )}
    >
      <Canvas camera={{ position: [2, 1.8, 2], fov: 45 }}>
        <Environment preset="city" />
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 4, 4]} intensity={0.9} />
        <React.Suspense fallback={null}>
          <group scale={1.8}>
            <MeshComponent
              baseColor={baseColor}
              backColor={backColor}
              borderColor={borderColor}
              thickness={thickness}
              border={border}
              reliefDepth={reliefDepth}
            />
            {textureUrl && (
              <TextureInlay
                geometry={inlayGeom}
                textureUrl={textureUrl}
                position={[0, 0, 0.011]}
                fitMode="cover"
                initialZoom={1}
                draggable
                wheelZoom
                controlsRef={controlsRef}
              />
            )}
          </group>
        </React.Suspense>
        <OrbitControls
          ref={controlsRef}
          enableZoom={false}
          autoRotate={false}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
}
