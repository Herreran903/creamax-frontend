import { NextResponse } from 'next/server';
import { getUpload } from '../_store';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const rec = getUpload(id);

  if (!rec) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return new NextResponse(rec.buffer, {
    headers: {
      'Content-Type': rec.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': `inline; filename="${encodeURIComponent(rec.filename)}"`,
      'Access-Control-Allow-Origin': '*',
    },
  });
}
