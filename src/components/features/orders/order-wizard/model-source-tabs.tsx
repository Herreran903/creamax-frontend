'use client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ModelPredesign3D } from '@/domain/types';
import PresetsTab from './tabs/presets-tab';
import Upload3DTab from './tabs/upload3d-tab';
import ArtisanTab from './tabs/artisan-tab';
import AiTab from './tabs/ai-tab';

import type { ModelSourceTab, SelectedMode } from '@/domain/types';
export type { ModelSourceTab, SelectedMode } from '@/domain/types';

export const PRESETS: ModelPredesign3D[] = [
  {
    id: 'square',
    name: 'Llavero Cuadrado',
    kind: 'square',
    category: 'keychain',
    price: 10000,
    source: 'internal',
  },
  {
    id: 'rect',
    name: 'Llavero Rectangular',
    kind: 'rect',
    category: 'keychain',
    price: 10000,
    source: 'internal',
  },
  {
    id: 'circle',
    name: 'Llavero Circular',
    kind: 'circle',
    category: 'keychain',
    price: 10000,
    source: 'internal',
  },
];

export type ModelSourceTabsProps = {
  value: ModelSourceTab;
  onValueChange: (v: ModelSourceTab) => void;
  selectedMode: SelectedMode;
  setSelectedMode: (m: SelectedMode) => void;
  selectedPresetId: string | null;
  setSelectedPresetId: (id: string | null) => void;
  uploadedUrl: string | null;
  setUploadedUrl: (u: string | null) => void;
  uploadedName: string | null;
  setUploadedName: (n: string | null) => void;
  artisanDescription: string;
  setArtisanDescription: (s: string) => void;
  artisanImageUrls: string[];
  setArtisanImageUrls: (f: (prev: string[]) => string[]) => void;
};

export default function ModelSourceTabs({
  value,
  onValueChange,
  selectedMode,
  setSelectedMode,
  selectedPresetId,
  setSelectedPresetId,
  uploadedUrl,
  setUploadedUrl,
  uploadedName,
  setUploadedName,
  artisanDescription,
  setArtisanDescription,
  artisanImageUrls,
  setArtisanImageUrls,
}: ModelSourceTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onValueChange(v as ModelSourceTab)}
      className="space-y-5"
    >
      <TabsList>
        <TabsTrigger value="presets">Prediseñados</TabsTrigger>
        <TabsTrigger value="ai">Generado con IA</TabsTrigger>
        <TabsTrigger value="upload3d">Subir 3D</TabsTrigger>
        <TabsTrigger value="artisanal">Artesanal</TabsTrigger>
      </TabsList>

      <TabsContent value="presets">
        <PresetsTab
          presets={PRESETS}
          selectedPresetId={selectedPresetId}
          setSelectedPresetId={setSelectedPresetId}
          setSelectedMode={setSelectedMode}
          onValueChange={onValueChange}
        />
      </TabsContent>

      <TabsContent value="ai">
        <AiTab />
      </TabsContent>

      <TabsContent value="upload3d">
        <Upload3DTab
          uploadedName={uploadedName}
          setUploadedName={setUploadedName}
          setUploadedUrl={setUploadedUrl}
          setSelectedMode={setSelectedMode}
          onValueChange={onValueChange}
        />
      </TabsContent>

      <TabsContent value="artisanal">
        <ArtisanTab
          artisanDescription={artisanDescription}
          setArtisanDescription={setArtisanDescription}
          artisanImageUrls={artisanImageUrls}
          setArtisanImageUrls={setArtisanImageUrls}
        />
      </TabsContent>
    </Tabs>
  );
}
