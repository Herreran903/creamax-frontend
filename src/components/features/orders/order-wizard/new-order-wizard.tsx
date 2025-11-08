'use client';
import * as React from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import ModelSourceTabs, { ModelSourceTab, SelectedMode } from './model-source-tabs';
import type { CustomConfirmationResponse } from '@/lib/api/custom-confirmation';
import { useTripoTask } from '@/hooks/use-tripo-task';
import { ArrowLeft, ArrowRight, CheckCircle2, Home } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useActiveModel } from '@/stores/active-model';
import { useOrder } from '@/hooks/use-order';
import QuoteReviewStep from './quote-review-step';
import Options from './options/options';
import { CheckoutSuccessStep } from './checkout-success-step';

function isValidUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function NewOrderWizard() {
  const r = useRouter();
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);

  const [activeTab, setActiveTab] = React.useState<ModelSourceTab>('presets');
  const [selectedMode, setSelectedMode] = React.useState<SelectedMode>('PRESETS');

  const [selectedPresetId, setSelectedPresetId] = React.useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = React.useState<string | null>(null);
  const [uploadedName, setUploadedName] = React.useState<string | null>(null);
  const [artisanDescription, setArtisanDescription] = React.useState('');
  const [artisanImageUrls, setArtisanImageUrls] = React.useState<string[]>([]);
  const [notes, setNotes] = React.useState('');
  // Validación del formulario del Paso 3 (Cotización)
  const [step3Valid, setStep3Valid] = React.useState(false);

  // Paso 4 (Checkout/Confirmación)
  const [submitCounter, setSubmitCounter] = React.useState(0);
  const [orderConfirmation, setOrderConfirmation] =
    React.useState<CustomConfirmationResponse | null>(null);

  // Paso 3 (Cotización) UI state
  const [quoteLoading, setQuoteLoading] = React.useState(false);
  const [quoteError, setQuoteError] = React.useState<string | null>(null);

  // mock toggle via query param ?mock=1
  const search = useSearchParams();
  const useMock = search?.get('mock') === '1';

  const { glbUrl: aiGlbUrl } = useTripoTask();
  const { state: amState } = useActiveModel();

  const canContinue = amState.status === 'READY' && !!(amState as any).data;

  // Step 2 validation: disable continue when NFC is enabled but URL is invalid
  const o = useOrder();
  const nfcInvalid = o.includeNfc && !isValidUrl(o.nfcUrl);

  // Build contract for /api/v1/custom/create (updated schema)
  const buildCreateContract = () => {
    // Determine fuente_modelo
    let fuente_modelo: 'ai' | '3d_upload' | 'texture_image' | 'svg';
    if (selectedMode === 'AI') fuente_modelo = 'ai';
    else if (selectedMode === 'UPLOAD3D') fuente_modelo = '3d_upload';
    else if (selectedMode === 'SVG') fuente_modelo = 'svg';
    else {
      // PRESETS/ARTESANAL: prefer SVG if present, else texture image
      if ((o as any).svgText) fuente_modelo = 'svg';
      else if ((o as any).textureImageUrl) fuente_modelo = 'texture_image';
      else fuente_modelo = 'texture_image';
    }

    // Helpers to compute model stats from ActiveModel (dimensions and UV info)
    const computeStatsFromActiveModel = () => {
      try {
        if (amState.status !== 'READY' || !(amState as any).data) {
          return {
            alto: null as number | null,
            ancho: null as number | null,
            profundidad: null as number | null,
            uv_map: null as
              | {
                  hasUV: boolean;
                  vertexCount: number;
                  triangleCount: number;
                  materialsCount?: number;
                  area?: number | null;
                  volumen?: number | null;
                }
              | null,
          };
        }
        const rootAny: any = (amState as any).data;
        const root: any = rootAny?.scene ?? rootAny;

        // Dimensions via bounding box
        const box = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        box.getSize(size);
        const alto = Number.isFinite(size.y) ? Number(size.y) : null;
        const ancho = Number.isFinite(size.x) ? Number(size.x) : null;
        const profundidad = Number.isFinite(size.z) ? Number(size.z) : null;

        let hasUV = false;
        let vertexCount = 0;
        let triangleCount = 0;
        const mats = new Set<string>();

        root.traverse?.((child: any) => {
          if (child?.isMesh && child.geometry) {
            const geo = child.geometry;
            const pos = geo.attributes?.position;
            const idx = geo.index;
            const uv = geo.attributes?.uv;
            if (uv) hasUV = true;
            const vCount = pos?.count ?? 0;
            vertexCount += vCount;
            const tri = idx?.count ? Math.floor(idx.count / 3) : Math.floor((vCount as number) / 3);
            triangleCount += tri;
            const m = child.material;
            if (Array.isArray(m)) {
              for (const mm of m) mats.add(mm?.uuid ?? mm?.id ?? `${mats.size}`);
            } else if (m) {
              mats.add(m.uuid ?? m.id ?? `${mats.size}`);
            }
          }
        });

        const uv_map = {
          hasUV,
          vertexCount,
          triangleCount,
          materialsCount: mats.size || undefined,
          area: null,
          volumen: null,
        };

        return { alto, ancho, profundidad, uv_map };
      } catch {
        return {
          alto: null as number | null,
          ancho: null as number | null,
          profundidad: null as number | null,
          uv_map: null as any,
        };
      }
    };

    const stats = computeStatsFromActiveModel();
    const isPreset = fuente_modelo === 'svg' || fuente_modelo === 'texture_image';

    // Model refs per new schema
    const modelo: any = {
      modelo_id: isPreset ? selectedPresetId : null,
      archivo: null as string | null,
      url: null as string | null,
      svg: null as string | null,
      textura_imagen: null as string | null,
      parametros_generacion_ai: null as
        | {
            text_prompt?: string;
            imagen_prompt?: any | null;
          }
        | null,
    };

    if (fuente_modelo === 'ai') {
      modelo.url = aiGlbUrl ? `/api/tripo/proxy?url=${encodeURIComponent(aiGlbUrl)}` : null;
      modelo.parametros_generacion_ai = {
        text_prompt: o.prompt || '',
        imagen_prompt: null,
      };
    } else if (fuente_modelo === '3d_upload') {
      // For 3D upload, we'll upload the binary and set modelo.archivo during requestQuote
      modelo.archivo = null;
      modelo.url = null;
    } else if (fuente_modelo === 'texture_image') {
      // presets with image texture
      modelo.textura_imagen = (o as any).textureImageUrl ?? null;
      modelo.url = null;
    } else if (fuente_modelo === 'svg') {
      // presets with svg
      modelo.svg = (o as any).svgText ?? null;
    }

    // Nombre personalizado (máx. 30 caracteres)
    const nombreRaw =
      (o as any).customName?.trim() ||
      (amState.meta?.name ?? null) ||
      (selectedPresetId ? `Preset ${selectedPresetId}` : null) ||
      'Llavero Personalizado';
    const nombre_personalizado = String(nombreRaw).slice(0, 30);

    // Parametros por nueva especificación
    const parametros = {
      color: null as string[] | null,
      alto: stats.alto,
      ancho: stats.ancho,
      profundidad: stats.profundidad,
      uv_map: stats.uv_map,
    };

    const contract = {
      fuente_modelo,
      nombre_personalizado,
      modelo,
      parametros,
    };

    return contract;
  };

  const requestQuote = React.useCallback(async () => {
    try {
      setQuoteError(null);
      setQuoteLoading(true);

      // Build base contract
      const contract: any = buildCreateContract();

      // If 3D upload, upload the local file blob and set modelo.archivo (backend-ready)
      if (contract.fuente_modelo === '3d_upload' && uploadedUrl) {
        try {
          const resp = await fetch(uploadedUrl);
          const blob = await resp.blob();
          // Name fallback and content-type for STL
          const fname = (uploadedName || 'modelo.stl').replace(/[^a-zA-Z0-9_.-]/g, '_');
          const type = blob.type || 'application/sla';
          // Ensure a File instance so filename is preserved server-side
          const file = new File([blob], fname, { type });
          const fd = new FormData();
          fd.append('file', file);

          const up = await fetch('/api/uploads', { method: 'POST', body: fd });
          const upData = await up.json();
          if (!up.ok || !upData?.url) {
            throw new Error(upData?.error || 'No se pudo subir el archivo 3D');
          }
          contract.modelo.archivo = upData.url;
          contract.modelo.url = null;
        } catch (err: any) {
          throw new Error(err?.message || 'No se pudo preparar el archivo 3D');
        }
      }

      // Send contract to backend
      const endpoint = '/api/v1/custom/create';
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contract),
      });
      const data = await r.json();
      if (!r.ok) {
        const msg =
          data?.error?.mensaje ||
          data?.message ||
          'Error solicitando cotización. Intenta nuevamente.';
        throw new Error(msg);
      }
      o.setQuoteResponse(data);
    } catch (e: any) {
      setQuoteError(e?.message || 'Error solicitando cotización.');
    } finally {
      setQuoteLoading(false);
    }
  }, [useMock, selectedMode, o, amState.meta, selectedPresetId, uploadedUrl, uploadedName]);

  const goNext = async () => {
    if (step === 1) {
      setSelectedMode(
        activeTab === 'artisanal'
          ? 'ARTESANAL'
          : activeTab === 'ai'
            ? 'AI'
            : activeTab === 'upload3d'
              ? 'UPLOAD3D'
              : activeTab === 'svg'
                ? 'SVG'
                : 'PRESETS'
      );
      setStep(2);
      return;
    }
    if (step === 2) {
      // Navigate to Step 3 and start quoting
      setStep(3);
      await requestQuote();
      return;
    }
    if (step === 3) {
      // Disparar confirmación del pedido (el componente de cotización escuchará este contador)
      setSubmitCounter((n) => n + 1);
      return;
    }
  };

  const goBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const primaryLabel = step === 3 ? 'Finalizar pedido' : 'Continuar';
  const PrimaryIcon = step === 3 ? CheckCircle2 : ArrowRight;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Stepper
          current={step}
          steps={[
            { label: 'Modelo', kind: 'cart' },
            { label: 'Opciones', kind: 'options' },
            { label: 'Cotización', kind: 'options' },
            { label: 'Checkout', kind: 'done' },
          ]}
          className="m-0"
        />
        <div className="flex items-center gap-2">
          <>
            {step > 1 && step < 4 && (
              <Button
                onClick={goBack}
                aria-label="Volver"
                className="
                    px-6 py-4
                    bg-white
                    rounded-xl
                    border-2 border-foreground/40 
                    text-foreground 
                    uppercase
                  "
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
                <span>Volver</span>
              </Button>
            )}
            {step < 4 && (
              <Button
                onClick={goNext}
                aria-label={primaryLabel}
                aria-disabled={(step === 1 && !canContinue) || (step === 2 && nfcInvalid)}
                title={
                  step === 1 && !canContinue
                    ? 'Primero elige/genera un modelo'
                    : step === 2 && nfcInvalid
                      ? 'Ingresa una URL NFC válida o desactiva NFC'
                      : undefined
                }
                disabled={
                  (step === 1 && !canContinue) ||
                  (step === 2 && nfcInvalid) ||
                  (step === 3 && !step3Valid)
                }
                className="
                  rounded-xl
                  px-6 py-4
                  text-base font-extrabold
                  text-white
                  bg-[#FF4D00]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  uppercase
                "
                variant="default"
              >
                <PrimaryIcon size={20} strokeWidth={step === 2 ? 3 : 5} />
                <span>{primaryLabel}</span>
              </Button>
            )}
          </>
        </div>
      </div>

      <div className="h-[calc(100%-60px)] h-max-[calc(100%-60px)]">
        {step === 1 && (
          <ModelSourceTabs
            value={activeTab}
            onValueChange={setActiveTab}
            selectedMode={selectedMode}
            setSelectedMode={setSelectedMode}
            selectedPresetId={selectedPresetId}
            setSelectedPresetId={setSelectedPresetId}
            uploadedUrl={uploadedUrl}
            setUploadedUrl={setUploadedUrl}
            uploadedName={uploadedName}
            setUploadedName={setUploadedName}
            artisanDescription={artisanDescription}
            setArtisanDescription={setArtisanDescription}
            artisanImageUrls={artisanImageUrls}
            setArtisanImageUrls={setArtisanImageUrls}
          />
        )}

        {step === 2 && (
          <Options
            selectedMode={selectedMode}
            selectedPresetId={selectedPresetId}
            uploadedUrl={uploadedUrl}
            aiGlbUrl={aiGlbUrl}
            notes={notes}
            setNotes={setNotes}
            onBack={() => setStep(1)}
            onFinish={async (payload) => {
              await fetch('/api/orders', { method: 'POST', body: JSON.stringify(payload) });
              setStep(3);
            }}
          />
        )}

        {step === 3 && (
          <QuoteReviewStep
            selectedMode={selectedMode}
            quote={o.quoteResponse}
            defaultQuantity={o.quantity}
            notes={notes}
            onNotesChange={setNotes}
            onBack={() => setStep(2)}
            loading={quoteLoading}
            error={quoteError}
            onRetry={() => {
              setQuoteError(null);
              void requestQuote();
            }}
            requestSubmit={submitCounter}
            onOrderConfirmed={(resp) => {
              setOrderConfirmation(resp);
              setStep(4);
            }}
            onConfirm={async (_data) => {
              // Mantener compatibilidad, pero el cambio de step ocurre en onOrderConfirmed
            }}
            onValidityChange={setStep3Valid}
          />
        )}

        {step === 4 && <CheckoutSuccessStep />}
      </div>
    </>
  );
}
