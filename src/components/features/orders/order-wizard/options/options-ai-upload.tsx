'use client';
import * as React from 'react';
import { useOrder } from '@/hooks/use-order';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ActiveModelViewer from '@/components/features/orders/order-wizard/active-model-viewer';
import { Package, FileText, Rss, Link2 } from 'lucide-react';
import { SelectedMode } from '@/domain/types';

export type OptionsAIUploadProps = {
  selectedMode: SelectedMode;
  selectedPresetId: string | null;
  uploadedUrl: string | null;
  aiGlbUrl: string | null;
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

export default function OptionsAIUpload({ notes, setNotes }: OptionsAIUploadProps) {
  const o = useOrder();
  const nfcUrlInvalid = o.includeNfc && !isValidUrl(o.nfcUrl);

  const [productType, setProductType] = React.useState<'LLAVERO' | 'IMAN' | 'OTROS'>('LLAVERO');

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
        <div className="md:col-span-2">
          <div className="rounded-xl border-2 border-border bg-white p-4 h-full space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="product-type"
                className="text-xs font-bold tracking-wide text-foreground/80 flex"
              >
                <Package className="h-4 w-4 mr-1" size={12} />
                TIPO DE PRODUCTO
              </Label>
              <select
                id="product-type"
                aria-describedby="product-type-help"
                value={productType}
                onChange={(e) => setProductType(e.target.value as any)}
                className="h-9 w-full rounded-xl border-2 border-border bg-background text-foreground px-3
                  focus-visible:ring-1 focus-visible:ring-[#0B4D67] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="LLAVERO">Llavero</option>
                <option value="IMAN" disabled>
                  Imán de nevera (próximamente)
                </option>
                <option value="OTROS" disabled>
                  Otros (próximamente)
                </option>
              </select>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="extra-notes"
                className="text-xs font-bold tracking-wide text-foreground/80 flex"
              >
                <FileText className="h-4 w-4 mr-1" size={12} />
                DESCRIPCIÓN ADICIONAL
              </Label>
              <Textarea
                id="extra-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agrega detalles para ayudar a nuestro equipo a describir y producir correctamente."
                rows={2}
                spellCheck
                className="resize-none rounded-xl border-2 border-border bg-background text-foreground
                  focus-visible:ring-1 focus-visible:ring-[#0B4D67]"
              />
              <p className="text-xs text-muted-foreground">
                Ejemplos: tamaño aproximado, colores preferidos, texto opcional, acabados, empaques,
                etc.
              </p>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="include-nfc"
                className="text-xs font-bold tracking-wide text-foreground/80 flex"
              >
                <Rss className="h-4 w-4 mr-1" size={12} />
                NFC
              </Label>
              <div className="flex items-center justify-between gap-4">
                <p id="include-nfc-desc" className="text-xs text-muted-foreground">
                  Activa esta opción para asociar un enlace al producto mediante NFC.
                </p>
                <Switch
                  id="include-nfc"
                  className="data-[state=unchecked]:bg-muted"
                  checked={o.includeNfc}
                  onCheckedChange={(v) => o.setIncludeNfc(Boolean(v))}
                  aria-label="Incluir NFC"
                  aria-checked={o.includeNfc}
                  aria-describedby="include-nfc-desc"
                />
              </div>

              {o.includeNfc && (
                <div className="space-y-2">
                  <Label
                    htmlFor="nfc-url"
                    className="text-xs font-bold tracking-wide text-foreground/80 flex"
                  >
                    <Link2 className="h-4 w-4 mr-1" size={12} />
                    URL NFC
                  </Label>
                  <Input
                    id="nfc-url"
                    type="url"
                    inputMode="url"
                    placeholder="https://ejemplo.com/ruta"
                    value={o.nfcUrl}
                    onChange={(e) => o.setNfcUrl(e.target.value)}
                    aria-invalid={nfcUrlInvalid}
                    aria-describedby="nfc-url-help nfc-url-error"
                    className={`rounded-xl border-2 border-border bg-background text-foreground
                      focus-visible:ring-1 focus-visible:ring-[#0B4D67] ${
                        nfcUrlInvalid ? 'ring-1 ring-red-500 focus-visible:ring-red-500' : ''
                      }`}
                    required
                  />
                  {nfcUrlInvalid ? (
                    <p id="nfc-url-error" className="text-xs text-red-600">
                      Ingresa una URL válida (incluye http:// o https://).
                    </p>
                  ) : null}
                  <p id="nfc-url-help" className="text-xs text-muted-foreground">
                    Debe ser un enlace válido que se abrirá al acercar el producto a un teléfono.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="md:col-span-2">
          <ActiveModelViewer className="h-full w-full rounded-lg overflow-hidden" />
        </div>
      </div>
    </div>
  );
}
