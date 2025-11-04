'use client';

import { useEffect, useMemo, useState } from 'react';
import { useOrder, useUpdateOrder } from '@/hooks/data';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function Page({ params }: { params: { id: string } }) {
  const id = params.id;
  const { data: order, isLoading } = useOrder(id);
  const { mutateAsync: updateOrder, isPending: saving } = useUpdateOrder();

  const [nfcUrl, setNfcUrl] = useState('');
  const [convRate, setConvRate] = useState(3); // %
  const [valuePerConv, setValuePerConv] = useState(5); // currency units
  const [scans, setScans] = useState(100); // scans to estimate

  useEffect(() => {
    if (order?.nfcUrl) setNfcUrl(order.nfcUrl);
    if (order && !order.nfcUrl) setNfcUrl('');
  }, [order?.nfcUrl, order]);

  const cost = useMemo(() => {
    if (!order) return { amount: 0, currency: 'USD' as const, hasQuote: false };
    if (order.quote) {
      return { amount: order.quote.amount, currency: order.quote.currency, hasQuote: true };
    }
    // Fallback: mimic /api/quote simple pricing
    const base =
      order.productType === 'FIGURA' ? 35 : order.productType === 'IMAN_NEVERA' ? 15 : 10;
    const nfc = order.includeNFC ? 5 : 0;
    return { amount: base + nfc, currency: 'USD' as const, hasQuote: false };
  }, [order]);

  const roi = useMemo(() => {
    // ingresos estimados por N scans
    const income = scans * (convRate / 100) * valuePerConv;
    const roiPct = cost.amount > 0 ? ((income - cost.amount) / cost.amount) * 100 : 0;
    return { income, roiPct };
  }, [scans, convRate, valuePerConv, cost.amount]);

  async function handleSaveNfc() {
    try {
      await updateOrder({ id, data: { nfcUrl: nfcUrl || undefined } });
      toast.success('NFC actualizado');
    } catch (e) {
      toast.error('No se pudo actualizar el NFC');
    }
  }

  return (
    <main className="p-0 mx-auto text-foreground space-y-4">
      <Card className="bg-white/60 backdrop-blur-xl border border-white/60 shadow-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-xl">Pedido #{id}</CardTitle>
            <div className="flex items-center gap-2">
              {order?.status && <Badge>{order.status}</Badge>}
              {order?.productType && (
                <Badge variant="secondary" className="uppercase">
                  {order.productType}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}

          {!isLoading && order && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-xl border px-3 py-2">
                  <p className="text-sm">Resumen</p>
                  <p className="text-xs text-muted-foreground">
                    Creado: {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Costo estimado</Label>
                  <div className="rounded-xl border px-3 py-2">
                    <p className="text-sm font-medium">
                      {cost.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                      {cost.currency}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.quote
                        ? `Basado en cotización · ETA ${order.quote.estimateDays} días`
                        : 'Estimado rápido (sin cotización)'}
                    </p>
                  </div>
                </div>

                {order.includeNFC ? (
                  <div className="space-y-2">
                    <Label className="text-sm">URL de destino NFC</Label>
                    <Input
                      placeholder="https://tusitio.com/mi-campana"
                      value={nfcUrl}
                      onChange={(e) => setNfcUrl(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button variant="glass" onClick={handleSaveNfc} disabled={saving}>
                        {saving ? 'Guardando…' : 'Guardar enlace'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Este enlace se abrirá al escanear la etiqueta NFC del producto.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border px-3 py-2">
                    <p className="text-sm">NFC</p>
                    <p className="text-xs text-muted-foreground">Este pedido no incluye NFC.</p>
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
                    <p className="text-xs text-muted-foreground">Costo</p>
                    <p className="text-lg font-semibold">
                      {cost.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                      {cost.currency}
                    </p>
                  </div>
                  <div className="rounded-xl border px-3 py-3">
                    <p className="text-xs text-muted-foreground">ROI</p>
                    <p
                      className={`text-lg font-semibold ${
                        roi.roiPct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {roi.roiPct.toLocaleString(undefined, {
                        maximumFractionDigits: 1,
                      })}
                      %
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Las métricas son estimaciones simples para apoyar decisiones. Ajusta los valores
                  de conversión según tu negocio.
                </p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => history.back()}>
            Volver
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
