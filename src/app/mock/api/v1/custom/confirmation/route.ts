import { NextRequest, NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function withCors(res: NextResponse) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  return withCors(res);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}) as any);

    if (!body?.cotizacion_id) {
      const res = NextResponse.json({ error: 'cotizacion_id requerido' }, { status: 400 });
      return withCors(res);
    }

    // Simulated latency 300–800 ms
    const delay = 300 + Math.floor(Math.random() * 501);
    await new Promise((r) => setTimeout(r, delay));

    const now = new Date().toISOString();
    const resp = {
      pedido_id: 105,
      item_personalizado_id: 42,
      cantidad: typeof body?.cantidad === 'number' ? body.cantidad : 1,
      estado: 'Precotización',
      fecha_pedido: now,
      mensaje: 'Pedido recibido. El precio final será confirmado manualmente por correo.',
    };

    const res = NextResponse.json(resp, {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
    return withCors(res);
  } catch (err: any) {
    const res = NextResponse.json(
      { error: { codigo: 'INTERNAL_ERROR', mensaje: err?.message ?? 'Error desconocido en mock' } },
      { status: 500 }
    );
    return withCors(res);
  }
}
