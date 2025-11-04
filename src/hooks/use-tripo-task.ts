'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export type TStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN' | null;

const POLL_BASE_MS = 2500;
const POLL_MAX_MS = 10000;
export const MAX_WAIT_MS = 120000;
const SUCCEEDED_EXTRA_RETRIES = 3;

export function useTripoTask() {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<TStatus>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nextTickRef = useRef<NodeJS.Timeout | null>(null);
  const backoffRef = useRef<number>(POLL_BASE_MS);
  const succeededExtraTriesRef = useRef<number>(SUCCEEDED_EXTRA_RETRIES);
  const isPollingRef = useRef<boolean>(false);

  const clearTimers = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (nextTickRef.current) clearTimeout(nextTickRef.current);
    timeoutRef.current = null;
    nextTickRef.current = null;
  };

  const stopPolling = useCallback((): void => {
    clearTimers();
    abortRef.current?.abort();
    abortRef.current = null;
    isPollingRef.current = false;
  }, []);

  const reset = useCallback((): void => {
    setError(null);
    setGlbUrl(null);
    setPreviewUrl(null);
    setProgress(null);
    setStatus(null);
    backoffRef.current = POLL_BASE_MS;
    succeededExtraTriesRef.current = SUCCEEDED_EXTRA_RETRIES;
  }, []);

  // ---- core: pollOnce (async) ----
  const pollOnce = useCallback(
    async (id: string): Promise<void> => {
      if (!id || isPollingRef.current) return;
      isPollingRef.current = true;

      try {
        abortRef.current = new AbortController();
        const res = await fetch(`/api/tripo/tasks/${id}`, {
          cache: 'no-store',
          signal: abortRef.current.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Error en polling');

        const st = (data.status as TStatus) || 'UNKNOWN';
        setStatus(st);
        if (typeof data.progress === 'number') setProgress(data.progress);
        if (data.previewUrl) setPreviewUrl(data.previewUrl ?? null);

        if (st === 'FAILED') {
          setError('La tarea falló en el servidor.');
          stopPolling();
          return;
        }

        if (st === 'SUCCEEDED') {
          if (data.glbUrl) {
            setGlbUrl(data.glbUrl);
            stopPolling();
            return;
          }
          if (succeededExtraTriesRef.current > 0) {
            succeededExtraTriesRef.current -= 1;
            scheduleNext(id, 1500);
            return;
          }
          setError('Modelo finalizado pero no se recibió el enlace. Intenta nuevamente.');
          stopPolling();
          return;
        }

        // queued/running: backoff progresivo
        backoffRef.current = Math.min(Math.round(backoffRef.current * 1.4), POLL_MAX_MS);
        scheduleNext(id, backoffRef.current);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setError(e?.message || 'Error en polling');
        stopPolling();
      } finally {
        isPollingRef.current = false;
      }
    },
    [stopPolling]
  );

  const scheduleNext: (id: string, ms: number) => void = useCallback(
    (id, ms) => {
      clearTimeout(nextTickRef.current as any);
      nextTickRef.current = setTimeout(() => {
        void pollOnce(id);
      }, ms);
    },
    [pollOnce]
  );

  const startPolling = useCallback(
    (id: string): void => {
      stopPolling();
      reset();
      setStatus('RUNNING');
      timeoutRef.current = setTimeout(() => {
        setError('Tiempo de espera agotado. No se encontró el asset a tiempo.');
        setStatus('FAILED');
        stopPolling();
      }, MAX_WAIT_MS);
      void pollOnce(id);
    },
    [pollOnce, reset, stopPolling]
  );

  const createTask = useCallback(
    async (prompt: string, imageUrl?: string): Promise<void> => {
      reset();
      setStatus('PENDING');
      const body: any = { prompt: prompt.trim() };
      if (imageUrl && imageUrl.trim()) body.imageUrl = imageUrl.trim();

      const res = await fetch('/api/tripo/text-to-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error creando tarea');

      const newId = data.taskId as string;
      setTaskId(newId);
      setStatus('RUNNING');
      startPolling(newId);
    },
    [reset, startPolling]
  );

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && taskId && !glbUrl && status !== 'FAILED') {
        backoffRef.current = POLL_BASE_MS;
        scheduleNext(taskId, 0);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [taskId, glbUrl, status, scheduleNext]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  return {
    taskId,
    status,
    progress,
    previewUrl,
    glbUrl,
    error,
    createTask,
    startPolling,
    reset,
    stopPolling,
    MAX_WAIT_MS,
  };
}
