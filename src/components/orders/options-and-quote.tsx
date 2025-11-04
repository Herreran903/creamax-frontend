'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileDrop } from '@/components/core/forms/file-drop';
import { ModelViewer } from '@/components/core/3d/model-viewer';
import { PRESETS, SelectedMode } from './model-source-tabs';
import { useActiveModel } from '@/stores/active-model';

export type QuoteData = {
  amount: number;
  currency: string;
  estimateDays: number;
  modelOnly?: boolean;
};

export type OptionsAndQuoteProps = {
  selectedMode: SelectedMode;
  selectedPresetId: string | null;
  uploadedUrl: string | null;
  aiGlbUrl: string | null;
  notes: string;
  setNotes: (s: string) => void;
  onBack: () => void;
  onFinish: (payload: any) => Promise<void>;
};

export default function OptionsAndQuote({
  selectedMode,
  selectedPresetId,
  uploadedUrl,
  aiGlbUrl,
  notes,
  setNotes,
  onBack,
  onFinish,
}: OptionsAndQuoteProps) {
  const isArtisanal = selectedMode === 'ARTESANAL';
  const [includeNfc, setIncludeNfc] = React.useState(true);
  const [nfcUrl, setNfcUrl] = React.useState('');
  const [quantity, setQuantity] = React.useState<number>(50);
  const [presetOverlay, setPresetOverlay] = React.useState<string | null>(null);
  const [quoteData, setQuoteData] = React.useState<QuoteData | null>(null);

  const { state: amState } = useActiveModel();
  const isModelReady = amState.status === 'READY' && !!(amState as any).data;

  const demoKind =
    selectedMode === 'PRESETS'
      ? PRESETS.find((p) => p.id === selectedPresetId)?.kind === 'circle'
        ? 'circle'
        : 'square'
      : undefined;

  const requestQuote = async () => {
    setQuoteData(null);
    const apiMode =
      selectedMode === 'AI'
        ? 'IA'
        : selectedMode === 'UPLOAD3D'
          ? 'SUBIR_3D'
          : selectedMode === 'ARTESANAL'
            ? 'ARTESANAL'
            : 'CATALOGO';
    const body: any = {
      includeNFC: !isArtisanal && includeNfc,
      productType: 'LLAVERO',
      quantity: isArtisanal ? 1 : quantity,
      mode: apiMode,
      artisanChanges: false,
    };
    const res = await fetch('/api/quote', { method: 'POST', body: JSON.stringify(body) });
    const data = await res.json();
    setQuoteData(data);
  };

  const backgroundSrc =
    selectedMode === 'AI'
      ? aiGlbUrl
        ? `/api/tripo/proxy?url=${encodeURIComponent(aiGlbUrl)}`
        : undefined
      : selectedMode === 'UPLOAD3D'
        ? (uploadedUrl ?? undefined)
        : undefined;

  return (
    <div className="relative">
      {!isArtisanal && (
        <div className="absolute inset-0 -z-10 pointer-events-none opacity-35">
          <ModelViewer
            className="h-full"
            object={isModelReady ? (amState as any).data : undefined}
            src={!isModelReady ? backgroundSrc : undefined}
            demoKind={selectedMode === 'PRESETS' ? (demoKind as any) : undefined}
            overlayImage={selectedMode === 'PRESETS' ? (presetOverlay ?? undefined) : undefined}
            autoRotate
            spinSpeed={0.6}
          />
        </div>
      )}

      {!isModelReady && !isArtisanal && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-3 rounded-lg border border-amber-300 bg-amber-100 text-amber-900 px-3 py-2 text-sm"
        >
          Elige o genera un modelo en el Paso 1 antes de continuar.
        </div>
      )}

      <div className="rounded-md border border-border bg-white/60 backdrop-blur-md p-4 space-y-4 relative z-10">
        {!isArtisanal ? (
          <>
            <div className="flex items-center gap-3">
              <Switch checked={includeNfc} onCheckedChange={setIncludeNfc} />
              <span className="text-sm">Incluir NFC</span>
            </div>
            {includeNfc && (
              <div className="max-w-md">
                <label className="text-sm">Enlace NFC</label>
                <Input
                  value={nfcUrl}
                  onChange={(e) => setNfcUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
            )}
            <div className="max-w-xs">
              <label className="text-sm">Cantidad</label>
              <Input
                type="number"
                min={1}
                value={Number.isFinite(quantity) ? quantity : 1}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value || '1')))}
              />
            </div>
            {selectedMode === 'PRESETS' && (
              <div className="space-y-2 max-w-md">
                <label className="text-sm font-medium">
                  Imagen para textura o referencia (opcional)
                </label>
                <FileDrop
                  onFiles={(files) => {
                    if (files?.[0]) setPresetOverlay(URL.createObjectURL(files[0]));
                  }}
                  className="text-xs"
                />
                {presetOverlay && (
                  <div className="flex items-center gap-2">
                    <img
                      src={presetOverlay}
                      alt="overlay"
                      className="h-16 w-16 rounded object-cover border"
                    />
                    <Button size="sm" onClick={() => setPresetOverlay(null)}>
                      Quitar
                    </Button>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-3">
              <Button onClick={requestQuote}>Obtener cotización</Button>
              {quoteData ? (
                <div className="text-sm">
                  <p>
                    Estimado:{' '}
                    <b>
                      {quoteData.amount} {quoteData.currency}
                    </b>{' '}
                    {quoteData.modelOnly ? '(solo modelado 3D)' : ''}
                  </p>
                  <p>
                    Tiempo estimado: <b>{quoteData.estimateDays} días hábiles</b>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Genera una cotización para ver el estimado.
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-amber-700">
              Estás solicitando el modelado 3D artesanal. Este paso cotiza únicamente el modelado;
              la cotización del producto se dará cuando el modelo esté listo.
            </p>
            <div className="flex items-center gap-3">
              <Button onClick={requestQuote}>Obtener cotización de modelado</Button>
            </div>
          </>
        )}

        <div className="space-y-1 text-xs text-white/80">
          <p>Aclaraciones importantes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Las cotizaciones, en especial de IA y archivos subidos por el usuario, son
              aproximaciones.
            </li>
            <li>El precio puede variar por la cantidad de colores y acabados.</li>
            <li>
              El modelo 3D puede requerir cambios por limitaciones técnicas; tanto el modelo como la
              cotización están sujetos a ajustes. En ese caso nos comunicaremos contigo.
            </li>
            <li>Los tiempos son en días hábiles y pueden aumentar si se piden cambios.</li>
          </ul>
        </div>

        <div className="space-y-1">
          <label className="text-sm">Notas o mensajes para el equipo</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Escribe indicaciones adicionales, usos, colores, etc."
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={onBack}>Volver</Button>
          <Button
            onClick={() =>
              onFinish({
                productType: 'LLAVERO',
                includeNFC: !isArtisanal ? includeNfc : false,
                nfcUrl: !isArtisanal && includeNfc ? nfcUrl : undefined,
                description: notes,
                referenceImages: [],
                quote: quoteData || undefined,
                status: 'PENDIENTE_REVISION',
                createdAt: new Date().toISOString(),
                mode: selectedMode,
              })
            }
          >
            Finalizar compra
          </Button>
        </div>
      </div>
    </div>
  );
}
