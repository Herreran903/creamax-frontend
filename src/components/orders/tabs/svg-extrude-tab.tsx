'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { FileDrop } from '@/components/core/forms/file-drop';
import { StatusPanel } from '@/components/status-panel';
import SvgExtruder from '@/components/core/3d/svg-extruder';
import type { DepthMap, SvgProcessResult, SvgWorkerMessage, SvgColorGroup, SvgPolygon } from '@/lib/svg/types';
import { toast } from 'sonner';
import { Save, Settings2 } from 'lucide-react';
import * as THREE from 'three';
import { normalizeColor, parseFill } from '@/lib/svg/normalizeColor';

// three GLTF exporter (runtime import inside handler to keep bundle light)
type GLTFExporterType = typeof import('three/examples/jsm/exporters/GLTFExporter.js').GLTFExporter;

// --- helpers (main-thread parsing to avoid DOMParser in Worker) ---

function parseViewBox(svgText: string): [number, number, number, number] | undefined {
  const m = svgText.match(/viewBox\s*=\s*["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i);
  if (!m) return undefined;
  return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])];
}

function parseSize(svgText: string): { width?: number; height?: number } {
  const w = svgText.match(/width\s*=\s*["']\s*([-\d.]+)(px)?\s*["']/i)?.[1];
  const h = svgText.match(/height\s*=\s*["']\s*([-\d.]+)(px)?\s*["']/i)?.[1];
  return {
    width: w ? parseFloat(w) : undefined,
    height: h ? parseFloat(h) : undefined,
  };
}

function shapeToPolygons(shape: any, curveSegments: number): SvgPolygon[] {
  const { shape: outerPts, holes: holesPts } = shape.extractPoints(curveSegments);
  const toVec2 = (v: any) => [v.x, v.y] as [number, number];
  const outer = (outerPts as any[]).map(toVec2);
  const holes = (holesPts as any[]).map((ring) => (ring as any[]).map(toVec2));
  return [{ outer, holes }];
}

function groupPathsByFill(paths: any[], curveSegments: number) {
  const groups = new Map<string, SvgColorGroup>();
  for (const p of paths) {
    const style = (p.userData?.style ?? {}) as Partial<{ fill: string; fillOpacity: string | number; opacity: string | number }>;
    const fillInfo = parseFill(style) ?? null;
    const hex = fillInfo?.hex ?? normalizeColor((p.userData?.style as any)?.stroke) ?? null;
    if (!hex) continue;

    const shapes = (p.toShapes?.(true) ?? []) as any[];
    if (!shapes.length) continue;

    const polys: SvgPolygon[] = [];
    for (const s of shapes) polys.push(...shapeToPolygons(s, curveSegments));

    if (!groups.has(hex)) groups.set(hex, { hex, opacity: fillInfo?.opacity, shapes: [] });
    groups.get(hex)!.shapes.push(...polys);
  }
  return groups;
}

async function computeColorsFromSvgText(svgText: string, curveSegments = 12): Promise<{
  colors: SvgColorGroup[];
  width: number;
  height: number;
  viewBox?: [number, number, number, number];
}> {
  const { SVGLoader } = await import('three/examples/jsm/loaders/SVGLoader.js');
  const loader = new SVGLoader();
  const parsed = loader.parse(svgText);
  const paths = parsed.paths || [];
  if (!paths.length) throw new Error('No se encontraron paths en el SVG');

  const grouped = groupPathsByFill(paths, curveSegments);
  if (grouped.size === 0) {
    throw new Error('No se detectaron colores de relleno (fill). Asegúrate de que el SVG tenga "fill".');
  }

  const colors: SvgColorGroup[] = [];
  for (const g of grouped.values()) {
    colors.push({ hex: g.hex, opacity: g.opacity, shapes: g.shapes });
  }

  const vb = parseViewBox(svgText);
  const size = parseSize(svgText);
  const width = (size.width ?? vb?.[2] ?? 1024) | 0;
  const height = (size.height ?? vb?.[3] ?? 1024) | 0;

  return { colors, width, height, viewBox: vb };
}

export default function SvgExtrudeTab({
  setSelectedMode,
  onValueChange,
  onReadyChange,
}: {
  setSelectedMode: (m: 'PRESETS' | 'AI' | 'UPLOAD3D' | 'ARTESANAL' | 'SVG') => void;
  onValueChange: (v: 'presets' | 'ai' | 'upload3d' | 'artisanal' | 'svg') => void;
  onReadyChange?: (ready: boolean) => void;
}) {
  const [svgName, setSvgName] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<SvgProcessResult | null>(null);
  const [depthMap, setDepthMap] = React.useState<DepthMap>({});
  const [selectedHex, setSelectedHex] = React.useState<string | null>(null);

  const [simplifyTol, setSimplifyTol] = React.useState(0.0);
  const [doUnion, setDoUnion] = React.useState(false);

  // worker status
  const [status, setStatus] = React.useState<'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | null>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // R3F group ref for GLTF export
  const groupRef = React.useRef<THREE.Group | null>(null);

  const openWorkerAndProcess = React.useCallback(async (svgText: string) => {
    setStatus('RUNNING');
    setProgress(0);
    setError(null);
    setResult(null);
    onReadyChange?.(false);

    // Pre-parse SVG in main thread to avoid DOMParser in Worker
    let parsed;
    try {
      parsed = await computeColorsFromSvgText(svgText, 12);
    } catch (e: any) {
      setStatus('FAILED');
      const msg = e?.message || 'Error leyendo SVG';
      setError(msg);
      toast.error(msg);
      return;
    }

    // IMPORTANT: Worker path resolved relatively to this file at build time
    const worker = new Worker(new URL('../../../workers/svg-extrude.worker.ts', import.meta.url), {
      type: 'module',
    });

    const onMsg = (ev: MessageEvent<SvgWorkerMessage>) => {
      const msg = ev.data;
      if (!msg) return;

      if (msg.type === 'progress') {
        setProgress(msg.progress);
      } else if (msg.type === 'error') {
        setStatus('FAILED');
        setError(msg.error);
        toast.error(msg.error);
        onReadyChange?.(false);
        worker.terminate();
      } else if (msg.type === 'result') {
        setStatus('SUCCEEDED');
        setProgress(100);
        setResult(msg.result);
        onReadyChange?.(true);
        // initialize depth map to 1.0 per color
        const dm: DepthMap = {};
        for (const c of msg.result.colors) dm[c.hex] = 1.0;
        setDepthMap(dm);
        setSelectedHex(msg.result.colors[0]?.hex ?? null);

        // mark mode as ready so wizard can continue
        setSelectedMode('SVG');
        onValueChange('svg');

        // show non-blocking warnings
        if (msg.result.warnings?.length) {
          msg.result.warnings.forEach((w) => toast.message(w));
        }

        worker.terminate();
      }
    };

    worker.onmessage = onMsg;
    worker.postMessage({
      type: 'process-polys',
      colors: parsed.colors,
      width: parsed.width,
      height: parsed.height,
      viewBox: parsed.viewBox,
      simplifyTolerance: simplifyTol,
      doUnion,
    });
  }, [doUnion, simplifyTol, onValueChange, setSelectedMode]);

  const onFiles = React.useCallback(async (files: File[]) => {
    const f = files?.[0];
    if (!f) return;
    if (!/\.svg$/i.test(f.name)) {
      toast.error('Por favor sube un archivo .svg válido.');
      return;
    }
    try {
      setSvgName(f.name);
      const text = await f.text();
      openWorkerAndProcess(text);
    } catch (e: any) {
      setError('No se pudo leer el archivo SVG.');
      setStatus('FAILED');
      toast.error('No se pudo leer el archivo SVG.');
    }
  }, [openWorkerAndProcess]);

  const resetHeights = () => {
    if (!result) return;
    const dm: DepthMap = {};
    for (const c of result.colors) dm[c.hex] = 1.0;
    setDepthMap(dm);
  };

  const exportGLTF = async () => {
    if (!groupRef.current) {
      toast.error('No hay geometría para exportar.');
      return;
    }
    const { GLTFExporter }: { GLTFExporter: GLTFExporterType } = await import(
      'three/examples/jsm/exporters/GLTFExporter.js'
    );

    const exporter = new GLTFExporter();
    exporter.parse(
      groupRef.current,
      (gltf) => {
        const blob = new Blob([JSON.stringify(gltf)], { type: 'model/gltf+json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (svgName?.replace(/\.svg$/i, '') || 'modelo') + '.gltf';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Exportado GLTF.');
      },
      (err) => {
        console.error(err);
        toast.error('Error exportando GLTF.');
      },
      { binary: false }
    );
  };

  const hasResult = !!result && result.colors.length > 0;

  return (
    <div className="grid grid-cols-12 gap-4">
      <aside className="col-span-12 md:col-span-4 space-y-3">
        <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-4 space-y-3">
          <label className="text-sm font-medium">Cargar SVG</label>
          <FileDrop
            onFiles={onFiles}
            accept={{ 'image/svg+xml': ['.svg'] }}
            multiple={false}
            className="min-h-[140px]"
          />
          {svgName ? (
            <p className="text-xs text-muted-foreground">Archivo: {svgName}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Formatos: .svg</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 opacity-70" />
            <span className="text-sm font-medium">Procesamiento</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs">Unir shapes por color (experimental)</label>
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#0B4D67]"
              checked={doUnion}
              onChange={(e) => setDoUnion(e.target.checked)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="tol" className="text-xs">Tolerancia de simplificación</label>
            <input
              id="tol"
              type="range"
              min={0}
              max={3}
              step={0.1}
              value={simplifyTol}
              onChange={(e) => setSimplifyTol(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-[11px] text-muted-foreground">{simplifyTol.toFixed(1)} px</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                if (!svgName) {
                  toast.message('Primero carga un SVG');
                  return;
                }
                // re-procesar con las opciones actuales
                setResult(null);
                setSelectedHex(null);
                setStatus('PENDING');
                setTimeout(() => setStatus('RUNNING'), 10);
                // We need the original SVG text; since we don't persist it, ask user to re-seleccionar o re-leer.
                // For UX v1 simple: show toast
                toast.message('Vuelve a seleccionar el archivo para reprocesar con nuevas opciones.');
              }}
            >
              Reprocesar
            </Button>
            <Button variant="outline" onClick={resetHeights}>Reset alturas</Button>
          </div>
        </div>

        <div className="space-y-2">
          <StatusPanel status={status} progress={progress} error={error} />
          {hasResult ? (
            <div className="rounded-xl border border-border bg-white/60 backdrop-blur-sm p-3 space-y-2">
              <p className="text-xs font-semibold">Altura por color</p>
              <div className="flex flex-col gap-2 max-h-[220px] overflow-auto pr-1">
                {result!.colors.map((c) => {
                  const depth = depthMap[c.hex] ?? 1.0;
                  return (
                    <div
                      key={c.hex}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedHex(c.hex)}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedHex(c.hex)}
                      className={`rounded-lg border p-2 ${selectedHex === c.hex ? 'border-[#0B4D67] shadow-[1.5px_1.5px_0_0_#0B4D67]' : 'border-border'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-4 w-4 rounded"
                          style={{ backgroundColor: c.hex }}
                          aria-label={`Color ${c.hex}`}
                        />
                        <span className="text-xs font-medium">{c.hex}</span>
                        <span className="ml-auto text-[11px] text-muted-foreground">{depth.toFixed(1)}mm</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={10}
                        step={0.1}
                        value={depth}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setDepthMap((prev) => ({ ...prev, [c.hex]: v }));
                        }}
                        className="w-full mt-2"
                        aria-label={`Altura para ${c.hex}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </aside>

      <section className="col-span-12 md:col-span-8 space-y-3">
        <SvgExtruder
          result={result}
          depthMap={depthMap}
          selectedHex={selectedHex}
          className="h-[60vh]"
          onGroupReady={(g) => (groupRef.current = g)}
        />

        <div className="flex items-center gap-2">
          <Button onClick={exportGLTF} className="gap-2" disabled={!hasResult}>
            <Save className="h-4 w-4" />
            Exportar GLTF
          </Button>
        </div>
      </section>
    </div>
  );
}