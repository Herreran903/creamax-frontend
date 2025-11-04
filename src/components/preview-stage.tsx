'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Canvas } from '@react-three/fiber';
import { Float, ContactShadows, Environment, Segments, Segment } from '@react-three/drei';
import { ModelViewer } from '@/components/core/3d/model-viewer';
import * as THREE from 'three';

type PreviewState = 'idle' | 'loading' | 'ready';

export interface PreviewStageProps {
  state: PreviewState;
  className?: string;
  glbUrl?: string | null;
  imageUrl?: string | null;
  progress?: number | null;
  messages?: string[];
  messageIntervalMs?: number;
}

export function PreviewStage({
  state,
  className,
  glbUrl,
  imageUrl,
  progress = null,
  messages = [
    'Preparando escena…',
    'Procesando geometría…',
    'Suavizando malla…',
    'Texturizando…',
    'Empaquetando GLB…',
    'Ya casi está…',
  ],
  messageIntervalMs = 1800,
}: PreviewStageProps) {
  const [msgIdx, setMsgIdx] = React.useState(0);
  React.useEffect(() => {
    if (state !== 'loading' || messages.length === 0) return;
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % messages.length), messageIntervalMs);
    return () => clearInterval(id);
  }, [state, messages, messageIntervalMs]);

  return (
    <div
      className={cn(
        'h-[70vh] relative overflow-hidden rounded-xl grid bg-[#F2F2F2]',
        'outline-4 outline-dashed outline-[#E5E5E5]',
        'bg-[radial-gradient(110%_80%_at_10%_10%,rgba(0,0,0,0.05),transparent),radial-gradient(110%_80%_at_90%_90%,rgba(0,0,0,0.05),transparent)]',
        className
      )}
    >
      {state === 'idle' && <IdleFigure3D />}

      {state === 'loading' && (
        <>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="preview"
              className="absolute inset-0 w-full h-full object-contain opacity-30"
            />
          ) : null}
          <LoadingFigure3D />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
            <div className="rounded-xl bg-black/55 backdrop-blur-sm text-white px-3 py-2 w-fit max-w-full">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="inline-flex h-2 w-2 rounded-full bg-white animate-pulse" />
                <span className="truncate">{messages[msgIdx]}</span>
                {typeof progress === 'number' && (
                  <span className="ml-2 text-white/80">{Math.round(progress)}%</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {state === 'ready' && (
        <>
          {glbUrl ? (
            <ModelViewer src={glbUrl} className="h-full w-full" autoRotate spinSpeed={0.6} />
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt="resultado"
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <IdleFigure3D />
          )}
        </>
      )}
    </div>
  );
}

function usePolyBallGeometry({
  radius = 0.9,
  detail = 1,
  jitter = 0.04,
}: {
  radius?: number;
  detail?: number;
  jitter?: number;
}) {
  return React.useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(radius, detail);

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
      const f = 1 + (Math.random() * 2 - 1) * jitter;
      v.multiplyScalar(radius * f);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    return geo;
  }, [radius, detail, jitter]);
}

function EdgesFatLines({
  geometry,
  color = '#1e3a8a',
  lineWidth = 2,
}: {
  geometry: THREE.BufferGeometry;
  color?: string | number;
  lineWidth?: number;
}) {
  const segments = React.useMemo(() => {
    const edges = new THREE.EdgesGeometry(geometry, 1);
    const pos = edges.getAttribute('position') as THREE.BufferAttribute;
    const segs: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i = 0; i < pos.count; i += 2) {
      const a = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      const b = new THREE.Vector3(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1));
      segs.push([a, b]);
    }
    edges.dispose();
    return segs;
  }, [geometry]);

  return (
    <Segments
      limit={segments.length}
      lineWidth={lineWidth}
      color={typeof color === 'string' ? new THREE.Color(color).getHex() : color}
    >
      {segments.map(([a, b], i) => (
        <Segment key={i} start={a} end={b} />
      ))}
    </Segments>
  );
}

export function IdleFigure3D() {
  const geo = usePolyBallGeometry({ radius: 0.50, detail: 1, jitter: 0.01 });

  return (
    <Canvas camera={{ position: [2.2, 1.5, 2.4], fov: 50 }}>
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 4, 2]} intensity={1.2} />
      <Float speed={1.2} rotationIntensity={0.35} floatIntensity={0.35}>
        <mesh geometry={geo}>
          <meshStandardMaterial
            color="#E9E9E9"
            transparent
            opacity={0.25}
            roughness={0.9}
            metalness={0.05}
            flatShading
          />
        </mesh>
        <group>
          <EdgesFatLines geometry={geo} color="#E9E9E9" lineWidth={2.2} />
        </group>
      </Float>
      <ContactShadows opacity={0.35} blur={2} far={4} resolution={256} />
    </Canvas>
  );
}

export function LoadingFigure3D() {
const geo = usePolyBallGeometry({ radius: 0.50, detail: 1, jitter: 0.01 });

  return (
    <Canvas camera={{ position: [0.2, 0.9, 2.1], fov: 55 }}>
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 2]} intensity={1.2} />
      <Float speed={2.2} rotationIntensity={0.9} floatIntensity={0.9}>
        <mesh geometry={geo}>
        <meshStandardMaterial
            color="#FF4D00"
            transparent
            opacity={0.25}
            roughness={0.9}
            metalness={0.05}
            flatShading
          />
        </mesh>
        <group rotation={[Math.PI * 0.15, 0, 0]}>
          <EdgesFatLines geometry={geo} color="#b93800" lineWidth={2.2} />
        </group>
      </Float>
      <ContactShadows opacity={0.35} blur={2} far={4} resolution={256} />
    </Canvas>
  );
}
