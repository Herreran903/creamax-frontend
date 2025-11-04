'use client';

import * as React from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileDrop } from '@/components/core/forms/file-drop';
import { StatusPanel } from '@/components/status-panel';
import { PreviewStage } from '@/components/preview-stage';
import { Upload, FileType2, RefreshCw, FileDown } from 'lucide-react';
import { useUpload3DTask, MAX_3D_FILE_MB } from '@/hooks/use-upload3d-task';
import { GLTFLoader, OBJLoader, STLLoader, GLTFExporter } from 'three-stdlib';

export type Upload3DTabProps = {
  uploadedName: string | null;
  setUploadedName: (n: string | null) => void;
  setUploadedUrl: (u: string | null) => void;
  setSelectedMode: (m: 'PRESETS' | 'AI' | 'UPLOAD3D' | 'ARTESANAL' | 'SVG') => void;
  onValueChange: (v: 'presets' | 'ai' | 'upload3d' | 'artisanal' | 'svg') => void;
};

export default function Upload3DTab({
  uploadedName,
  setUploadedName,
  setUploadedUrl,
  setSelectedMode,
  onValueChange,
}: Upload3DTabProps) {
  const { status, progress, url, fileMeta, error, loadFiles, markReady, reset } = useUpload3DTask();
  const [exporting, setExporting] = React.useState(false);

  // When hook resolves an object URL, reflect in parent so the global flow "Continuar" gets enabled.
  React.useEffect(() => {
    if (fileMeta?.name) setUploadedName(fileMeta.name);
  }, [fileMeta?.name, setUploadedName]);

  React.useEffect(() => {
    if (url) setUploadedUrl(url);
    else setUploadedUrl(null);
  }, [url, setUploadedUrl]);

  // Small auto-finish to mirror VALIDATING -> LOADING -> READY UX
  React.useEffect(() => {
    if (url && (status === 'PENDING' || status === 'RUNNING')) {
      const id = setTimeout(() => markReady(), 1200);
      return () => clearTimeout(id);
    }
  }, [url, status, markReady]);

  const accept3D = {
    'model/gltf-binary': ['.glb'],
    'model/gltf+json': ['.gltf'],
    'model/obj': ['.obj'],
    'model/stl': ['.stl'],
    'application/octet-stream': ['.glb', '.gltf', '.obj', '.stl'],
  } as const;

  const getExt = (nameOrUrl: string): string => {
    const q = nameOrUrl.split('?')[0];
    return (q.split('.').pop() || '').toLowerCase();
  };

  const exportAsGLB = async () => {
    if (!url) return;
    setExporting(true);
    try {
      const ext = (fileMeta?.ext || getExt(url)).toLowerCase();
      // If it's already a GLB, download as-is
      if (ext === 'glb') {
        const resp = await fetch(url);
        const blob = await resp.blob();
        const filename = (fileMeta?.name?.replace(/\.[^.]+$/, '') || 'modelo') + '.glb';
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
        return;
      }

      let object: THREE.Object3D;
      if (ext === 'gltf') {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(url);
        object = gltf.scene;
      } else if (ext === 'obj') {
        const loader = new OBJLoader();
        object = await loader.loadAsync(url);
      } else if (ext === 'stl') {
        const loader = new STLLoader();
        const geom = await loader.loadAsync(url);
        object = new THREE.Mesh(
          geom,
          new THREE.MeshStandardMaterial({
            color: '#cbd5e1',
            metalness: 0.2,
            roughness: 0.7,
          })
        );
      } else {
        throw new Error('Formato no soportado para exportar');
      }

      const exporter = new GLTFExporter();

      const download = (blob: Blob, nameBase: string) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = nameBase;
        a.click();
        URL.revokeObjectURL(a.href);
      };

      // Prefer parseAsync if available in this three-stdlib version, else fallback to callback API
      const anyExporter = exporter as any;
      if (typeof anyExporter.parseAsync === 'function') {
        const res = await anyExporter.parseAsync(object, { binary: true });
        if (res instanceof ArrayBuffer) {
          download(
            new Blob([res], { type: 'model/gltf-binary' }),
            (fileMeta?.name?.replace(/\.[^.]+$/, '') || 'modelo') + '.glb'
          );
        } else {
          const json = JSON.stringify(res);
          download(
            new Blob([json], { type: 'model/gltf+json' }),
            (fileMeta?.name?.replace(/\.[^.]+$/, '') || 'modelo') + '.gltf'
          );
        }
      } else {
        await new Promise<void>((resolve, reject) => {
          anyExporter.parse(
            object,
            (res: ArrayBuffer | object) => {
              if (res instanceof ArrayBuffer) {
                download(
                  new Blob([res], { type: 'model/gltf-binary' }),
                  (fileMeta?.name?.replace(/\.[^.]+$/, '') || 'modelo') + '.glb'
                );
              } else {
                const json = JSON.stringify(res);
                download(
                  new Blob([json], { type: 'model/gltf+json' }),
                  (fileMeta?.name?.replace(/\.[^.]+$/, '') || 'modelo') + '.gltf'
                );
              }
              resolve();
            },
            (err: any) => reject(err),
            { binary: true }
          );
        });
      }
    } catch (e) {
      console.error(e);
      alert('No se pudo exportar el modelo.');
    } finally {
      setExporting(false);
    }
  };

  const onDrop3D = async (files: File[]) => {
    await loadFiles(files);
    onValueChange('upload3d');
    setSelectedMode('UPLOAD3D');
  };

  const replaceFile = () => {
    reset();
    setUploadedName(null);
    setUploadedUrl(null);
  };

  const showReady = status === 'SUCCEEDED' && !!url;
  const previewState: 'idle' | 'loading' | 'ready' = showReady
    ? 'ready'
    : url && (status === 'PENDING' || status === 'RUNNING')
      ? 'loading'
      : 'idle';

  const messages = [
    'Validando archivo…',
    'Cargando geometría…',
    'Analizando bounding box…',
    'Aplicando materiales…',
    'Optimizando escena…',
    'Listando buffers…',
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <div className="rounded-xl border-2 border-border bg-white p-4 h-full space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold tracking-wide text-foreground/80 flex">
                <FileType2 className="h-4 w-4 mr-1" />
                MODELO 3D
              </Label>

              <FileDrop
                onFiles={onDrop3D}
                previewUrl={null}
                uploading={status === 'PENDING' || status === 'RUNNING'}
                className="text-xs"
                accept={accept3D as any}
                ariaLabel="Agregar modelo 3D"
                emptyTitle="Arrastra y suelta tu modelo 3D"
                formatsHint={`GLB, GLTF, OBJ, STL • máx. ${MAX_3D_FILE_MB} MB`}
              />
              {fileMeta?.name ? (
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  {fileMeta.ext !== 'glb' && fileMeta.ext !== 'gltf' ? (
                    <div className="mt-1 text-[10px]">
                      Sugerencia: para mejor compatibilidad, convierte a GLB antes de subir.
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Sube un GLB/GLTF (recomendado). También aceptamos OBJ/STL.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Button
                onClick={() => {
                  onValueChange('upload3d');
                  setSelectedMode('UPLOAD3D');
                }}
                disabled={!showReady}
                className="
      w-full
      rounded-xl
      px-5 py-5
      text-base font-extrabold
      text-white
      bg-[#FF4D00]
      disabled:opacity-50 disabled:cursor-not-allowed
    "
                aria-label="Usar este modelo"
              >
                <Upload size={20} strokeWidth={3} />
                USAR ESTE MODELO
              </Button>
              {url ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={replaceFile}
                    variant="outline"
                    className="w-full px-4 py-5 rounded-xl"
                    aria-label="Reemplazar archivo"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reemplazar
                  </Button>

                  <Button
                    onClick={exportAsGLB}
                    variant="outline"
                    className="w-full px-4 py-5 rounded-xl"
                    aria-label="Exportar GLB"
                    disabled={exporting}
                  >
                    <FileDown className="h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              ) : null}
            </div>

            <StatusPanel
              status={
                status === null
                  ? null
                  : status === 'PENDING'
                    ? 'PENDING'
                    : status === 'RUNNING'
                      ? 'RUNNING'
                      : status === 'SUCCEEDED'
                        ? 'SUCCEEDED'
                        : 'FAILED'
              }
              progress={typeof progress === 'number' ? progress : null}
              error={error ?? null}
              taskId={null}
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <PreviewStage
            state={previewState}
            glbUrl={url}
            imageUrl={null}
            progress={typeof progress === 'number' ? progress : null}
            messages={messages}
          />
        </div>
      </div>
    </div>
  );
}
