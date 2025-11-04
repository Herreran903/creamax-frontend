'use client';

import * as React from 'react';
import * as THREE from 'three';
import type { GLTF } from 'three-stdlib';

export type ModelSource = 'ai' | 'svg' | 'upload' | 'preset';

export type ModelMeta = {
  name?: string;
  format: 'glb' | 'gltf' | 'obj' | 'stl' | 'procedural';
  triangles?: number;
  materials?: number;
  sizeMB?: number;
  source: ModelSource;
  createdAt: number; // Date.now()
};

export type ActiveModel =
  | { status: 'IDLE'; data: null; meta: null }
  | {
      status: 'VALIDATING' | 'LOADING';
      data: null;
      meta: Partial<ModelMeta> | null;
      progress?: number;
    }
  | {
      status: 'READY';
      data: THREE.Group | GLTF;
      meta: ModelMeta;
    }
  | {
      status: 'ERROR';
      data: null;
      meta: Partial<ModelMeta> | null;
      error: string;
    };

export interface ActiveModelStore {
  state: ActiveModel;
  setLoading(meta?: Partial<ModelMeta>): void;
  setProgress(p: number): void;
  setReady(data: any, meta: ModelMeta): void;
  setError(msg: string, meta?: Partial<ModelMeta>): void;
  reset(): void;
}

export function isReady(s: ActiveModel): s is Extract<ActiveModel, { status: 'READY' }> {
  return s.status === 'READY' && !!(s as any).data;
}

const ActiveModelContext = React.createContext<ActiveModelStore | null>(null);

export function ActiveModelProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ActiveModel>({
    status: 'IDLE',
    data: null,
    meta: null,
  });

  const setLoading = React.useCallback((meta?: Partial<ModelMeta>) => {
    setState({
      status: 'LOADING',
      data: null,
      meta: meta ?? null,
      progress: 0,
    });
  }, []);

  const setProgress = React.useCallback((p: number) => {
    setState((prev) => {
      if (prev.status !== 'LOADING' && prev.status !== 'VALIDATING') return prev;
      return { ...prev, progress: p };
    });
  }, []);

  const setReady = React.useCallback((data: any, meta: ModelMeta) => {
    setState({
      status: 'READY',
      data: data as THREE.Group | GLTF,
      meta,
    });
  }, []);

  const setError = React.useCallback((msg: string, meta?: Partial<ModelMeta>) => {
    setState({
      status: 'ERROR',
      data: null,
      meta: meta ?? null,
      error: msg,
    });
  }, []);

  const reset = React.useCallback(() => {
    setState({ status: 'IDLE', data: null, meta: null });
  }, []);

  const value = React.useMemo<ActiveModelStore>(
    () => ({ state, setLoading, setProgress, setReady, setError, reset }),
    [state, setLoading, setProgress, setReady, setError, reset]
  );

  return React.createElement(ActiveModelContext.Provider, { value }, children);
}

export function useActiveModel(): ActiveModelStore {
  const ctx = React.useContext(ActiveModelContext);
  if (!ctx) {
    throw new Error('useActiveModel must be used within ActiveModelProvider');
  }
  return ctx;
}
