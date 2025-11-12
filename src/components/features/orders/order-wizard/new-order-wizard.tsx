'use client';
import * as React from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import ModelSourceTabs, { ModelSourceTab, SelectedMode, PRESETS } from './model-source-tabs';
import type { CustomConfirmationResponse } from '@/lib/api/custom-confirmation';
import { useTripoTask } from '@/hooks/use-tripo-task';
import { ArrowLeft, ArrowRight, CheckCircle2, Home } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useActiveModel } from '@/stores/active-model';
import { useOrder } from '@/hooks/use-order';
import QuoteReviewStep from './quote-review-step';
import Options from './options/options';
import { CheckoutSuccessStep } from './checkout-success-step';
import { normalizeSceneForExport, exportGroupTo3mf } from '@/lib/threeExportHelpers';
import { loadFileToGroup } from '@/lib/loaderHelpers';
import { uploadToTransferSh } from '@/lib/uploadTransferSh';

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
            uv_map: null as {
              hasUV: boolean;
              vertexCount: number;
              triangleCount: number;
              materialsCount?: number;
              area?: number | null;
              volumen?: number | null;
            } | null,
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

    const selectedPreset = PRESETS.find((p) => p.id === selectedPresetId);
    const basePrice = isPreset && selectedPreset ? selectedPreset.price : 10000;

    // Model refs per new schema
    const modelo: any = {
      modelo_id: isPreset ? selectedPresetId : null,
      archivo: null as string | null,
      url: null as string | null,
      svg: null as string | null,
      textura_imagen: null as string | null,
      parametros_generacion_ai: null as {
        text_prompt?: string;
        imagen_prompt?: any | null;
      } | null,
      precio_base: basePrice,
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
      color: [String((o as any).baseColor ?? ''), String((o as any).borderColor ?? '')].filter(
        (c) => c !== ''
      ),
      alto: stats.alto,
      ancho: stats.ancho,
      profundidad: stats.profundidad,
      uv_map: stats.uv_map,
      // NFC: incluir flag y URL del pedido
      include_nfc: Boolean(o.includeNfc),
      nfc_url: String(o.nfcUrl ?? ''),
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

      // eslint-disable-next-line no-console
      console.log('[requestQuote] Starting quote request, fuente_modelo:', contract.fuente_modelo);
      // eslint-disable-next-line no-console
      console.log('[requestQuote] amState.data available:', !!(amState as any).data);
      // eslint-disable-next-line no-console
      console.log('[requestQuote] amState.data:', (amState as any).data);

      // Export 3MF and upload to transfer.sh for ALL flows
      try {
        let group: THREE.Group | null = null;

        if (contract.fuente_modelo === '3d_upload' && uploadedUrl) {
          // Load STL file from uploadedUrl (blob URL)
          // eslint-disable-next-line no-console
          console.log('[requestQuote] Loading 3D file from uploadedUrl:', uploadedUrl);
          const resp = await fetch(uploadedUrl);
          const blob = await resp.blob();
          const file = new File([blob], uploadedName || 'model.stl', { type: blob.type });
          group = await loadFileToGroup(file);
          // eslint-disable-next-line no-console
          console.log('[requestQuote] Loaded 3D upload file to Group:', group);
        } else if (contract.fuente_modelo === 'ai') {
          // Use the active model (preview group) from amState for AI
          if ((amState as any).data) {
            group = (amState as any).data as THREE.Group;
            // eslint-disable-next-line no-console
            console.log('[requestQuote] Using active model group (AI):', group);
          } else {
            // eslint-disable-next-line no-console
            console.warn('[requestQuote] No amState.data for AI');
          }
        } else if (contract.fuente_modelo === 'texture_image') {
          // For texture_image (presets), try amState first, fallback to creating a simple model
          if ((amState as any).data) {
            group = (amState as any).data as THREE.Group;
            // eslint-disable-next-line no-console
            console.log('[requestQuote] Using active model group (texture_image):', group);
          } else {
            // Fallback: Create a simple box model as placeholder
            // eslint-disable-next-line no-console
            console.log('[requestQuote] Creating fallback box model for preset (no amState.data available)');
            try {
              const geometry = new THREE.BoxGeometry(1, 1, 0.1);
              const material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
              const mesh = new THREE.Mesh(geometry, material);
              group = new THREE.Group();
              group.add(mesh);
              // eslint-disable-next-line no-console
              console.log('[requestQuote] Created fallback box model');
            } catch (e) {
              // eslint-disable-next-line no-console
              console.warn('[requestQuote] Could not create fallback model, will still export an empty group');
            }
            // Ensure group is not null so export path executes; export of an empty group yields a tiny 3MF
            if (!group) {
              group = new THREE.Group();
              // eslint-disable-next-line no-console
              console.warn('[requestQuote] Created empty THREE.Group fallback for texture_image');
            }
          }
        } else if (contract.fuente_modelo === 'svg') {
          // For SVG, try to get the 3D model from amState (SVG extruder generates one)
          if ((amState as any).data) {
            group = (amState as any).data as THREE.Group;
            // eslint-disable-next-line no-console
            console.log('[requestQuote] Using active model group (SVG extruded):', group);
          } else {
            // eslint-disable-next-line no-console
            console.warn('[requestQuote] No amState.data for SVG, creating fallback');
            // Fallback: Create a simple placeholder
            try {
              const geometry = new THREE.BoxGeometry(1, 1, 0.1);
              const material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
              const mesh = new THREE.Mesh(geometry, material);
              group = new THREE.Group();
              group.add(mesh);
              // eslint-disable-next-line no-console
              console.log('[requestQuote] Created fallback box model for SVG');
            } catch (e) {
              // eslint-disable-next-line no-console
              console.warn('[requestQuote] Could not create fallback model for SVG, will still export an empty group');
            }
            // Ensure group is not null so export path executes; export of an empty group yields a tiny 3MF
            if (!group) {
              group = new THREE.Group();
              // eslint-disable-next-line no-console
              console.warn('[requestQuote] Created empty THREE.Group fallback for SVG');
            }
          }
        }

        if (group) {
          // eslint-disable-next-line no-console
          console.log('[requestQuote] group is NOT null, proceeding with export');
          try {
            // Normalize the group for export
            const normalized = normalizeSceneForExport(group, { scaleToMm: true });
            // eslint-disable-next-line no-console
            console.log('[requestQuote] Normalized group for export');

            // Export to 3MF blob
            const blob3mf = await exportGroupTo3mf(normalized);
            // eslint-disable-next-line no-console
            console.log('[requestQuote] Exported to 3MF, blob size:', blob3mf.size, 'bytes');

            // Check size limit
            const maxMb = Number(process.env.NEXT_PUBLIC_MAX_3MF_MB ?? 100);
            const maxBytes = maxMb * 1024 * 1024;
            if (blob3mf.size > maxBytes) {
              throw new Error(
                `Archivo 3MF (${Math.round(blob3mf.size / (1024 * 1024))} MB) excede el límite de ${maxMb} MB`
              );
            }

            // Upload to transfer.sh
            // Choose extension based on blob MIME type (fallback to STL if exporter missing)
            const blob = blob3mf;
            let ext = '3mf';
            try {
              const t = blob.type || '';
              if (t.includes('stl')) ext = 'stl';
              else if (t.includes('3mf')) ext = '3mf';
            } catch (e) {
              // keep default
            }

            const filename =
              contract.fuente_modelo === '3d_upload' && uploadedName
                ? uploadedName.replace(/\.[^/.]+$/, '') + `.${ext}`
                : `model_${Date.now()}.${ext}`;

            // eslint-disable-next-line no-console
            console.log('[requestQuote] Uploading to transfer.sh as:', filename, 'blob.type=', blob.type);
            const transferUrl = await uploadToTransferSh(blob, filename);

            // eslint-disable-next-line no-console
            console.log('[requestQuote] ✅ 3MF uploaded to transfer.sh:', transferUrl);

            // Set the URL in the contract based on fuente_modelo
            if (contract.fuente_modelo === '3d_upload') {
              contract.modelo.url = transferUrl;
              // eslint-disable-next-line no-console
              console.log('[requestQuote] Set modelo.url (3d_upload) to:', transferUrl);
            } else if (contract.fuente_modelo === 'ai') {
              contract.modelo.model_url = transferUrl;
              // eslint-disable-next-line no-console
              console.log('[requestQuote] Set modelo.model_url (ai) to:', transferUrl);
            } else if (contract.fuente_modelo === 'texture_image') {
              contract.modelo.model_url = transferUrl;
              // eslint-disable-next-line no-console
              console.log('[requestQuote] Set modelo.model_url (texture_image) to:', transferUrl);
            } else if (contract.fuente_modelo === 'svg') {
              contract.modelo.model_url = transferUrl;
              // eslint-disable-next-line no-console
              console.log('[requestQuote] Set modelo.model_url (svg) to:', transferUrl);
            }
          } catch (exportErr: any) {
            // eslint-disable-next-line no-console
            console.error('[requestQuote] Error during 3MF export/upload:', exportErr);
            // For presets and SVG, don't hard-fail if export fails - gracefully proceed
            if (contract.fuente_modelo === 'ai' || contract.fuente_modelo === '3d_upload') {
              throw new Error(exportErr?.message || 'Error al exportar/subir modelo 3MF');
            }
            // eslint-disable-next-line no-console
            console.warn('[requestQuote] Proceeding without 3MF export due to error');
          }
        } else {
          // eslint-disable-next-line no-console
          console.warn('[requestQuote] ⚠️ group is NULL! No export will happen');
          // For AI and 3D uploads, this is critical; for others, we can proceed
          if (contract.fuente_modelo === 'ai' || contract.fuente_modelo === '3d_upload') {
            throw new Error('No se pudo obtener el modelo 3D para exportar');
          }
        }
      } catch (exportErr: any) {
        // eslint-disable-next-line no-console
        console.error('[requestQuote] Error during model preparation:', exportErr);
        // Only throw for critical flows
        if (exportErr?.message && (exportErr.message.includes('No se pudo obtener') || exportErr.message.includes('excede el límite'))) {
          throw exportErr;
        }
        // eslint-disable-next-line no-console
        console.warn('[requestQuote] Continuing despite export error:', exportErr?.message);
      }

      // eslint-disable-next-line no-console
      console.log('[requestQuote] Final contract before POST:', JSON.stringify(contract, null, 2));

      // Send contract to backend
      const endpoint = '/api/v1/custom/create';
      // eslint-disable-next-line no-console
      console.log('[requestQuote] Sending POST to', endpoint);

      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contract),
      });
      const data = await r.json();

      // eslint-disable-next-line no-console
      console.log('[requestQuote] Response status:', r.status, 'data:', data);

      if (!r.ok) {
        const msg =
          data?.error?.mensaje ||
          data?.message ||
          'Error solicitando cotización. Intenta nuevamente.';
        throw new Error(msg);
      }
      o.setQuoteResponse(data);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('[requestQuote] Error:', e);
      setQuoteError(e?.message || 'Error solicitando cotización.');
    } finally {
      setQuoteLoading(false);
    }
  }, [useMock, selectedMode, o, amState.meta, amState.data, selectedPresetId, uploadedUrl, uploadedName]);

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
