import { Suspense } from 'react';
import NewOrderWizard from '@/components/features/orders/order-wizard/new-order-wizard';

export default function Page() {
  return (
    <main className="p-6 max-w-5xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-4">Nuevo pedido</h1>
      <Suspense fallback={<div>Cargando...</div>}>
        <NewOrderWizard />
      </Suspense>
    </main>
  );
}
