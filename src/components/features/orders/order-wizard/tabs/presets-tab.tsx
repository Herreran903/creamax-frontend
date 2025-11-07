'use client';
import * as React from 'react';
import * as THREE from 'three';
import PredesignCard from '@/components/features/catalog/predesign-card';
import { ModelPredesign3D } from '@/domain/types';
import { Separator } from '@/components/ui/separator';
import { Boxes, KeyRound, Magnet } from 'lucide-react';
import { useActiveModel } from '@/stores/active-model';
import CategoryItem from '@/components/shared/inputs/category-button';

export type PresetsTabProps = {
  presets: ModelPredesign3D[];
  selectedPresetId: string | null;
  setSelectedPresetId: (id: string | null) => void;
  setSelectedMode: (m: 'PRESETS' | 'AI' | 'UPLOAD3D' | 'ARTESANAL') => void;
  onValueChange: (v: 'presets' | 'ai' | 'upload3d' | 'artisanal') => void;
};

export default function PresetsTab({
  presets,
  selectedPresetId,
  setSelectedPresetId,
  setSelectedMode,
  onValueChange,
}: PresetsTabProps) {
  const [category, setCategory] = React.useState<'keychain'>('keychain');
  const { setLoading, setReady, setError } = useActiveModel();

  function buildPresetGroup(kind: 'square' | 'rect' | 'circle'): THREE.Group {
    const group = new THREE.Group();
    const color = new THREE.Color('#7dd3fc');
    const metalness = 0.3;
    const roughness = 0.45;
    const thickness = 0.01;
    const reliefDepth = 0.06;
    const border = 0.05;

    const mkMat = (hex?: string) =>
      new THREE.MeshStandardMaterial({
        color: hex ? new THREE.Color(hex) : color,
        metalness,
        roughness,
      });

    const addSquare = () => {
      const width = 1.0;
      const height = 1.0;
      const baseShape = new THREE.Shape();
      baseShape.moveTo(-width / 2, -height / 2);
      baseShape.lineTo(width / 2, -height / 2);
      baseShape.lineTo(width / 2, height / 2);
      baseShape.lineTo(-width / 2, height / 2);
      baseShape.closePath();

      const inner = new THREE.Shape();
      inner.moveTo(-(width - 2 * border) / 2, -(height - 2 * border) / 2);
      inner.lineTo((width - 2 * border) / 2, -(height - 2 * border) / 2);
      inner.lineTo((width - 2 * border) / 2, (height - 2 * border) / 2);
      inner.lineTo(-(width - 2 * border) / 2, (height - 2 * border) / 2);
      inner.closePath();

      const frame = baseShape.clone();
      const holePath = new THREE.Path(inner.getPoints());
      frame.holes.push(holePath);

      const baseGeom = new THREE.ExtrudeGeometry(baseShape, {
        depth: thickness,
        bevelEnabled: false,
      });
      const frameGeom = new THREE.ExtrudeGeometry(frame, {
        depth: reliefDepth,
        bevelEnabled: false,
      });

      const base = new THREE.Mesh(baseGeom, mkMat());
      base.position.set(0, 0, -thickness / 2);
      const fr = new THREE.Mesh(frameGeom, mkMat());
      fr.position.set(0, 0, thickness / 2);

      group.add(base, fr);
    };

    const addRect = () => {
      const width = 1.2;
      const height = 0.8;

      const baseShape = new THREE.Shape();
      baseShape.moveTo(-width / 2, -height / 2);
      baseShape.lineTo(width / 2, -height / 2);
      baseShape.lineTo(width / 2, height / 2);
      baseShape.lineTo(-width / 2, height / 2);
      baseShape.closePath();

      const inner = new THREE.Shape();
      inner.moveTo(-(width - 2 * border) / 2, -(height - 2 * border) / 2);
      inner.lineTo((width - 2 * border) / 2, -(height - 2 * border) / 2);
      inner.lineTo((width - 2 * border) / 2, (height - 2 * border) / 2);
      inner.lineTo(-(width - 2 * border) / 2, (height - 2 * border) / 2);
      inner.closePath();

      const frame = baseShape.clone();
      const holePath = new THREE.Path(inner.getPoints());
      frame.holes.push(holePath);

      const baseGeom = new THREE.ExtrudeGeometry(baseShape, {
        depth: thickness,
        bevelEnabled: false,
      });
      const frameGeom = new THREE.ExtrudeGeometry(frame, {
        depth: reliefDepth,
        bevelEnabled: false,
      });

      const base = new THREE.Mesh(baseGeom, mkMat());
      base.position.set(0, 0, -thickness / 2);
      const fr = new THREE.Mesh(frameGeom, mkMat());
      fr.position.set(0, 0, thickness / 2);

      group.add(base, fr);
    };

    const addCircle = () => {
      const radius = 0.5;
      const s = new THREE.Shape();
      s.absarc(0, 0, radius, 0, Math.PI * 2, false);

      const frame = new THREE.Shape();
      frame.absarc(0, 0, radius, 0, Math.PI * 2, false);
      const inner = new THREE.Path();
      inner.absarc(0, 0, radius - border, 0, Math.PI * 2, true);
      frame.holes.push(inner);

      const baseGeom = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false });
      const frameGeom = new THREE.ExtrudeGeometry(frame, {
        depth: reliefDepth,
        bevelEnabled: false,
      });

      const base = new THREE.Mesh(baseGeom, mkMat());
      base.position.set(0, 0, -thickness / 2);
      const fr = new THREE.Mesh(frameGeom, mkMat());
      fr.position.set(0, 0, thickness / 2);

      group.add(base, fr);
    };

    if (kind === 'square') addSquare();
    else if (kind === 'rect') addRect();
    else addCircle();

    return group;
  }

  async function handleSelectPreset(d: ModelPredesign3D) {
    setSelectedPresetId(d.id);
    onValueChange('presets');
    setSelectedMode('PRESETS');

    setLoading({
      source: 'preset',
      format: 'procedural',
      name: d.name,
      createdAt: Date.now(),
    });

    try {
      const group = buildPresetGroup(d.kind);
      let triangles = 0;
      let materials = 0;
      group.traverse((obj: any) => {
        if (obj.isMesh) {
          const g = obj.geometry as THREE.BufferGeometry | undefined;
          if (g) {
            const index = g.getIndex();
            const pos = g.getAttribute('position');
            if (index) triangles += index.count / 3;
            else if (pos) triangles += pos.count / 3;
          }
          if (obj.material) materials += Array.isArray(obj.material) ? obj.material.length : 1;
        }
      });

      setReady(group, {
        name: d.name,
        format: 'procedural',
        triangles,
        materials,
        sizeMB: undefined,
        source: 'preset',
        createdAt: Date.now(),
      });
    } catch (e: any) {
      setError('No se pudo generar el modelo del preset.', {
        source: 'preset',
        format: 'procedural',
        name: d.name,
        createdAt: Date.now(),
      });
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <aside className="col-span-12 md:col-span-3">
        <div className="rounded-xl border-2 border-border bg-white p-3 h-full">
          <h3 className="font-bold mb-2 uppercase">Categorías</h3>
          <Separator className="border mb-3" />
          <div className="flex md:flex-col gap-2" role="listbox" aria-label="Categorías">
            <CategoryItem
              icon={KeyRound}
              label="Llaveros"
              active={category === 'keychain'}
              onClick={() => setCategory('keychain')}
            />
            <CategoryItem icon={Magnet} label="Imanes" disabled hint="Próximamente" />
            <CategoryItem icon={Boxes} label="Otros" disabled hint="Próximamente" />
          </div>
        </div>
      </aside>

      <section className="col-span-12 md:col-span-9">
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
          {presets
            .filter((d) => d.category === 'keychain')
            .map((d) => (
              <PredesignCard
                key={d.id}
                m={d}
                isSelected={selectedPresetId === d.id}
                onView={() => handleSelectPreset(d)}
                onAsk={() => handleSelectPreset(d)}
              />
            ))}
        </div>
      </section>
    </div>
  );
}
