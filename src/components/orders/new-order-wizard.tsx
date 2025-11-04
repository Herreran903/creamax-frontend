'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import ModelSourceTabs, { ModelSourceTab, SelectedMode } from './model-source-tabs';
import OptionsAndQuote from './options-and-quote';
import FinalStep from './final-step';
import { useTripoTask } from '@/hooks/use-tripo-task';
import { ArrowLeft, ArrowRight, CheckCircle2, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NewOrderWizard() {
  const r = useRouter();
  const [step, setStep] = React.useState<1 | 2 | 3>(1);

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

  const canContinue =
    activeTab === 'ai'
      ? Boolean(aiGlbUrl)
      : activeTab === 'upload3d'
        ? Boolean(uploadedUrl)
        : activeTab === 'artisanal'
          ? artisanDescription.trim().length >= 10 || artisanImageUrls.length > 0
          : activeTab === 'svg'
            ? svgReady
            : Boolean(selectedPresetId);

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
            { label: 'Elegir/Generar modelo', kind: 'cart' },
            { label: 'Elegir Opciones', kind: 'options' },
            { label: 'Realizar Checkout', kind: 'done' },
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
              disabled={step === 1 && !canContinue}
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
        <OptionsAndQuote
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

      {step === 3 && <FinalStep />}
    </>
  );
}
