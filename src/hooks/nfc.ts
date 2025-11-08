import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNfcConfig,
  updateNfcConfig,
  updateNfcByShortCode,
  type NfcConfig,
  buildSeriesFromData,
} from '@/lib/api/nfc';

/**
 * Query: NFC Config by id
 */
export function useNfcConfig(id: string | undefined) {
  return useQuery({
    queryKey: ['nfc-config', id],
    queryFn: () => getNfcConfig(id as string),
    enabled: !!id,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: (failureCount, error) => {
      // back-off light for 5xx/Network; fail fast on 4xx
      const msg = (error as Error)?.message || '';
      const is4xx = /\b(400|401|403|404)\b/.test(msg);
      if (is4xx) return false;
      return failureCount < 2;
    },
  });
}

/**
 * Query: Clicks series derived from unified config.data (DMY format)
 * Returns series with date normalized to YYYY-MM-DD so existing chart keeps working.
 */
export function useNfcClicksSeries(id: string | undefined) {
  return useQuery({
    queryKey: ['nfc-clicks', id],
    queryFn: async () => {
      if (!id) throw new Error('ID NFC no definido');
      return getNfcConfig(id);
    },
    enabled: !!id,
    select: (cfg: NfcConfig) => {
      const data = (cfg as any)?.data ?? [];
      const result = buildSeriesFromData(data);
      const toISO = (s: string) => {
        const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
        if (!m) return s;
        const [, dd, mm, yyyy] = m;
        return `${yyyy}-${mm}-${dd}`;
      };
      return {
        ...result,
        series: result.series.map((d) => ({ date: toISO(d.date), count: d.count })),
      };
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: (failureCount, error) => {
      const msg = (error as Error)?.message || '';
      const is4xx = /\b(400|401|403|404)\b/.test(msg);
      if (is4xx) return false;
      return failureCount < 2;
    },
  });
}

/**
 * Mutation: Update NFC target URL (PUT)
 */
export function useUpdateNfcUrl(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ url_destino_actual }: { url_destino_actual: string }) => {
      if (!id) throw new Error('ID NFC no definido');
      return updateNfcConfig(id, { url_destino_actual });
    },
    onSuccess: (updated: NfcConfig) => {
      // update cache and revalidate in background
      qc.setQueryData(['nfc-config', id], updated);
      qc.invalidateQueries({ queryKey: ['nfc-config', id] });
    },
  });
}

/**
 * Mutation: Update NFC target URL by short_code (PUT)
 */
export function useUpdateNfcUrlByShortCode(
  short_code: string | undefined,
  idForInvalidate?: string | undefined
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ url_destino_actual }: { url_destino_actual: string }) => {
      if (!short_code) throw new Error('SHORT CODE no definido');
      return updateNfcByShortCode(short_code, { url_destino_actual });
    },
    onSuccess: (updated: NfcConfig) => {
      if (idForInvalidate) {
        qc.setQueryData(['nfc-config', idForInvalidate], updated);
        qc.invalidateQueries({ queryKey: ['nfc-config', idForInvalidate] });
        qc.invalidateQueries({ queryKey: ['nfc-clicks', idForInvalidate] });
      }
    },
  });
}
