'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SelectedMode } from './model-source-tabs';
import {
  Loader,
  Hash,
  CalendarDays,
  BadgeDollarSign,
  Coins,
  Truck,
  Phone,
  User,
  Mail,
  MapPin,
  FileText,
} from 'lucide-react';
import {
  createCustomConfirmation,
  type CustomConfirmationResponse,
} from '@/lib/api/custom-confirmation';

export type QuoteReviewStepProps = {
  selectedMode: SelectedMode;
  quote: any | null;
  defaultQuantity?: number;
  notes: string;
  onNotesChange: (s: string) => void;
  onBack: () => void;
  onConfirm: (data: {
    quantity: number;
    user: { name: string; email: string; phone?: string };
    address?: string;
    notes: string;
  }) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /**
   * Fired when confirmation succeeds. Receives API response.
   */
  onOrderConfirmed?: (resp: CustomConfirmationResponse) => void;
  /**
   * Incrementing counter to request a submit from parent (wizard primary button).
   */
  requestSubmit?: number;
  /**
   * Emits current form validity so the wizard can enable/disable the primary button.
   */
  onValidityChange?: (v: boolean) => void;
};

export default function QuoteReviewStep({
  selectedMode,
  quote,
  defaultQuantity = 50,
  notes,
  onNotesChange,
  onBack,
  onConfirm,
  loading = false,
  error = null,
  onRetry,
  onOrderConfirmed,
  requestSubmit,
  onValidityChange,
}: QuoteReviewStepProps) {
  const [quantity, setQuantity] = React.useState<number>(defaultQuantity);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');

  // Confirmation request state
  const [confirming, setConfirming] = React.useState(false);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);
  const lastSubmit = React.useRef<number | null>(null);

  // Helpers: locale formats and mappings
  const TZ = 'America/Santiago';
  const fmtDate = React.useCallback((iso?: string | null) => {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('es-CL', {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: TZ,
      }).format(new Date(iso));
    } catch {
      return '—';
    }
  }, []);
  const fmtClp = React.useMemo(
    () =>
      new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
      }),
    []
  );
  const fmtRangeClp = React.useCallback(
    (min?: number, max?: number, currency?: string) => {
      if (typeof min !== 'number' || typeof max !== 'number') return '—';
      return `${fmtClp.format(min)}–${fmtClp.format(max)} ${currency ?? 'CLP'}`;
    },
    [fmtClp]
  );
  const mapModeEs = React.useCallback((m: SelectedMode) => {
    const map: Record<string, string> = {
      PRESETS: 'Plantillas',
      AI: 'IA',
      UPLOAD3D: 'Archivo 3D',
      ARTESANAL: 'Artesanal',
      SVG: 'SVG',
    };
    return map[m] ?? m;
  }, []);

  const handleConfirm = async () => {
    if (!quote?.id) {
      setConfirmError('No hay cotización válida para confirmar.');
      return;
    }
    try {
      setConfirmError(null);
      setConfirming(true);
      const resp = await createCustomConfirmation({
        cotizacion_id: Number(quote.id),
        nombre: name,
        email,
        telefono: phone || undefined,
        rut: undefined,
        direccion: address || undefined,
        comentarios: notes || undefined,
        cantidad: Number.isFinite(quantity) ? quantity : 1,
      });
      onOrderConfirmed?.(resp);
      await onConfirm?.({
        quantity,
        user: { name, email, phone: phone || undefined },
        address: address || undefined,
        notes,
      });
    } catch (e: any) {
      setConfirmError(e?.message || 'Error al crear el pedido');
    } finally {
      setConfirming(false);
    }
  };

  // When parent requests a submit (wizard primary button on step 3), trigger handleConfirm
  React.useEffect(() => {
    if (typeof requestSubmit === 'number' && requestSubmit !== lastSubmit.current) {
      lastSubmit.current = requestSubmit;
      void handleConfirm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestSubmit]);

  // Compute and emit Step 3 form validity for wizard primary button enable/disable
  React.useEffect(() => {
    const nameOk = name.trim().length > 1;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const qtyOk = Number.isFinite(quantity) && Number(quantity) >= 1;
    const quoteOk = Boolean(quote?.id);
    onValidityChange?.(nameOk && emailOk && qtyOk && quoteOk);
  }, [name, email, quantity, quote?.id, onValidityChange]);

  // Compute and emit Step 3 form validity for wizard primary button enable/disable
  React.useEffect(() => {
    const nameOk = name.trim().length > 1;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const qtyOk = Number.isFinite(quantity) && Number(quantity) >= 1;
    const quoteOk = Boolean(quote?.id);
    onValidityChange?.(nameOk && emailOk && qtyOk && quoteOk);
  }, [name, email, quantity, quote?.id, onValidityChange]);

  // Compute and emit Step 3 form validity for wizard primary button enable/disable
  React.useEffect(() => {
    const nameOk = name.trim().length > 1;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const qtyOk = Number.isFinite(quantity) && Number(quantity) >= 1;
    const quoteOk = Boolean(quote?.id);
    onValidityChange?.(nameOk && emailOk && qtyOk && quoteOk);
  }, [name, email, quantity, quote?.id, onValidityChange]);

  // Compute and emit Step 3 form validity to parent (wizard)
  React.useEffect(() => {
    const nameOk = name.trim().length > 1;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const qtyOk = Number.isFinite(quantity) && Number(quantity) >= 1;
    const quoteOk = Boolean(quote?.id);
    const valid = nameOk && emailOk && qtyOk && quoteOk;
    onValidityChange?.(valid);
  }, [name, email, quantity, quote?.id, onValidityChange]);

  // Compute form validity for Step 3 and report to wizard
  React.useEffect(() => {
    const nameOk = name.trim().length > 1;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const qtyOk = Number.isFinite(quantity) && Number(quantity) >= 1;
    const quoteOk = Boolean(quote?.id);
    const valid = nameOk && emailOk && qtyOk && quoteOk;
    onValidityChange?.(valid);
  }, [name, email, quantity, quote?.id, onValidityChange]);

  return (
    <section
      className="
        h-full w-full overflow-hidden
        p-4 grid
        grid-rows-[auto_1fr_auto]
        gap-4
      "
      aria-label="Revisión de cotización"
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className="flex flex-wrap items-baseline gap-2">
            <span className="text-lg font-semibold tracking-wide uppercase">COTIZACIÓN</span>

            {quote?.id && <span className="font-display text-2xl font-semibold">#{quote.id}</span>}
          </h4>
          <p className="text-xs md:text-sm text-muted-foreground uppercase">
            MODO: {mapModeEs(selectedMode)}
          </p>
        </div>
        <div className="text-right text-xs md:text-sm">
          {loading ? (
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader className="h-4 w-4 animate-spin" />
              Generando cotización…
            </div>
          ) : error ? (
            <span className="text-red-600">Error al cotizar</span>
          ) : quote ? (
            <>
              <p className="text-muted-foreground">{fmtDate(quote.fecha_creacion)}</p>
            </>
          ) : (
            <p className="text-muted-foreground">Aún no hay cotización generada.</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4 overflow-hidden">
        <div className="col-span-12 md:col-span-5 h-full">
          <div className="h-full rounded-xl border-2 p-4 text-base space-y-3 bg-white">
            <Label className="text-xs md:text-sm font-extrabold tracking-wide uppercase">
              RESUMEN DE COTIZACIÓN
            </Label>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader className="h-4 w-4 animate-spin" />
                Generando…
              </div>
            ) : error ? (
              <div className="text-red-600">{error}</div>
            ) : quote ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] md:text-xs font-bold tracking-wide uppercase inline-flex items-center gap-2">
                    <Hash className="h-4 w-4" /> ID
                  </Label>
                  <span className="font-medium">{quote.id ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] md:text-xs font-semibold tracking-wide uppercase inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" /> Fecha
                  </Label>
                  <span>{fmtDate(quote.fecha_creacion)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] md:text-xs font-semibold tracking-wide uppercase inline-flex items-center gap-2">
                    <Coins className="h-4 w-4" /> Moneda
                  </Label>
                  <span>{quote.moneda ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] md:text-xs font-semibold tracking-wide uppercase inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" /> Válida hasta
                  </Label>
                  <span>{fmtDate(quote.valida_hasta)}</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] md:text-xs font-semibold tracking-wide uppercase inline-flex items-center gap-2">
                    <BadgeDollarSign className="h-4 w-4" /> Rango
                  </Label>
                  <div className="text-[34px] leading-none tracking-tight font-extrabold text-[#FF4D00]">
                    {fmtRangeClp(
                      quote?.cotizacion_rango?.cotizacion_min,
                      quote?.cotizacion_rango?.cotizacion_max,
                      quote?.moneda
                    )}
                  </div>
                </div>
                {quote?.notas ? (
                  <p className="text-[11px] text-muted-foreground mt-2">{quote.notas}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-muted-foreground">Sin datos aún.</p>
            )}

            <div className="mt-4 border-t pt-2">
              <p className="font-semibold">Aclaraciones importantes</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  Esta cotización puede ser un <b>rango estimado</b> sujeto a revisión técnica del
                  modelo.
                </li>
                <li>
                  Los tiempos se expresan en <b>días hábiles</b> y pueden ajustarse según cambios.
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="col-span-12 md:col-span-7 h-full">
          <div className="h-full rounded-lg border-2 p-3 bg-white grid grid-rows-[auto_1fr] gap-3">
            <div className="grid grid-cols-2 gap-3 text-base">
              {confirmError ? (
                <div className="col-span-2 text-sm text-red-600">{confirmError}</div>
              ) : null}
              <div className="col-span-2 md:col-span-1">
                <Label className="text-xs font-semibold tracking-wide uppercase inline-flex items-center gap-2">
                  <Hash className="h-4 w-4" /> Cantidad
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={Number.isFinite(quantity) ? quantity : 1}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value || '1')))}
                  disabled={confirming}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label className="text-xs font-semibold tracking-wide uppercase inline-flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Teléfono (opcional)
                </Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+57…"
                  disabled={confirming}
                />
              </div>

              <div className="col-span-2 md:col-span-1">
                <Label className="text-xs font-semibold tracking-wide uppercase inline-flex items-center gap-2">
                  <User className="h-4 w-4" /> Nombre y apellido
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  disabled={confirming}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label className="text-xs font-semibold tracking-wide uppercase inline-flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Correo
                </Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  disabled={confirming}
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-semibold tracking-wide uppercase inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Dirección (opcional)
                </Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle 123 #45-67"
                  disabled={confirming}
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-semibold tracking-wide uppercase inline-flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Notas adicionales
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder="Información para el equipo (usos, colores, cambios…)"
                  disabled={confirming}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
