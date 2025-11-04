'use client';
import * as React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { FileDrop } from '@/components/core/forms/file-drop';
import { ModelViewer } from '@/components/core/3d/model-viewer';

export type ArtisanTabProps = {
  artisanDescription: string;
  setArtisanDescription: (s: string) => void;
  artisanImageUrls: string[];
  setArtisanImageUrls: (f: (prev: string[]) => string[]) => void;
};

export default function ArtisanTab({
  artisanDescription,
  setArtisanDescription,
  artisanImageUrls,
  setArtisanImageUrls,
}: ArtisanTabProps) {
  const onDropArtisanImages = async (files: File[]) => {
    if (!files?.length) return;
    try {
      for (const f of files) {
        const fd = new FormData();
        fd.append('file', f);
        const res = await fetch('/api/uploads', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Error subiendo imagen');
        setArtisanImageUrls((prev) => [...prev, data.url]);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-4 space-y-3">
            <label className="text-sm font-medium">Descripción detallada del modelo</label>
            <Textarea
              value={artisanDescription}
              onChange={(e) => setArtisanDescription(e.target.value)}
              placeholder="Describe en detalle lo que necesitas. Ej. forma, tamaños, colores aproximados, anillas, etc."
            />
            <label className="text-sm font-medium">Imágenes de referencia</label>
            <FileDrop onFiles={onDropArtisanImages} className="text-xs" />
            {artisanImageUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {artisanImageUrls.map((u, i) => (
                  <img
                    key={i}
                    src={u}
                    alt="ref"
                    className="h-16 w-16 rounded object-cover border"
                  />
                ))}
              </div>
            )}
            <p className="text-xs text-amber-600">
              Caso especial: hacer el modelo 3D tiene un costo adicional y no se dará una cotización
              del producto hasta terminarlo.
            </p>
          </div>
        </div>
        <div className="md:col-span-2">
          <ModelViewer className="h-[70vh]" />
        </div>
      </div>
    </div>
  );
}
