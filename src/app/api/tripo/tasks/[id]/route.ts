import { NextResponse } from 'next/server';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  try {
    const res = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${id}`, {
      headers: { Authorization: `Bearer ${process.env.NEXT_TRIPO_API_KEY ?? ''}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return NextResponse.json({ error: errText || 'Tripo error' }, { status: res.status });
    }

    const json = await res.json();

    if (json.code !== 0 || !json.data) {
      return NextResponse.json(
        { error: json.message || 'Respuesta no válida de Tripo' },
        { status: 502 }
      );
    }

    const d = json.data as {
      task_id: string;
      status:
        | 'queued'
        | 'running'
        | 'success'
        | 'failed'
        | 'banned'
        | 'expired'
        | 'cancelled'
        | 'unknown';
      output?: { model?: string; rendered_image?: string };
      progress?: number;
    };

    const statusMap = {
      queued: 'PENDING',
      running: 'RUNNING',
      success: 'SUCCEEDED',
      failed: 'FAILED',
      banned: 'FAILED',
      expired: 'FAILED',
      cancelled: 'FAILED',
      unknown: 'UNKNOWN',
    } as const;

    const errorMessage =
      (json as any)?.message ||
      (d as any)?.message ||
      (d as any)?.error_message ||
      (d as any)?.status_message ||
      (d as any)?.failure_reason ||
      (d as any)?.reason ||
      null;

    const errorCode =
      (typeof (json as any)?.code === 'number' && (json as any)?.code !== 0
        ? (json as any)?.code
        : null) ??
      (d as any)?.error_code ??
      null;

    return NextResponse.json({
      taskId: d.task_id,
      status: statusMap[d.status] ?? 'UNKNOWN',
      progress: typeof d.progress === 'number' ? d.progress : null,
      glbUrl: d.output?.model ?? null,
      previewUrl: d.output?.rendered_image ?? null,
      errorMessage,
      errorCode,
    });
  } catch (err) {
    console.error('Error consultando tarea Tripo:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
