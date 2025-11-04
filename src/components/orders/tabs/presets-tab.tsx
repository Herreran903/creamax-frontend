'use client';
import * as React from 'react';
import PredesignCard from '@/components/predesign-card';
import { ModelPredesign3D } from '@/domain/types';
import { Separator } from '@/components/ui/separator';
import { CategoryItem } from '@/components/category-button';
import { Boxes, KeyRound, Magnet } from 'lucide-react';

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

  return (
    <div className="mt-0 grid grid-cols-12 gap-6">
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
                onView={() => setSelectedPresetId(d.id)}
                onAsk={() => {
                  setSelectedPresetId(d.id);
                  onValueChange('presets');
                  setSelectedMode('PRESETS');
                }}
              />
            ))}
        </div>
      </section>
    </div>
  );
}
