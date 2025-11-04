import { NextResponse, NextRequest } from 'next/server';
import type { Order } from '@/domain/types';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

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

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await req.json();

  const updated: Partial<Order> & { id: string } = {
    id,
    ...body,
  };

  return NextResponse.json(updated);
}
