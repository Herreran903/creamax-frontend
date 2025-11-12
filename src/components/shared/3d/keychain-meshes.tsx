'use client';

import * as THREE from 'three';
import { useMemo } from 'react';

type KeychainProps = {
  scale?: number;
  baseColor?: string; // color de la CARA FRONTAL (lámina)
  backColor?: string; // color del CUERPO (tapa/cara trasera + canto)
  borderColor?: string; // color del MARCO (relieve frontal)
  thickness?: number; // grosor total
  border?: number; // ancho de borde del marco
  reliefDepth?: number; // altura del marco
  cornerRadius?: number;
  frontFaceDepth?: number; // grosor de la lámina frontal
};

const CURVE_SEGMENTS = 96;
const BASE_BEVEL = {
  bevelEnabled: true,
  bevelThickness: 0.005,
  bevelSize: 0.005,
  bevelSegments: 3,
} as const;

const Z_EPS = 0.0015; // separación mínima para evitar z-fighting

function roundedRectShape(w: number, h: number, r: number) {
  const hw = w / 2,
    hh = h / 2;
  const rr = Math.max(0, Math.min(r, hw - 1e-6, hh - 1e-6));
  const s = new THREE.Shape();
  s.moveTo(-hw + rr, -hh);
  s.lineTo(hw - rr, -hh);
  s.absarc(hw - rr, -hh + rr, rr, -Math.PI / 2, 0, false);
  s.lineTo(hw, hh - rr);
  s.absarc(hw - rr, hh - rr, rr, 0, Math.PI / 2, false);
  s.lineTo(-hw + rr, hh);
  s.absarc(-hw + rr, hh - rr, rr, Math.PI / 2, Math.PI, false);
  s.lineTo(-hw, -hh + rr);
  s.absarc(-hw + rr, -hh + rr, rr, Math.PI, (3 * Math.PI) / 2, false);
  s.closePath();
  return s;
}

function roundedRectPath(w: number, h: number, r: number) {
  const hw = w / 2,
    hh = h / 2;
  const rr = Math.max(0, Math.min(r, hw - 1e-6, hh - 1e-6));
  const p = new THREE.Path();
  p.moveTo(-hw + rr, -hh);
  p.lineTo(hw - rr, -hh);
  p.absarc(hw - rr, -hh + rr, rr, -Math.PI / 2, 0, false);
  p.lineTo(hw, hh - rr);
  p.absarc(hw - rr, hh - rr, rr, 0, Math.PI / 2, false);
  p.lineTo(-hw + rr, hh);
  p.absarc(-hw + rr, hh - rr, rr, Math.PI / 2, Math.PI, false);
  p.lineTo(-hw, -hh + rr);
  p.absarc(-hw + rr, -hh + rr, rr, Math.PI, (3 * Math.PI) / 2, false);
  return p;
}

function rectFrameShape(width: number, height: number, border: number, corner: number) {
  const outer = roundedRectShape(width, height, corner);
  const iw = Math.max(width - 2 * border, 0.0001);
  const ih = Math.max(height - 2 * border, 0.0001);
  const innerR = Math.max(0, corner - border);
  const inner = roundedRectPath(iw, ih, innerR);
  outer.holes.push(inner);
  return outer;
}

function circleShape(radius: number) {
  const s = new THREE.Shape();
  s.absarc(0, 0, radius, 0, Math.PI * 2, false);
  return s;
}

function circleFrameShape(radius: number, border: number) {
  const outer = circleShape(radius);
  const inner = new THREE.Path();
  inner.absarc(0, 0, Math.max(radius - border, 0.0001), 0, Math.PI * 2, true);
  outer.holes.push(inner);
  return outer;
}

// ====== NUEVO KeychainBase con 3 mallas: FrontPlate, Body, Frame ======
function KeychainBase({
  shape,
  frameShape,
  scale = 1,
  baseColor = '#7dd3fc',
  backColor,
  borderColor = '#3b82f6',
  thickness = 0.01,
  border = 0.05,
  reliefDepth = 0.06,
  frontFaceDepth = 0.003, // lámina delantera muy fina
}: {
  shape: THREE.Shape;
  frameShape: THREE.Shape;
  scale?: number;
  baseColor?: string;
  backColor?: string;
  borderColor?: string;
  thickness?: number;
  border?: number;
  reliefDepth?: number;
  frontFaceDepth?: number;
}) {
  const back = backColor ?? baseColor;

  // 1) Lámina frontal
  const frontPlateGeom = useMemo(() => {
    const depth = Math.max(Math.min(frontFaceDepth, thickness * 0.5), 0.0008);
    return new THREE.ExtrudeGeometry(shape, {
      depth,
      steps: 1,
      curveSegments: CURVE_SEGMENTS,
      ...BASE_BEVEL,
    });
  }, [shape, frontFaceDepth, thickness]);

  // 2) Cuerpo trasero (el resto del grosor)
  const bodyDepth = Math.max(thickness - Math.max(frontFaceDepth, 0), 0.0008);
  const bodyGeom = useMemo(() => {
    return new THREE.ExtrudeGeometry(shape, {
      depth: bodyDepth,
      steps: 1,
      curveSegments: CURVE_SEGMENTS,
      ...BASE_BEVEL,
    });
  }, [shape, bodyDepth]);

  // 3) Marco/sobre-relieve frontal
  const frameGeom = useMemo(() => {
    return new THREE.ExtrudeGeometry(frameShape, {
      depth: reliefDepth,
      steps: 1,
      curveSegments: CURVE_SEGMENTS,
      ...BASE_BEVEL,
    });
  }, [frameShape, reliefDepth]);

  // Posiciones (sistema: Z positivo hacia el frente)
  // - El BODY empieza en z = -thickness/2 y llega hasta (thickness/2 - frontFaceDepth)
  // - La FRONT PLATE ocupa el frente: [thickness/2 - frontFaceDepth, thickness/2]
  // - El FRAME se apoya encima del frente, con un pequeño epsilon
  const frontPlateZ = thickness / 2 - Math.max(frontFaceDepth, 0);
  const bodyZ = -thickness / 2;
  const frameZ = thickness / 2 + Z_EPS;

  return (
    <group scale={scale}>
      {/* BODY (color de la tapa/cuerpo/canto) */}
      <mesh geometry={bodyGeom} position={[0, 0, bodyZ]}>
        <meshStandardMaterial color={back} metalness={0.3} roughness={0.45} />
      </mesh>

      {/* FRONT PLATE (color base de la cara delantera) */}
      <mesh geometry={frontPlateGeom} position={[0, 0, frontPlateZ]}>
        <meshStandardMaterial
          color={baseColor}
          metalness={0.3}
          roughness={0.45}
          // leve offset para garantizar que pinte por encima del body en el borde
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      {/* FRAME (marco/relieve frontal) */}
      <mesh geometry={frameGeom} position={[0, 0, frameZ]}>
        <meshStandardMaterial
          color={borderColor}
          metalness={0.35}
          roughness={0.4}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
    </group>
  );
}

// ===== Variantes (sin cambios en API) =====
export function KeychainSquare(props: KeychainProps) {
  const s = roundedRectShape(1.0, 1.0, props.cornerRadius ?? 0.12);
  const f = rectFrameShape(1.0, 1.0, props.border ?? 0.05, props.cornerRadius ?? 0.12);
  return <KeychainBase {...props} shape={s} frameShape={f} />;
}

export function KeychainRect(props: KeychainProps) {
  const s = roundedRectShape(1.2, 0.8, props.cornerRadius ?? 0.12);
  const f = rectFrameShape(1.2, 0.8, props.border ?? 0.05, props.cornerRadius ?? 0.12);
  return <KeychainBase {...props} shape={s} frameShape={f} />;
}

export function KeychainCircle(props: KeychainProps) {
  const s = circleShape(0.5);
  const f = circleFrameShape(0.5, props.border ?? 0.05);
  return <KeychainBase {...props} shape={s} frameShape={f} />;
}
