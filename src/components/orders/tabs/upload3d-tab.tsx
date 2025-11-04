'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

export type Upload3DTabProps = {
  uploadedName: string | null;
  setUploadedName: (n: string | null) => void;
  setUploadedUrl: (u: string | null) => void;
  setSelectedMode: (m: 'PRESETS' | 'AI' | 'UPLOAD3D' | 'ARTESANAL') => void;
  onValueChange: (v: 'presets' | 'ai' | 'upload3d' | 'artisanal') => void;
};

export default function Upload3DTab({
  uploadedName,
  setUploadedName,
  setUploadedUrl,
  setSelectedMode,
  onValueChange,
}: Upload3DTabProps) {
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const onPickFile = () => fileRef.current?.click();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/\.(glb|gltf|stl)$/i.test(f.name)) {
      alert('Por favor sube un archivo .glb, .gltf o .stl');
      return;
    }
    setUploadedName(f.name);
    try {
      const url = URL.createObjectURL(f);
      setUploadedUrl(url);
      onValueChange('upload3d');
      setSelectedMode('UPLOAD3D');
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-4">
      <p className="text-sm text-muted-foreground">
        Sube un archivo .glb, .gltf o .stl listo para impresión.
      </p>
      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".glb,.gltf,.stl"
          className="hidden"
          onChange={onFile}
        />
        <Button className="gap-2" onClick={onPickFile}>
          <Upload className="h-4 w-4" />
          Subir modelo (GLB/STL)
        </Button>
      </div>
      {uploadedName && <p className="text-xs">Archivo: {uploadedName}</p>}
    </div>
  );
}
