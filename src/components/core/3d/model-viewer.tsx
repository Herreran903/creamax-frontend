'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF } from '@react-three/drei';
import { STLLoader } from 'three-stdlib';
import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';
import { KeychainCircle, KeychainRect, KeychainSquare } from './keychan-meshes';

function Spinning({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_s, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.1;
  });
  return <group ref={ref}>{children}</group>;
}

function CallOnReadyOnce({ onReady }: { onReady?: () => void }) {
  const called = useRef(false);
  useFrame(() => {
    if (!called.current) {
      called.current = true;
      onReady?.();
    }
  });
  return null;
}

function SafeGLB({ url }: { url: string }) {
  try {
    const { scene } = useGLTF(url);
    return <primitive object={scene} dispose={null} />;
  } catch {
    return null;
  }
}

function SafeSTL({ url }: { url: string }) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    const loader = new STLLoader();
    loader.load(
      url,
      (geom) => setGeometry(geom),
      undefined,
      () => setGeometry(null)
    );
  }, [url]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} scale={0.017} rotation={[0, Math.PI / 8, 0]}>
      <meshStandardMaterial color="#7dd3fc" metalness={0.3} roughness={0.4} />
    </mesh>
  );
}

export function ModelViewer({
  src,
  overlayImage,
  onReady,
  className,
  demoKind,
  disableSpin = false,
  disableControls = false,
  autoRotate = true,
  spinSpeed = 0.6,
  preferOverlay = false,
}: {
  src?: string;
  overlayImage?: string;
  onReady?: () => void;
  className?: string;
  demoKind?: 'square' | 'circle' | 'rect';
  disableSpin?: boolean;
  disableControls?: boolean;
  autoRotate?: boolean;
  spinSpeed?: number;
  preferOverlay?: boolean;
}) {
  const hasSrc = !!src;
  const ext = src?.split('.').pop()?.toLowerCase();
  const [loadErr, setLoadErr] = useState(false);

  const showOverlay = !!overlayImage && (!hasSrc || preferOverlay);
  const show3D = hasSrc && !preferOverlay && !loadErr;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/40 dark:border-white/10',
        'bg-[#F2F2F2]',
        'w-full h-[200px]',
        className
      )}
    >
      {show3D && (
        <Canvas
          camera={{ position: [2, 1.8, 2], fov: 45 }}
          onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), 0)}
        >
          <Suspense
            fallback={
              <mesh>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#cbd5e1" />
              </mesh>
            }
          >
            <CallOnReadyOnce onReady={onReady} />
            <Environment preset="city" />
            <ambientLight intensity={0.3} />
            <directionalLight position={[4, 4, 4]} intensity={0.8} />

            {!disableSpin ? (
              <Spinning>{ext === 'stl' ? <SafeSTL url={src!} /> : <SafeGLB url={src!} />}</Spinning>
            ) : ext === 'stl' ? (
              <SafeSTL url={src!} />
            ) : (
              <SafeGLB url={src!} />
            )}

            {!disableControls && (
              <OrbitControls
                makeDefault
                enableZoom={false}
                enablePan={false}
                autoRotate={disableSpin ? false : autoRotate}
                autoRotateSpeed={disableSpin ? 0 : spinSpeed}
              />
            )}
          </Suspense>
        </Canvas>
      )}

      {!show3D && !showOverlay && !loadErr && (
        <div className="absolute inset-0 grid place-items-center">
          <Canvas camera={{ position: [2, 1.8, 2], fov: 45 }}>
            <ambientLight intensity={0.3} />
            <directionalLight position={[4, 4, 4]} intensity={0.8} />

            {demoKind === 'circle' ? (
              <KeychainCircle scale={2} />
            ) : demoKind === 'rect' ? (
              <KeychainRect scale={1.6} />
            ) : (
              <KeychainSquare scale={1.8} />
            )}
          </Canvas>
        </div>
      )}
      {showOverlay && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <img
            src={overlayImage}
            alt="overlay"
            className="max-w-[70%] max-h-[70%] opacity-80 rounded-lg shadow-md"
          />
        </div>
      )}
      {loadErr && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground/80 bg-white/80 dark:bg-black/50 backdrop-blur-sm">
          Modelo no encontrado
        </div>
      )}
    </div>
  );
}
