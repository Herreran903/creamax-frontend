'use client';
import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileDrop } from '@/components/shared/forms/file-drop';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';

export type ArtisanTabProps = {
  artisanDescription: string;
  setArtisanDescription: (s: string) => void;
  artisanImageUrls: string[];
  setArtisanImageUrls: (f: (prev: string[]) => string[]) => void;
};

type LocalImage = {
  url: string;
  name: string;
  size: number;
  file: File;
};

const MAX_IMAGES = 10;
const MAX_IMAGE_MB = 10;

export default function ArtisanTab({
  artisanDescription,
  setArtisanDescription,
  artisanImageUrls: _artisanImageUrls,
  setArtisanImageUrls,
}: ArtisanTabProps) {
  const [images, setImages] = React.useState<LocalImage[]>([]);

  // Cleanup object URLs on unmount
  React.useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.url));
    };
  }, []);

  const onDropArtisanImages = (files: File[]) => {
    if (!files?.length) return;

    const remaining = Math.max(0, MAX_IMAGES - images.length);
    if (remaining <= 0) {
      toast('Has alcanzado el máximo de imágenes.');
      return;
    }

    const maxBytes = MAX_IMAGE_MB * 1024 * 1024;
    const next: LocalImage[] = [];
    for (const f of files) {
      if (next.length >= remaining) break;

      if (!f.type?.startsWith('image/')) {
        toast('Tipo no permitido. Solo imágenes.');
        continue;
      }
      if (f.size > maxBytes) {
        toast('El archivo excede el tamaño permitido.');
        continue;
      }

      const url = URL.createObjectURL(f);
      next.push({ url, name: f.name, size: f.size, file: f });
    }

    if (next.length === 0) return;

    setImages((prev) => [...prev, ...next]);
    // keep parent in sync with only URLs for consistency with current prop shape
    setArtisanImageUrls((prev) => [...prev, ...next.map((n) => n.url)]);

    if (images.length + next.length >= MAX_IMAGES) {
      toast('Has alcanzado el máximo de imágenes.');
    }
  };

  const removeImageAt = (index: number) => {
    setImages((prev) => {
      const img = prev[index];
      if (img) {
        URL.revokeObjectURL(img.url);
        setArtisanImageUrls((urls) => urls.filter((u) => u !== img.url));
      }
      const copy = prev.slice();
      copy.splice(index, 1);
      return copy;
    });
  };

  const clearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.url));
    setImages([]);
    setArtisanImageUrls(() => []);
    setArtisanDescription('');
  };

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
        <div className="md:col-span-2">
          <div className="rounded-xl border-2 border-border bg-white p-4 h-full space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="artisan-description"
                className="text-xs font-bold tracking-wide text-foreground/80"
              >
                DESCRIPCIÓN (OPCIONAL)
              </Label>
              <Textarea
                id="artisan-description"
                value={artisanDescription}
                onChange={(e) => setArtisanDescription(e.target.value)}
                placeholder="Cuéntanos qué quieres: estilo, materiales, dimensiones, acabados…"
                rows={3}
                className="resize-none rounded-xl border-2 border-border bg-background text-foreground focus-visible:ring-1 focus-visible:ring-[#0B4D67]"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="artisan-images"
                className="text-xs font-bold tracking-wide text-foreground/80"
              >
                IMÁGENES DE REFERENCIA
              </Label>

              <FileDrop
                onFiles={onDropArtisanImages}
                className="text-xs"
                multiple
                ariaLabel="Agregar imágenes de referencia"
                formatsHint={`PNG, JPG, WEBP, HEIC • máx. ${MAX_IMAGE_MB} MB`}
              />

              <p className="text-[11px] text-muted-foreground">
                Puedes subir hasta {MAX_IMAGES} imágenes como referencia.
              </p>

              {images.length > 0 && (
                <div
                  className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                  role="list"
                  aria-label="Imágenes subidas"
                >
                  {images.map((img, i) => (
                    <div
                      key={img.url}
                      role="listitem"
                      className="group relative overflow-hidden rounded-xl border border-border bg-muted/20"
                    >
                      <img
                        src={img.url}
                        alt={`Referencia: ${img.name}`}
                        className="h-28 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImageAt(i)}
                        className="absolute top-2 right-2 inline-flex items-center justify-center rounded-md bg-red-600 text-white p-1.5 shadow hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                        aria-label={`Eliminar ${img.name}`}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/50 to-transparent p-2">
                        <div className="text-[11px] leading-tight text-white">
                          <p className="truncate font-medium">{img.name}</p>
                          <p className="opacity-80">
                            {Math.max(0.1, Math.round((img.size / (1024 * 1024)) * 10) / 10)} MB
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="sticky bottom-0 pt-2">
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearAll}
                  className="rounded-xl px-4 py-3 gap-2"
                  aria-label="Limpiar"
                >
                  <RefreshCw className="h-4 w-4" />
                  Limpiar
                </Button>
                <Button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Pronto podrás enviar tu solicitud artesanal. Por ahora, esta función está en desarrollo."
                  className="
                    rounded-xl
                    px-5 py-5
                    text-base font-extrabold
                    text-white
                    bg-[#FF4D00]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4D67]
                    disabled:opacity-50 disabled:cursor-not-allowed
                    gap-2
                  "
                  aria-label="Enviar solicitud artesanal"
                >
                  <Send className="h-4 w-4" />
                  Enviar
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel: tips (keeps layout coherence) */}
        <div className="md:col-span-1">
          <div className="rounded-xl border-2 border-border bg-white p-4 h-full">
            <div className="space-y-2">
              <h3 className="text-sm font-bold tracking-wide text-foreground/80">
                RECOMENDACIONES
              </h3>
              <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
                <li>Incluye fotos claras desde varios ángulos.</li>
                <li>Si tienes medidas aproximadas, agrégalas en la descripción.</li>
                <li>Comparte referencias de estilo, materiales y acabados deseados.</li>
              </ul>
              <p className="text-[11px] text-amber-700/90 mt-2">
                Nota: Esta solicitud no genera un modelo automáticamente ni inicia un flujo de
                compra.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
