'use client';

import NewOrderWizard from '@/components/orders/new-order-wizard';
import { OrderProvider } from '@/hooks/use-order';

export default function Page() {
  return (
    <OrderProvider>
      <NewOrderWizard />
    </OrderProvider>
  );
}
