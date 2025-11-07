import { NextRequest, NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const API_BASE_URL = process.env.API_BASE_URL;

const BACKEND_URL = `${API_BASE_URL}/custom/create`; 

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
    // 1. Obtener el cuerpo de la solicitud tal cual
    const body = await req.json().catch(() => ({}));
    
    // 2. Reenviar la solicitud al backend FastAPI/Python
    const backendResponse = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Opcional: Reenviar tokens de autorización si los tienes
        // 'Authorization': req.headers.get('Authorization') || '', 
      },
      body: JSON.stringify(body),
    });

    // 3. Manejar la respuesta del backend
    const data = await backendResponse.json();
    const status_code = backendResponse.status;
    
    // 4. Retornar la respuesta (exitosa o con error) del backend al cliente
    const res = NextResponse.json(data, { status: status_code });
    return withCors(res);

  } catch (err: any) {
    // Esto captura errores de red (ej. el backend está caído o no responde)
    const res = NextResponse.json(
      {
        error: {
          codigo: 'PROXY_ERROR',
          mensaje: 'No se pudo conectar con el servicio de cotización (Backend).',
          detalles: err?.message,
        },
      },
      { status: 503 } // Service Unavailable
    );
    return withCors(res);
  }
}


/*
type CreateBody = {
  version?: string;
  fuente_modelo?: 'ai' | '3d_upload' | 'texture_image' | 'svg';
  nombre_personalizado?: string;
  usuario_id?: string;
  modelo?: {
    modelo_id?: string | null;
    archivo_id?: string | null;
    url?: string | null;
    svg?: string | null;
    textura_imagen_id?: string | null;
    parametros_generacion_ai?: {
      prompt?: string;
      semilla?: number | null;
      variacion?: string | null;
      motor?: string | null;
    } | null;
    thumbnail_url?: string | null;
  };
  parametros?: {
    material?: string;
    color?: string;
    acabado?: string;
    dimension_unidad?: 'mm' | 'cm' | 'in';
    alto?: number;
    ancho?: number;
    profundidad?: number;
    escala?: number;
    cantidad?: number;
    complejidad_estimacion?: 'baja' | 'media' | 'alta';
    tolerancia?: 'fina' | 'estandar' | 'gruesa';
    espesor_minimo?: number;
    // opcionales para textura
    uv_map?: unknown;
    textura_escala?: number;
  };
  metadatos?: {
    app_version?: string;
    locale?: string;
    dispositivo?: string;
    referer?: string;
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as CreateBody;

    // Basic validation (example from spec)
    const qty = Number(body?.parametros?.cantidad ?? 0);
    if (!Number.isFinite(qty) || qty <= 0) {
      const res = NextResponse.json(
        {
          error: {
            codigo: 'VALIDATION_ERROR',
            mensaje: 'parametros.cantidad debe ser mayor a 0',
            detalles: { campo: 'parametros.cantidad' },
          },
        },
        { status: 400 }
      );
      return withCors(res);
    }

    // Simulated latency 300–800 ms
    const delay = 300 + Math.floor(Math.random() * 501);
    await new Promise((r) => setTimeout(r, delay));

    const now = new Date();
    const createdAt = now.toISOString();
    const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fixed-ish response aligned with the provided example, but echoing some request fields
    const nombre = body?.nombre_personalizado || 'Llavero Marketing 2025';

    const response = {
      id: 42,
      nombre_personalizado: nombre,
      fecha_creacion: createdAt,
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
      valida_hasta: validUntil,
      notas: 'Valores estimados sujetos a revisión técnica.',
    };

    const res = NextResponse.json(response, { status: 200 });
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
