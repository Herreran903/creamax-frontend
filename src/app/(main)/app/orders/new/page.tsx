'use client';

import { Suspense } from 'react';
import NewOrderWizard from '@/components/features/orders/order-wizard/new-order-wizard';
import { OrderProvider } from '@/hooks/use-order';

export default function Page() {
  return (
    <OrderProvider>
      <Suspense fallback={<div>Cargando...</div>}>
        <NewOrderWizard />
      </Suspense>
    </OrderProvider>
  );
}
