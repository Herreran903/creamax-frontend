This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Paso 3: Cotización

Objetivo del paso

- Al presionar CONTINUAR desde el Paso 2, se navega a la pantalla de Cotización (Paso 3) y se ejecuta una solicitud POST a /api/v1/custom/create enviando un contrato único y completo, independientemente de la fuente del modelo (IA, carga 3D, imagen de textura o SVG).
- En la pantalla de cotización se muestra la respuesta del backend: id, nombre personalizado, fecha de creación, moneda, rango de precios (mínimo y máximo), desglose, tiempos, vigencia y notas.
- La UI debe manejar estados: cargando, éxito, error (con opción de reintentar).
- Persistir en el estado global la respuesta completa para reutilizarla en pasos posteriores.

Contrato de solicitud (JSON) recomendado, versión 1.0
Nota: Este es el contrato que se envía a /api/v1/custom/create. Debe contener toda la información disponible sobre inputs del usuario, el modelo y los parámetros de fabricación, además de una referencia concreta al modelo o sus archivos.

Ejemplo (fuente_modelo = "ai")
{
"version": "1.0",
"fuente_modelo": "ai",
"nombre_personalizado": "Llavero Marketing 2025",
"usuario_id": "usr_001",
"modelo": {
"modelo_id": "mdl_001",
"archivo_id": "file_3d_abc123",
"url": "https://cdn.misitio.com/models/mdl_001.glb",
"svg": null,
"textura_imagen_id": null,
"parametros_generacion_ai": {
"prompt": "Llavero con logo minimalista 2025",
"semilla": 12345,
"variacion": "v2",
"motor": "shape-gen-v1"
},
"thumbnail_url": "https://cdn.misitio.com/thumbs/mdl_001.png"
},
"parametros": {
"material": "PLA",
"color": "#FF4D4F",
"acabado": "mate",
"dimension_unidad": "mm",
"alto": 50,
"ancho": 30,
"profundidad": 5,
"escala": 1.0,
"cantidad": 100,
"complejidad_estimacion": "media",
"tolerancia": "estandar",
"espesor_minimo": 1.2
},
"metadatos": {
"app_version": "web@1.2.3",
"locale": "es-CL",
"dispositivo": "desktop",
"referer": "paso_2"
}
}

Variantes por fuente de modelo

- 3D Upload
  - fuente_modelo: "3d_upload"
  - Proveer al menos modelo.url (puede ser URL temporal local u origen) o archivo_id si existe referencia.
- Imagen de textura
  - fuente_modelo: "texture_image"
  - Proveer modelo.textura_imagen_id o modelo.url de la imagen de textura.
  - Si corresponde incluir mapeo UV o escala, agregar en parametros. Por ejemplo:
    - parametros.uv_map
    - parametros.textura_escala
- SVG
  - fuente_modelo: "svg"
  - Enviar el string SVG en modelo.svg.
  - Si hay extrusión, incluir profundidad y escala en parametros (profundidad, escala).

Ejemplo completo para SVG
{
"version": "1.0",
"fuente_modelo": "svg",
"nombre_personalizado": "Logo grabado 2025",
"usuario_id": "usr_002",
"modelo": {
"modelo_id": "mdl_svg_777",
"archivo_id": null,
"url": null,
"svg": "<svg viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M10 10 H 90 V 90 H 10 Z\"/></svg>",
"textura_imagen_id": null,
"parametros_generacion_ai": null,
"thumbnail_url": "https://cdn.misitio.com/thumbs/mdl_svg_777.png"
},
"parametros": {
"material": "Acrilico",
"color": "#000000",
"acabado": "brillante",
"dimension_unidad": "mm",
"alto": 60,
"ancho": 60,
"profundidad": 3,
"escala": 1.0,
"cantidad": 50,
"complejidad_estimacion": "baja",
"tolerancia": "fina",
"espesor_minimo": 1.0
},
"metadatos": {
"app_version": "web@1.2.3",
"locale": "es-CL",
"dispositivo": "mobile",
"referer": "paso_2"
}
}

Contrato de respuesta de cotización
Ejemplo mínimo recomendado (se puede ampliar con moneda, desglose, tiempos y vigencia):
{
"id": 42,
"nombre_personalizado": "Llavero Marketing 2025",
"fecha_creacion": "2025-10-15T10:00:00Z",
"moneda": "CLP",
"cotizacion_rango": {
"cotizacion_min": 4000,
"cotizacion_max": 6000
},
"desglose": {
"material": 2500,
"mano_obra": 1200,
"energia": 300,
"acabado": 0
},
"tiempo_entrega_dias": 5,
"valida_hasta": "2025-10-22T10:00:00Z",
"notas": "Valores estimados sujetos a revisión técnica."
}

Manejo de errores esperado
{
"error": {
"codigo": "VALIDATION_ERROR",
"mensaje": "parametros.cantidad debe ser mayor a 0",
"detalles": {
"campo": "parametros.cantidad"
}
}
}

Ejemplos de cURL

- Crear cotización
  curl -X POST /api/v1/custom/create \
   -H "Content-Type: application/json" \
   -d '{
  "version": "1.0",
  "fuente_modelo": "ai",
  "nombre_personalizado": "Llavero Marketing 2025",
  "usuario_id": "usr_001",
  "modelo": {
  "modelo_id": "mdl_001",
  "archivo_id": "file_3d_abc123",
  "url": "https://cdn.misitio.com/models/mdl_001.glb",
  "svg": null,
  "textura_imagen_id": null,
  "parametros_generacion_ai": { "prompt": "Llavero con logo minimalista 2025", "semilla": 12345, "variacion": "v2", "motor": "shape-gen-v1" },
  "thumbnail_url": "https://cdn.misitio.com/thumbs/mdl_001.png"
  },
  "parametros": {
  "material": "PLA",
  "color": "#FF4D4F",
  "acabado": "mate",
  "dimension_unidad": "mm",
  "alto": 50,
  "ancho": 30,
  "profundidad": 5,
  "escala": 1.0,
  "cantidad": 100,
  "complejidad_estimacion": "media",
  "tolerancia": "estandar",
  "espesor_minimo": 1.2
  },
  "metadatos": {
  "app_version": "web@1.2.3",
  "locale": "es-CL",
  "dispositivo": "desktop",
  "referer": "paso_2"
  }
  }'

Flujo de UI del Paso 3

- Al hacer clic en CONTINUAR en el Paso 2:
  - Se dispara el POST a /api/v1/custom/create con el contrato anterior.
  - Se muestra estado de carga en la pantalla de Cotización.
  - Ante errores, se muestra un mensaje claro con opción de Reintentar.
  - Al recibir la respuesta, se renderizan: número de cotización (id), nombre personalizado, fecha de creación, moneda, rango de precios (mín y máx), desglose, tiempo de entrega estimado, fecha de validez, notas.
  - Acciones disponibles: Confirmar pedido, Editar diseño, Volver.
- Persistencia:
  - La respuesta completa se persiste en el estado global para uso posterior (checkout, confirmación, etc.).

Mock para desarrollo

- Rutas disponibles:
  - POST /mock/api/v1/custom/create (devuelve siempre la misma cotización del ejemplo superior).
  - GET /mock/api/v1/custom/42 (recupera la cotización fija por id).
- CORS:
  - Habilitado para entorno local (Access-Control-Allow-Origin: \* y cabeceras básicas).
- Latencia simulada:
  - 300 a 800 ms para probar estados de carga.
- Sugerencia de uso:
  - En esta implementación, si se accede con ?mock=1 en la URL del wizard, el flujo usa el endpoint mock en vez del real.

Estados de UI

- Cargando:
  - Muestra spinner y texto “Generando cotización…”
- Éxito:
  - Muestra todos los campos de la cotización (id, nombre, moneda, rango, desglose, tiempos, vigencia, notas).
- Error:
  - Muestra texto en rojo con el mensaje de error y botón “Reintentar”.

Notas de versionado del contrato

- version = "1.0"
  - Cambios futuros deben procurar compatibilidad hacia atrás.
  - Se recomienda agregar campos nuevos como opcionales manteniendo los existentes.
  - Cualquier cambio incompatible debe incrementar el campo version (por ejemplo, "2.0") y documentarse.

Implementación (resumen técnico)

- Backend (Next.js App Router):
  - POST /api/v1/custom/create: recibe el contrato 1.0, valida cantidad > 0 y responde con una cotización basada en el ejemplo. CORS habilitado y latencia simulada.
  - Mock:
    - POST /mock/api/v1/custom/create: responde siempre con la cotización fija de ejemplo.
    - GET /mock/api/v1/custom/42: devuelve la misma cotización por id.
- Frontend:
  - Al pasar del Paso 2 al Paso 3, se construye el contrato unificado a partir del estado del wizard (fuente del modelo AI/3D Upload/Imagen de textura/SVG + parámetros + metadatos).
  - Se realiza POST al endpoint real o mock y se persiste la respuesta en estado global.
  - La pantalla de cotización renderiza todos los campos, maneja carga/errores y expone acciones de Confirmar pedido, Editar diseño, Volver.
