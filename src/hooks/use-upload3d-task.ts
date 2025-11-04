'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type LocalStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | null;

type FileMeta = {
  name: string;
  size: number; // bytes
  type: string;
  ext: string;
};

const BYTES_MB = 1024 * 1024;
export const MAX_3D_FILE_MB = 200;

const ALLOWED_EXTS = ['glb', 'gltf', 'obj', 'stl'] as const;
type AllowedExt = (typeof ALLOWED_EXTS)[number];

function getExt(name: string): string {
  return (name.split('.').pop() || '').toLowerCase();
}

function pickPrimaryModel(files: File[]): File | null {
  if (!files?.length) return null;
  // Prefer GLB/GLTF over OBJ/STL when multiple files are dropped
  const priority: AllowedExt[] = ['glb', 'gltf', 'obj', 'stl'];
  for (const preferred of priority) {
    const f = files.find((x) => getExt(x.name) === preferred);
    if (f) return f;
  }
  return null;
}

export function useUpload3DTask() {
  const [status, setStatus] = useState<LocalStatus>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<FileMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tickRef = useRef<number | null>(null);
  const objUrlRef = useRef<string | null>(null);

  const clearProgressTimer = () => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const reset = useCallback(() => {
    clearProgressTimer();
    setStatus(null);
    setProgress(null);
    setError(null);
    setFileMeta(null);
    setUrl(null);
    if (objUrlRef.current) {
      URL.revokeObjectURL(objUrlRef.current);
      objUrlRef.current = null;
    }
  }, []);

  useEffect(() => () => reset(), [reset]);

  const simulateProgress = () => {
    clearProgressTimer();
    setProgress(8);
    setStatus('RUNNING');
    tickRef.current = window.setInterval(() => {
      setProgress((p) => {
        const next = typeof p === 'number' ? Math.min(92, p + Math.max(1, Math.random() * 5)) : 10;
        return next;
      });
    }, 300);
  };

  const markReady = useCallback(() => {
    clearProgressTimer();
    setProgress(100);
    setStatus('SUCCEEDED');
  }, []);

  const fail = useCallback((msg: string) => {
    clearProgressTimer();
    setStatus('FAILED');
    setError(msg);
  }, []);

  const loadFiles = useCallback(
    async (files: File[]): Promise<void> => {
      reset();

      const primary = pickPrimaryModel(files);
      if (!primary) {
        fail('Formato no soportado. Sube un GLB/GLTF (recomendado) o alternativamente OBJ/STL.');
        return;
      }

      const ext = getExt(primary.name);
      if (!ALLOWED_EXTS.includes(ext as AllowedExt)) {
        fail('Tipo de archivo no soportado. Usa .glb, .gltf, .obj o .stl');
        return;
      }

      const sizeMB = primary.size / BYTES_MB;
      if (sizeMB > MAX_3D_FILE_MB) {
        fail(
          `El archivo excede el límite (${MAX_3D_FILE_MB} MB). Comprime u optimiza el modelo y vuelve a intentarlo.`
        );
        return;
      }

      setStatus('PENDING');
      setProgress(5);
      setError(null);
      setFileMeta({
        name: primary.name,
        size: primary.size,
        type: primary.type || 'application/octet-stream',
        ext,
      });

      try {
        const objectUrl = URL.createObjectURL(primary);
        objUrlRef.current = objectUrl;
        setUrl(objectUrl);
        // Begin simulated loading while the viewer parses
        simulateProgress();
      } catch (e) {
        fail('No fue posible leer el archivo. Verifica el formato e inténtalo de nuevo.');
      }
    },
    [fail, reset]
  );

  return {
    // state
    status,
    progress,
    url,
    fileMeta,
    error,
    // actions
    loadFiles,
    markReady,
    reset,
  };
}
