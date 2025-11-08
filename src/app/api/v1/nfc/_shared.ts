import { NextRequest, NextResponse } from 'next/server';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function withCors(res: NextResponse) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v as string));
  return res;
}

// Toggle mock mode (can also be driven by env in consuming routes if desired)
export const USE_MOCK: boolean = true;

export const API_BASE_URL = (
  process.env.NEXT_URL_BACKEND ??
  process.env.API_BASE_URL ??
  ''
).replace(/\/+$/, '');

export function resolveUseMock(req: NextRequest): boolean {
  const q = new URL(req.url).searchParams.get('mock');
  if (q == null) return USE_MOCK;
  const s = q.toLowerCase();
  if (s === '1' || s === 'true' || s === 'yes') return true;
  if (s === '0' || s === 'false' || s === 'no') return false;
  return USE_MOCK;
}

export type StoreRaw = {
  nfc_id: number;
  item_id: number | string;
  'short-code'?: string;
  short_code?: string;
  url_destino_actual: string;
  url_short_code?: string;
  weekly_data?: Record<string, number>;
  data?: Array<{ dia: string; clicks: number }>;
};

export const STORE = new Map<string, StoreRaw>();

function pad2(n: number) {
  return String(n).padStart(2, '0');
}
function toDMY(d: Date) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function fromISOtoDMY(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, y, mm, dd] = m;
  return `${dd}/${mm}/${y}`;
}
function buildHostShortUrl(req: NextRequest, short_code: string) {
  const host = req.headers.get('host') ?? 'localhost';
  return `${host}/${short_code}`;
}
export function generateMockData(days = 7) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  const out: Array<{ dia: string; clicks: number }> = [];
  const cur = new Date(start);
  let i = 0;
  while (cur <= end) {
    out.push({ dia: toDMY(cur), clicks: i % 3 === 0 ? 0 : 5 + (i % 4) });
    i++;
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function unifyResponseShape(
  raw: any,
  req: NextRequest
): {
  item_id: string;
  short_code: string;
  url_short_code: string;
  url_destino_actual: string;
  data: Array<{ dia: string; clicks: number }>;
} {
  const short_code: string = raw?.short_code ?? raw?.['short-code'] ?? raw?.shortCode ?? '';
  const item_id: string =
    raw?.item_id != null ? String(raw.item_id) : raw?.itemId != null ? String(raw.itemId) : '';
  const url_destino_actual: string = raw?.url_destino_actual ?? raw?.urlDestinoActual ?? '';
  const url_short_code: string =
    raw?.url_short_code ??
    raw?.urlShortCode ??
    (short_code ? buildHostShortUrl(req, short_code) : '');
  let dataArr: Array<{ dia: string; clicks: number }> = Array.isArray(raw?.data) ? raw.data : [];
  if (
    (!dataArr || dataArr.length === 0) &&
    raw?.weekly_data &&
    typeof raw.weekly_data === 'object'
  ) {
    dataArr = Object.entries(raw.weekly_data).map(([iso, clicks]: [string, any]) => ({
      dia: fromISOtoDMY(iso),
      clicks: Number(clicks) || 0,
    }));
  }
  if (!Array.isArray(dataArr)) dataArr = [];
  dataArr = dataArr
    .filter((d) => d && typeof d.dia === 'string' && Number.isFinite(Number(d.clicks)))
    .map((d) => ({ dia: d.dia, clicks: Number(d.clicks) }));
  return { item_id, short_code, url_short_code, url_destino_actual, data: dataArr };
}

// Seed shared mock data
STORE.set('m1', {
  nfc_id: 50,
  item_id: 'm1',
  'short-code': 'xyz789',
  url_destino_actual: 'https://landingpage.com/campana_q4_2025',
  url_short_code: 'localhost/xyz789',
  data: generateMockData(),
});
