import { NextResponse } from 'next/server';
import { putUpload } from './_store';

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    const type = file.type || 'application/octet-stream';
    if (!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(type)) {
      return NextResponse.json({ error: 'Unsupported content-type' }, { status: 415 });
    }

    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const filename = (typeof (file as any).name === 'string' && (file as any).name) || 'upload';
    const id = crypto.randomUUID();

    putUpload({
      id,
      buffer,
      contentType: type,
      filename,
      createdAt: Date.now(),
    });

    const origin = new URL(req.url).origin;
    const url = `${origin}/api/uploads/${id}`;

    return NextResponse.json({ id, url, filename, contentType: type });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
