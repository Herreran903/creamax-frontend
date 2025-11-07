import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: text || 'Failed to fetch resource' },
        { status: res.status }
      );
    }

    const buf = await res.arrayBuffer();

    // Preserve upstream content type when possible; infer from URL otherwise
    let contentType = res.headers.get('content-type') || '';
    if (!contentType) {
      try {
        const u = new URL(url);
        const ext = (u.pathname.split('.').pop() || '').toLowerCase();
        contentType =
          ext === 'glb'
            ? 'model/gltf-binary'
            : ext === 'gltf'
              ? 'model/gltf+json'
              : ext === 'fbx'
                ? 'application/octet-stream'
                : ext === 'obj'
                  ? 'model/obj'
                  : ext === 'stl'
                    ? 'model/stl'
                    : 'application/octet-stream';
      } catch {
        contentType = 'application/octet-stream';
      }
    }

    // Derive filename from URL for better UX
    let filename = 'resource';
    try {
      const u = new URL(url);
      const base = u.pathname.split('/').pop();
      if (base) filename = base;
    } catch {
      // keep default
    }

    return new NextResponse(buf, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (err) {
    console.error('Proxy error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
