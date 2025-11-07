'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle2, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';

export function CheckoutSuccessStep() {
  const router = useRouter();

  React.useEffect(() => {
    const t = setTimeout(() => router.push('/'), 4000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <section
      aria-label="Resultado del pedido"
      className="relative flex flex-col items-center justify-center text-center p-8 min-h-[60vh] h-full"
    >
      <div className="mb-6 inline-flex items-center justify-center rounded-full bg-emerald-500/10 p-5">
        <CheckCircle2 className="h-24 w-24 text-emerald-600" />
      </div>

      <h2 className="text-3xl md:text-4xl font-bold text-emerald-600">Pedido creado con éxito</h2>
      <p className="mt-2 text-sm md:text-base text-muted-foreground">
        Revisaremos tu solicitud y te confirmaremos por correo.
      </p>

      <Button
        onClick={() => router.push('/')}
        className="px-5 py-7 rounded-xl border-2 border-foreground/40 bg-background/70 text-foreground bg-white uppercase font-bold mt-6"
      >
        <Home size={24} strokeWidth={2.5} />
        Volver al inicio
      </Button>
    </section>
  );
}
