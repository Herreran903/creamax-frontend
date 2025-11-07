export type CustomConfirmationRequest = {
  cotizacion_id: number;
  nombre: string;
  email: string;
  telefono?: string;
  rut?: string;
  direccion?: string;
  comentarios?: string;
  cantidad?: number;
};

export type CustomConfirmationResponse = {
  pedido_id: number;
  item_personalizado_id: number;
  cantidad: number;
  estado: string;
  fecha_pedido: string;
  mensaje: string;
};

export async function createCustomConfirmation(
  payload: CustomConfirmationRequest,
  init?: RequestInit
): Promise<CustomConfirmationResponse> {
  const res = await fetch('/api/v1/custom/confirmation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    ...(init || {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Error ${res.status} al confirmar el pedido`);
  }
  return res.json();
}
