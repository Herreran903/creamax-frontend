'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF } from '@react-three/drei';
import { STLLoader, OBJLoader, FBXLoader } from 'three-stdlib';
import type { GLTF } from 'three-stdlib';
import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';
import { KeychainCircle, KeychainRect, KeychainSquare } from './keychain-meshes';

function Spinning({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useEffect(() => {
    let raf: number;
    const animate = (t: number) => {
      if (ref.current) ref.current.rotation.y += 0.000001 * 60;
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <group ref={ref}>{children}</group>;
}

function CallOnReadyOnce({ onReady }: { onReady?: () => void }) {
  const called = useRef(false);
  useEffect(() => {
    if (!called.current) {
      called.current = true;
      onReady?.();
    }
  }, [onReady]);
  return null;
}

function NormalizeGroup({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    g.scale.set(1, 1, 1);
    g.position.set(0, 0, 0);

    const box = new THREE.Box3().setFromObject(g);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const target = 1.6;
    const scale = target / maxDim;

    g.scale.setScalar(scale);
    g.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  }, [children]);
  return <group ref={ref}>{children}</group>;
}

function GLBObject({ url }: { url: string }) {
  const { scene } = useGLTF(url) as GLTF;
  return <primitive object={scene} dispose={null} />;
}

function OBJObject({ url }: { url: string }) {
  const [obj, setObj] = useState<THREE.Object3D | null>(null);

  useEffect(() => {
    let disposed = false;
    const loader = new OBJLoader();
    loader.load(
      url,
      (o) => {
        if (disposed) return;
        o.traverse((child: any) => {
          if ((child as THREE.Mesh)?.isMesh) {
            const mesh = child as THREE.Mesh;
            const hasMaterial =
              !!mesh.material ||
              (Array.isArray(mesh.material) && (mesh.material as THREE.Material[])?.length > 0);
            if (!hasMaterial) {
              mesh.material = new THREE.MeshStandardMaterial({
                color: '#cbd5e1',
                metalness: 0.2,
                roughness: 0.7,
              });
            }
            const g = mesh.geometry as THREE.BufferGeometry | undefined;
            if (g && !g.attributes.normal) g.computeVertexNormals();
          }
        });
        setObj(o);
      },
      undefined,
      () => setObj(null)
    );
    return () => {
      disposed = true;
    };
  }, [url]);

  if (!obj) return null;
  return <primitive object={obj} dispose={null} />;
}

function STLMesh({ url }: { url: string }) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    let disposed = false;
    const loader = new STLLoader();
    loader.load(
      url,
      (geom) => {
        if (!disposed) setGeometry(geom);
      },
      undefined,
      () => setGeometry(null)
    );
    return () => {
      disposed = true;
    };
  }, [url]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} scale={0.01}>
      <meshStandardMaterial color="#7dd3fc" metalness={0.3} roughness={0.4} />
    </mesh>
  );
}

function FBXObject({ url }: { url: string }) {
  const [obj, setObj] = useState<THREE.Object3D | null>(null);

  useEffect(() => {
    let disposed = false;
    const loader = new FBXLoader();

    // Si el FBX referencia texturas relativas, esto ayuda:
    try {
      const u = new URL(url);
      const base = u.origin + u.pathname.replace(/[^/]+$/, '');
      loader.setResourcePath(base); // para que cargue texturas a partir del mismo path
      loader.setCrossOrigin('anonymous');
    } catch {
      // url relativa o blob: no pasa nada
    }

    loader.load(
      url,
      (o) => {
        if (disposed) return;
        o.traverse((child: any) => {
          if ((child as THREE.Mesh)?.isMesh) {
            const mesh = child as THREE.Mesh;
            // material por defecto si no viene:
            const hasMaterial =
              !!mesh.material ||
              (Array.isArray(mesh.material) && (mesh.material as THREE.Material[])?.length > 0);
            if (!hasMaterial) {
              mesh.material = new THREE.MeshStandardMaterial({
                color: '#cbd5e1',
                metalness: 0.2,
                roughness: 0.7,
              });
            }
            const g = mesh.geometry as THREE.BufferGeometry | undefined;
            if (g && !g.attributes.normal) g.computeVertexNormals();
          }
        });
        setObj(o);
      },
      undefined,
      () => setObj(null)
    );

    return () => {
      disposed = true;
    };
  }, [url]);

  if (!obj) return null;
  return <primitive object={obj} dispose={null} />;
}

// Infer file extension from src
// - Supports blob: URLs when a filename is appended via #filename.ext
// - Supports proxy URLs like /api/tripo/proxy?url=...
function inferExtFromSrc(src?: string): string | undefined {
  if (!src) return undefined;
  const pick = (s: string) => s.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase();

  // blob: URL: intenta sacar la extensión desde el hash (#filename.ext)
  if (src.startsWith('blob:')) {
    try {
      const u = new URL(src);
      const fromHash = u.hash ? pick(u.hash.replace(/^#/, '')) : undefined;
      if (fromHash) return fromHash;
      // No hay hash con nombre → no podemos inferir por string
      return undefined;
    } catch {
      return undefined;
    }
  }

  // URLs normales (incluye proxies tipo ?url=...)
  try {
    const u = new URL(src);
    let ext = pick(u.pathname);
    if (!ext) ext = u.hash ? pick(u.hash.replace(/^#/, '')) : undefined;
    if ((!ext || ext.length > 5) && u.searchParams.has('url')) {
      const inner = u.searchParams.get('url')!;
      try {
        const iu = new URL(inner);
        ext = pick(iu.pathname) || (iu.hash ? pick(iu.hash.replace(/^#/, '')) : undefined);
      } catch {
        ext = pick(inner);
      }
    }
    return ext || pick(src);
  } catch {
    return pick(src);
  }
}

async function sniffExtFromContent(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf.slice(0, 64));
    const ascii = new TextDecoder().decode(bytes);

    // GLB: cabecera "glTF" (0x67 0x6C 0x54 0x46)
    if (bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46) {
      return 'glb';
    }
    // STL ASCII: empieza con "solid"
    if (ascii.startsWith('solid')) return 'stl';
    // OBJ: líneas típicas "v ", "vt ", "vn ", "o ", "g ", o comentario Wavefront
    if (/^(v |vt |vn |o |g )/m.test(ascii) || ascii.includes('Wavefront')) return 'obj';

    // STL binario: no tiene firma oficial; si no “huele” a glb/obj y el tamaño > 84 bytes, probamos stl
    if (buf.byteLength > 84) return 'stl';
  } catch {
    /* no-op */
  }
  return undefined;
}

function useExtForSrc(src?: string) {
  const [ext, setExt] = useState<string | undefined>(() => inferExtFromSrc(src));
  useEffect(() => {
    let alive = true;
    const first = inferExtFromSrc(src);
    setExt(first);
    if (!first && src && src.startsWith('blob:')) {
      sniffExtFromContent(src).then((sniffed) => {
        if (alive && sniffed) setExt(sniffed);
      });
    }
    return () => {
      alive = false;
    };
  }, [src]);
  return ext;
}

export default function ModelViewer({
  src,
  object,
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
  object?: THREE.Group | GLTF | THREE.Object3D;
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
  const hasObject = !!object;
  const ext = useExtForSrc(src);
  const loadErr = false;

  const showOverlay = !!overlayImage && (!(hasSrc || hasObject) || preferOverlay);
  const show3D = (hasSrc || hasObject) && !preferOverlay && !loadErr;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/40 dark:border-white/10',
        'bg-[#F2F2F2]',
        'w-full h-full min-h-[200px]',
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
              <Spinning>
                <NormalizeGroup>
                  {hasObject ? (
                    <primitive
                      object={
                        (object as GLTF & { scene?: THREE.Object3D }).scene ??
                        (object as THREE.Object3D)
                      }
                      dispose={null}
                    />
                  ) : ext === 'stl' ? (
                    <STLMesh url={src!} />
                  ) : ext === 'obj' ? (
                    <OBJObject url={src!} />
                  ) : ext === 'fbx' ? (
                    <FBXObject url={src!} />
                  ) : (
                    <GLBObject url={src!} />
                  )}
                </NormalizeGroup>
              </Spinning>
            ) : (
              <NormalizeGroup>
                {hasObject ? (
                  <primitive
                    object={
                      (object as GLTF & { scene?: THREE.Object3D }).scene ??
                      (object as THREE.Object3D)
                    }
                    dispose={null}
                  />
                ) : ext === 'stl' ? (
                  <STLMesh url={src!} />
                ) : ext === 'obj' ? (
                  <OBJObject url={src!} />
                ) : (
                  <GLBObject url={src!} />
                )}
              </NormalizeGroup>
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
    </div>
  );
}
