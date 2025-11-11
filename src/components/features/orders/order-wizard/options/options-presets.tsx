'use client';
import * as React from 'react';
import { useOrder } from '@/hooks/use-order';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileDrop } from '@/components/shared/forms/file-drop';
import PresetModelViewer from '@/components/features/orders/order-wizard/preset-model-viewer';
import SvgPresetComposer from '../svg-preset-composer';
import { FileText, Rss, Link2, Image, Palette } from 'lucide-react';
import { SelectedMode } from '@/domain/types';
import { ColorInput } from '@/components/shared';
import { computeColorsFromSvgText } from '@/services/svg/preparse';
import type { SvgProcessResult, DepthMap } from '@/lib/svg/types';
import { toast } from 'sonner';
import { useActiveModel } from '@/stores/active-model';

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

  // ActiveModel global status for stepper readiness and progress
  const {
    setLoading: setAMLoading,
    setProgress: setAMProgress,
    setError: setAMError,
  } = useActiveModel();

  const [textureUrl, setTextureUrl] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  // Use colors from Order context so they are available when building the contract
  const baseColor = o.baseColor;
  const setBaseColor = o.setBaseColor;
  const borderColor = o.borderColor;
  const setBorderColor = o.setBorderColor;

  // SVG mode state
  const [buildFromSvg, setBuildFromSvg] = React.useState(false);
  const [svgName, setSvgName] = React.useState<string | null>(null);
  const [svgResult, setSvgResult] = React.useState<SvgProcessResult | null>(null);
  const [depthMap, setDepthMap] = React.useState<DepthMap>({});
  const [selectedHex, setSelectedHex] = React.useState<string | null>(null);

  const onDropImages = async (files: File[]) => {
    if (buildFromSvg) {
      toast.error('Solo se aceptan archivos .svg cuando "Construir desde SVG" está activo.');
      return;
    }
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
      // persist in order context for Step 3 contract
      o.setTextureImageUrl(localUrl);
    } finally {
      setUploading(false);
    }
  };

  // SVG processing pipeline (reuses worker and pre-parser)
  const openWorkerAndProcess = React.useCallback(
    async (svgText: string) => {
      try {
        // reflect loading state globally
        setAMLoading({
          source: 'svg',
          format: 'procedural',
          name: svgName || 'SVG',
          createdAt: Date.now(),
        });

        const parsed = await computeColorsFromSvgText(svgText, 12);

        const worker = new Worker(
          new URL('../../../../../workers/svg-extrude.worker.ts', import.meta.url),
          { type: 'module' }
        );

        worker.onmessage = (ev: MessageEvent<any>) => {
          const msg = ev.data;
          if (!msg) return;
          if (msg.type === 'progress') {
            if (typeof msg.progress === 'number') setAMProgress(msg.progress);
          } else if (msg.type === 'error') {
            toast.error(msg.error || 'Error procesando SVG.');
            setAMError(msg.error || 'Error procesando SVG.', {
              source: 'svg',
              format: 'procedural',
              name: svgName || 'SVG',
              createdAt: Date.now(),
            });
            worker.terminate();
          } else if (msg.type === 'result') {
            setSvgResult(msg.result as SvgProcessResult);
            const dm: DepthMap = {};
            for (const c of msg.result.colors) dm[c.hex] = 1.0;
            setDepthMap(dm);
            setSelectedHex(msg.result.colors[0]?.hex ?? null);
            worker.terminate();
          }
        };

        worker.postMessage({
          type: 'process-polys',
          colors: parsed.colors,
          width: parsed.width,
          height: parsed.height,
          viewBox: parsed.viewBox,
          simplifyTolerance: 0,
          doUnion: false,
        });
      } catch (e: any) {
        const msg = e?.message || 'Error leyendo SVG.';
        toast.error(msg);
        setAMError(msg, {
          source: 'svg',
          format: 'procedural',
          name: svgName || 'SVG',
          createdAt: Date.now(),
        });
      }
    },
    [setAMLoading, setAMProgress, setAMError, svgName]
  );

  const onDropSvg = async (files: File[]) => {
    const f = files?.[0];
    if (!f) return;
    if (!/\.svg$/i.test(f.name)) {
      toast.error('Formato inválido. Solo se acepta .svg.');
      return;
    }
    setSvgName(f.name);
    const text = await f.text();
    // persist raw SVG for Step 3 contract
    o.setSvgText(text);
    await openWorkerAndProcess(text);
  };

  // Controlado y estable para evitar bucles de actualización
  const handleToggleBuildFromSvg = React.useCallback(
    (v: boolean) => {
      const next = Boolean(v);
      setBuildFromSvg((prev) => {
        if (prev === next) return prev;
        if (next) {
          // Limpiar imagen previa si existía
          setTextureUrl(null);
          o.setTextureImageUrl(null);
        }
        return next;
      });
      // Si se desactiva el modo SVG, limpiar SVG persistido
      if (!next) {
        setSvgResult(null);
        setSvgName(null);
        setDepthMap({});
        setSelectedHex(null);
        o.setSvgText(null);
      }
    },
    [o]
  );

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <div className="rounded-xl border-2 border-border bg-white p-4 h-full space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold tracking-wide text-foreground/80 flex">
                  <Image className="h-4 w-4 mr-1" /> {buildFromSvg ? 'SVG' : 'TEXTURA (IMAGEN)'}
                </Label>
                {selectedPresetId && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Construir desde SVG</span>
                    <Switch
                      id="build-from-svg"
                      checked={buildFromSvg}
                      onCheckedChange={handleToggleBuildFromSvg}
                      aria-label="Construir desde SVG"
                      size="sm"
                    />
                  </div>
                )}
              </div>

              {buildFromSvg ? (
                <FileDrop
                  onFiles={onDropSvg}
                  onRejected={() => {
                    toast.error('Formato inválido. Solo se acepta .svg.');
                  }}
                  previewUrl={null}
                  uploading={false}
                  onClear={() => {
                    setSvgResult(null);
                    setSvgName(null);
                    setDepthMap({});
                    setSelectedHex(null);
                    o.setSvgText(null);
                  }}
                  className="text-xs"
                  accept={{ 'image/svg+xml': ['.svg'] }}
                  multiple={false}
                  formatsHint="SVG • máx. 10 MB"
                  ariaLabel="Cargar archivo SVG"
                />
              ) : (
                <FileDrop
                  onFiles={onDropImages}
                  previewUrl={textureUrl}
                  uploading={uploading}
                  onClear={() => {
                    setTextureUrl(null);
                    o.setTextureImageUrl(null);
                  }}
                  className="text-xs"
                  accept={{
                    'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.bmp'],
                  }}
                />
              )}

              {buildFromSvg && svgName ? (
                <p className="text-[11px] text-muted-foreground">Archivo: {svgName}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold tracking-wide text-foreground/80 flex">
                <Palette className="h-4 w-4 mr-1" /> COLORES
              </Label>
              <div className="flex gap-3">
                <div className="flex flex-col items-start gap-2">
                  <Label className="text-xs text-muted-foreground">Base</Label>
                  <ColorInput id="color-base" value={baseColor} onChange={setBaseColor} className="w-40" />
                </div>
                <div className="flex flex-col items-start gap-2">
                  <Label className="text-xs text-muted-foreground">Borde</Label>
                  <ColorInput id="color-border" value={borderColor} onChange={setBorderColor} className="w-40" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="custom-name"
                    className="text-xs font-bold tracking-wide text-foreground/80 flex"
                  >
                    <FileText className="h-4 w-4 mr-1" /> NOMBRE DEL MODELO
                  </Label>
                  <Input
                    id="custom-name"
                    value={o.customName}
                    onChange={(e) => o.setCustomName(e.target.value.slice(0, 30))}
                    placeholder="Ej: Llavero para campaña"
                    maxLength={30}
                    className="h-9 w-full rounded-xl border-2 border-border bg-background text-foreground px-3
                      focus-visible:ring-1 focus-visible:ring-[#0B4D67] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="text-[11px] text-muted-foreground">{o.customName.length}/30</p>
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
              </div>
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
            {buildFromSvg ? (
            <SvgPresetComposer
              kind={selectedPresetKind}
                baseColor={baseColor}
                borderColor={borderColor}
              result={svgResult}
              depthMap={depthMap}
              selectedHex={selectedHex}
              onDepthChange={(hex, v) => setDepthMap((prev) => ({ ...prev, [hex]: v }))}
              onSelectHex={setSelectedHex}
            />
          ) : (
            <PresetModelViewer
              kind={selectedPresetKind}
                textureUrl={textureUrl}
                baseColor={baseColor}
                borderColor={borderColor}
            />
          )}
        </div>
      </div>
    </div>
  );
}
