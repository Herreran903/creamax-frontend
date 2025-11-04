import { NextResponse } from 'next/server';

type TripoCreateResponse = {
  code: number;
  data?: { task_id: string };
  message?: string;
};

export async function POST(req: Request) {
  try {
    const { prompt, imageUrl } = await req.json().catch(() => ({}));

    // Determina el tipo de tarea según inputs
    const type = imageUrl ? 'image_to_model' : 'text_to_model';

    if (type === 'text_to_model') {
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return NextResponse.json({ error: 'Prompt inválido o vacío' }, { status: 400 });
      }
    } else {
      if (!imageUrl || typeof imageUrl !== 'string') {
        return NextResponse.json({ error: 'Falta imageUrl' }, { status: 400 });
      }
    }

    // Cuerpo para Tripo (config de costo bajo y malla optimizada)
    const body: Record<string, any> = {
      type,
      model_version: 'v2.5-20250123',
      texture: false,
      pbr: false,
      smart_low_poly: true,
      geometry_quality: 'standard',
      auto_size: false,
    };

    if (type === 'text_to_model') {
      body.prompt = String(prompt).trim();
    } else {
      body.image_url = imageUrl;
      if (prompt && typeof prompt === 'string') body.prompt = prompt.trim();
    }

    const res = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NEXT_TRIPO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return NextResponse.json(
        { error: errText || 'Error al crear tarea' },
        { status: res.status }
      );
    }

    const json = (await res.json()) as TripoCreateResponse;
    if (json.code !== 0 || !json.data?.task_id) {
      return NextResponse.json(
        { error: json.message || 'Respuesta inválida del servidor Tripo' },
        { status: 502 }
      );
    }

    return NextResponse.json({ taskId: json.data.task_id });
  } catch (err) {
    console.error('Error al crear tarea Tripo:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
