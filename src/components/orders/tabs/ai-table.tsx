'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileDrop } from '@/components/core/forms/file-drop';
import { Hammer, Image, TextInitial } from 'lucide-react';
import { useTripoTask, MAX_WAIT_MS as MAX_WAIT_MS_EXPORT } from '@/hooks/use-tripo-task';
import { Label } from '@/components/ui/label';
import { StatusPanel } from '@/components/status-panel';
import { PreviewStage } from '@/components/preview-stage';
import { useActiveModel } from '@/stores/active-model';
import { GLTFLoader } from 'three-stdlib';
import * as THREE from 'three';

export type AiTabProps = {};

export default function AiTab(_props: AiTabProps) {
  const [prompt, setPrompt] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const { taskId, status, progress, previewUrl, glbUrl, error, createTask } = useTripoTask();
  const MAX_WAIT_MS = MAX_WAIT_MS_EXPORT;

  const { setLoading, setProgress: setAMProgress, setReady, setError } = useActiveModel();

  const didEmitRef = React.useRef(false);

  const canGenerate = React.useMemo(
    () => prompt.trim().length > 0 || !!(imageUrl || imagePreview),
    [prompt, imageUrl, imagePreview]
  );
  const onGenerate = React.useCallback(async () => {
    if (!canGenerate) {
      return;
    }

    didEmitRef.current = false;
    setLoading({
      source: 'ai',
      format: 'glb',
      name: 'Modelo IA',
      createdAt: Date.now(),
    });

    await createTask(prompt.trim(), { imageUrl });
  }, [canGenerate, createTask, imageUrl, prompt, setLoading]);

  React.useEffect(() => {
    if (status === 'RUNNING' || status === 'PENDING') {
      if (typeof progress === 'number') setAMProgress(progress);
    } else if (status === 'FAILED') {
      setError(error || 'La generación con IA falló. Intenta nuevamente.', {
        source: 'ai',
        format: 'glb',
        createdAt: Date.now(),
      });
    }
  }, [status, progress, error, setAMProgress, setError]);

  React.useEffect(() => {
    const loadAndSet = async () => {
      if (!glbUrl || didEmitRef.current) return;
      try {
        const proxied = `/api/tripo/proxy?url=${encodeURIComponent(glbUrl)}`;
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(proxied);

        let triangles = 0;
        let materials = 0;
        gltf.scene.traverse((obj: any) => {
          if (obj.isMesh) {
            const g = obj.geometry as THREE.BufferGeometry;
            if (g) {
              const index = g.getIndex();
              const pos = g.getAttribute('position');
              if (index) triangles += index.count / 3;
              else if (pos) triangles += pos.count / 3;
            }
            if (obj.material) {
              if (Array.isArray(obj.material)) materials += obj.material.length;
              else materials += 1;
            }
          }
        });

        setReady(gltf, {
          name: 'Modelo IA',
          format: 'glb',
          triangles,
          materials,
          sizeMB: undefined,
          source: 'ai',
          createdAt: Date.now(),
        });
        didEmitRef.current = true;
      } catch (e) {
        setError('No se pudo cargar el modelo generado por IA.', {
          source: 'ai',
          format: 'glb',
          createdAt: Date.now(),
        });
      }
    };
    void loadAndSet();
  }, [glbUrl, setReady, setError]);

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
      setImageUrl('');
      setImagePreview(null);
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
              {!canGenerate && (
                <p id="ia-helper" aria-live="polite" className="mt-1 text-xs text-muted-foreground">
                  Agrega una imagen, o escribe una descripción (o ambas) para continuar.
                </p>
              )}
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
            <Button
              onClick={onGenerate}
              aria-disabled={!canGenerate}
              aria-describedby={!canGenerate ? 'ia-helper' : undefined}
              title={
                !canGenerate
                  ? 'Agrega una imagen, o escribe una descripción (o ambas) para continuar.'
                  : undefined
              }
              disabled={!canGenerate}
              className="
                rounded-xl
                px-5 py-5
                text-base font-extrabold
                text-white
                bg-[#FF4D00]
                w-full
                disabled:opacity-50 disabled:cursor-not-allowed
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4D67]
            "
            >
              <Hammer size={20} strokeWidth={3} />
              GENERAR CON IA
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
