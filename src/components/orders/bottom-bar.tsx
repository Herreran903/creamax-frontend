// src/components/orders/bottom-bar.tsx
'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { useOrder } from '@/hooks/use-order';
import { PRESETS } from '@/domain/types';

export function BottomBar() {
  const o = useOrder();
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/\.(glb|gltf|stl)$/i.test(f.name)) return alert('Archivo inválido');
    o.setUploadedName(f.name);
    o.setUploadedUrl(URL.createObjectURL(f));
    o.setSelectedMode('UPLOAD3D');
  };

  const selectedName = o.selected ? PRESETS.find((p) => p.id === o.selected)?.name : 'Ninguna';

  return (
    <div className="sticky bottom-4 z-30 mx-auto max-w-6xl">
      <div className="rounded-md border bg-white/50 shadow-[0_8px_30px_rgba(0,0,0,0.08)] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Selección:</span>
          <span className="font-medium">{selectedName}</span>
          {o.uploadedName && (
            <span className="ml-3 text-xs text-muted-foreground">
              Archivo: <span className="font-medium text-foreground">{o.uploadedName}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".glb,.gltf,.stl"
            className="hidden"
            onChange={onFile}
          />
          <Button variant="glass" className="gap-2" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Subir modelo (GLB/STL)
          </Button>
        </div>
      </div>
    </div>
  );
}
