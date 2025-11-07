/**
 * NFC API: types, adapters, and client functions
 * Follows the same patterns as createCustomConfirmation() in this project:
 * - fetch-based client
 * - explicit error handling with readable messages
 * - adapters to normalize short_code vs short-code
 */

export type NfcConfigResponseRaw = {
  nfc_id: number;
  item_id: number;
  'short-code'?: string;
  short_code?: string;
  url_destino_actual: string;
};

export type NfcConfig = {
  nfc_id: number;
  item_id: number;
  short_code: string;
  url_destino_actual: string;
};

export function adaptNfcConfig(raw: NfcConfigResponseRaw): NfcConfig {
  const short_code = raw.short_code ?? (raw as any)['short-code'] ?? '';
  return {
    nfc_id: raw.nfc_id,
    item_id: raw.item_id,
    short_code,
    url_destino_actual: raw.url_destino_actual,
  };
}

export type WeeklyData = Record<string, number>;

export type WeeklyStatsEntryRaw = {
  short_code?: string;
  'short-code'?: string;
  weekly_data: WeeklyData;
};

export type WeeklyStatsEntry = {
  short_code: string;
  weekly_data: WeeklyData;
};

export function adaptWeeklyStatsEntry(raw: WeeklyStatsEntryRaw): WeeklyStatsEntry {
  const short_code = raw.short_code ?? (raw as any)['short-code'] ?? '';
  return { short_code, weekly_data: raw.weekly_data ?? {} };
}

/**
 * GET /api/v1/nfc/config/:id
 */
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

/**
 * GET /api/v1/nfc/stats/weekly
 */
export async function getWeeklyStats(init?: RequestInit): Promise<WeeklyStatsEntry[]> {
  const res = await fetch('/api/v1/nfc/stats/weekly', {
    ...(init || {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Error ${res.status} al cargar estadísticas semanales`);
  }
  const raw = (await res.json()) as WeeklyStatsEntryRaw[];
  return raw.map(adaptWeeklyStatsEntry);
}

/**
 * PUT /api/v1/nfc/config/:id
 * Body: { url_destino_actual: string }
 */
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

/**
 * Utilidades
 */

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
 * Prepara una serie de 7 días consecutivos (incluyendo ceros) basada en weekly_data.
 * Si no se proporcionan límites, se intenta deducirlos de las claves del objeto.
 */
export function buildSevenDaySeries(weekly_data: WeeklyData, from?: string, to?: string) {
  const keys = Object.keys(weekly_data || {}).sort();
  let start: Date;
  let end: Date;

  if (from && to) {
    start = new Date(from);
    end = new Date(to);
  } else if (keys.length > 0) {
    // Últimos 7 días hasta el máximo disponible
    end = new Date(keys[keys.length - 1]);
    start = new Date(end);
    start.setDate(end.getDate() - 6);
  } else {
    // Sin datos: usar la semana actual como referencia
    end = new Date();
    end.setHours(0, 0, 0, 0);
    start = new Date(end);
    start.setDate(end.getDate() - 6);
  }

  const series: { date: string; count: number }[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const iso = cur.toISOString().slice(0, 10);
    series.push({ date: iso, count: weekly_data?.[iso] ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }

  const total = series.reduce((acc, d) => acc + d.count, 0);
  const minDate = series[0]?.date ?? '';
  const maxDate = series[series.length - 1]?.date ?? '';

  return { series, total, minDate, maxDate };
}