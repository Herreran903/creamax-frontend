import { NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function withCors(res: NextResponse) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v as string));
  return res;
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  return withCors(res);
}

function last7Days(): string[] {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  const days: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export async function GET() {
  try {
    // Simulated latency 250–650 ms
    const delay = 250 + Math.floor(Math.random() * 401);
    await new Promise((r) => setTimeout(r, delay));

    const days = last7Days();

    // One series for xyz789 including zeros as required
    const xyz: Record<string, number> = {};
    days.forEach((d, i) => {
      xyz[d] = i % 3 === 0 ? 0 : 5 + (i % 5);
    });

    // Another code to ensure filtering on client
    const other: Record<string, number> = {};
    days.forEach((d, i) => {
      other[d] = 2 + ((i * 3) % 7);
    });

    const payload = [
      // Provide one with hyphenated key to validate adapter normalization if someone uses raw data
      { 'short-code': 'xyz789' as any, weekly_data: xyz },
      { short_code: 'abc123', weekly_data: other },
    ];

    const res = NextResponse.json(payload, { status: 200 });
    return withCors(res);
  } catch (err: any) {
    const res = NextResponse.json(
      { error: { codigo: 'INTERNAL_ERROR', mensaje: err?.message ?? 'Error desconocido (mock)' } },
      { status: 500 }
    );
    return withCors(res);
  }
}