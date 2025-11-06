'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { Center, Float, Stage, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

type TabValue = 'gallery' | 'shipping';

type Props = {
  value: TabValue;
  onChange: (v: TabValue) => void;
  className?: string;
};

export default function MetroToggle({ value, onChange, className }: Props) {
  return (
    <div
      role="tablist"
      aria-orientation="vertical"
      className={['flex flex-row gap-3 md:flex-col md:gap-4', 'shrink-0', className]
        .filter(Boolean)
        .join(' ')}
    >
      <Tile
        title="GALERÍA"
        active={value === 'gallery'}
        onClick={() => onChange('gallery')}
        ariaControls="panel-gallery"
      >
        <Gallery3D active={value === 'gallery'} />
      </Tile>

      <Tile
        title="EN ENVÍO"
        active={value === 'shipping'}
        onClick={() => onChange('shipping')}
        ariaControls="panel-shipping"
      >
        <Shipping3D active={value === 'shipping'} />
      </Tile>
    </div>
  );
}

function Tile({
  title,
  active,
  onClick,
  children,
  ariaControls,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaControls: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      aria-controls={ariaControls}
      className={[
        'group relative grid place-items-center rounded-2xl border transition-colors',
        'w-30 h-30',
        'md:w-38 md:h-38',
        'lg:w-42 lg:h-42',
        'xl:w-48 xl:h-80',
        '2xl:w-52 2xl:h-90',
        active ? 'bg-[#FF4D00]' : 'bg-white/80 text-foreground border-2 border-foreground/40 ',
        'shadow-sm hover:shadow-md backdrop-blur-sm',
      ].join(' ')}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.16 }}
      style={{ willChange: 'transform' }}
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute bg-transparent rounded-2xl"
        initial={false}
        animate={{
          boxShadow: active
            ? 'inset 0 0 0 3px rgba(255,255,255,0.28)'
            : 'inset 0 0 0 0 rgba(0,0,0,0)',
        }}
        transition={{ duration: 0.2 }}
      />

      {/* título */}
      <span
        className={[
          'absolute top-2 left-1/2 -translate-x-1/2',
          'text-sm md:text-base lg:text-lg font-extrabold tracking-wide',
          active ? 'text-white' : 'text-foreground',
        ].join(' ')}
      >
        {title}
      </span>
      <div className="pointer-events-none w-[6.3rem] h-[6.3rem] md:w-32 md:h-32 lg:w-36 lg:h-36 xl:w-42 xl:h-42">
        {children}
      </div>
    </motion.button>
  );
}

function PaletteModel({ active }: { active: boolean }) {
  const { scene } = useGLTF('/models/Palette.glb');
  const ref = React.useRef<THREE.Group>(null!);
  return (
    <Center ref={ref} scale={1} disableZ rotation={[Math.PI / 4, 0, 0]}>
      <primitive object={scene} />
    </Center>
  );
}
useGLTF.preload('/models/Palette.glb');

function PackageModel({ active }: { active: boolean }) {
  const { scene } = useGLTF('/models/Package.glb');
  const ref = React.useRef<THREE.Group>(null!);
  return (
    <Center ref={ref} scale={1} disableZ rotation={[Math.PI / 6, 0, 0]}>
      <primitive object={scene} />
    </Center>
  );
}
useGLTF.preload('/models/Package.glb');

function Gallery3D({ active }: { active: boolean }) {
  return (
    <Canvas orthographic camera={{ zoom: 80, position: [0, 0, 100] }} dpr={[1, 2]}>
      <ambientLight intensity={0.8} />
      <Float floatIntensity={active ? 2 : 1} rotationIntensity={active ? 2 : 0}>
        <Stage intensity={0.6} environment={null} shadows={false} adjustCamera={false}>
          <PaletteModel active={active} />
        </Stage>
      </Float>
    </Canvas>
  );
}

function Shipping3D({ active }: { active: boolean }) {
  return (
    <Canvas orthographic camera={{ zoom: 80, position: [0, 0, 100] }} dpr={[1, 2]}>
      <ambientLight intensity={0.8} />
      <Float floatIntensity={active ? 2 : 0} rotationIntensity={active ? 2 : 0}>
        <Stage intensity={0.6} environment={null} shadows={false} adjustCamera={false}>
          <PackageModel active={active} />
        </Stage>
      </Float>
    </Canvas>
  );
}
