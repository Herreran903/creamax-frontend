import { NextResponse, NextRequest } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function withCors(res: NextResponse) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

// Fixed mock quote (as per spec)
const FIXED_QUOTE = {
  id: 42,
  nombre_personalizado: 'Llavero Marketing 2025',
  fecha_creacion: '2025-10-15T10:00:00Z',
  moneda: 'CLP',
  cotizacion_rango: {
    cotizacion_min: 4000,
    cotizacion_max: 6000,
  },
  desglose: {
    material: 2500,
    mano_obra: 1200,
    energia: 300,
    acabado: 0,
  },
  tiempo_entrega_dias: 5,
  valida_hasta: '2025-10-22T10:00:00Z',
  notas: 'Valores estimados sujetos a revisión técnica.',
};

export async function OPTIONS() {
  // CORS preflight
  const res = new NextResponse(null, { status: 204 });
  return withCors(res);
}

export async function POST(req: NextRequest) {
  try {
    // Parse body to validate shape if desired (but response is fixed)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const body = await req.json().catch(() => null);

    // Simulated latency 300–800 ms
    const delay = 300 + Math.floor(Math.random() * 501);
    await new Promise((r) => setTimeout(r, delay));

    const res = NextResponse.json(FIXED_QUOTE, { status: 200 });
    return withCors(res);
  } catch (err: any) {
    const res = NextResponse.json(
      {
        error: {
          codigo: 'INTERNAL_ERROR',
          mensaje: err?.message ?? 'Error desconocido en mock',
        },
      },
      { status: 500 }
    );
    return withCors(res);
  }
}
