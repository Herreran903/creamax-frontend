'use client';
import * as React from 'react';
import * as THREE from 'three';
import { useThree, invalidate } from '@react-three/fiber';

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
  onLoaded?: () => void; // <-- opcional, por si quieres saber cuándo quedó lista
};

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function setTextureSRGB(tex: THREE.Texture) {
  // r152+ usa colorSpace
  if ('colorSpace' in tex) {
    (tex as any).colorSpace = (THREE as any).SRGBColorSpace;
  } else {
    // r151 y anteriores
    (tex as any).encoding = (THREE as any).sRGBEncoding;
  }
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
  onLoaded,
}: Props) {
  const { gl } = useThree();
  const [tex, setTex] = React.useState<THREE.Texture | null>(texture ?? null);
  const matRef = React.useRef<THREE.MeshStandardMaterial | null>(null);
  const meshRef = React.useRef<THREE.Mesh>(null!);

  const [zoom, setZoom] = React.useState(initialZoom);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });

  // --- Carga de textura (primer render) + invalidate() al terminar
  React.useEffect(() => {
    if (!textureUrl) {
      setTex(null);
      return;
    }
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.load(
      textureUrl,
      (t) => {
        if (!alive) return;
        setTextureSRGB(t);
        t.flipY = false;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = true;

        if (enableAnisotropy && 'capabilities' in gl) {
          const maxAniso = (gl as any).capabilities?.getMaxAnisotropy?.() ?? 0;
          if (maxAniso > 0) t.anisotropy = Math.min(8, maxAniso);
        }

        t.wrapS = THREE.ClampToEdgeWrapping;
        t.wrapT = THREE.ClampToEdgeWrapping;
        t.needsUpdate = true;

        setTex(t);
        invalidate(); // ⬅️ fuerza render inmediato
        onLoaded?.();
      },
      undefined,
      () => {
        setTex(null);
        invalidate();
      }
    );
    return () => {
      alive = false;
    };
  }, [textureUrl, gl, enableAnisotropy, onLoaded]);

  // --- Crear material una sola vez (no depende de tex)
  React.useEffect(() => {
    if (material) {
      matRef.current = material;
      return;
    }
    const m = new THREE.MeshStandardMaterial({ color: 'white', roughness: 0.9, metalness: 0.05 });
    matRef.current = m;
    return () => m.dispose?.();
  }, [material]);

  // --- Cuando hay textura, asignarla al material existente
  React.useEffect(() => {
    const m = matRef.current;
    if (!m) return;
    m.map = tex ?? null;
    m.needsUpdate = true;
    invalidate(); // asegura el primer frame con map asignado
  }, [tex]);

  // --- Tamaño del rectángulo de inlay
  const rect = React.useMemo(() => {
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
    const bbox = new THREE.Box3().setFromBufferAttribute(pos);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    return { w: size.x || 1, h: size.y || 1 };
  }, [geometry]);

  // --- UV transform (repeat/offset) + invalidate en cada cambio visible
  React.useLayoutEffect(() => {
    if (!tex) return;

    const imgW = (tex.image as HTMLImageElement | HTMLCanvasElement | undefined)?.width ?? 1;
    const imgH = (tex.image as HTMLImageElement | HTMLCanvasElement | undefined)?.height ?? 1;

    const sx = rect.w / imgW;
    const sy = rect.h / imgH;

    let repX: number, repY: number;

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

    invalidate(); // ⬅️ cada cambio de zoom/pan aplica en el frame siguiente
  }, [tex, rect.w, rect.h, fitMode, zoom, pan.x, pan.y, flipX, flipY]);

  // --- Drag/zoom (sin cambios, salvo invalidate implícito arriba)
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
