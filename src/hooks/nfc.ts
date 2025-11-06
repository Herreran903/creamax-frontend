import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNfcConfig,
  getWeeklyStats,
  updateNfcConfig,
  type NfcConfig,
  type WeeklyStatsEntry,
  buildSevenDaySeries,
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
 * Query: Weekly stats filtered by short_code; returns 7-day padded series and totals
 */
export function useWeeklyStatsForCode(short_code: string | undefined) {
  return useQuery({
    queryKey: ['nfc-weekly-stats', short_code],
    queryFn: async () => {
      const all = await getWeeklyStats();
      const match = all.find((e: WeeklyStatsEntry) => e.short_code === short_code);
      return match ?? null;
    },
    enabled: !!short_code,
    select: (entry) => {
      if (!entry) return { series: [], total: 0, minDate: '', maxDate: '' };
      return buildSevenDaySeries(entry.weekly_data);
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