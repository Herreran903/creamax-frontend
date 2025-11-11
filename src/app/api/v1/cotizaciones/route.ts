import { NextRequest, NextResponse } from 'next/server';
import { withCors, resolveUseMock, API_BASE_URL } from '../nfc/_shared';

type Cotizacion = {
  id: number;
  item_personalizado_id: number;
  nombre_personalizado: string;
  cantidad: number;
  cotizacion_rango: string;
  precio_final_unidad: number;
  precio_total: number;
  estado: string;
  fecha_pedido: string; // ISO string
  moneda: 'CLP' | string;
};

function sampleData(): Cotizacion[] {
  return [
    {
      id: 105,
      item_personalizado_id: 42,
      nombre_personalizado: 'Llavero Marketing 2025',
      cantidad: 500,
      cotizacion_rango: '4000 - 6000',
      precio_final_unidad: 5200,
      precio_total: 2600000,
      estado: 'Aprobado - En Producción',
      fecha_pedido: '2025-10-15T10:30:00Z',
      moneda: 'CLP',
    },
  ];
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  return withCors(res);
}

export async function GET(req: NextRequest) {
  try {
    if (!API_BASE_URL) {
      const res = NextResponse.json(
        { error: { codigo: 'CONFIG_ERROR', mensaje: 'API_BASE_URL no configurada' } },
        { status: 503 }
      );
      return withCors(res);
    }

    const url = `${API_BASE_URL.replace(/\/+$/, '')}/cotizaciones`;
    const backendRes = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const raw = await backendRes.json().catch(() => null);

    if (!backendRes.ok) {
      const res = NextResponse.json(
        raw || { error: { codigo: 'UPSTREAM_ERROR', mensaje: 'Error del backend' } },
        { status: backendRes.status }
      );
      return withCors(res);
    }

    const arr: any[] = Array.isArray(raw) ? raw : [];

    const normalized: Cotizacion[] = arr.map((r) => ({
      id: Number(r?.id ?? 0),
      item_personalizado_id: Number(r?.item_personalizado_id ?? r?.itemPersonalizadoId ?? 0),
      nombre_personalizado: String(r?.nombre_personalizado ?? r?.nombrePersonalizado ?? ''),
      cantidad: Number(r?.cantidad ?? 0),
      cotizacion_rango: String(r?.cotizacion_rango ?? r?.cotizacionRango ?? ''),
      precio_final_unidad: Number(r?.precio_final_unidad ?? r?.precioFinalUnidad ?? 0),
      precio_total: Number(r?.precio_total ?? r?.precioTotal ?? 0),
      estado: String(r?.estado ?? ''),
      fecha_pedido: String(r?.fecha_pedido ?? r?.fechaPedido ?? ''),
      moneda: String(r?.moneda ?? 'CLP'),
    }));

    const res = NextResponse.json(normalized, { status: 200 });
    return withCors(res);
  } catch (err: any) {
    const res = NextResponse.json(
      { error: { codigo: 'INTERNAL_ERROR', mensaje: err?.message ?? 'Error desconocido' } },
      { status: 500 }
    );
    return withCors(res);
  }
}
