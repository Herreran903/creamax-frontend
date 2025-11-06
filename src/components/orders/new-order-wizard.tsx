'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import ModelSourceTabs, { ModelSourceTab, SelectedMode } from './model-source-tabs';
import FinalStep from './final-step';
import { useTripoTask } from '@/hooks/use-tripo-task';
import { ArrowLeft, ArrowRight, CheckCircle2, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActiveModel } from '@/stores/active-model';
import { useOrder } from '@/hooks/use-order';
import QuoteReviewStep from './quote-review-step';
import Options from './options';

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
  const [svgReady, setSvgReady] = React.useState(false);

  const { glbUrl: aiGlbUrl } = useTripoTask();
  const { state: amState } = useActiveModel();

  const canContinue = amState.status === 'READY' && !!(amState as any).data;

  // Step 2 validation: disable continue when NFC is enabled but URL is invalid
  const { includeNfc, nfcUrl } = useOrder();
  const nfcInvalid = includeNfc && !isValidUrl(nfcUrl);

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
      setStep(3);
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
            {step > 1 && (
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
              disabled={(step === 1 && !canContinue) || (step === 2 && nfcInvalid)}
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
            onSvgReadyChange={setSvgReady}
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
            quote={null}
            defaultQuantity={50}
            notes={notes}
            onNotesChange={setNotes}
            onBack={() => setStep(2)}
            onConfirm={async (data) => {
              setStep(4);
            }}
          />
        )}

        {step === 4 && <FinalStep />}
      </div>
    </>
  );
}
