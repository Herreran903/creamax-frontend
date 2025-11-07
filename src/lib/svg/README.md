# SVG → 3D (Extrude by Color)

Visión general

- Este modo recibe un archivo SVG, agrupa las shapes por color de relleno (fill), y extruye cada grupo con una altura configurable por color.
- El procesamiento pesado se realiza en un Web Worker para no bloquear la UI.
- La escena 3D se renderiza con React Three Fiber, reusando materiales por color y combinando geometrías para minimizar draw calls.

Arquitectura de archivos

- Worker: [svg-extrude.worker.ts](../../workers/svg-extrude.worker.ts:1)
- Renderizador 3D: [svg-extruder.tsx](../../components/core/3d/svg-extruder.tsx:1)
- Tab UI: [svg-extrude-tab.tsx](../../components/orders/tabs/svg-extrude-tab.tsx:1)
- Utilidades:
  - Normalización de color: [normalizeColor.ts](./normalizeColor.ts:1)
  - Simplificación geométrica: [simplify.ts](./simplify.ts:1)
  - Boolean stub: [boolean.ts](./boolean.ts:1)
  - Tipos: [types.ts](./types.ts:1)

Flujo (pipeline)

1. Carga del SVG en el frontend (FileDrop acepta “.svg”).
2. Web Worker parsea con three/examples SVGLoader:
   - Extrae paths y estilos (userData.style).
   - Normaliza fill a hex con utilidades de THREE.Color.
   - Convierte cada path a shapes (toShapes(true), para conservar agujeros).
3. Agrupación por color:
   - Se usa el hex normalizado como clave.
   - Se generan polígonos (outer + holes) por cada shape.
4. Opcionales:
   - Simplificación RDP (Ramer–Douglas–Peucker) de puntos antes de extruir.
   - Unión booleana (stub) para limpiar overlapps conflictivos por color.
5. Resultado hacia la UI (SvgProcessResult): lista estable de colores, polígonos por color y dimensiones (width/height/viewBox).
6. Extrusión en el canvas:
   - Por cada color, construye ExtrudeGeometry de todas sus shapes.
   - Merge por color (BufferGeometryUtils) para reducir draw calls.
   - Reutiliza MeshStandardMaterial por color.
   - Orientación: se rota -90° en X para que Z sea “arriba”.
   - Flip de Y: el sistema SVG (Y hacia abajo) se adapta a R3F (Y hacia arriba).

Decisiones de color

- Normalización: [normalizeColor.ts](./normalizeColor.ts:1) usa THREE.Color().set() para aceptar CSS color strings.
- Gradientes/patrones: fill con “url(#…)” no se soporta (v1) → se ignoran y no generan geometría. Política simple: skip seguro. Esto se documenta con warnings si aplica.
- Opacidad: se lee fillOpacity/opacity del estilo y se expone en SvgColorGroup.opacity. En v1 la opacidad no se mapea al material para evitar confusiones de z-sorting; se puede usar en futuras iteraciones (p. ej., material.transparent con límites).

Boolean (experimental)

- [unionPolygonsByColor()](./boolean.ts:1) es un stub deliberado (retorna la entrada).
- Opciones consideradas:
  - martinez-polygon-clipping: robusto en boolean operations (union/diff).
  - clipper-lib / Clipper2 (WASM): muy rápido, requiere escala entera y manejo de precision.
  - paper.js: boolean sobre paths, footprint más grande.
- En v1 evitamos traer dependencias pesadas. El Worker envía un warning cuando “Unir shapes por color” está activo.

Simplificación

- Implementación RDP en [simplify.ts](./simplify.ts:1):
  - Tolerancia en “px” del espacio SVG antes de flip Y.
  - Si la tolerancia es 0, no se simplifica.
  - Cierra los anillos si el anillo original estaba cerrado.
- Propósito: acelerar extrusión y render en SVGs con miles de puntos.

Mensajería del Worker

- Progreso por etapas: parse → group → simplify → boolean → done.
- Interface de mensajes: [types.ts](./types.ts:1)
- La UI muestra barra de progreso con [StatusPanel](../../components/status-panel.tsx:1) y toasts (sonner) para errores/warnings.

Render 3D y performance

- Extrusión por color con ExtrudeGeometry(curveSegments moderado, bevelEnabled=false).
- Merge por color mediante BufferGeometryUtils.mergeGeometries para reducir draw calls.
- Reuso de materiales por color (Map<hex, MeshStandardMaterial>).
- Orientación: rotación -90° en X. Flip de Y aplicado al pre-build de shapes.
- Centrado/autofit: se centra cada geometría por color; para v1 es suficiente. Un “auto-fit global” se puede agregar en iteraciones futuras.

Controles de altura por color

- UI de sliders (0–10mm, paso 0.1) + chip visual del color + valor numérico.
- Cambios de altura reconstruyen solo esa geometría (memoización por mapa de alturas).
- Selección de color resalta (emissive suave).

Exportación

- Botón “Exportar GLTF” crea un .gltf (JSON) con [GLTFExporter](https://threejs.org/docs/#examples/en/exporters/GLTFExporter).
- Para exportar GLB (binario), cambiar la opción a { binary: true } y escribir el ArrayBuffer a Blob “model/gltf-binary”:
  - Ejemplo (en [svg-extrude-tab.tsx](../../components/orders/tabs/svg-extrude-tab.tsx:1)):
    - exporter.parse(group, (glb: ArrayBuffer) => saveBlob(glb, 'modelo.glb'), { binary: true })
- Integración con pipeline existente: la exportación se hace en cliente y descarga el archivo.

Casos límite cubiertos

- SVG sin fill (solo stroke): se omite en v1 y se muestra mensaje claro. Recomendado: expandir el stroke en el editor vectorial antes de subir.
- Colores repetidos en nodos distintos: la agrupación por hex hace el merge semántico correcto.
- Gradientes y opacidades: gradientes se ignoran; opacidad se lee pero no se aplica en material (documentado).
- Self-intersections/artefactos: simplificación previa ayuda; la booleana (cuando se implemente) resolverá la mayoría de fugas.
- SVGs pesados (miles de puntos): el Worker mantiene la UI fluida; mostrar progreso por etapas.

Accesibilidad y estilo

- UI sigue tokens Tailwind + shadcn: bordes suaves, sombras sutiles, tonos oscuros.
- Inputs con labels, focus visible y aria-labels en sliders/botones.
- FileDrop actualizado para aceptar .svg y mantener la estética existente.

Limitaciones conocidas (v1)

- Sin booleans reales todavía (stub). La opción “Unir shapes por color” muestra un warning.
- Export solo GLTF por defecto (GLB opcional con pequeño cambio).
- El “auto-fit global” de toda la composición puede mejorarse: actualmente centramos por color.

Futuras mejoras

- Integrar martinez-polygon-clipping o Clipper2 WASM en el Worker para union/diff por color.
- Aplicar opacidad de SVG a material (con heurística para evitar z-fighting).
- Barra de progreso más granular con conteo de puntos/paths.
- Persistir el resultado (estado global) para portarlo a otras vistas o para compartir.

Notas de implementación

- Worker se crea con: new Worker(new URL('../../../workers/svg-extrude.worker.ts', import.meta.url), { type: 'module' }).
- three/examples imports:
  - BufferGeometryUtils: import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
  - GLTFExporter: import('three/examples/jsm/exporters/GLTFExporter.js') (dinámico)
- TS Worker types: declaramos self como DedicatedWorkerGlobalScope para evitar errores de tipo.
