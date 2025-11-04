import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, AlertCircle, Clock, Copy } from 'lucide-react';

export function StatusPanel({
  status,
  progress,
  error,
  taskId,
}: {
  status?: string | null;
  progress?: number | null;
  error?: string | null;
  taskId?: string | null;
}) {
  const isWorking = status === 'PENDING' || status === 'RUNNING';
  const isDone = status === 'SUCCEEDED' || status === 'COMPLETED';
  const isIdle = !status && !error && !taskId;
  const showProgress = typeof progress === 'number' && isWorking;

  const tone = isWorking
    ? 'bg-amber-500/10 border-amber-500/30'
    : isDone
      ? 'bg-emerald-500/10 border-emerald-500/30'
      : error
        ? 'bg-red-500/10 border-red-500/30'
        : 'bg-muted/40 border-border';

  const title = isWorking
    ? 'Generando modelo...'
    : isDone
      ? '¡Listo!'
      : error
        ? 'Ocurrió un error'
        : 'Sin tarea en curso';

  const Icon = isWorking ? Loader2 : isDone ? CheckCircle2 : error ? AlertCircle : Clock;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-3 ${tone} space-y-2`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <Icon className={isWorking ? 'animate-spin' : ''} size={18} />
        <div className="text-sm font-semibold">{title}</div>
      </div>

      {showProgress && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Progreso</span>
            <span>{Math.max(0, Math.min(100, progress!))}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(0, Math.min(100, progress!))}%` }}
              transition={{ type: 'spring', stiffness: 140, damping: 20 }}
              className={`h-full rounded-full ${
                progress! >= 100 ? 'bg-emerald-500' : 'bg-linear-to-r from-amber-400 to-amber-600'
              }`}
            />
          </div>
        </div>
      )}
      {error ? <div className="text-xs text-red-600 leading-relaxed">{error}</div> : null}
    </motion.div>
  );
}
