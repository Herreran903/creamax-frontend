import { NextRequest, NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const API_BASE_URL = (process.env.NEXT_URL_BACKEND ?? process.env.API_BASE_URL ?? '').replace(/\/+$/, '');

const BACKEND_URL = `${API_BASE_URL}/custom/confirmation`; 

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
    const body = (await req.json().catch(() => ({})));

    if (!body?.cotizacion_id || typeof body.cotizacion_id !== 'number') {
      const res = NextResponse.json(
        { error: { codigo: 'VALIDATION_ERROR', mensaje: 'cotizacion_id requerido' } },
        { status: 400 }
      );
      return withCors(res);
    }
 
    if (!API_BASE_URL) {
      const res = NextResponse.json(
        { error: { codigo: 'CONFIG_ERROR', mensaje: 'API_BASE_URL no configurada' } },
        { status: 500 }
      );
      return withCors(res);
    }
 
    const backendResponse = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // 3. Manejar la respuesta del backend
    const data = await backendResponse.json();
    const status_code = backendResponse.status;
    
    // 4. Retornar la respuesta (exitosa o con error) del backend al cliente
    const res = NextResponse.json(data, { status: status_code });
    return withCors(res);
  } catch (error: any) {
      const res = NextResponse.json(
        {
          error: {
            codigo: 'PROXY_ERROR',
            mensaje: 'No se pudo conectar con el servicio de pedidos.',
            detalles: error?.message,
          },
        },
        { status: 503 } // Service Unavailable
      );
      return withCors(res);
  }
}

/*
type ConfirmationBody = {
  cotizacion_id?: number;
  nombre?: string;
  email?: string;
  telefono?: string;
  rut?: string;
  direccion?: string;
  comentarios?: string;
  cantidad?: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ConfirmationBody;

    // Basic validation
    if (!body?.cotizacion_id || typeof body.cotizacion_id !== 'number') {
      const res = NextResponse.json(
        { error: { codigo: 'VALIDATION_ERROR', mensaje: 'cotizacion_id requerido' } },
        { status: 400 }
      );
      return withCors(res);
    }

    // Simulated latency 300–800 ms
    const delay = 300 + Math.floor(Math.random() * 501);
    await new Promise((r) => setTimeout(r, delay));

    const now = new Date().toISOString();
    const resp = {
      pedido_id: 105,
      item_personalizado_id: body.cotizacion_id,
      cantidad: typeof body.cantidad === 'number' ? body.cantidad : 1,
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
      {
        error: {
          codigo: 'INTERNAL_ERROR',
          mensaje: err?.message ?? 'Error desconocido',
        },
      },
      { status: 500 }
    );
    return withCors(res);
  }
}
*/