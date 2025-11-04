import { NextResponse } from 'next/server';
import type { Order } from '@/domain/types';

export async function GET(_req: Request, context: { params: { id: string } }) {
  const { id } = context.params;

  // Mock single-order fetch. If it's the demo "o1", enrich it a bit; otherwise return a stub.
  const demo: Order = {
    id,
    productType: 'LLAVERO',
    includeNFC: true,
    nfcUrl: '',
    description: '',
    referenceImages: [],
    status: 'PENDIENTE_REVISION',
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json(demo);
}

export async function PATCH(req: Request, context: { params: { id: string } }) {
  const { id } = context.params;
  const body = await req.json();

  // Echo-back update. In a real backend you would persist and return the updated entity.
  const updated: Partial<Order> & { id: string } = {
    id,
    ...body,
  };

  return NextResponse.json(updated);
}
