'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FileDrop } from '@/components/core/forms/file-drop';
import { ModelViewer } from '@/components/core/3d/model-viewer';
import { Hammer, Image, Image as ImageIcon, TextInitial, Trash2 } from 'lucide-react';
import { useTripoTask, MAX_WAIT_MS as MAX_WAIT_MS_EXPORT } from '@/hooks/use-tripo-task';
import { Label } from '@/components/ui/label';
import { StatusPanel } from '@/components/status-panel';
import { PreviewStage } from '@/components/preview-stage';

export type AiTabProps = {};

export default function AiTab(_props: AiTabProps) {
  const [prompt, setPrompt] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [aiArtisan, setAiArtisan] = React.useState(false);
  const [aiArtisanNotes, setAiArtisanNotes] = React.useState('');
  const [uploading, setUploading] = React.useState(false);

  const { taskId, status, progress, previewUrl, glbUrl, error, createTask } = useTripoTask();
  const MAX_WAIT_MS = MAX_WAIT_MS_EXPORT;

  const onDropImages = async (files: File[]) => {
    if (!files?.length) return;
    const f = files[0];
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', f);
      const res = await fetch('/api/uploads', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error subiendo imagen');
      setImageUrl(data.url);
      setImagePreview(URL.createObjectURL(f));
    } catch (e) {
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    setImageUrl('');
    setImagePreview(null);
  };

  const dropPreview = imagePreview ?? (imageUrl ? imageUrl : null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <div className="rounded-xl border-2 border-border bg-white p-4 h-full space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="ai-prompt"
                className="text-xs font-bold tracking-wide text-foreground/80 flex"
              >
                <TextInitial className="h-4 w-4 mr-1" size={12} />
                DESCRIPCIÓN
              </Label>
              <Textarea
                id="ai-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe el objeto (p. ej., robot juguete low-poly, auto deportivo rojo low-poly)"
                rows={2}
                spellCheck
                className="resize-none rounded-xl border-2 border-border bg-background text-foreground
               focus-visible:ring-1 focus-visible:ring-[#0B4D67]"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="ai-prompt"
                className="text-xs font-bold tracking-wide text-foreground/80 flex"
              >
                <Image className="h-4 w-4 mr-1" size={12} />
                IMAGEN DE REFERENCIA (OPCIONAL)
              </Label>
              <FileDrop
                onFiles={onDropImages}
                previewUrl={dropPreview}
                uploading={uploading}
                onClear={clearImage}
                className="text-xs"
              />
            </div>
            {/* <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch checked={aiArtisan} onCheckedChange={setAiArtisan} />
                <Label
                  htmlFor="ai-prompt"
                  className="text-xs font-bold tracking-wide text-foreground/80 flex"
                >
                  QUIERO REVISION ARTESANAL (+ COSTO)
                </Label>
              </div>
              {aiArtisan && (
                <div className="space-y-2">
                  <Textarea
                    value={aiArtisanNotes}
                    onChange={(e) => setAiArtisanNotes(e.target.value)}
                    placeholder="Ej. aumentar grosor, cambiar anilla, suavizar bordes, etc."
                    rows={3}
                    spellCheck
                    className="resize-none rounded-xl border-2 border-border bg-background text-foreground
                   focus-visible:ring-1 focus-visible:ring-[#0B4D67]"
                  />
                </div>
              )}
            </div> */}
            <Button
              onClick={() => createTask(prompt, imageUrl)}
              className="
                rounded-xl
                px-5 py-5
                text-base font-extrabold
                text-white
                bg-[#FF4D00]
                w-full
            "
            >
              <Hammer size={20} strokeWidth={3} />
              GENERAR
            </Button>

            <StatusPanel
              status={status}
              progress={progress ?? null}
              error={error ?? null}
              taskId={taskId ?? null}
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <PreviewStage
            state={
              glbUrl ? 'ready' : status === 'RUNNING' || status === 'PENDING' ? 'loading' : 'idle'
            }
            glbUrl={glbUrl ? `/api/tripo/proxy?url=${encodeURIComponent(glbUrl)}` : null}
            imageUrl={previewUrl || null}
            progress={typeof progress === 'number' ? progress : null}
            messages={[
              'Preparando escena…',
              'Procesando geometría…',
              'Suavizando malla…',
              'Texturizando…',
              'Empaquetando GLB…',
              'Ya casi está…',
            ]}
          />
        </div>
      </div>
    </div>
  );
}
