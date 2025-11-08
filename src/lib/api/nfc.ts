/**
 * NFC API client and helpers for unified config shape used in the app.
 * The server route /api/v1/nfc/config/:id returns this unified shape,
 * but we keep an adapter for robustness.
 */

export type NfcClickPoint = { dia: string; clicks: number };

export type NfcConfigResponseRaw = {
  item_id?: string | number;
  short_code?: string;
  'short-code'?: string;
  url_short_code?: string;
  url_destino_actual?: string;
  data?: Array<{ dia: string; clicks: number }>;
};

export type NfcConfig = {
  item_id: string;
  short_code: string;
  url_short_code: string;
  url_destino_actual: string;
  data: NfcClickPoint[];
};

export function adaptNfcConfig(raw: NfcConfigResponseRaw): NfcConfig {
  const short_code = raw.short_code ?? (raw as any)['short-code'] ?? '';
  const item_id = raw.item_id != null ? String(raw.item_id) : '';
  const url_short_code = raw.url_short_code ?? (short_code ? `${short_code}` : '');
  const url_destino_actual = raw.url_destino_actual ?? '';
  const dataArr = Array.isArray(raw.data) ? raw.data : [];
  const data = dataArr
    .filter((d) => d && typeof d.dia === 'string' && Number.isFinite(Number(d.clicks)))
    .map((d) => ({ dia: d.dia, clicks: Number(d.clicks) }));

  return { item_id, short_code, url_short_code, url_destino_actual, data };
}

export async function getNfcConfig(id: string, init?: RequestInit): Promise<NfcConfig> {
  const res = await fetch(`/api/v1/nfc/config/${encodeURIComponent(id)}`, {
    ...(init || {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Error ${res.status} al cargar la configuración NFC`);
  }
  const raw = (await res.json()) as NfcConfigResponseRaw;
  return adaptNfcConfig(raw);
}

export async function updateNfcConfig(
  id: string,
  body: { url_destino_actual: string },
  init?: RequestInit
): Promise<NfcConfig> {
  const res = await fetch(`/api/v1/nfc/config/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    body: JSON.stringify({ url_destino_actual: body.url_destino_actual }),
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Error ${res.status} al actualizar la configuración NFC`);
  }
  const raw = (await res.json()) as NfcConfigResponseRaw;
  return adaptNfcConfig(raw);
}
export async function updateNfcByShortCode(
  short_code: string,
  body: { url_destino_actual: string },
  init?: RequestInit
): Promise<NfcConfig> {
  const res = await fetch(`/api/v1/nfc/actualizar/${encodeURIComponent(short_code)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    body: JSON.stringify({ url_destino_actual: body.url_destino_actual }),
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Error ${res.status} al actualizar la URL por short_code`);
  }
  const raw = (await res.json()) as NfcConfigResponseRaw;
  return adaptNfcConfig(raw);
}

export function validateNfcUrl(url: string): { valid: boolean; reason?: string } {
  if (!url || typeof url !== 'string') return { valid: false, reason: 'URL requerida' };
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) {
      return { valid: false, reason: 'Solo se permiten protocolos http y https' };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Formato de URL inválido' };
  }
}

/**
 * Build chart series from an array of { dia: 'dd/mm/yyyy', clicks }.
 * Aggregates duplicates for the same day and sorts ascending by date.
 */
export function buildSeriesFromData(data: NfcClickPoint[]) {
  const agg = new Map<string, number>();
  for (const p of data || []) {
    if (!p || typeof p.dia !== 'string') continue;
    const key = p.dia.trim();
    const c = Number(p.clicks) || 0;
    agg.set(key, (agg.get(key) ?? 0) + c);
  }
  const parseDMY = (s: string) => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
    if (!m) return new Date(NaN);
    const [_, dd, mm, yyyy] = m;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  };
  const ordered = Array.from(agg.entries()).sort(
    (a, b) => parseDMY(a[0]).getTime() - parseDMY(b[0]).getTime()
  );
  const series = ordered.map(([dia, clicks]) => ({ date: dia, count: clicks }));
  const total = series.reduce((acc, d) => acc + d.count, 0);
  const minDate = series[0]?.date ?? '';
  const maxDate = series[series.length - 1]?.date ?? '';
  return { series, total, minDate, maxDate };
}
