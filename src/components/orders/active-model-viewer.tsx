'use client';

import { ModelViewer } from '@/components/core/3d/model-viewer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useActiveModel } from '@/stores/active-model';

type Props = {
  className?: string;
};

export default function ActiveModelViewer({ className }: Props) {
  const { state, reset } = useActiveModel();

  const isReady = state.status === 'READY' && !!(state as any).data;
  const progress =
    (state.status === 'LOADING' || state.status === 'VALIDATING') && 'progress' in state
      ? ((state as any).progress ?? null)
      : null;

  const microStatus =
    state.status === 'READY'
      ? 'LISTO'
      : state.status === 'LOADING'
        ? 'CARGANDO'
        : state.status === 'VALIDATING'
          ? 'VALIDANDO'
          : state.status === 'ERROR'
            ? 'ERROR'
            : 'IDLE';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-[#F2F2F2]',
        'min-h-[46vh] md:min-h-[56vh]',
        className
      )}
    >
      <ModelViewer
        className="h-[46vh] md:h-[56vh]"
        object={isReady ? (state as any).data : undefined}
        src={undefined}
        autoRotate
        spinSpeed={0.6}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 p-3 flex items-end justify-between"
        aria-live="polite"
        role="status"
      >
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-lg bg-black/60 text-white px-3 py-1.5 text-xs">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
          <span className="font-semibold tracking-wide">{microStatus}</span>
          {typeof progress === 'number' ? (
            <span className="ml-1 text-white/80">({Math.round(progress)}%)</span>
          ) : null}
          {state.status === 'ERROR' && (state as any).error ? (
            <span className="ml-2 line-clamp-1 max-w-[38ch] text-red-200">
              {(state as any).error}
            </span>
          ) : null}
        </div>

        <div className="pointer-events-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            className="rounded-lg bg-white/85 backdrop-blur-md"
            aria-label="Resetear modelo activo"
            title="Descartar modelo activo"
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
