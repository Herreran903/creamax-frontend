'use client';
import { SelectedMode } from '@/domain/types';
import OptionsAIUpload from './options-ai-upload';
import OptionsPresets from './options-presets';

export type QuoteData = {
  amount: number;
  currency: string;
  estimateDays: number;
  modelOnly?: boolean;
};

export type OptionsProps = {
  selectedMode: SelectedMode;
  selectedPresetId: string | null;
  selectedPresetKind?: 'square' | 'rect' | 'circle';
  uploadedUrl: string | null;
  aiGlbUrl: string | null;
  notes: string;
  setNotes: (s: string) => void;
  onBack: () => void;
  onFinish: (payload: any) => Promise<void>;
};

export default function Options(props: OptionsProps) {
  const { selectedMode } = props;

  return (
    <div className="h-full pt-4">
      {(() => {
        switch (selectedMode) {
          case 'AI':
          case 'UPLOAD3D':
            return (
              <OptionsAIUpload
                selectedMode={props.selectedMode}
                selectedPresetId={props.selectedPresetId}
                uploadedUrl={props.uploadedUrl}
                aiGlbUrl={props.aiGlbUrl}
                notes={props.notes}
                setNotes={props.setNotes}
                onBack={props.onBack}
                onFinish={props.onFinish}
              />
            );
          case 'PRESETS':
            return (
              <OptionsPresets
                selectedMode={props.selectedMode}
                selectedPresetId={props.selectedPresetId}
                selectedPresetKind={
                  props.selectedPresetId as 'square' | 'rect' | 'circle' | undefined
                }
                notes={props.notes}
                setNotes={props.setNotes}
                onBack={props.onBack}
                onFinish={props.onFinish}
              />
            );
          default:
            return (
              <div className="h-full grid place-items-center">
                <p className="text-sm text-muted-foreground">
                  Opciones no disponibles para el modo seleccionado.
                </p>
              </div>
            );
        }
      })()}
    </div>
  );
}
