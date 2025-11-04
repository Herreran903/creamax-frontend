'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ModelViewer } from '@/components/core/3d/model-viewer';
import { Loader } from 'lucide-react';

type PreviewState = 'idle' | 'loading' | 'ready';

export interface PreviewStageProps {
  state: PreviewState;
  className?: string;
  glbUrl?: string | null;
  imageUrl?: string | null;
  progress?: number | null;
  messages?: string[];
  messageIntervalMs?: number;
}

export function PreviewStage({
  state,
  className,
  glbUrl,
  imageUrl,
  progress = null,
  messages = [
    'Preparando escena…',
    'Procesando geometría…',
    'Suavizando malla…',
    'Texturizando…',
    'Empaquetando GLB…',
    'Ya casi está…',
  ],
  messageIntervalMs = 1800,
}: PreviewStageProps) {
  const [msgIdx, setMsgIdx] = React.useState(0);
  React.useEffect(() => {
    if (state !== 'loading' || messages.length === 0) return;
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % messages.length), messageIntervalMs);
    return () => clearInterval(id);
  }, [state, messages, messageIntervalMs]);

  return (
    <div
      className={cn(
        'h-[70vh] relative overflow-hidden rounded-xl grid bg-[#F2F2F2]',
        'outline-4 outline-dashed outline-[#E5E5E5]',
        'bg-[radial-gradient(110%_80%_at_10%_10%,rgba(0,0,0,0.05),transparent),radial-gradient(110%_80%_at_90%_90%,rgba(0,0,0,0.05),transparent)]',
        className
      )}
    >
      {state === 'idle' && (
        <div>
          <span className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            Inicie el proceso para ver la vista previa aquí.
          </span>
        </div>
      )}

      {state === 'loading' && (
        <>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="preview"
              className="absolute inset-0 w-full h-full object-contain opacity-30"
            />
          ) : null}
          <div>
            <Loader className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 text-black/30 animate-spin" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
            <div className="rounded-xl bg-[#0B4D67] backdrop-blur-sm text-white px-3 py-2 w-fit max-w-full">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="inline-flex h-2 w-2 rounded-full bg-white animate-pulse" />
                <span className="truncate">{messages[msgIdx]}</span>
                {typeof progress === 'number' && (
                  <span className="ml-2 text-white/80">{Math.round(progress)}%</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {state === 'ready' && (
        <>
          {glbUrl ? (
            <ModelViewer
              key={glbUrl}
              src={glbUrl}
              className="h-full w-full"
              autoRotate
              spinSpeed={0.6}
            />
          ) : imageUrl ? (
            <img
              key={imageUrl}
              src={imageUrl}
              alt="resultado"
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <div>
              <span className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                No se ha proporcionado ningún GLB o imagen para previsualizar.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
