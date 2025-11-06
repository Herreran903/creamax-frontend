'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SelectedMode } from './model-source-tabs';

export type QuoteReviewStepProps = {
  selectedMode: SelectedMode;
  quote: any | null; // puede ser null si aún no hay
  defaultQuantity?: number; // para prellenar
  notes: string;
  onNotesChange: (s: string) => void;
  onBack: () => void;
  onConfirm: (data: {
    quantity: number;
    user: { name: string; email: string; phone?: string };
    address?: string;
    notes: string;
  }) => Promise<void> | void;
};

export default function QuoteReviewStep({
  selectedMode,
  quote,
  defaultQuantity = 50,
  notes,
  onNotesChange,
  onBack,
  onConfirm,
}: QuoteReviewStepProps) {
  const [quantity, setQuantity] = React.useState<number>(defaultQuantity);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');

  const handleConfirm = async () => {
    await onConfirm({
      quantity,
      user: { name, email, phone: phone || undefined },
      address: address || undefined,
      notes,
    });
  };

  return (
    <section
      className="
        h-dvh w-full overflow-hidden
        rounded-md border border-border bg-white/60 backdrop-blur-md
        p-4 grid
        grid-rows-[auto_1fr_auto]
        gap-4
      "
      aria-label="Revisión de cotización"
    >
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Revisión de cotización</h2>
          <p className="text-xs text-muted-foreground">
            Modo seleccionado: <b>{selectedMode}</b>
          </p>
        </div>
        <div className="text-right text-xs">
          {quote ? (
            <>
              <p>
                Rango estimado:{' '}
                <b>
                  {quote.min?.amount ?? '—'}–{quote.max?.amount ?? '—'} {quote.currency ?? ''}
                </b>
              </p>
              <p>
                Tiempo estimado: <b>{quote.estimateDays ?? '—'} días hábiles</b>
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">Aún no hay cotización generada.</p>
          )}
        </div>
      </header>
      <div className="grid grid-cols-12 gap-4 overflow-hidden">
        <div className="col-span-12 md:col-span-5 h-full">
          <div className="h-full rounded-lg border p-3 text-xs space-y-2 bg-white/70">
            <p className="font-semibold">Aclaraciones importantes</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                Esta cotización es un <b>rango estimado</b> porque el modelo puede generarse con IA
                y/o heurísticas adicionales.
              </li>
              <li>
                <b>No es un precio inamovible</b>; puede variar según cambios solicitados, colores,
                acabados y características técnicas del 3D.
              </li>
              <li>
                Los tiempos se expresan en <b>días hábiles</b> y pueden ajustarse si hay retrabajos.
              </li>
            </ul>
          </div>
        </div>
        <div className="col-span-12 md:col-span-7 h-full">
          <div className="h-full rounded-lg border p-3 bg-white/70 grid grid-rows-[auto_1fr] gap-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2 md:col-span-1">
                <label className="text-xs">Cantidad</label>
                <Input
                  type="number"
                  min={1}
                  value={Number.isFinite(quantity) ? quantity : 1}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value || '1')))}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="text-xs">Teléfono (opcional)</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+57…"
                />
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="text-xs">Nombre y apellido</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="text-xs">Correo</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs">Dirección (opcional)</label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle 123 #45-67"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs">Notas adicionales</label>
                <Textarea
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder="Información para el equipo (usos, colores, cambios…)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="flex items-center justify-between">
        <Button
          onClick={onBack}
          className="px-6 py-4 bg-white rounded-xl border-2 border-foreground/40 text-foreground uppercase"
        >
          Volver
        </Button>
        <Button
          onClick={handleConfirm}
          className="rounded-xl px-6 py-4 text-base font-extrabold text-white bg-[#FF4D00] uppercase"
        >
          Confirmar y continuar
        </Button>
      </footer>
    </section>
  );
}
