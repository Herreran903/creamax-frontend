'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ModelViewer } from '@/components/core/3d/model-viewer';
import { useActiveModel } from '@/stores/active-model';
import { Loader } from 'lucide-react';

export default function ActiveModelViewer({ className }: { className?: string }) {
  const { state, reset } = useActiveModel();

  const isReady = state.status === 'READY' && !!(state as any).data;
  const isLoading = state.status === 'LOADING' || state.status === 'VALIDATING';
  const isError = state.status === 'ERROR';
  const progress = isLoading && 'progress' in state ? ((state as any).progress ?? null) : null;

  const messages = [
    'Preparando escena…',
    'Procesando geometría…',
    'Suavizando malla…',
    'Texturizando…',
    'Empaquetando GLB…',
    'Ya casi está…',
  ];

  const [msgIdx, setMsgIdx] = React.useState(0);
  React.useEffect(() => {
    if (!isLoading) return;
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % messages.length), 1800);
    return () => clearInterval(id);
  }, [isLoading]);

  const currentMsg = messages[msgIdx];

  return (
    <div
      className={cn(
        'h-[70vh] relative overflow-hidden rounded-xl grid',
        'outline-4 outline-dashed outline-[#E5E5E5]',
        'bg-[#F2F2F2]',
        'bg-[radial-gradient(110%_80%_at_10%_10%,rgba(0,0,0,0.05),transparent),radial-gradient(110%_80%_at_90%_90%,rgba(0,0,0,0.05),transparent)]',
        className
      )}
    >
      {state.status === 'IDLE' && (
        <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
          Inicie el proceso para ver la vista previa aquí.
        </div>
      )}
      {isLoading && (
        <>
          <Loader className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 text-black/30 animate-spin" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
            <div className="rounded-xl bg-[#0B4D67] backdrop-blur-sm text-white px-3 py-2 w-fit max-w-full">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="inline-flex h-2 w-2 rounded-full bg-white animate-pulse" />
                <span className="truncate">{currentMsg}</span>
                {typeof progress === 'number' && (
                  <span className="ml-2 text-white/80">{Math.round(progress)}%</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      {isReady && (
        <>
          <ModelViewer
            className="h-full w-full"
            object={(state as any).data}
            autoRotate
            spinSpeed={0.6}
          />
        </>
      )}
      {isError && (
        <div className="absolute inset-0 grid place-items-center text-sm text-red-600">
          Ocurrió un error al cargar el modelo.
        </div>
      )}
    </div>
  );
}
