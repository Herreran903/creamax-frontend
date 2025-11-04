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

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Content-Disposition': 'inline; filename="model.glb"',
      },
    });
  } catch (err) {
    console.error('Proxy error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
