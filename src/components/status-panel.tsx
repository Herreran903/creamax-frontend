import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react';

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

  // Paleta base por estado
  const baseHex = isWorking ? '#0B4D67' : isDone ? null : error ? null : null;
  const baseClass = isWorking ? 'emerald-600' : isDone ? 'emerald-600' : error ? 'red-600' : null;

  // Panel: fondo y borde por estado
  const tone = isWorking
    ? 'bg-[#0B4D67]/10 border-[#0B4D67]/30'
    : isDone
      ? 'bg-emerald-600/10 border-emerald-600/30'
      : error
        ? 'bg-red-600/10 border-red-600/30'
        : 'bg-muted/40 border-border';

  const title = isWorking
    ? 'Generando modelo...'
    : isDone
      ? '¡Listo!'
      : error
        ? 'Ocurrió un error'
        : 'Sin tarea en curso';

  const Icon = isWorking ? Loader2 : isDone ? CheckCircle2 : error ? AlertCircle : Clock;

  // Color del icono por estado
  const iconColorClass = isWorking
    ? 'text-[#0B4D67]'
    : isDone
      ? 'text-emerald-600'
      : error
        ? 'text-red-600'
        : 'text-muted-foreground';

  // Progreso clamped
  const pct = Math.max(0, Math.min(100, progress ?? 0));

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-3 ${tone} space-y-2`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <Icon className={`${isWorking ? 'animate-spin' : ''} ${iconColorClass}`} size={18} />
        <div className="text-sm font-semibold">{title}</div>
      </div>

      {showProgress && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Progreso</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 140, damping: 20 }}
              className={`h-full rounded-full ${
                isWorking
                  ? 'bg-[#0B4D67]'
                  : isDone
                    ? 'bg-emerald-600'
                    : error
                      ? 'bg-red-600'
                      : 'bg-muted'
              }`}
            />
          </div>
        </div>
      )}

      {error ? <div className="text-xs text-red-600 leading-relaxed">{error}</div> : null}
    </motion.div>
  );
}
