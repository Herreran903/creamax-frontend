import { NextRequest, NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function withCors(res: NextResponse) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v as string));
  return res;
}

// In-memory store for demo/mock purposes within this route module scope
type NfcConfigRaw = {
  nfc_id: number;
  item_id: number;
  'short-code': string; // deliver with hyphen to test client normalization
  url_destino_actual: string;
};

const STORE = new Map<string, NfcConfigRaw>();

// Seed with example required by spec (id=50)
STORE.set('50', {
  nfc_id: 50,
  item_id: 42,
  'short-code': 'xyz789',
  url_destino_actual: 'https://landingpage.com/campana_q4_2025',
});

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  return withCors(res);
}

export async function GET(_req: NextRequest, ctx: any) {
  try {
    const { id } = await ctx?.params;

    // Simulated latency 200–600 ms
    const delay = 200 + Math.floor(Math.random() * 401);
    await new Promise((r) => setTimeout(r, delay));

    const found = STORE.get(String(id));
    if (!found) {
      const res = NextResponse.json(
        {
          error: {
            codigo: 'NOT_FOUND',
            mensaje: 'Configuración NFC no encontrada',
            detalles: { id },
          },
        },
        { status: 404 }
      );
      return withCors(res);
    }

    const res = NextResponse.json(found, { status: 200 });
    return withCors(res);
  } catch (err: any) {
    const res = NextResponse.json(
      { error: { codigo: 'INTERNAL_ERROR', mensaje: err?.message ?? 'Error desconocido' } },
      { status: 500 }
    );
    return withCors(res);
  }
}

export async function PUT(req: NextRequest, ctx: any) {
  try {
    const { id } = await ctx?.params;
    const body = (await req.json().catch(() => ({}))) as Partial<NfcConfigRaw>;

    if (!STORE.has(String(id))) {
      const res = NextResponse.json(
        { error: { codigo: 'NOT_FOUND', mensaje: 'Configuración NFC no encontrada', detalles: { id } } },
        { status: 404 }
      );
      return withCors(res);
    }

    const url = body?.url_destino_actual;
    if (!url || typeof url !== 'string') {
      const res = NextResponse.json(
        { error: { codigo: 'VALIDATION_ERROR', mensaje: 'url_destino_actual requerido' } },
        { status: 400 }
      );
      return withCors(res);
    }

    // Optional: basic URL validation on server
    try {
      const u = new URL(url);
      if (!['http:', 'https:'].includes(u.protocol)) {
        const res = NextResponse.json(
          { error: { codigo: 'VALIDATION_ERROR', mensaje: 'Solo http/https permitidos' } },
          { status: 400 }
        );
        return withCors(res);
      }
    } catch {
      const res = NextResponse.json(
        { error: { codigo: 'VALIDATION_ERROR', mensaje: 'Formato de URL inválido' } },
        { status: 400 }
      );
      return withCors(res);
    }

    const prev = STORE.get(String(id))!;
    const updated: NfcConfigRaw = {
      ...prev,
      url_destino_actual: url,
      // never overwrite other fields not being edited
      'short-code': prev['short-code'],
      nfc_id: prev.nfc_id,
      item_id: prev.item_id,
    };

    STORE.set(String(id), updated);

    // Simulated latency 200–600 ms
    const delay = 200 + Math.floor(Math.random() * 401);
    await new Promise((r) => setTimeout(r, delay));

    const res = NextResponse.json(updated, { status: 200 });
    return withCors(res);
  } catch (err: any) {
    const res = NextResponse.json(
      { error: { codigo: 'INTERNAL_ERROR', mensaje: err?.message ?? 'Error desconocido' } },
      { status: 500 }
    );
    return withCors(res);
  }
}