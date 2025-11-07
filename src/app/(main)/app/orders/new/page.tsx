'use client';

import NewOrderWizard from '@/components/features/orders/order-wizard/new-order-wizard';
import { OrderProvider } from '@/hooks/use-order';

export default function Page() {
  return (
    <OrderProvider>
      <NewOrderWizard />
    </OrderProvider>
  );
}
