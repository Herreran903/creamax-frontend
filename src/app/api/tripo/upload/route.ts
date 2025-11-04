import { NextResponse } from 'next/server';

// Relay upload to Tripo to obtain a file_token (or object) so we don't need a public URL.
// Accepts multipart/form-data with field "file".
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    const filename = (typeof (file as any).name === 'string' && (file as any).name) || 'upload.jpg';

    // Build outbound multipart/form-data to Tripo
    const outbound = new FormData();
    // Note: append(name, blob, filename) is supported by the Web FormData API
    outbound.append('file', file, filename);

    const apiKey = process.env.NEXT_TRIPO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server missing NEXT_TRIPO_API_KEY' }, { status: 500 });
    }

    // Tripo upload endpoint (per Docs/Upload)
    const tripoUrl = 'https://api.tripo3d.ai/v2/openapi/upload';

    const res = await fetch(tripoUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        // Do NOT set Content-Type manually; let fetch set boundary for multipart
      },
      body: outbound,
      cache: 'no-store',
    });

    // Prefer JSON error body if available
    let errJson: any = null;
    if (!res.ok) {
      try {
        errJson = await res.json();
      } catch {
        // ignore
      }
      const errText = errJson?.message || (await res.text().catch(() => ''));
      return NextResponse.json(
        {
          error: errText || 'Failed to upload to Tripo',
          code: typeof errJson?.code !== 'undefined' ? errJson.code : undefined,
        },
        { status: res.status }
      );
    }

    const json = (await res.json()) as {
      code: number;
      data?: any;
      message?: string;
    };

    if (json.code !== 0 || !json.data) {
      return NextResponse.json(
        {
          error: json.message || 'Invalid response from Tripo upload',
          code: typeof json.code !== 'undefined' ? json.code : undefined,
        },
        { status: 502 }
      );
    }

    // Commonly returned: data.file_token, or STS object info (bucket/key/object)
    return NextResponse.json({
      code: 0,
      data: json.data,
    });
  } catch (err) {
    console.error('Tripo upload proxy error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
