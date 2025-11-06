'use client';

import * as THREE from 'three';
import { useMemo } from 'react';

type KeychainProps = {
  scale?: number;
  baseColor?: string;
  borderColor?: string;
  thickness?: number;
  border?: number;
  reliefDepth?: number;
  cornerRadius?: number;
};

const CURVE_SEGMENTS = 96;
const BASE_BEVEL = {
  bevelEnabled: true,
  bevelThickness: 0.005,
  bevelSize: 0.005,
  bevelSegments: 3,
} as const;

function roundedRectShape(w: number, h: number, r: number) {
  const hw = w / 2;
  const hh = h / 2;
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
  const hw = w / 2;
  const hh = h / 2;
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

export function KeychainSquare({
  scale = 1,
  baseColor = '#7dd3fc',
  borderColor = '#3b82f6',
  thickness = 0.01,
  border = 0.05,
  reliefDepth = 0.06,
  cornerRadius = 0.12,
}: KeychainProps) {
  const width = 1.0;
  const height = 1.0;

  const baseGeom = useMemo(() => {
    const s = roundedRectShape(width, height, cornerRadius);
    return new THREE.ExtrudeGeometry(s, {
      depth: thickness,
      steps: 1,
      curveSegments: CURVE_SEGMENTS,
      ...BASE_BEVEL,
    });
  }, [thickness, cornerRadius]);

  const frameGeom = useMemo(() => {
    const s = rectFrameShape(width, height, border, cornerRadius);
    return new THREE.ExtrudeGeometry(s, {
      depth: reliefDepth,
      steps: 1,
      curveSegments: CURVE_SEGMENTS,
      ...BASE_BEVEL,
    });
  }, [border, reliefDepth, cornerRadius]);

  return (
    <group scale={scale}>
      <mesh geometry={baseGeom} position={[0, 0, -thickness / 2]}>
        <meshStandardMaterial color={baseColor} metalness={0.3} roughness={0.45} />
      </mesh>
      <mesh geometry={frameGeom} position={[0, 0, thickness / 2]}>
        <meshStandardMaterial color={borderColor} metalness={0.35} roughness={0.4} />
      </mesh>
    </group>
  );
}

export function KeychainCircle({
  scale = 1,
  baseColor = '#7dd3fc',
  borderColor = '#3b82f6',
  thickness = 0.01,
  border = 0.05,
  reliefDepth = 0.06,
}: KeychainProps) {
  const radius = 0.5;

  const baseGeom = useMemo(() => {
    const s = circleShape(radius);
    return new THREE.ExtrudeGeometry(s, {
      depth: thickness,
      steps: 1,
      curveSegments: CURVE_SEGMENTS,
      ...BASE_BEVEL,
    });
  }, [thickness]);

  const frameGeom = useMemo(() => {
    const s = circleFrameShape(radius, border);
    return new THREE.ExtrudeGeometry(s, {
      depth: reliefDepth,
      steps: 1,
      curveSegments: CURVE_SEGMENTS,
      ...BASE_BEVEL,
    });
  }, [border, reliefDepth]);

  return (
    <group scale={scale}>
      <mesh geometry={baseGeom} position={[0, 0, -thickness / 2]}>
        <meshStandardMaterial color={baseColor} metalness={0.3} roughness={0.45} />
      </mesh>
      <mesh geometry={frameGeom} position={[0, 0, thickness / 2]}>
        <meshStandardMaterial color={borderColor} metalness={0.35} roughness={0.4} />
      </mesh>
    </group>
  );
}

export function KeychainRect({
  scale = 1,
  baseColor = '#7dd3fc',
  borderColor = '#3b82f6',
  thickness = 0.01,
  border = 0.05,
  reliefDepth = 0.06,
  cornerRadius = 0.12,
}: KeychainProps) {
  const width = 1.2;
  const height = 0.8;

  const baseGeom = useMemo(() => {
    const s = roundedRectShape(width, height, cornerRadius);
    return new THREE.ExtrudeGeometry(s, {
      depth: thickness,
      steps: 1,
      curveSegments: CURVE_SEGMENTS,
      ...BASE_BEVEL,
    });
  }, [thickness, cornerRadius]);

  const frameGeom = useMemo(() => {
    const s = rectFrameShape(width, height, border, cornerRadius);
    return new THREE.ExtrudeGeometry(s, {
      depth: reliefDepth,
      steps: 1,
      curveSegments: CURVE_SEGMENTS,
      ...BASE_BEVEL,
    });
  }, [border, reliefDepth, cornerRadius]);

  return (
    <group scale={scale}>
      <mesh geometry={baseGeom} position={[0, 0, -thickness / 2]}>
        <meshStandardMaterial color={baseColor} metalness={0.3} roughness={0.45} />
      </mesh>
      <mesh geometry={frameGeom} position={[0, 0, thickness / 2]}>
        <meshStandardMaterial color={borderColor} metalness={0.35} roughness={0.4} />
      </mesh>
    </group>
  );
}
