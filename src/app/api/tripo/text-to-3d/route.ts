import { NextResponse } from 'next/server';

type TripoCreateResponse = {
  code: number;
  data?: { task_id: string };
  message?: string;
};

function getOrigin(req: Request): string {
  const u = new URL(req.url);
  return u.origin;
}

function ensureAbsoluteUrl(req: Request, url: string): string {
  try {
    const u = new URL(url);
    return u.toString();
  } catch {
    // relative url -> prefix origin
    return `${getOrigin(req)}${url.startsWith('/') ? url : `/${url}`}`;
  }
}

function getExtFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname || '';
    const ext = (path.split('.').pop() || '').toLowerCase();
    return ext;
  } catch {
    const path = url.split('?')[0];
    return (path.split('.').pop() || '').toLowerCase();
  }
}

function fileObjectForUrl(absUrl: string) {
  const ext = getExtFromUrl(absUrl);
  const type =
    ext === 'png'
      ? 'png'
      : ext === 'webp'
        ? 'webp'
        : ext === 'jpg' || ext === 'jpeg'
          ? 'jpeg'
          : 'jpg';
  return { type, url: absUrl };
}

// Detect localhost/private hosts that Tripo cannot fetch from
function isPrivateOrLocalUrl(absUrl: string): boolean {
  try {
    const u = new URL(absUrl);
    const host = (u.hostname || '').toLowerCase();

    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return true;
    if (host.startsWith('10.') || host.startsWith('192.168.')) return true;
    if (host.startsWith('172.')) {
      const parts = host.split('.');
      const second = Number(parts[1] || '0');
      if (second >= 16 && second <= 31) return true;
    }
    return false;
  } catch {
    return true;
  }
}

function isSupportedImageExtForImageToModel(ext: string): boolean {
  return ext === 'jpg' || ext === 'jpeg' || ext === 'png';
}

// Server-side helper: fetch a (possibly private) URL, upload the bytes to Tripo,
// and return a file_token so Tripo doesn't need to fetch from our origin.
async function uploadUrlToTripo(absUrl: string): Promise<string> {
  const imgResp = await fetch(absUrl, { cache: 'no-store' });
  if (!imgResp.ok) {
    const t = await imgResp.text().catch(() => '');
    throw new Error(t || 'No se pudo leer la imagen local');
  }
  const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
  const buf = await imgResp.arrayBuffer();
  let filename = 'upload.jpg';
  try {
    const u = new URL(absUrl);
    const base = u.pathname.split('/').pop();
    if (base) filename = base;
  } catch {
    /* ignore */
  }

  const fd = new FormData();
  fd.append('file', new Blob([buf], { type: contentType }), filename);

  const apiKey =
    process.env.NEXT_TRIPO_API_KEY ||
    process.env.TRIPO_API_KEY ||
    process.env.NEXT_PUBLIC_TRIPO_API_KEY;
  if (!apiKey) throw new Error('Falta NEXT_TRIPO_API_KEY');

  const up = await fetch('https://api.tripo3d.ai/v2/openapi/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: fd,
    cache: 'no-store',
  });

  const upJson: any = await up
    .json()
    .catch(async () => ({ message: await up.text().catch(() => '') }));
  if (
    !up.ok ||
    typeof upJson?.code !== 'number' ||
    upJson.code !== 0 ||
    !upJson?.data?.file_token
  ) {
    const msg = (upJson && (upJson.message || upJson.error)) || 'Fallo subiendo imagen a Tripo';
    throw new Error(msg);
  }
  return String(upJson.data.file_token);
}

export async function POST(req: Request) {
  try {
    const input = (await req.json().catch(() => ({}))) as Record<string, any>;

    let {
      type,
      prompt,
      negative_prompt,
      imageUrl,
      imageFileToken,
      imageObject,
      files,
      model_version,
      // pass-through options (we'll forward if provided)
      face_limit,
      texture,
      pbr,
      texture_seed,
      texture_alignment,
      texture_quality,
      auto_size,
      style,
      orientation,
      quad,
      compress,
      smart_low_poly,
      generate_parts,
      geometry_quality,
      model_seed,
      image_seed,
      // texture_model specific
      original_model_task_id,
      // refine_model specific
      draft_model_task_id,
      // generate_image specific
      t_pose,
      sketch_to_render,
    } = input || {};

    // Decide task type if not explicitly provided
    let taskType: string =
      typeof type === 'string' && type.trim()
        ? type
        : Array.isArray(files) && files.length
          ? 'multiview_to_model'
          : imageFileToken || imageObject || imageUrl
            ? 'image_to_model'
            : 'text_to_model';

    // Basic validations per type
    if (
      taskType === 'text_to_model' ||
      taskType === 'text_to_image' ||
      taskType === 'generate_image'
    ) {
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return NextResponse.json({ error: 'Prompt inválido o vacío' }, { status: 400 });
      }
    }

    if (taskType === 'image_to_model' || taskType === 'generate_image') {
      const hasToken = typeof imageFileToken === 'string' && !!imageFileToken.trim();
      const hasObject = !!imageObject && typeof imageObject === 'object';
      const hasUrl = typeof imageUrl === 'string' && !!imageUrl.trim();
      if (!hasToken && !hasObject && !hasUrl) {
        return NextResponse.json(
          { error: 'Falta archivo de imagen: provee imageFileToken, imageObject o imageUrl' },
          { status: 400 }
        );
      }
    }

    if (taskType === 'multiview_to_model') {
      if (!Array.isArray(files) || files.length === 0) {
        return NextResponse.json(
          { error: 'Faltan archivos multivista (files[])' },
          { status: 400 }
        );
      }
    }

    if (taskType === 'texture_model') {
      if (!original_model_task_id || typeof original_model_task_id !== 'string') {
        return NextResponse.json({ error: 'Falta original_model_task_id' }, { status: 400 });
      }
    }

    if (taskType === 'refine_model') {
      if (!draft_model_task_id || typeof draft_model_task_id !== 'string') {
        return NextResponse.json({ error: 'Falta draft_model_task_id' }, { status: 400 });
      }
      // Docs: refine is NOT supported for model_version >= v2.0-20240919.
      // Compute an effective version locally without relying on symbols declared later.
      const mvLocal = typeof model_version === 'string' ? model_version : 'v1.4-20240625';
      const disallowRefine = mvLocal.startsWith('v2.') || mvLocal.startsWith('v3.');
      if (disallowRefine) {
        return NextResponse.json(
          { error: 'refine_model no es compatible con versiones v2.x o v3.x del modelo' },
          { status: 400 }
        );
      }
    }

    // Defaults per type
    const mdlVersion =
      model_version ||
      (taskType === 'text_to_image' || taskType === 'generate_image'
        ? 'flux.1_kontext_pro'
        : 'v2.5-20250123');

    // Feature gates by version (according to docs)
    const isV3Plus = typeof mdlVersion === 'string' && mdlVersion.startsWith('v3.');
    const isV2Plus = typeof mdlVersion === 'string' && mdlVersion.startsWith('v2.');
    const isV2OrV3 = isV2Plus || isV3Plus;

    const payload: Record<string, any> = {
      type: taskType,
      model_version: mdlVersion,
    };

    // Common optional params (only add if defined)
    const maybeAssign = (key: string, val: any) => {
      if (typeof val !== 'undefined') payload[key] = val;
    };

    // Apply geometry options only if explicitly provided by the client.
    // Avoid forcing defaults that may conflict with Tripo validations.
    if (
      taskType.endsWith('_to_model') ||
      taskType === 'texture_model' ||
      taskType === 'refine_model'
    ) {
      if (typeof texture !== 'undefined') maybeAssign('texture', texture);
      if (typeof pbr !== 'undefined') maybeAssign('pbr', pbr);
      if (typeof smart_low_poly !== 'undefined') maybeAssign('smart_low_poly', smart_low_poly);
      if (typeof auto_size !== 'undefined') maybeAssign('auto_size', auto_size);
      // geometry_quality only valid for v3.x (docs)
      if (isV3Plus && typeof geometry_quality !== 'undefined') {
        maybeAssign('geometry_quality', geometry_quality);
      }
      if (typeof face_limit !== 'undefined') maybeAssign('face_limit', face_limit);
      if (typeof texture_quality !== 'undefined') maybeAssign('texture_quality', texture_quality);
      if (typeof texture_seed !== 'undefined') maybeAssign('texture_seed', texture_seed);
      // texture_alignment only valid for v2.0+ (docs)
      if (isV2OrV3 && typeof texture_alignment !== 'undefined') {
        maybeAssign('texture_alignment', texture_alignment);
      }
      if (typeof style !== 'undefined') maybeAssign('style', style);
      if (typeof orientation !== 'undefined') maybeAssign('orientation', orientation);
      if (typeof quad !== 'undefined') maybeAssign('quad', quad);
      if (typeof compress !== 'undefined') maybeAssign('compress', compress);
      if (typeof generate_parts !== 'undefined') maybeAssign('generate_parts', generate_parts);
      if (typeof model_seed !== 'undefined') maybeAssign('model_seed', model_seed);
    }

    // Per-type shaping
    switch (taskType) {
      case 'text_to_model': {
        payload.prompt = String(prompt).trim();
        maybeAssign('negative_prompt', negative_prompt);
        maybeAssign('image_seed', image_seed);
        break;
      }
      case 'image_to_model': {
        // Prefer file_token/object when provided (bypasses public URL requirement)
        if (typeof imageFileToken === 'string' && imageFileToken.trim()) {
          // Include type as recommended by docs
          payload.file = { type: 'jpg', file_token: String(imageFileToken).trim() };
          break;
        }
        if (imageObject && typeof imageObject === 'object') {
          // Map STS/object and include type as recommended by docs.
          const obj: any = imageObject;
          const ftype =
            (typeof obj?.type === 'string' && obj.type) ||
            (typeof obj?.mime_type === 'string' && (obj.mime_type.includes('png') ? 'png' : 'jpg')) ||
            'jpg';

          if (obj.bucket && obj.key) {
            payload.file = { type: ftype, bucket: String(obj.bucket), key: String(obj.key) };
          } else if (obj.object && typeof obj.object === 'object') {
            payload.file = { type: ftype, object: obj.object };
          } else {
            payload.file = { type: ftype, object: obj };
          }
          break;
        }

        // Else, use URL. If it's private/local, upload it to Tripo to obtain a file_token.
        const abs = ensureAbsoluteUrl(req, String(imageUrl));
        const ext = getExtFromUrl(abs);
        const inferredType = ext === 'png' ? 'png' : 'jpg';

        if (isPrivateOrLocalUrl(abs)) {
          try {
            const token = await uploadUrlToTripo(abs);
            payload.file = { type: inferredType, file_token: token };
          } catch (e: any) {
            return NextResponse.json(
              { error: e?.message || 'No fue posible subir la imagen a Tripo' },
              { status: 400 }
            );
          }
          break;
        }

        // Public URL path: ensure JPG/PNG per docs
        if (!isSupportedImageExtForImageToModel(ext)) {
          return NextResponse.json(
            {
              error:
                'Formato de imagen no soportado para image_to_model. Usa JPG o PNG (máx. 20MB).',
            },
            { status: 415 }
          );
        }

        payload.file = { type: inferredType, url: abs };
        break;
      }
      case 'multiview_to_model': {
        // files: must be length 4 in order [front, left, back, right] (per docs)
        // Accept either array of strings (urls) or {url|file_token|object,...}
        const mapped = (files as any[]).map((f) => {
          if (!f) return {};
          if (typeof f === 'string') {
            const abs = ensureAbsoluteUrl(req, f);
            return fileObjectForUrl(abs);
          }
          // pass-through known fields
          const o: any = {};
          if (f.url) o.url = ensureAbsoluteUrl(req, String(f.url));
          if (f.file_token) o.file_token = String(f.file_token);
          if (f.object) o.object = f.object;
          if (f.bucket) o.bucket = String(f.bucket);
          if (f.key) o.key = String(f.key);
          if (f.type) o.type = String(f.type);
          return o;
        });
        payload.files = mapped;
        // optional prompt even for multiview
        if (prompt && typeof prompt === 'string') payload.prompt = prompt.trim();
        break;
      }
      case 'text_to_image': {
        payload.prompt = String(prompt).trim();
        maybeAssign('negative_prompt', negative_prompt);
        break;
      }
      case 'generate_image': {
        payload.prompt = String(prompt).trim();
        maybeAssign('negative_prompt', negative_prompt);

        if (typeof imageFileToken === 'string' && imageFileToken.trim()) {
          payload.file = { type: 'jpeg', file_token: String(imageFileToken).trim() };
        } else if (imageObject && typeof imageObject === 'object') {
          payload.file = { object: imageObject };
        } else if (imageUrl) {
          const abs = ensureAbsoluteUrl(req, String(imageUrl));
          payload.file = fileObjectForUrl(abs);
        }

        maybeAssign('t_pose', t_pose);
        maybeAssign('sketch_to_render', sketch_to_render);
        break;
      }
      case 'texture_model': {
        payload.original_model_task_id = String(original_model_task_id);
        // If style image is provided via imageUrl, forward as style_image
        if (imageUrl) {
          const abs = ensureAbsoluteUrl(req, String(imageUrl));
          payload.texture_prompt = { image: fileObjectForUrl(abs) };
        } else if (prompt && typeof prompt === 'string') {
          payload.texture_prompt = { text: prompt.trim() };
        }
        break;
      }
      case 'refine_model': {
        payload.draft_model_task_id = String(draft_model_task_id);
        break;
      }
      default: {
        return NextResponse.json(
          { error: `Tipo de tarea no soportado: ${taskType}` },
          { status: 400 }
        );
      }
    }

    const apiKey =
      process.env.NEXT_TRIPO_API_KEY ||
      process.env.TRIPO_API_KEY ||
      process.env.NEXT_PUBLIC_TRIPO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Falta NEXT_TRIPO_API_KEY (o TRIPO_API_KEY)' },
        { status: 500 }
      );
    }
    const res = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!res.ok) {
      // Try to parse JSON to extract Tripo error details; fallback to text
      let errBody: any = null;
      try {
        errBody = await res.json();
      } catch {
        // ignore
      }
      const errText = !errBody ? await res.text().catch(() => '') : '';
      return NextResponse.json(
        {
          error:
            (errBody && (errBody.message || errBody.error)) || errText || 'Error al crear tarea',
          code: (errBody && typeof errBody.code !== 'undefined' ? errBody.code : undefined) as
            | number
            | undefined,
        },
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
