import { NextResponse } from 'next/server';

// --- Helpers ---------------------------------------------------------------

// Recorre el objeto y junta todas las URLs que encuentre (strings y {url})
function collectUrlsDeep(node: any, out: string[] = []): string[] {
  if (!node) return out;
  if (typeof node === 'string') {
    if (node.startsWith('http')) out.push(node);
    return out;
  }
  if (Array.isArray(node)) {
    for (const it of node) collectUrlsDeep(it, out);
    return out;
  }
  if (typeof node === 'object') {
    for (const k of Object.keys(node)) collectUrlsDeep(node[k], out);
  }
  return out;
}

// Intenta seleccionar un preview representativo
function pickPreview(data: any): string | null {
  return (
    data?.preview_url ||
    data?.previewUrl ||
    data?.output?.rendered_image ||
    data?.output?.preview ||
    data?.output?.preview_url ||
    null
  );
}

// Normalizador robusto que busca glb/fbx en distintos campos y estructuras
function normalizeTask(data: any) {
  const statusMap: Record<string, string> = {
    queued: 'PENDING',
    running: 'RUNNING',
    success: 'SUCCEEDED',
    succeeded: 'SUCCEEDED',
    failed: 'FAILED',
    banned: 'FAILED',
    expired: 'FAILED',
    cancelled: 'FAILED',
    unknown: 'UNKNOWN',
  };

  const taskId = data?.task_id || data?.taskId || null;
  const statusRaw = String(data?.status || '').toLowerCase();
  const status = statusMap[statusRaw] ?? data?.status ?? 'UNKNOWN';
  const progress =
    typeof data?.progress === 'number'
      ? data.progress
      : typeof data?.percent === 'number'
        ? data.percent
        : null;

  // 1) Candidatos directos habituales
  const directCandidates: (string | undefined)[] = [
    data?.model_url,
    data?.modelUrl,
    data?.output?.model,
    data?.output?.model_url,
    data?.output?.glb_url,
    data?.output?.fbx_url,
  ];

  // 2) Barrido profundo en todo el objeto
  const deepUrls = collectUrlsDeep(data);

  // 3) Clasificación por extensión
  const all = [...directCandidates.filter(Boolean), ...deepUrls] as string[];
  let glbUrl: string | null = null;
  let fbxUrl: string | null = null;

  for (const u of all) {
    const low = u.toLowerCase();
    // descarta previews webp legacy
    if (low.includes('legacy_mesh.webp')) continue;

    if (!glbUrl && (low.endsWith('.glb') || low.includes('.glb?'))) glbUrl = u;
    if (!fbxUrl && (low.endsWith('.fbx') || low.includes('.fbx?'))) fbxUrl = u;
  }

  const previewUrl = pickPreview(data);

  // 4) Errores
  const errorMessage =
    data?.errorMessage ||
    data?.message ||
    data?.status_message ||
    data?.failure_reason ||
    data?.reason ||
    null;
  const errorCode =
    data?.errorCode || (typeof data?.code === 'number' && data.code !== 0 ? data.code : null);

  return {
    taskId,
    status,
    progress,
    previewUrl: previewUrl ?? null,
    glbUrl: glbUrl ?? null,
    fbxUrl: fbxUrl ?? null,
    errorMessage,
    errorCode,
  };
}

// --- Route -----------------------------------------------------------------

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

    // Normalizar y devolver con tu contrato
    const normalized = normalizeTask(json.data);
    return NextResponse.json(normalized);
  } catch (err) {
    console.error('Error consultando tarea Tripo:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
