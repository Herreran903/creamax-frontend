'use client';
import * as React from 'react';
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

  // Build unified contract (version 1.0) for /api/v1/custom/create
  const buildCreateContract = () => {
    // Determine fuente_modelo
    let fuente_modelo: 'ai' | '3d_upload' | 'texture_image' | 'svg';
    if (selectedMode === 'AI') fuente_modelo = 'ai';
    else if (selectedMode === 'UPLOAD3D') fuente_modelo = '3d_upload';
    else if (selectedMode === 'SVG') fuente_modelo = 'svg';
    else {
      // PRESETS/ARTESANAL: prefer SVG if present, else texture image, else fallback to texture_image
      if ((o as any).svgText) fuente_modelo = 'svg';
      else if ((o as any).textureImageUrl) fuente_modelo = 'texture_image';
      else fuente_modelo = 'texture_image';
    }

    // Model refs
    const modelo: any = {
      modelo_id: null,
      archivo_id: null,
      url: null as string | null,
      svg: null as string | null,
      textura_imagen_id: null as string | null,
      parametros_generacion_ai: null as any,
      thumbnail_url: null as string | null,
    };

    // Try to provide best available reference (use local wizard state where applicable)
    if (fuente_modelo === 'ai') {
      modelo.url = aiGlbUrl ? `/api/tripo/proxy?url=${encodeURIComponent(aiGlbUrl)}` : null;
      modelo.parametros_generacion_ai = {
        prompt: o.prompt || '',
        semilla: null,
        variacion: null,
        motor: 'shape-gen-v1',
      };
    } else if (fuente_modelo === '3d_upload') {
      modelo.url = uploadedUrl ?? null;
    } else if (fuente_modelo === 'texture_image') {
      // we only have a local object URL; include it as url reference
      modelo.textura_imagen_id = null;
      modelo.url = (o as any).textureImageUrl ?? null;
    } else if (fuente_modelo === 'svg') {
      modelo.svg = (o as any).svgText ?? null;
    }

    // Nombre personalizado heurístico
    const nombre_personalizado =
      (o as any).uploadedName ||
      (amState.meta?.name ?? null) ||
      (selectedPresetId ? `Preset ${selectedPresetId}` : null) ||
      'Llavero Personalizado';

    const parametros = {
      material: 'PLA',
      color: '#FF4D4F',
      acabado: 'mate',
      dimension_unidad: 'mm',
      alto: 50,
      ancho: 30,
      profundidad: 5,
      escala: 1.0,
      cantidad: o.quantity || 50,
      complejidad_estimacion: 'media',
      tolerancia: 'estandar',
      espesor_minimo: 1.2,
      // Opcionales si aplica textura
      uv_map: undefined,
      textura_escala: undefined,
    };

    const metadatos = {
      app_version: 'web@1.2.3',
      locale: 'es-CL',
      dispositivo: 'desktop',
      referer: 'paso_2',
    };

    const contract = {
      version: '1.0',
      fuente_modelo,
      nombre_personalizado,
      usuario_id: 'usr_anon',
      modelo,
      parametros,
      metadatos,
    };

    return contract;
  };

  const requestQuote = React.useCallback(async () => {
    try {
      setQuoteError(null);
      setQuoteLoading(true);
      const contract = buildCreateContract();
      const endpoint = useMock ? '/mock/api/v1/custom/create' : '/api/v1/custom/create';
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
  }, [useMock, selectedMode, o, amState.meta, selectedPresetId]);

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
