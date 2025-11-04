import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getModels,
  getOrders,
  getOrder,
  createOrder,
  postQuote,
  updateOrder,
} from '@/services/api/client';

export function useModels() {
  return useQuery({ queryKey: ['models'], queryFn: getModels });
}
export function useOrders() {
  return useQuery({ queryKey: ['orders'], queryFn: getOrders });
}
export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
export function useQuote() {
  return useMutation({ mutationFn: postQuote });
}
export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateOrder(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(id),
    enabled: !!id,
  });
}
