'use client';

import { useRouter } from 'next/navigation';
import { useModels } from '@/hooks/data';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { ModelCard } from '@/components/features/catalog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Images, Package, FileText, AlertCircle, Hash, Coins } from 'lucide-react';

export default function AppHome() {
  const r = useRouter();
  const { data: models } = useModels();
  const [tab, setTab] = useState<'gallery' | 'shipping' | 'quotes'>('gallery');

  type QuoteDTO = {
    id: number;
    item_personalizado_id: number;
    nombre_personalizado: string;
    cantidad: number;
    cotizacion_rango: string;
    precio_final_unidad: number;
    precio_total: number;
    estado: string;
    fecha_pedido: string;
    moneda: string;
  };

  const [quotes, setQuotes] = useState<QuoteDTO[] | null>(null);
  const [quotesLoading, setQuotesLoading] = useState<boolean>(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  function formatMoneyCLP(n: number) {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(Number(n || 0));
  }

  function formatDateLocal(iso: string) {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }

  function statusBadgeClass(status: string) {
    const s = status?.toLowerCase();
    if (s.includes('aprobado')) return 'bg-green-600 text-white border-transparent';
    if (s.includes('pendiente')) return 'bg-amber-500 text-white border-transparent';
    if (s.includes('rechaz')) return 'bg-red-600 text-white border-transparent';
    return 'bg-muted text-foreground border-transparent';
  }

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setQuotesLoading(true);
      setQuotesError(null);
      try {
        const r = await fetch('/api/v1/cotizaciones', { headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as QuoteDTO[];
        if (!cancelled) setQuotes(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!cancelled) {
          setQuotes(null);
          setQuotesError(e?.message ?? 'Error de red');
        }
      } finally {
        if (!cancelled) setQuotesLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const retryFetchQuotes = () => setReloadKey((k) => k + 1);

  const easeCreamax: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

  const fadeUp = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeCreamax } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: easeCreamax } },
  };

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as 'gallery' | 'shipping' | 'quotes')}
      orientation="vertical"
      className="h-full"
    >
      <div className="p-4 flex gap-6 md:gap-8 2xl:gap-10 xl:gap-10 justify-center h-full">
        <TabsList
          aria-orientation="vertical"
          className="inline-flex flex-col items-stretch gap-3 md:gap-4 shrink-0 rounded-2xl border-2 p-4 bg-white"
        >
          <TabsTrigger
            value="gallery"
            className="justify-start gap-3 rounded-2xl px-5 py-4 text-base"
            aria-controls="panel-gallery"
          >
            <Images size={18} strokeWidth={2.5} />
            <span className="font-extrabold tracking-wide">GALERÍA</span>
          </TabsTrigger>

          <TabsTrigger
            value="shipping"
            className="justify-start gap-3 rounded-2xl px-5 py-4 text-base"
            aria-controls="panel-shipping"
          >
            <Package size={18} strokeWidth={2.5} />
            <span className="font-extrabold tracking-wide">EN ENVÍO</span>
          </TabsTrigger>

          <TabsTrigger
            value="quotes"
            className="justify-start gap-3 rounded-2xl px-5 py-4 text-base"
            aria-controls="panel-quotes"
          >
            <FileText size={18} strokeWidth={2.5} />
            <span className="font-extrabold tracking-wide">COTIZACIONES</span>
          </TabsTrigger>
        </TabsList>

        <section className="flex-1 min-w-0 flex flex-col justify-start">
          <TabsContent value="gallery" id="panel-gallery" role="tabpanel">
            <AnimatePresence mode="wait">
              <motion.div
                key="tab-gallery"
                variants={fadeUp}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {models?.length ? (
                  <motion.div
                    variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
                    initial="initial"
                    animate="animate"
                    className={cn(
                      'grid gap-4 justify-center',
                      'grid-cols-[repeat(auto-fit,minmax(150px,1fr))] sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] md:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] xl:grid-cols-[repeat(auto-fit,minmax(170px,1fr))]'
                    )}
                  >
                    {models.map((m) => (
                      <motion.div
                        key={m.id}
                        variants={{
                          initial: { opacity: 0, y: 6 },
                          animate: { opacity: 1, y: 0 },
                        }}
                      >
                        <ModelCard m={m} onOpen={(id) => r.push(`/app/models/${id}`)} />
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <Card className="border-dashed">
                    <CardHeader>
                      <CardTitle className="text-center text-muted-foreground text-sm">
                        No tienes modelos aún
                      </CardTitle>
                    </CardHeader>
                  </Card>
                )}
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="shipping" id="panel-shipping" role="tabpanel">
            Proximamente
          </TabsContent>

          <TabsContent
            value="quotes"
            id="panel-quotes"
            role="tabpanel"
            aria-labelledby="tab-quotes"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`tab-quotes-${quotesLoading ? 'loading' : quotesError ? 'error' : quotes?.length ? 'data' : 'empty'}`}
                variants={fadeUp}
                initial="initial"
                animate="animate"
                exit="exit"
                className="min-h-[120px]"
              >
                {quotesLoading ? (
                  <div
                    role="grid"
                    aria-busy="true"
                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                  >
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Card key={i} className="rounded-xl border-2 bg-white overflow-hidden">
                        <div className="p-4 animate-pulse">
                          <div className="h-5 w-2/3 rounded bg-muted mb-3" />
                          <div className="h-4 w-1/2 rounded bg-muted mb-2" />
                          <div className="h-4 w-2/3 rounded bg-muted mb-2" />
                          <div className="h-4 w-1/3 rounded bg-muted mb-2" />
                          <div className="h-4 w-2/5 rounded bg-muted" />
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : quotesError ? (
                  <Card role="alert" className="rounded-xl border-2 border-red-200 bg-white">
                    <CardHeader className="flex flex-row items-center gap-2 pb-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <CardTitle className="text-base uppercase tracking-wide">
                        No se pudieron cargar las cotizaciones
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground flex items-center gap-3">
                      <span>Se produjo un error al contactar el servicio.</span>
                      <button
                        type="button"
                        role="button"
                        tabIndex={0}
                        aria-label="Reintentar cargar cotizaciones"
                        onClick={retryFetchQuotes}
                        onKeyDown={(e) =>
                          (e.key === 'Enter' || e.key === ' ') && retryFetchQuotes()
                        }
                        className="underline text-primary"
                      >
                        Reintentar
                      </button>
                    </CardContent>
                  </Card>
                ) : !quotes || quotes.length === 0 ? (
                  <Card className="rounded-xl border-2 border-dashed bg-white">
                    <CardHeader className="items-center text-center space-y-2">
                      <FileText size={24} className="text-muted-foreground" />
                      <CardTitle className="text-muted-foreground text-sm uppercase tracking-wide">
                        Aún no tienes cotizaciones
                      </CardTitle>
                    </CardHeader>
                  </Card>
                ) : (
                  <div
                    role="grid"
                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                    aria-label="Listado de cotizaciones"
                  >
                    {quotes.map((q) => (
                      <Card
                        key={q.id}
                        role="article"
                        aria-label={`Cotización ${q.nombre_personalizado}`}
                        className="rounded-xl border-2 bg-white hover:shadow-md transition-shadow"
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-3">
                            <CardTitle
                              className="text-base font-semibold uppercase tracking-wide truncate"
                              title={q.nombre_personalizado}
                            >
                              {q.nombre_personalizado}
                            </CardTitle>
                            <Badge
                              className={statusBadgeClass(q.estado)}
                              aria-label={`Estado: ${q.estado}`}
                            >
                              {q.estado}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="text-sm space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] uppercase tracking-wide inline-flex items-center gap-2 text-muted-foreground">
                              <Hash className="h-4 w-4" /> Id pers.
                            </span>
                            <span className="font-medium tabular-nums text-foreground">
                              {q.item_personalizado_id}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Cantidad
                            </span>
                            <span className="font-medium tabular-nums text-foreground">
                              {q.cantidad}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[11px] uppercase tracking-wide inline-flex items-center gap-2 text-muted-foreground">
                              <Package className="h-4 w-4" /> Rango cotizado
                            </span>
                            <span className="font-medium text-foreground">
                              {q.cotizacion_rango}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Precio unidad
                            </span>
                            <span className="font-medium tabular-nums text-foreground">
                              {q.precio_final_unidad === 0 && q.estado.toLowerCase().includes('precot')
                                ? 'Precio por definir'
                                : `$${formatMoneyCLP(q.precio_final_unidad)}`}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[11px] uppercase tracking-wide inline-flex items-center gap-2 text-muted-foreground">
                              <Coins className="h-4 w-4" /> Total
                            </span>
                            <span
                              className="font-extrabold tabular-nums"
                              style={{ color: '#FF4D00' }}
                            >
                              {q.precio_total === 0 && q.estado.toLowerCase().includes('precot')
                                ? 'Precio por definir'
                                : `$${formatMoneyCLP(q.precio_total)}`}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="sr-only">Moneda</span>
                            <span className="sr-only">{q.moneda}</span>
                          </div>

                          <div className="pt-1 border-t" />

                          <div className="flex items-center justify-between">
                            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Pedido
                            </span>
                            <span className="font-medium text-foreground">
                              {formatDateLocal(q.fecha_pedido)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        </section>
      </div>
    </Tabs>
  );
}
