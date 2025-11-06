'use client';
import * as React from 'react';
import { useOrder } from '@/hooks/use-order';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileDrop } from '@/components/shared/forms/file-drop';
import PresetModelViewer from '@/components/features/orders/order-wizard/preset-model-viewer';
import { FileText, Rss, Link2, Image, Palette } from 'lucide-react';
import { SelectedMode } from '@/domain/types';
import { ColorInput } from '@/components/shared';

export type OptionsPresetsProps = {
  selectedMode: SelectedMode;
  selectedPresetId: string | null;
  selectedPresetKind?: 'square' | 'rect' | 'circle'; // 🔹 nuevo
  notes: string;
  setNotes: (s: string) => void;
  onBack: () => void;
  onFinish: (payload: any) => Promise<void>;
};

function isValidUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function OptionsPresets({
  selectedMode,
  selectedPresetId,
  selectedPresetKind = 'square',
  notes,
  setNotes,
  onBack,
  onFinish,
}: OptionsPresetsProps) {
  const o = useOrder();
  const nfcUrlInvalid = o.includeNfc && !isValidUrl(o.nfcUrl);

  const [textureUrl, setTextureUrl] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [baseColor, setBaseColor] = React.useState('#7dd3fc');
  const [borderColor, setBorderColor] = React.useState('#7dd3fc');

  const onDropImages = async (files: File[]) => {
    if (!files?.length) return;
    const f = files[0];
    if (f.name.toLowerCase().endsWith('.svg')) {
      alert('Las imágenes SVG no están permitidas para este tipo de modelo.');
      return;
    }
    setUploading(true);
    try {
      const localUrl = URL.createObjectURL(f);
      setTextureUrl(localUrl);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <div className="rounded-xl border-2 border-border bg-white p-4 h-full space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold tracking-wide text-foreground/80 flex">
                <Image className="h-4 w-4 mr-1" /> TEXTURA (IMAGEN)
              </Label>
              <FileDrop
                onFiles={onDropImages}
                previewUrl={textureUrl}
                uploading={uploading}
                onClear={() => setTextureUrl(null)}
                className="text-xs"
                accept={{
                  'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.bmp'],
                }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold tracking-wide text-foreground/80 flex">
                <Palette className="h-4 w-4 mr-1" /> COLORES
              </Label>
              <div className="flex gap-3">
                <div className="flex flex-col items-start gap-2">
                  <Label className="text-xs text-muted-foreground">Base</Label>
                  <ColorInput
                    id="color-base"
                    value={baseColor}
                    onChange={setBaseColor}
                    className="w-40"
                  />
                </div>
                <div className="flex flex-col items-start gap-2">
                  <Label className="text-xs text-muted-foreground">Borde</Label>
                  <ColorInput
                    id="color-border"
                    value={borderColor}
                    onChange={setBorderColor}
                    className="w-40"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="extra-notes"
                className="text-xs font-bold tracking-wide text-foreground/80 flex"
              >
                <FileText className="h-4 w-4 mr-1" /> DESCRIPCIÓN ADICIONAL
              </Label>
              <Textarea
                id="extra-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agrega detalles o ajustes sobre el preset seleccionado."
                rows={2}
                className="resize-none rounded-xl border-2 border-border bg-background text-foreground
                  focus-visible:ring-1 focus-visible:ring-[#0B4D67]"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="include-nfc"
                className="text-xs font-bold tracking-wide text-foreground/80 flex"
              >
                <Rss className="h-4 w-4 mr-1" /> NFC
              </Label>
              <div className="flex items-center justify-between gap-4">
                <p id="include-nfc-desc" className="text-xs text-muted-foreground">
                  Activa esta opción para asociar un enlace al producto mediante NFC.
                </p>
                <Switch
                  id="include-nfc"
                  checked={o.includeNfc}
                  onCheckedChange={(v) => o.setIncludeNfc(Boolean(v))}
                  aria-label="Incluir NFC"
                />
              </div>

              {o.includeNfc && (
                <div className="space-y-2">
                  <Label
                    htmlFor="nfc-url"
                    className="text-xs font-bold tracking-wide text-foreground/80 flex"
                  >
                    <Link2 className="h-4 w-4 mr-1" /> URL NFC
                  </Label>
                  <Input
                    id="nfc-url"
                    type="url"
                    placeholder="https://ejemplo.com/ruta"
                    value={o.nfcUrl}
                    onChange={(e) => o.setNfcUrl(e.target.value)}
                    aria-invalid={nfcUrlInvalid}
                    className={`rounded-xl border-2 border-border bg-background text-foreground
                      focus-visible:ring-1 focus-visible:ring-[#0B4D67] ${
                        nfcUrlInvalid ? 'ring-1 ring-red-500' : ''
                      }`}
                    required
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="md:col-span-2">
          <PresetModelViewer
            kind={selectedPresetKind}
            textureUrl={textureUrl}
            baseColor={baseColor}
            borderColor={borderColor}
          />
        </div>
      </div>
    </div>
  );
}
