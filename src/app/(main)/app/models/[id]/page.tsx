'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNfcConfig, useUpdateNfcUrlByShortCode, useNfcClicksSeries } from '@/hooks/nfc';
import { validateNfcUrl } from '@/lib/api/nfc';
import {
  Loader,
  Hash,
  Link2,
  BarChart3,
  CalendarDays,
  ArrowLeft,
  Save,
  RefreshCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

function SectionSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 w-full rounded-md bg-muted animate-pulse" />
      ))}
    </div>
  );
}

function WeeklyLineChart({ series }: { series: { date: string; count: number }[] }) {
  const data = series.map((d) => ({ date: d.date, count: d.count }));
  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => (typeof v === 'string' ? v.slice(5) : v)}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            labelFormatter={(v) => String(v)}
            formatter={(value: any) => [value as number, 'Clicks']}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#FF4D00"
            strokeWidth={2.5}
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ReorderSection({ lastCost, lastQty }: { lastCost: string; lastQty: number }) {
  return (
    <div className="space-y-3">
      <Label className="text-xs md:text-sm font-extrabold tracking-wide uppercase inline-flex items-center gap-2">
        VOLER A PEDIR
      </Label>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2 md:col-span-1 flex items-center">
          <span className="text-2xl text-[#0B4D67] leading-none tracking-tight font-extrabold">
            {lastCost}
          </span>
        </div>
        <div className="space-y-1 col-span-2 md:col-span-1">
          <Label htmlFor="reorder-qty" className="text-xs font-semibold tracking-wide uppercase">
            Cantidad
          </Label>
          <Input id="reorder-qty" value={String(lastQty)} readOnly aria-readonly="true" />
        </div>
      </div>

      <div className="flex pt-2 w-full">
        <Button
          disabled
          className="
            rounded-xl
            px-6 py-4
            text-base font-extrabold
            text-white
            bg-[#FF4D00]
            disabled:opacity-50 disabled:cursor-not-allowed
            uppercase
            w-full
          "
        >
          <RefreshCcw size={20} strokeWidth={2.5} />
          Volver a pedir
        </Button>
      </div>
    </div>
  );
}

export default function Page() {
  const r = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id as string;
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

  const {
    data: cfg,
    isLoading: cfgLoading,
    isError: cfgIsError,
    error: cfgError,
  } = useNfcConfig(id);

  const shortCode = cfg?.short_code;

  const {
    data: clicks,
    isLoading: clicksLoading,
    isError: clicksIsError,
    error: clicksError,
  } = useNfcClicksSeries(id);

  const {
    series = [],
    total = 0,
    minDate = '',
    maxDate = '',
  } = clicks || { series: [], total: 0, minDate: '', maxDate: '' };

  const [urlValue, setUrlValue] = useState('');
  const [touched, setTouched] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cfg?.url_destino_actual) setUrlValue(cfg.url_destino_actual);
  }, [cfg?.url_destino_actual]);

  const { mutateAsync: doUpdate, isPending: isSaving } = useUpdateNfcUrlByShortCode(shortCode, id);
  const urlValidation = useMemo(() => validateNfcUrl(urlValue), [urlValue]);
  const urlInvalid = touched && !urlValidation.valid;

  const isUrlDirty = useMemo(() => {
    const orig = (cfg?.url_destino_actual ?? '').trim();
    return urlValue.trim() !== orig;
  }, [cfg?.url_destino_actual, urlValue]);

  const isUrlValid = useMemo(
    () => urlValidation.valid && urlValue.trim().length > 0,
    [urlValidation.valid, urlValue]
  );

  const hasNfc = useMemo(
    () => Boolean(cfg?.url_destino_actual || cfg?.short_code || cfg?.url_short_code),
    [cfg?.url_destino_actual, cfg?.short_code, cfg?.url_short_code]
  );

  const lastCost = '$20.000 COP';
  const lastQty = 0;

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
      toast.error(err?.message || 'No se pudo actualizar el URL');
    }
  }

  return (
    <main
      className="
        h-full w-full overflow-hidden
        p-4 grid grid-rows-[auto_1fr] gap-4
        text-foreground
      "
      aria-label="Gestión NFC"
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className="flex flex-wrap items-baseline gap-2">
            <span className="text-lg font-semibold tracking-wide uppercase">MODELO</span>
            <span className="font-display text-2xl font-semibold">#{id}</span>
          </h4>
          <p className="text-xs md:text-sm text-muted-foreground uppercase">
            Gestión y seguimiento de redirecciones NFC
          </p>
        </div>
        <Button
          className="
                    px-6 py-4
                    bg-white
                    rounded-xl
                    border-2 border-foreground/40 
                    text-foreground 
                    uppercase
                  "
          onClick={() => r.back()}
          aria-label="Volver"
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
          Volver
        </Button>
      </div>
      {!cfgLoading && !hasNfc ? (
        <div className="grid grid-cols-12 gap-4 overflow-hidden">
          <div className="col-span-12">
            <div className="h-full rounded-xl border-2 p-4 md:p-5 bg-white space-y-3">
              <ReorderSection lastCost={lastCost} lastQty={lastQty} />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4 overflow-hidden">
          <div className="col-span-12 md:col-span-5">
            <div className="h-full rounded-xl border-2 p-4 md:p-5 bg-white space-y-3">
              <Label className="text-xs md:text-sm font-extrabold tracking-wide uppercase inline-flex items-center gap-2">
                Resumen NFC
              </Label>

              {cfgLoading ? (
                <SectionSkeleton lines={5} />
              ) : cfgIsError ? (
                <div className="text-sm text-red-600">
                  {cfgError instanceof Error
                    ? cfgError.message
                    : 'Error al cargar la configuración.'}
                </div>
              ) : cfg ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] md:text-xs font-bold tracking-wide uppercase inline-flex items-center gap-2">
                      <Hash className="h-4 w-4" /> Item ID
                    </Label>
                    <span className="font-medium">{cfg.item_id ?? '—'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] md:text-xs font-semibold tracking-wide uppercase inline-flex items-center gap-2">
                      <Link2 className="h-4 w-4" /> URL corta
                    </Label>
                    {cfg?.url_short_code ? (
                      <a
                        href={`${API_BASE_URL}/nfc/${cfg.short_code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-[#0B4D67] font-semibold hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0B4D67] rounded-md px-2 py-1"
                        aria-label="Abrir URL corta en nueva pestaña"
                        title="Abrir URL corta"
                      >
                        <Link2 className="h-4 w-4" />
                        <span className="text-xs uppercase">Abrir enlace</span>
                      </a>
                    ) : (
                      <span>—</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] md:text-xs font-semibold tracking-wide uppercase inline-flex items-center gap-2">
                      <Link2 className="h-4 w-4" /> URL de destino actual
                    </Label>
                    <div className="text-sm break-all">{cfg.url_destino_actual ?? '—'}</div>
                  </div>

                  <div className="pt-1">
                    <form className="grid gap-3" onSubmit={onSubmit} noValidate>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs md:text-sm font-extrabold tracking-wide uppercase inline-flex items-center gap-2">
                          Editar URL de destino
                        </Label>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="nfc-url"
                          className="text-xs font-semibold tracking-wide uppercase inline-flex items-center gap-2"
                        >
                          <Link2 className="h-4 w-4" />
                          URL
                        </Label>
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
                          disabled={!cfg || isSaving}
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
                      <Button
                        type="submit"
                        disabled={isSaving || !cfg || !isUrlDirty || !isUrlValid}
                        aria-busy={isSaving}
                        className="
                          rounded-xl
                          px-4 py-2
                          text-xs md:text-sm font-extrabold
                          text-white
                          bg-[#FF4D00]
                          disabled:opacity-50 disabled:cursor-not-allowed
                          uppercase
                          inline-flex items-center gap-2
                        "
                      >
                        {isSaving ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader className="h-4 w-4 animate-spin" />
                            Guardando…
                          </span>
                        ) : (
                          <>
                            <Save />
                            <span>Guardar cambios</span>
                          </>
                        )}
                      </Button>
                    </form>
                  </div>

                  <ReorderSection lastCost={lastCost} lastQty={lastQty} />
                </div>
              ) : (
                <p className="text-muted-foreground">Sin datos.</p>
              )}
            </div>
          </div>
          <div className="col-span-12 md:col-span-7">
            <div className="h-full rounded-xl border-2 p-4 md:p-5 bg-white space-y-3">
              <Label className="text-xs md:text-sm font-extrabold tracking-wide uppercase inline-flex items-center gap-2">
                Estadísticas
              </Label>

              <div className="space-y-1 pt-1">
                <Label className="text-[11px] md:text-xs font-semibold tracking-wide uppercase inline-flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Total semana
                </Label>
                <div className="text-[34px] leading-none tracking-tight font-extrabold text-[#FF4D00]">
                  {clicksLoading ? '—' : total}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border px-3 py-2">
                  <p className="text-[11px] md:text-xs text-muted-foreground uppercase font-semibold inline-flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" /> Desde
                  </p>
                  <p className="text-sm tabular-nums">{minDate || '—'}</p>
                </div>
                <div className="rounded-lg border px-3 py-2">
                  <p className="text-[11px] md:text-xs text-muted-foreground uppercase font-semibold inline-flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" /> Hasta
                  </p>
                  <p className="text-sm tabular-nums">{maxDate || '—'}</p>
                </div>
              </div>

              <div className="pt-2 h-[calc(100%-200px)]">
                {clicksLoading ? (
                  <SectionSkeleton lines={4} />
                ) : clicksIsError ? (
                  <div className="text-sm">
                    {clicksError instanceof Error
                      ? clicksError.message
                      : 'Error al cargar estadísticas.'}
                  </div>
                ) : series.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Sin datos en la última semana
                  </div>
                ) : (
                  <WeeklyLineChart series={series} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
