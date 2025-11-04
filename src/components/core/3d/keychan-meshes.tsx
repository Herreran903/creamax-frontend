'use client';

import * as THREE from 'three';
import { useMemo } from 'react';

function rectShape(width: number, height: number) {
  const hw = width / 2;
  const hh = height / 2;
  const s = new THREE.Shape();
  s.moveTo(-hw, -hh);
  s.lineTo(hw, -hh);
  s.lineTo(hw, hh);
  s.lineTo(-hw, hh);
  s.closePath();
  return s;
}

function rectFrameShape(width: number, height: number, border: number) {
  const outer = rectShape(width, height);
  const inner = rectShape(width - 2 * border, height - 2 * border);
  const innerPath = new THREE.Path(inner.getPoints());
  outer.holes.push(innerPath);
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
  inner.absarc(0, 0, radius - border, 0, Math.PI * 2, true);
  outer.holes.push(inner);
  return outer;
}

type KeychainProps = {
  scale?: number;
  color?: string;
  thickness?: number;
  border?: number;
  reliefDepth?: number;
};

export function KeychainSquare({
  scale = 1,
  color = '#7dd3fc',
  thickness = 0.01,
  border = 0.05,
  reliefDepth = 0.06,
}: KeychainProps) {
  const width = 1.0;
  const height = 1.0;

  const baseGeom = useMemo(() => {
    const s = rectShape(width, height);
    return new THREE.ExtrudeGeometry(s, {
      depth: thickness,
      bevelEnabled: false,
      steps: 1,
    });
  }, [thickness]);

  const frameGeom = useMemo(() => {
    const s = rectFrameShape(width, height, border);
    return new THREE.ExtrudeGeometry(s, {
      depth: reliefDepth,
      bevelEnabled: false,
      steps: 1,
    });
  }, [border, reliefDepth]);

  return (
    <group scale={scale}>
      <mesh geometry={baseGeom} position={[0, 0, -thickness / 2]}>
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.45} />
      </mesh>
      <mesh geometry={frameGeom} position={[0, 0, thickness / 2]}>
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.4} />
      </mesh>
    </group>
  );
}

export function KeychainCircle({
  scale = 1,
  color = '#7dd3fc',
  thickness = 0.01,
  border = 0.05,
  reliefDepth = 0.06,
}: KeychainProps) {
  const radius = 0.5;

  const baseGeom = useMemo(() => {
    const s = circleShape(radius);
    return new THREE.ExtrudeGeometry(s, {
      depth: thickness,
      bevelEnabled: false,
      steps: 1,
    });
  }, [thickness]);

  const frameGeom = useMemo(() => {
    const s = circleFrameShape(radius, border);
    return new THREE.ExtrudeGeometry(s, {
      depth: reliefDepth,
      bevelEnabled: false,
      steps: 1,
    });
  }, [border, reliefDepth]);

  return (
    <group scale={scale}>
      <mesh geometry={baseGeom} position={[0, 0, -thickness / 2]}>
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.45} />
      </mesh>
      <mesh geometry={frameGeom} position={[0, 0, thickness / 2]}>
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.4} />
      </mesh>
    </group>
  );
}

export function KeychainRect({
  scale = 1,
  color = '#7dd3fc',
  thickness = 0.01,
  border = 0.05,
  reliefDepth = 0.06,
}: KeychainProps) {
  const width = 1.2;
  const height = 0.8;
  const baseGeom = useMemo(() => {
    const s = rectShape(width, height);
    return new THREE.ExtrudeGeometry(s, {
      depth: thickness,
      bevelEnabled: false,
      steps: 1,
    });
  }, [thickness]);

  const frameGeom = useMemo(() => {
    const s = rectFrameShape(width, height, border);
    return new THREE.ExtrudeGeometry(s, {
      depth: reliefDepth,
      bevelEnabled: false,
      steps: 1,
    });
  }, [border, reliefDepth]);

  return (
    <group scale={scale}>
      <mesh geometry={baseGeom} position={[0, 0, -thickness / 2]}>
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.45} />
      </mesh>
      <mesh geometry={frameGeom} position={[0, 0, thickness / 2]}>
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.4} />
      </mesh>
    </group>
  );
}
