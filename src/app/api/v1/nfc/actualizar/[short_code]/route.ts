import { NextRequest, NextResponse } from 'next/server';
import { withCors, resolveUseMock, STORE, unifyResponseShape, API_BASE_URL } from '../../_shared';

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  return withCors(res);
}

export async function PUT(req: NextRequest, ctx: any) {
  try {
    const { short_code } = await ctx?.params;
    const useMock = resolveUseMock(req);
    const body = (await req.json().catch(() => ({}))) as { url_destino_actual?: string };
    const nextUrl = body?.url_destino_actual;

    if (!nextUrl || typeof nextUrl !== 'string') {
      const res = NextResponse.json(
        { error: { codigo: 'VALIDATION_ERROR', mensaje: 'url_destino_actual requerido' } },
        { status: 400 }
      );
      return withCors(res);
    }

    try {
      const u = new URL(nextUrl);
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

    if (!useMock) {
      if (!API_BASE_URL) {
        const res = NextResponse.json(
          { error: { codigo: 'CONFIG_ERROR', mensaje: 'API_BASE_URL no configurada' } },
          { status: 503 }
        );
        return withCors(res);
      }

      const backendRes = await fetch(
        `${API_BASE_URL}/nfc/actualizar/${encodeURIComponent(String(short_code))}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url_destino_actual: nextUrl }),
        }
      );

      const raw = await backendRes.json().catch(() => ({}));
      if (!backendRes.ok) {
        const res = NextResponse.json(
          raw || { error: { codigo: 'UPSTREAM_ERROR', mensaje: 'Error del backend' } },
          { status: backendRes.status }
        );
        return withCors(res);
      }

      const payload = unifyResponseShape(raw, req);
      const res = NextResponse.json(payload, { status: 200 });
      return withCors(res);
    }

    // MOCK branch: find by short_code in in-memory STORE
    let foundKey: string | null = null;
    let found: any = null;
    for (const [k, rec] of STORE.entries()) {
      const sc = (rec as any).short_code ?? (rec as any)['short-code'];
      if (sc === String(short_code)) {
        foundKey = k;
        found = rec;
        break;
      }
    }

    if (!foundKey || !found) {
      const res = NextResponse.json(
        {
          error: {
            codigo: 'NOT_FOUND',
            mensaje: 'Configuración NFC no encontrada',
            detalles: { short_code },
          },
        },
        { status: 404 }
      );
      return withCors(res);
    }

    const updated = { ...found, url_destino_actual: nextUrl };
    STORE.set(foundKey, updated);
    const payload = unifyResponseShape(updated, req);
    const res = NextResponse.json(payload, { status: 200 });
    return withCors(res);
  } catch (err: any) {
    const res = NextResponse.json(
      { error: { codigo: 'INTERNAL_ERROR', mensaje: err?.message ?? 'Error desconocido' } },
      { status: 500 }
    );
    return withCors(res);
  }
}
