'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Center, Float, useGLTF } from '@react-three/drei';

type Step = { label: string; kind?: 'cart' | 'options' | 'done' };
type Props = { current: number; steps: Step[]; className?: string };

function Rotator({
  axis = 'y',
  speed = 1,
  active = true,
  children,
}: {
  axis?: string;
  speed?: number;
  active?: boolean;
  children: React.ReactNode;
}) {
  const ref = React.useRef<THREE.Group>(null!);
  useFrame((_, delta) => {
    if (!active) return;
    const r = ref.current.rotation;
    const incr = speed * delta;
    if (axis === 'x') r.x += incr;
    else if (axis === 'y') r.y += incr;
    else r.z += incr;
  });
  return <group ref={ref}>{children}</group>;
}

// Auto-fit group to a target size so icons always render at a consistent scale
function FitNormalize({ children, target = 1.2 }: { children: React.ReactNode; target?: number }) {
  const ref = React.useRef<THREE.Group>(null!);
  React.useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    // Reset transforms
    g.scale.set(1, 1, 1);
    g.position.set(0, 0, 0);
    const box = new THREE.Box3().setFromObject(g);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = target / maxDim;
    g.scale.setScalar(s);
    g.position.set(-center.x * s, -center.y * s, -center.z * s);
  }, [children, target]);
  return <group ref={ref}>{children}</group>;
}

function GLBIconInner({
  url,
  active,
  color,
  scale = 1,
  rotation = [0, 0, 0],
  position = [0, 0, 0],
  size = 25,
  axis = 'y',
  angularSpeed = 1,
}: {
  url: string;
  active: boolean;
  color: string;
  scale?: number;
  rotation?: [number, number, number];
  position?: [number, number, number];
  size?: number;
  axis?: 'x' | 'y' | 'z';
  angularSpeed?: number;
}) {
  const { scene } = useGLTF(url);
  const cloned = React.useMemo(() => scene.clone(true), [scene]);

  React.useLayoutEffect(() => {
    cloned.traverse((o: any) => {
      if (o.isMesh) {
        if (o.material?.map) o.material.map = null;
        if (o.material?.normalMap) o.material.normalMap = null;
        if (o.material?.roughnessMap) o.material.roughnessMap = null;
        if (o.material?.metalnessMap) o.material.metalnessMap = null;
        o.material = new THREE.MeshStandardMaterial({ color });
      }
    });
  }, [cloned, color]);

  return (
    <div className="inline-block" style={{ width: size, height: size, pointerEvents: 'none' }}>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 2.5], fov: 35, near: 0.01, far: 100 }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 2, 2]} intensity={1} />
        <Center>
          <Float speed={active ? 1 : 0.6} floatIntensity={active ? 0.32 : 0} rotationIntensity={0}>
            <Rotator axis={axis} speed={active ? angularSpeed : 0.001} active>
              <group rotation={rotation} position={position} scale={scale}>
                <FitNormalize>
                  <primitive object={cloned} />
                </FitNormalize>
              </group>
            </Rotator>
          </Float>
        </Center>
      </Canvas>
    </div>
  );
}

export function GLBIcon(props: React.ComponentProps<typeof GLBIconInner>) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="inline-block" style={{ width: props.size ?? 25, height: props.size ?? 25 }} />
    );
  }
  return <GLBIconInner {...props} />;
}

function IconCart({ active, color }: { active: boolean; color: string }) {
  return (
    <GLBIcon url="/models/Cart.glb" active={active} color={color} scale={1} position={[0, 0, 0]} />
  );
}
function IconGear({ active, color }: { active: boolean; color: string }) {
  return (
    <GLBIcon
      url="/models/Gear.glb"
      active={active}
      color={color}
      scale={1}
      rotation={[0, Math.PI / 1.35, 0]}
    />
  );
}
function IconCheck({ active, color }: { active: boolean; color: string }) {
  return <GLBIcon url="/models/Check.glb" active={active} color={color} scale={1} />;
}

function StepMiniIcon({
  kind,
  active,
  color,
}: {
  kind?: Step['kind'];
  active: boolean;
  color: string;
}) {
  const K = kind ?? 'cart';
  if (K === 'options') return <IconGear active={active} color={color} />;
  if (K === 'done') return <IconCheck active={active} color={color} />;
  return <IconCart active={active} color={color} />;
}

export function Stepper({ current, steps, className }: Props) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center gap-4">
        {steps.map((s, i) => {
          const idx = i + 1;
          const isCompleted = idx < current;
          const isCurrent = idx === current;

          const color = isCurrent ? '#FF4D00' : isCompleted ? '#43A047' : '#71717b';

          return (
            <React.Fragment key={`${s.label}-${i}`}>
              <motion.div className="flex items-center gap-2" whileHover={{ y: -1 }}>
                <StepMiniIcon kind={s.kind} active={isCurrent} color={color} />
                <div
                  className={cn(
                    'text-2xl font-extrabold font-display tracking-wide',
                    'flex items-center justify-center',
                    isCurrent
                      ? ' text-[#FF4D00]'
                      : isCompleted
                        ? ' text-emerald-600'
                        : ' text-zinc-500'
                  )}
                >
                  {idx}
                </div>
                <span
                  className={cn(
                    'text-sm font-extrabold tracking-wide uppercase',
                    isCurrent
                      ? 'text-[#FF4D00]'
                      : isCompleted
                        ? 'text-emerald-600'
                        : 'text-zinc-500'
                  )}
                >
                  {s.label}
                </span>
              </motion.div>
              {i < steps.length - 1 && (
                <div className="relative w-14 h-1.5">
                  <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded-full bg-black/90" />
                  <div
                    className={cn(
                      'relative w-full h-full overflow-hidden rounded-full ring-1 transition-colors',
                      idx > current ? 'bg-white ring-blue' : 'bg-zinc-800 ring-white/10'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute inset-y-0 left-0 rounded-full transition-all',
                        idx < current
                          ? 'w-full bg-emerald-600'
                          : idx === current && idx === 0
                            ? 'w-full bg-[#FF4D00]'
                            : idx === current
                              ? 'w-full bg-[#FF4D00]'
                              : 'w-0'
                      )}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
