# API: Confirmación de Pedido (Paso 4)

Descripción

- Este endpoint confirma un pedido a partir de una cotización previamente generada (Paso 3).
- Método: POST
- Path: /api/v1/custom/confirmation
- Retorna un objeto de confirmación (pedido) con estado inicial y un mensaje de seguimiento.
- En este proyecto existen implementaciones:
  - Real (mock de backend con validación y latencia simulada): ver [POST()](../../src/app/api/v1/custom/confirmation/route.ts:21)
  - Mock de desarrollo: ver [POST()](../../src/app/mock/api/v1/custom/confirmation/route.ts:15)

Uso en el frontend

- Cliente API: [createCustomConfirmation()](../../src/lib/api/custom-confirmation.ts:24)
- Integración en UI (Paso 3) para enviar confirmación y avanzar al Paso 4:
  - Componente: [QuoteReviewStep()](../../src/components/features/orders/order-wizard/quote-review-step.tsx:28)
  - Wizard: [NewOrderWizard()](../../src/components/features/orders/order-wizard/new-order-wizard.tsx:24)
  - Pantalla final minimalista: [CheckoutSuccessStep()](../../src/components/features/orders/order-wizard/checkout-success-step.tsx:1)

---

## Contrato

Método y Path

- POST /api/v1/custom/confirmation

Request (JSON)

- Debe incluir el id de la cotización y los campos del formulario del paso de revisión:
  - cotizacion_id: number (obligatorio)
  - nombre: string (obligatorio)
  - email: string (obligatorio, formato email válido)
  - telefono?: string (opcional)
  - rut?: string (opcional)
  - direccion?: string (opcional)
  - comentarios?: string (opcional)
  - cantidad?: number (opcional; por defecto el backend puede asignar 1 si no se envía)

Ejemplo de request
{
"cotizacion_id": 42,
"nombre": "Juan Pérez",
"email": "juan.perez@example.com",
"telefono": "+56 9 1234 5678",
"rut": "11.111.111-1",
"direccion": "Av. Providencia 1234, of 12, Santiago",
"comentarios": "Entregar en horario de oficina.",
"cantidad": 500
}

Response (JSON)

- Ejemplo y shape base:
  {
  "pedido_id": 105,
  "item_personalizado_id": 42,
  "cantidad": 500,
  "estado": "Precotización",
  "fecha_pedido": "2025-10-15T10:30:00Z",
  "mensaje": "Pedido recibido. El precio final será confirmado manualmente por correo."
  }

Significado de campos

- pedido_id: number — identificador interno del pedido generado.
- item_personalizado_id: number — referencia a la cotización/ítem personalizado confirmado (suele corresponder a cotizacion_id).
- cantidad: number — cantidad solicitada para el pedido.
- estado: string — estado inicial del pedido (por ejemplo, "Precotización").
- fecha_pedido: string (ISO-8601) — timestamp de creación del pedido.
- mensaje: string — observación/nota del sistema sobre el siguiente paso (p. ej. confirmación por correo).

Códigos de estado

- 201 Created — Confirmación creada con éxito; devuelve el JSON de pedido.
- 400 Bad Request — Error de validación. Ej: falta cotizacion_id o tipos inválidos.
- 404 Not Found — La cotización no existe o es inaccesible (reservado para backend real).
- 500 Internal Server Error — Error inesperado del servidor.

Notas de validación

- cotizacion_id es obligatorio y debe ser number > 0.
- nombre y email deben enviarse (el backend puede validar formato de email y normalizar nombre).
- cantidad debe ser un número entero positivo.
- Campos opcionales (telefono, rut, direccion, comentarios) pueden omitirse y serán ignorados si vienen vacíos.

---

## Ejemplos cURL

Crear confirmación (éxito 201)
curl -X POST http://localhost:3000/api/v1/custom/confirmation \
 -H "Content-Type: application/json" \
 -d '{
"cotizacion_id": 42,
"nombre": "Juan Pérez",
"email": "juan.perez@example.com",
"telefono": "+56 9 1234 5678",
"rut": "11.111.111-1",
"direccion": "Av. Providencia 1234, of 12, Santiago",
"comentarios": "Entregar en horario de oficina.",
"cantidad": 500
}'

Respuesta esperada (201)
{
"pedido_id": 105,
"item_personalizado_id": 42,
"cantidad": 500,
"estado": "Precotización",
"fecha_pedido": "2025-10-15T10:30:00Z",
"mensaje": "Pedido recibido. El precio final será confirmado manualmente por correo."
}

Error de validación (400)
curl -X POST http://localhost:3000/api/v1/custom/confirmation \
 -H "Content-Type: application/json" \
 -d '{ "nombre": "Sin ID de cotización", "email": "x@example.com" }'

Respuesta ejemplo (400)
{
"error": {
"codigo": "VALIDATION_ERROR",
"mensaje": "cotizacion_id requerido"
}
}

---

## Mock para desarrollo

Rutas mock

- POST /mock/api/v1/custom/confirmation
  - Responde 201 con un JSON fijo basado en el ejemplo superior.
  - Valida cotizacion_id (si falta -> 400).
  - Simula latencia 300–800 ms.
  - CORS habilitado.

Implementación mock

- Handler: [POST()](../../src/app/mock/api/v1/custom/confirmation/route.ts:15)

---

## Integración en UI (Wizard Paso 4)

Patrones replicados del paso de “cotización”:

- Estados de carga/éxito/error (sin introducir nuevos controles de navegación; se reutiliza el botón primario del wizard para enviar).
- Al confirmar:
  - Se arma el payload con:
    - cotizacion_id: se obtiene de la respuesta del paso 3 (quote.id).
    - nombre, email, telefono?, direccion?, comentarios? desde el formulario actual.
    - cantidad desde el mismo formulario/resumen.
  - Se llama a [createCustomConfirmation()](../../src/lib/api/custom-confirmation.ts:24).
  - En éxito: se almacena la respuesta en el estado del wizard si se requiere (por ejemplo, para mostrar un mínimo de datos) y se navega al Paso 4.

Piezas principales en el código

- En la vista de revisión (Paso 3): [QuoteReviewStep()](../../src/components/features/orders/order-wizard/quote-review-step.tsx:28)
  - Integra la función createCustomConfirmation, maneja confirmación con estados y notifica al wizard mediante onOrderConfirmed.
- En el wizard: [NewOrderWizard()](../../src/components/features/orders/order-wizard/new-order-wizard.tsx:24)
  - Avanza a Step 4 (checkout/success) cuando onOrderConfirmed entrega la respuesta del backend.
- Pantalla de éxito (Paso 4): [CheckoutSuccessStep()](../../src/components/features/orders/order-wizard/checkout-success-step.tsx:1)
  - Diseño minimalista con motivo visual 3D, mensaje de éxito y botón “Volver al inicio” (más auto-redirect en pocos segundos).
