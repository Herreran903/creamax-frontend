import { NextResponse, NextRequest } from 'next/server';
import { getUpload } from '../_store';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const rec = getUpload(id);

  if (!rec) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Convert Node Buffer -> ArrayBuffer slice compatible with Web Response
  const arrayBuffer = rec.buffer.buffer.slice(
    rec.buffer.byteOffset,
    rec.buffer.byteOffset + rec.buffer.byteLength
  );

  // Wrap in Uint8Array to satisfy BodyInit typing (ArrayBufferView)
  return new Response(new Uint8Array(arrayBuffer as ArrayBuffer), {
    headers: {
      'Content-Type': rec.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': `inline; filename="${encodeURIComponent(rec.filename)}"`,
      'Access-Control-Allow-Origin': '*',
    },
  });
}
