import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json([
    {
      id: 'o1',
      productType: 'LLAVERO',
      includeNFC: true,
      description: 'Pedido demo',
      referenceImages: [],
      status: 'ENVIADO',
      trackingCode: 'TRACK123',
      createdAt: new Date().toISOString(),
    },
  ]);
}
export async function POST(req: Request) {
  const body = await req.json();
  return NextResponse.json({ id: String(Math.floor(Math.random() * 1000)), ...body });
}
