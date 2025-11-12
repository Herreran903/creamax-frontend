'use client';
import * as React from 'react';
import * as THREE from 'three';
import { Canvas, useThree, invalidate } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import {
  KeychainCircle,
  KeychainRect,
  KeychainSquare,
} from '@/components/shared/3d/keychain-meshes';
import { cn } from '@/lib/utils';
import { TextureInlay } from '@/components/shared';
import { RefreshCcw } from 'lucide-react';

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

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // --- estado para remontar cuando falle
  const [canvasKey, setCanvasKey] = React.useState(0);
  const [dead, setDead] = React.useState(false);
  const remount = React.useCallback(() => {
    setDead(false);
    setCanvasKey((k) => k + 1);
    // pintamos el primer frame al volver
    requestAnimationFrame(() => invalidate());
  }, []);

  const dims = React.useMemo(() => {
    if (kind === 'rect') return { w: 1.2, h: 0.8, r: 0 };
    if (kind === 'circle') return { w: 1.0, h: 1.0, r: 0.5 };
    return { w: 1.0, h: 1.0, r: 0 };
  }, [kind]);

  const makeInlayShape = React.useCallback(() => {
    const s = new THREE.Shape();
    if (kind === 'circle') {
      const innerR = Math.max(dims.r - border, 0.0001);
      s.absarc(0, 0, innerR, 0, Math.PI * 2, false);
    } else {
      const iw = Math.max(dims.w - 2 * border, 0.0001);
      const ih = Math.max(dims.h - 2 * border, 0.0001);
      const hw = iw / 2,
        hh = ih / 2;
      s.moveTo(-hw, -hh);
      s.lineTo(hw, -hh);
      s.lineTo(hw, hh);
      s.lineTo(-hw, hh);
      s.closePath();
    }
    return s;
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
    (geom as any).uvsNeedUpdate = true;
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

  const handleTextureLoaded = React.useCallback(() => invalidate(), []);

  if (!mounted) {
    return (
      <div
        className={cn(
          'h-full relative overflow-hidden rounded-xl bg-[#F2F2F2]',
          'outline-4 outline-dashed outline-[#E5E5E5]',
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'h-full relative overflow-hidden rounded-xl bg-[#F2F2F2]',
        'outline-4 outline-dashed outline-[#E5E5E5]',
        'bg-[radial-gradient(110%_80%_at_10%_10%,rgba(0,0,0,0.05),transparent),radial-gradient(110%_80%_at_90%_90%,rgba(0,0,0,0.05),transparent)]',
        className
      )}
    >
      {true && (
        <div className="pointer-events-auto absolute right-3 top-3 z-10">
          <button
            onClick={remount}
            className="rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide shadow-sm hover:bg-neutral-50"
            title="Si el visor quedó en blanco, reintenta"
          >
            <RefreshCcw size={14} />
          </button>
        </div>
      )}

      <Canvas
        key={`${kind}-${canvasKey}`}
        camera={{ position: [2, 1.8, 2], fov: 45 }}
        onCreated={({ gl }) => {
          // r152+: asegurar espacio de color correcto
          (gl as any).outputColorSpace =
            (THREE as any).SRGBColorSpace ?? (gl as any).outputEncoding;
          // por si el navegador restaura solo:
          gl.domElement.addEventListener(
            'webglcontextrestored',
            () => {
              setDead(false);
              requestAnimationFrame(() => invalidate());
            },
            { once: true }
          );
        }}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true, // mejora recuperación en algunos drivers
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
        }}
        style={{ width: '100%', height: '100%' }}
      >
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
                key={textureUrl}
                geometry={inlayGeom}
                textureUrl={textureUrl}
                position={[0, 0, 0.011]}
                fitMode="cover"
                initialZoom={1}
                draggable
                wheelZoom
                controlsRef={controlsRef}
                onLoaded={handleTextureLoaded}
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
