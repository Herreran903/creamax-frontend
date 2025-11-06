import { Card, CardHeader, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Order } from '@/domain/types';
import Link from 'next/link';

export default function OrderCard({ o, onOpen }: { o: Order; onOpen: (id: string) => void }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-white">Pedido #{o.id}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-white/70">
          {o.productType} · {o.includeNFC ? 'Con NFC' : 'Sin NFC'} ·{' '}
          {o.quote ? `${o.quote.amount} ${o.quote.currency}` : 'Sin cotizar'}
        </p>
        <p className="text-xs text-white/60">Tracking: {o.trackingCode ?? '—'}</p>
      </CardContent>
      <CardFooter className="flex items-center gap-2 justify-between">
        <Badge>{o.status}</Badge>
        <Button size="sm" asChild>
          <Link href={`/app/orders/${o.id}`}>Ver</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
