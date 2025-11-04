import type { Model3D, Order, Quote } from '@/domain/types';

export async function getModels(): Promise<Model3D[]> {
  const r = await fetch('/api/models');
  return r.json();
}
export async function getOrders(): Promise<Order[]> {
  const r = await fetch('/api/orders');
  return r.json();
}
export async function getOrder(id: string): Promise<Order> {
  const r = await fetch(`/api/orders/${id}`);
  return r.json();
}
export async function createOrder(payload: Partial<Order>): Promise<Order> {
  const r = await fetch('/api/orders', { method: 'POST', body: JSON.stringify(payload) });
  return r.json();
}
export async function postQuote(payload: {
  includeNFC: boolean;
  productType: string;
  complexity?: number;
}): Promise<Quote> {
  const r = await fetch('/api/quote', { method: 'POST', body: JSON.stringify(payload) });
  return r.json();
}

export async function updateOrder(id: string, payload: Partial<Order>): Promise<Order> {
  const r = await fetch(`/api/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return r.json();
}
