# API: NFC Configuración, Estadísticas y Vista app/models/:id

Descripción general

Este documento especifica los endpoints NFC, la vista asociada y los contratos de datos. Los patrones siguen los del proyecto (fetch + adaptadores + React Query + toasts).

Implementaciones principales

- Cliente API: [adaptNfcConfig()](../../src/lib/api/nfc.ts:24), [getNfcConfig()](../../src/lib/api/nfc.ts:55), [getWeeklyStats()](../../src/lib/api/nfc.ts:70), [updateNfcConfig()](../../src/lib/api/nfc.ts:86), [validateNfcUrl()](../../src/lib/api/nfc.ts:109), [buildSevenDaySeries()](../../src/lib/api/nfc.ts:126)
- Hooks de datos: [useNfcConfig()](../../src/hooks/nfc.ts:14), [useWeeklyStatsForCode()](../../src/hooks/nfc.ts:34), [useUpdateNfcUrl()](../../src/hooks/nfc.ts:61)
- Rutas reales (Next API): Config [GET()](../../src/app/api/v1/nfc/config/[id]/route.ts:37), [PUT()](../../src/app/api/v1/nfc/config/[id]/route.ts:71); Estadísticas [GET()](../../src/app/api/v1/nfc/stats/weekly/route.ts:38)
- Rutas mock: Config [route.ts](../../src/app/mock/api/v1/nfc/config/[id]/route.ts), Estadísticas [route.ts](../../src/app/mock/api/v1/nfc/stats/weekly/route.ts)
- Vista UI: [Page()](<../../src/app/(main)/app/models/[id]/page.tsx:67>)

---

## Endpoints

- GET /api/v1/nfc/config/:id
  - Retorna: { nfc_id, item_id, short_code | short-code, url_destino_actual }
  - Nota: Si el backend responde short-code, se normaliza a short_code en el cliente.
- PUT /api/v1/nfc/config/:id
  - Body: { url_destino_actual: string }
  - Retorna recurso actualizado, preservando campos no editados.
- GET /api/v1/nfc/stats/weekly
  - Retorna: Array<{ short_code, weekly_data }>
  - weekly_data: objeto { 'YYYY-MM-DD': number } para 7 días (puede incluir ceros).

## Contratos y normalización

- Configuración
  - Entrada cruda: NfcConfigResponseRaw
    - Campos: nfc_id: number; item_id: number; short_code?: string; 'short-code'?: string; url_destino_actual: string
  - Adaptado: NfcConfig
    - Campos: nfc_id, item_id, short_code (normalizado), url_destino_actual
  - Adaptador: [adaptNfcConfig()](../../src/lib/api/nfc.ts:24)
- Estadísticas semanales
  - Entrada cruda: WeeklyStatsEntryRaw
    - Campos: short_code?: string; 'short-code'?: string; weekly_data: Record<string, number>
  - Adaptado: WeeklyStatsEntry
    - Campos: short_code (normalizado), weekly_data
  - Adaptador: [adaptWeeklyStatsEntry()](../../src/lib/api/nfc.ts:47)

## Vista app/models/:id

- Al montar:
  - Toma params.id de la ruta.
  - Llama a [useNfcConfig()](../../src/hooks/nfc.ts:14) para GET /api/v1/nfc/config/:id.
  - Una vez resuelto, obtiene short_code y usa [useWeeklyStatsForCode()](../../src/hooks/nfc.ts:34) para GET /api/v1/nfc/stats/weekly y filtra por ese short_code.
- UI:
  - Encabezado con identificador y badge del short_code normalizado.
  - Tarjeta "Configuración NFC" con skeletons de carga, error banner y datos.
  - Tarjeta "Estadísticas semanales" con skeletons/error y gráfica semanal.
  - Tarjeta "Editar URL de destino" con validación y flujo PUT.
- Gráfica:
  - Se construye con [buildSevenDaySeries()](../../src/lib/api/nfc.ts:126) para garantizar 7 días consecutivos, completando ceros.
  - Componente bar chart accesible sin librería externa y responsive en la propia vista [Page()](<../../src/app/(main)/app/models/[id]/page.tsx:15>).
- Accesibilidad:
  - Roles ARIA en gráfica (role="meter") y estados.
  - Mensajes de error con role="alert".
  - Foco gestionado en el input URL al validar.
- Estados:
  - Carga: skeletons en Config y Estadísticas.
  - Vacío: "Sin datos en la última semana".
  - Error: banners coherentes con el resto de la app.

## Validación del URL y restricciones

- Se valida en cliente con [validateNfcUrl()](../../src/lib/api/nfc.ts:109).
  - Reglas: formato URL válido; protocolos permitidos: http y https.
- El servidor también verifica protocolo/formato en [PUT()](../../src/app/api/v1/nfc/config/[id]/route.ts:93).

## Flujo de edición del URL (PUT)

- Formulario en la vista con input type="url".
- Validación previa; botón se deshabilita mientras guarda.
- Al guardar: [useUpdateNfcUrl()](../../src/hooks/nfc.ts:61) llama [updateNfcConfig()](../../src/lib/api/nfc.ts:86) con { url_destino_actual }.
- En éxito: se actualiza cache de React Query y se toastea confirmación; la configuración se revalida en background.
- En error: se muestra toast/banner con mensaje legible.

## Caching, revalidación y reintento

- React Query keys:
  - Config: ['nfc-config', id]
  - Stats: ['nfc-weekly-stats', short_code]
- Políticas:
  - staleTime 30s; gcTime 5 min.
  - Retry leve (máx 2) solo para 5xx/errores de red; 4xx no reintenta. Ver [useNfcConfig()](../../src/hooks/nfc.ts:14) y [useWeeklyStatsForCode()](../../src/hooks/nfc.ts:34).

## Errores y formato

- El cliente lanza Error con el texto del cuerpo o `Error {status}` (mismo patrón de [createCustomConfirmation()](../../src/lib/api/custom-confirmation.ts:21)).
- El backend ejemplifica errores:
  - 400 VALIDATION_ERROR para campos inválidos.
  - 404 NOT_FOUND si no existe el recurso.
  - 500 INTERNAL_ERROR para excepciones.

## Mocks de desarrollo

- Endpoints mock disponibles bajo prefijo /mock:
  - GET /mock/api/v1/nfc/config/:id
  - PUT /mock/api/v1/nfc/config/:id
  - GET /mock/api/v1/nfc/stats/weekly
- Ubicación:
  - Config: [route.ts](../../src/app/mock/api/v1/nfc/config/[id]/route.ts)
  - Stats: [route.ts](../../src/app/mock/api/v1/nfc/stats/weekly/route.ts)
- Datos incluidos:
  - Config id=50 → nfc_id 50, item_id 42, short-code "xyz789", url_destino_actual "https://landingpage.com/campana_q4_2025".
  - Stats: incluye códigos "xyz789" y "abc123"; el de "xyz789" contiene siete días consecutivos con algunos ceros.
- Activación/uso:
  - No hay flag global; se consumen llamando a las rutas con prefijo /mock en desarrollo.
  - Para usar el backend "real" interno del proyecto, utilice las rutas bajo /api en lugar de /mock.

## Especificación de contratos

### GET /api/v1/nfc/config/:id — Response 200

{
"nfc_id": 50,
"item_id": 42,
"short-code": "xyz789",
"url_destino_actual": "https://landingpage.com/campana_q4_2025"
}

### PUT /api/v1/nfc/config/:id — Request

{
"url_destino_actual": "https://midominio.com/nueva-campana"
}

### PUT /api/v1/nfc/config/:id — Response 200

{
"nfc_id": 50,
"item_id": 42,
"short-code": "xyz789",
"url_destino_actual": "https://midominio.com/nueva-campana"
}

### GET /api/v1/nfc/stats/weekly — Response 200

[
{
"short_code": "xyz789",
"weekly_data": {
"2025-10-10": 0,
"2025-10-11": 6,
"2025-10-12": 7,
"2025-10-13": 0,
"2025-10-14": 9,
"2025-10-15": 10,
"2025-10-16": 0
}
},
{
"short_code": "abc123",
"weekly_data": { "...": 3 }
}
]

## Códigos de estado

- 200 OK — Respuesta exitosa (GET/PUT).
- 400 Bad Request — Error de validación (p. ej., URL inválida).
- 404 Not Found — Recurso inexistente.
- 500 Internal Server Error — Error inesperado.

## Ejemplos cURL (real /api)

```bash
# GET Config
curl -X GET http://localhost:3000/api/v1/nfc/config/50

# GET Stats
curl -X GET http://localhost:3000/api/v1/nfc/stats/weekly

# PUT Update URL
curl -X PUT http://localhost:3000/api/v1/nfc/config/50 \
 -H "Content-Type: application/json" \
 -d '{ "url_destino_actual": "https://midominio.com/nueva-campana" }'
```

## Ejemplos cURL (mock /mock)

```bash
# GET Config (mock)
curl -X GET http://localhost:3000/mock/api/v1/nfc/config/50

# GET Stats (mock)
curl -X GET http://localhost:3000/mock/api/v1/nfc/stats/weekly

# PUT Update URL (mock)
curl -X PUT http://localhost:3000/mock/api/v1/nfc/config/50 \
 -H "Content-Type: application/json" \
 -d '{ "url_destino_actual": "https://midominio.com/nueva-campana" }'
```

## Notas de compatibilidad

- La normalización de short_code en cliente garantiza consistencia aunque el backend responda "short-code".
- La vista no depende de librerías de gráficos externas; usa estilos del sistema de diseño.
- Los endpoints se integran con React Query global ya configurado ([ReactQueryProvider](../../src/hooks/react-query-provider.tsx:5)).
- Notificaciones vía sonner están habilitadas en layout raíz ([Toaster](../../src/app/layout.tsx:3)).

## Cambios relevantes en el código

- API/Tipos/Adaptadores: [nfc.ts](../../src/lib/api/nfc.ts:1)
- Hooks: [nfc.ts](../../src/hooks/nfc.ts:1)
- Vista: [page.tsx](<../../src/app/(main)/app/models/[id]/page.tsx:1>)
- Rutas reales: [config [id] route.ts](../../src/app/api/v1/nfc/config/[id]/route.ts:1), [stats weekly route.ts](../../src/app/api/v1/nfc/stats/weekly/route.ts:1)
- Rutas mock: [config [id] route.ts](../../src/app/mock/api/v1/nfc/config/[id]/route.ts), [stats weekly route.ts](../../src/app/mock/api/v1/nfc/stats/weekly/route.ts)
