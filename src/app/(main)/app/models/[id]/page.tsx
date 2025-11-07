'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNfcConfig, useUpdateNfcUrl, useWeeklyStatsForCode } from '@/hooks/nfc';
import { validateNfcUrl } from '@/lib/api/nfc';

// Simple responsive weekly bar chart using design tokens (no external chart lib)
function WeeklyBarChart({
  series,
  ariaLabel,
}: {
  series: { date: string; count: number }[];
  ariaLabel?: string;
}) {
  const max = Math.max(1, ...series.map((d) => d.count));
  return (
    <div className="w-full">
      <div
        className="grid grid-cols-7 items-end gap-2 h-44 sm:h-52"
        role="img"
        aria-label={ariaLabel ?? 'Gráfica semanal de interacciones'}
      >
        {series.map((d) => {
          const hPct = Math.round((d.count / max) * 100);
          return (
            <div key={d.date} className="flex flex-col items-center gap-1">
              <div
                className="w-full rounded-md bg-primary/15 border border-primary/30"
                style={{ height: `${Math.max(6, hPct)}%` }}
                aria-valuemin={0}
                aria-valuenow={d.count}
                aria-valuemax={max}
                role="meter"
                aria-label={`Clicks ${d.count} el ${d.date}`}
                title={`${d.date}: ${d.count}`}
              />
              <div className="text-[10px] text-muted-foreground tabular-nums">
                {d.date.slice(5)}{/* MM-DD */}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">Escala máxima: {max}</div>
    </div>
  );
}

function SectionSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 w-full rounded-md bg-muted animate-pulse" />
      ))}
    </div>
  );
}

export default function Page({ params }: { params: { id: string } }) {
  const r = useRouter();
  const id = params.id;

  // 1) Load NFC configuration immediately on mount
  const {
    data: cfg,
    isLoading: cfgLoading,
    isError: cfgIsError,
    error: cfgError,
  } = useNfcConfig(id);

  // 2) Once resolved config, fetch weekly stats filtered by its short_code
  const shortCode = cfg?.short_code;
  const {
    data: weekly,
    isLoading: weeklyLoading,
    isError: weeklyIsError,
    error: weeklyError,
  } = useWeeklyStatsForCode(shortCode);

  const { series = [], total = 0, minDate = '', maxDate = '' } = weekly || {
    series: [],
    total: 0,
    minDate: '',
    maxDate: '',
  };

  // 3) Local state for URL editing
  const [urlValue, setUrlValue] = useState('');
  const [touched, setTouched] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (cfg?.url_destino_actual) {
      setUrlValue(cfg.url_destino_actual);
    }
  }, [cfg?.url_destino_actual]);

  const { mutateAsync: doUpdate, isPending: isSaving } = useUpdateNfcUrl(id);

  const urlValidation = useMemo(() => validateNfcUrl(urlValue), [urlValue]);
  const urlInvalid = touched && !urlValidation.valid;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    const v = validateNfcUrl(urlValue);
    if (!v.valid) {
      toast.error(v.reason ?? 'URL inválida');
      urlInputRef.current?.focus();
      return;
    }
    try {
      await doUpdate({ url_destino_actual: urlValue });
      toast.success('URL actualizada correctamente');
    } catch (err: any) {
      const msg = err?.message || 'No se pudo actualizar el URL';
      toast.error(msg);
    }
  }

  const showCfgError = cfgIsError;
  const showStatsError = weeklyIsError;

  return (
    <main className="p-0 mx-auto text-foreground">
      {/* Page header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Modelo {id}</h1>
          {shortCode ? <Badge variant="secondary">short_code: {shortCode}</Badge> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => r.back()} aria-label="Volver">
            Volver
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Column 1-2: Config + Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Configuración */}
          <Card className="bg-white/70 backdrop-blur-md border border-white/60 shadow-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg">Configuración NFC</CardTitle>
                <Badge variant="secondary">/api/v1/nfc/config/:id</Badge>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              {cfgLoading && <SectionSkeleton lines={4} />}

              {showCfgError && (
                <div
                  className="rounded-md border border-red-300 bg-red-50 text-red-700 p-3 text-sm"
                  role="alert"
                >
                  {cfgError instanceof Error
                    ? cfgError.message
                    : 'Error al cargar la configuración'}
                </div>
              )}

              {!cfgLoading && !showCfgError && cfg && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground">NFC ID</div>
                    <div className="text-base font-semibold">{cfg.nfc_id}</div>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground">Item ID</div>
                    <div className="text-base font-semibold">{cfg.item_id}</div>
                  </div>
                  <div className="rounded-xl border p-3 sm:col-span-2">
                    <div className="text-xs text-muted-foreground">URL de destino actual</div>
                    <div className="text-base font-semibold break-all">{cfg.url_destino_actual}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estadísticas */}
          <Card className="bg-white/70 backdrop-blur-md border border-white/60 shadow-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg">Estadísticas semanales</CardTitle>
                <Badge variant="secondary">/api/v1/nfc/stats/weekly</Badge>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              {weeklyLoading && <SectionSkeleton lines={5} />}

              {showStatsError && (
                <div
                  className="rounded-md border border-red-300 bg-red-50 text-red-700 p-3 text-sm"
                  role="alert"
                >
                  {weeklyError instanceof Error
                    ? weeklyError.message
                    : 'Error al cargar estadísticas'}
                </div>
              )}

              {!weeklyLoading && !showStatsError && (
                <>
                  {series.length === 0 ? (
                    <div
                      className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground"
                      role="status"
                      aria-live="polite"
                    >
                      Sin datos en la última semana
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <WeeklyBarChart
                        series={series}
                        ariaLabel={`Clicks del short_code ${shortCode}`}
                      />

                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl border px-3 py-3">
                          <p className="text-xs text-muted-foreground">Total semana</p>
                          <p className="text-lg font-semibold tabular-nums">{total}</p>
                        </div>
                        <div className="rounded-xl border px-3 py-3">
                          <p className="text-xs text-muted-foreground">Desde</p>
                          <p className="text-lg font-semibold tabular-nums">
                            {minDate || '-'}
                          </p>
                        </div>
                        <div className="rounded-xl border px-3 py-3">
                          <p className="text-xs text-muted-foreground">Hasta</p>
                          <p className="text-lg font-semibold tabular-nums">
                            {maxDate || '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Column 3: Edit URL */}
        <div className="space-y-6">
          <Card className="bg-white/70 backdrop-blur-md border border-white/60 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Editar URL de destino</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <form className="space-y-3" onSubmit={onSubmit} noValidate>
                <div className="space-y-2">
                  <Label htmlFor="nfc-url">URL</Label>
                  <Input
                    id="nfc-url"
                    ref={urlInputRef}
                    value={urlValue}
                    onChange={(e) => setUrlValue(e.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder="https://ejemplo.com/campana"
                    inputMode="url"
                    aria-invalid={urlInvalid}
                    aria-describedby={urlInvalid ? 'url-error' : undefined}
                  />
                  {urlInvalid ? (
                    <div id="url-error" className="text-xs text-red-600">
                      {urlValidation.reason}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Solo protocolos http y https permitidos.
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="submit"
                    disabled={isSaving || !cfg || !urlValue}
                    aria-busy={isSaving}
                  >
                    {isSaving ? 'Guardando…' : 'Guardar cambios'}
                  </Button>
                </div>
              </form>
            </CardContent>
            <CardFooter className="pt-0">
              <div className="text-xs text-muted-foreground">
                Al guardar, se actualiza únicamente el campo url_destino_actual.
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  );
}
