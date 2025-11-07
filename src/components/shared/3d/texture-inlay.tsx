'use client';
import * as React from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

type FitMode = 'cover' | 'contain' | 'stretch';

type Props = {
  geometry: THREE.BufferGeometry;
  texture?: THREE.Texture | null;
  textureUrl?: string;
  material?: THREE.MeshStandardMaterial;
  position?: [number, number, number];
  fitMode?: FitMode;
  initialZoom?: number;
  draggable?: boolean;
  wheelZoom?: boolean;
  flipX?: boolean;
  flipY?: boolean;
  enableAnisotropy?: boolean;
  onChange?: (state: { zoom: number; pan: { x: number; y: number } }) => void;
  controlsRef?: React.RefObject<any>;
};

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export default function TextureInlay({
  geometry,
  texture,
  textureUrl,
  material,
  position = [0, 0, 0.01],
  fitMode = 'cover',
  initialZoom = 1,
  draggable = true,
  wheelZoom = true,
  flipX = false,
  flipY = false,
  enableAnisotropy = true,
  onChange,
  controlsRef,
}: Props) {
  const { gl } = useThree();
  const [tex, setTex] = React.useState<THREE.Texture | null>(texture ?? null);
  const matRef = React.useRef<THREE.MeshStandardMaterial | null>(null);
  const meshRef = React.useRef<THREE.Mesh>(null!);

  const [zoom, setZoom] = React.useState(initialZoom);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    if (!textureUrl) return;
    const loader = new THREE.TextureLoader();
    let alive = true;
    loader.load(
      textureUrl,
      (t) => alive && setTex(t),
      undefined,
      () => setTex(null)
    );
    return () => {
      alive = false;
    };
  }, [textureUrl]);

  React.useEffect(() => {
    if (material) {
      matRef.current = material;
      if (tex && !material.map) {
        material.map = tex;
        material.needsUpdate = true;
      }
      return;
    }
    const m = new THREE.MeshStandardMaterial({ color: 'white', roughness: 0.9, metalness: 0.05 });
    matRef.current = m;
    return () => m.dispose?.();
  }, [material, tex]);

  React.useEffect(() => {
    if (!matRef.current) return;
    if (!tex) {
      matRef.current.map = null;
      matRef.current.needsUpdate = true;
      return;
    }

    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;

    (tex as any).colorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;

    tex.flipY = false;

    if (enableAnisotropy && 'capabilities' in gl) {
      const maxAniso = (gl as any).capabilities?.getMaxAnisotropy?.() ?? 0;
      if (maxAniso > 0) tex.anisotropy = Math.min(8, maxAniso);
    }

    matRef.current.map = tex;
    matRef.current.needsUpdate = true;
  }, [tex, gl, enableAnisotropy]);

  const rect = React.useMemo(() => {
    const bbox = new THREE.Box3().setFromBufferAttribute(
      geometry.getAttribute('position') as THREE.BufferAttribute
    );
    const size = new THREE.Vector3();
    bbox.getSize(size);
    return { w: size.x || 1, h: size.y || 1 };
  }, [geometry]);

  React.useLayoutEffect(() => {
    if (!tex || !matRef.current) return;

    const imgW = (tex.image as HTMLImageElement | HTMLCanvasElement | undefined)?.width ?? 1;
    const imgH = (tex.image as HTMLImageElement | HTMLCanvasElement | undefined)?.height ?? 1;

    const sx = rect.w / imgW;
    const sy = rect.h / imgH;

    let repX: number;
    let repY: number;

    if (fitMode === 'stretch') {
      repX = 1 / (sx * zoom);
      repY = 1 / (sy * zoom);
    } else {
      const s = (fitMode === 'cover' ? Math.max(sx, sy) : Math.min(sx, sy)) * zoom;
      const dw = imgW * s;
      const dh = imgH * s;
      repX = rect.w / dw;
      repY = rect.h / dh;
    }

    repX = clamp(repX, 0.001, 1);
    repY = clamp(repY, 0.001, 1);

    const maxOffX = 1 - repX;
    const maxOffY = 1 - repY;

    const pX = clamp((flipX ? 1 - (pan.x + 1) / 2 : (pan.x + 1) / 2) * maxOffX, 0, maxOffX);
    const pY = clamp((flipY ? 1 - (pan.y + 1) / 2 : (pan.y + 1) / 2) * maxOffY, 0, maxOffY);

    tex.repeat.set(flipX ? -repX : repX, flipY ? -repY : repY);
    tex.offset.set(pX, pY);
    tex.needsUpdate = true;
  }, [tex, rect.w, rect.h, fitMode, zoom, pan.x, pan.y, flipX, flipY]);

  const dragState = React.useRef<{ down: boolean; px: number; py: number } | null>(null);
  const setControlsEnabled = (v: boolean) => {
    const c = controlsRef?.current;
    if (c) c.enabled = v;
  };

  const onPointerDown = (e: any) => {
    if (!draggable) return;
    e.stopPropagation();
    dragState.current = { down: true, px: e.clientX, py: e.clientY };
    setControlsEnabled(false);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerUp = (e: any) => {
    if (!draggable) return;
    dragState.current = null;
    setControlsEnabled(true);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: any) => {
    if (!draggable || !dragState.current) return;
    e.stopPropagation();
    const dx = e.clientX - dragState.current.px;
    const dy = e.clientY - dragState.current.py;
    dragState.current.px = e.clientX;
    dragState.current.py = e.clientY;

    setPan((p) => {
      const np = { x: clamp(p.x + dx * 0.003, -1, 1), y: clamp(p.y - dy * 0.003, -1, 1) };
      onChange?.({ zoom, pan: np });
      return np;
    });
  };

  const onWheel = (e: any) => {
    if (!wheelZoom) return;
    e.stopPropagation();
    setControlsEnabled(false);
    const factor = e.deltaY > 0 ? 1 / 1.08 : 1.08;
    setZoom((z) => {
      const nz = clamp(z * factor, 0.2, 8);
      onChange?.({ zoom: nz, pan });
      return nz;
    });
    requestAnimationFrame(() => setControlsEnabled(true));
  };

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={matRef.current ?? undefined}
      position={position}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerMove={onPointerMove}
      onWheel={onWheel}
    />
  );
}
