'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useModels } from '@/hooks/data';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ModelViewer } from '@/components/shared/3d/model-viewer';

type KindParam = 'square' | 'rect' | 'circle';

export default function Page({ params }: { params: { id: string } }) {
  const r = useRouter();
  const { data: models } = useModels();
  const id = params.id;

  const model = useMemo(() => models?.find((m) => m.id === id), [models, id]);

  function getModelUrl(m: { source: 'internal' | 'tripo'; fileUrl: string }) {
    return m.source === 'tripo'
      ? `/api/tripo/proxy?url=${encodeURIComponent(m.fileUrl)}`
      : m.fileUrl;
  }

  const [includeNFC, setIncludeNFC] = useState(true);
  const [nfcUrl, setNfcUrl] = useState('');

  // ROI inputs
  const [scans, setScans] = useState(100);
  const [convRate, setConvRate] = useState(3); // %
  const [valuePerConv, setValuePerConv] = useState(5); // currency units

  const cost = useMemo(() => {
    // Estimado rápido: asumimos producto LLAVERO en esta vista
    const base = 10;
    const nfc = includeNFC ? 5 : 0;
    return { amount: base + nfc, currency: 'USD' as const };
  }, [includeNFC]);

  const roi = useMemo(() => {
    const income = scans * (convRate / 100) * valuePerConv;
    const roiPct = cost.amount > 0 ? ((income - cost.amount) / cost.amount) * 100 : 0;
    return { income, roiPct };
  }, [scans, convRate, valuePerConv, cost.amount]);

  function goCustomize() {
    const params = new URLSearchParams();
    params.set('modelId', id);
    params.set('withNfc', includeNFC ? '1' : '0');
    if (nfcUrl) params.set('nfc', nfcUrl);
    if (model?.name) params.set('name', model.name);
    r.push(`/app/orders/new/customize?${params.toString()}`);
  }

  return (
    <main className="p-0 mx-auto text-foreground">
      <Card className="bg-white/70 backdrop-blur-md border border-white/60 shadow-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-xl">Modelo {model?.name ?? id}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">GALERÍA</Badge>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <Label className="text-sm">Previsualización</Label>
              <ModelViewer
                className="h-[260px]"
                src={model ? getModelUrl(model) : undefined}
                demoKind={undefined}
                overlayImage={model?.overlayImageUrl}
                disableSpin
                disableControls
                autoRotate={false}
              />
              <p className="text-xs text-muted-foreground">
                Vista estática del modelo seleccionado.
              </p>

              <div className="flex items-center justify-between gap-4 rounded-xl border px-3 py-2">
                <div className="space-y-0.5">
                  <Label className="text-sm">Incluir NFC</Label>
                  <p className="text-xs text-muted-foreground">
                    Etiqueta NFC integrada en el producto.
                  </p>
                </div>
                <Switch checked={includeNFC} onCheckedChange={setIncludeNFC} />
              </div>

              {includeNFC && (
                <div className="space-y-2">
                  <Label className="text-sm">URL de destino para NFC</Label>
                  <Input
                    placeholder="https://tusitio.com/campana"
                    value={nfcUrl}
                    onChange={(e) => setNfcUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Este enlace se abrirá al escanear el NFC.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Métricas rápidas de ROI</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Escaneos</p>
                    <Input
                      type="number"
                      value={scans}
                      onChange={(e) => setScans(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                  <div className="rounded-xl border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Tasa conv. (%)</p>
                    <Input
                      type="number"
                      step="0.1"
                      value={convRate}
                      onChange={(e) => setConvRate(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                  <div className="rounded-xl border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Valor/conv. ({cost.currency})</p>
                    <Input
                      type="number"
                      step="0.01"
                      value={valuePerConv}
                      onChange={(e) => setValuePerConv(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border px-3 py-3">
                  <p className="text-xs text-muted-foreground">Ingresos estimados</p>
                  <p className="text-lg font-semibold">
                    {roi.income.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                    {cost.currency}
                  </p>
                </div>
                <div className="rounded-xl border px-3 py-3">
                  <p className="text-xs text-muted-foreground">Costo estimado</p>
                  <p className="text-lg font-semibold">
                    {cost.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                    {cost.currency}
                  </p>
                </div>
                <div className="rounded-xl border px-3 py-3">
                  <p className="text-xs text-muted-foreground">ROI</p>
                  <p
                    className={`text-lg font-semibold ${roi.roiPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    {roi.roiPct.toLocaleString(undefined, { maximumFractionDigits: 1 })}%
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Las métricas son estimaciones simples para apoyar decisiones. Ajusta los valores
                según tu negocio.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => r.back()}>
            Volver
          </Button>
          <Button onClick={goCustomize}>Personalizar y pedir</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
