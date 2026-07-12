# Ximilar Editions

## Objetivo

Este documento resume exactamente qué se dejó implementado para las tres funcionalidades visuales pedidas en TrainSmart AI usando Ximilar:

1. análisis del entorno y equipo disponible
2. análisis visual de alimentación
3. seguimiento visual del progreso corporal

## Resumen de arquitectura

Se construyó una integración desacoplada con Ximilar y una base compartida para manejo de imágenes y resultados.

### Capa de integración con Ximilar

- `backend/src/integrations/ximilar/client.ts`
- `backend/src/integrations/ximilar/types.ts`
- `backend/src/integrations/ximilar/errors.ts`

Esta capa:

- usa `XIMILAR_API_TOKEN`
- consume `photo/tags/v2/tags`
- intenta usar `identity/v2/person` para progreso corporal
- valida respuestas con `zod`
- centraliza timeouts y errores

## Servicios implementados

### 1. Entorno y equipo disponible

Archivos:

- `backend/src/services/environment-vision.service.ts`
- `backend/src/repositories/environment-vision.repository.ts`
- `backend/src/controllers/environment-vision.controller.ts`
- `backend/src/routes/environment-vision.routes.ts`
- `backend/src/validators/environment-vision.schemas.ts`
- `backend/src/types/environment-vision.types.ts`

Qué hace:

- recibe foto del espacio
- detecta tags visuales
- normaliza equipo útil para entrenamiento
- guarda imagen y análisis
- incorpora el contexto al prompt de rutinas

### 2. Análisis visual de alimentación

Archivos:

- `backend/src/services/nutrition-vision.service.ts`
- `backend/src/repositories/nutrition-vision.repository.ts`
- `backend/src/controllers/nutrition-vision.controller.ts`
- `backend/src/routes/nutrition-vision.routes.ts`
- `backend/src/validators/nutrition-vision.schemas.ts`
- `backend/src/types/nutrition-vision.types.ts`

Qué hace:

- recibe foto de comida
- usa tagging genérico de Ximilar
- traduce tags a grupos alimentarios
- genera:
  - `summary`
  - `educational_feedback`
  - `goal_alignment`
- consulta el objetivo del perfil para alinear feedback
- guarda imagen y análisis

### 3. Seguimiento visual del progreso corporal

Archivos:

- `backend/src/services/body-progress-vision.service.ts`
- `backend/src/repositories/body-progress-vision.repository.ts`
- `backend/src/controllers/body-progress-vision.controller.ts`
- `backend/src/routes/body-progress-vision.routes.ts`
- `backend/src/validators/body-progress-vision.schemas.ts`
- `backend/src/types/body-progress-vision.types.ts`

Qué hace:

- recibe foto corporal
- usa tagging genérico de Ximilar
- intenta usar `Person Detection`
- si `Person Detection` no está disponible para la cuenta, hace fallback a tagging genérico
- genera:
  - `entry_summary`
  - `comparison_summary`
  - `comparison_notes`
  - `quality_warnings`
- compara el registro nuevo con el anterior si existe
- guarda imagen y análisis

## Servicios compartidos creados

- `backend/src/services/visionShared.service.ts`
- `backend/src/services/visionImageStorage.service.ts`

Estos servicios resuelven:

- parseo de `data:image/...;base64`
- normalización y orden de tags
- reglas de mapeo
- subida de imágenes a Supabase Storage
- generación de signed URLs

## Persistencia y migraciones

Se agregaron tres migraciones nuevas:

- `backend/sql/008_environment_vision.sql`
- `backend/sql/009_nutrition_vision.sql`
- `backend/sql/010_body_progress_vision.sql`

Crean:

- `environment_analyses`
- `meal_analyses`
- `body_progress_entries`
- buckets privados:
  - `environment-images-private`
  - `meal-images-private`
  - `body-progress-images-private`
- políticas RLS para registros e imágenes

## Integración con frontend

### Routine

Se actualizó:

- `frontend/src/pages/Routine.tsx`
- `frontend/src/pages/Routine.css`
- `frontend/src/types/api.ts`

Qué se agregó:

- subida de foto del entorno
- visualización del último análisis
- uso automático del análisis en generación/regeneración de rutina

### Progress

Se actualizó:

- `frontend/src/pages/Progress.tsx`
- `frontend/src/pages/Progress.css`
- `frontend/src/types/api.ts`

Qué se agregó:

- subida de foto de comida
- lectura visual educativa
- historial reciente de comidas
- subida de foto corporal
- lectura comparativa aproximada
- historial reciente de progreso corporal

## Endpoints nuevos

### Entorno

- `GET /api/vision/environment/latest`
- `POST /api/vision/environment/analyze`

### Alimentación

- `GET /api/vision/nutrition/latest`
- `GET /api/vision/nutrition/history`
- `POST /api/vision/nutrition/analyze`

### Progreso corporal

- `GET /api/vision/body-progress/latest`
- `GET /api/vision/body-progress/history`
- `POST /api/vision/body-progress/analyze`

## Variables de entorno usadas

En backend quedaron necesarias:

```env
XIMILAR_API_TOKEN=...
XIMILAR_BASE_URL=https://api.ximilar.com
SUPABASE_ENVIRONMENT_IMAGES_BUCKET=environment-images-private
SUPABASE_MEAL_IMAGES_BUCKET=meal-images-private
SUPABASE_BODY_PROGRESS_IMAGES_BUCKET=body-progress-images-private
```

También se dejó el límite JSON del backend en `8mb` para soportar imágenes en base64.

## Particularidad detectada en Ximilar

Durante las pruebas reales:

- `photo/tags/v2/tags` respondió correctamente
- `identity/v2/person` devolvió `404` con esta cuenta/token

Por eso se dejó un fallback explícito en progreso corporal:

- si `Person Detection` falla, la funcionalidad no se rompe
- se infiere presencia corporal básica desde tagging genérico
- se agrega advertencia en `quality_warnings`

## Pruebas implementadas

### Pruebas simuladas

Archivos:

- `backend/src/tests/environment-vision.service.test.ts`
- `backend/src/tests/nutrition-vision.service.test.ts`
- `backend/src/tests/body-progress-vision.service.test.ts`
- `backend/src/tests/helpers/fakeSupabase.ts`
- `backend/src/tests/helpers/testFixtures.ts`

Qué validan:

- guardado simulado en tablas
- guardado simulado en buckets
- respuestas mockeadas de Ximilar
- generación de resúmenes y contexto

### Smoke tests reales con Ximilar

Archivo:

- `backend/src/tests/vision.live.test.ts`

Qué hacen:

- llaman a Ximilar real
- usan imágenes locales del proyecto
- simulan persistencia con fake Supabase
- verifican que cada funcionalidad complete el flujo

## Comandos ejecutados

```bash
cd backend
npm run typecheck
npm run build
npm run test:vision

$env:RUN_XIMILAR_LIVE_TESTS="true"
npm run test:vision:live

cd ../frontend
npm run build
```

## Resumen corto

Quedaron implementadas las tres funcionalidades visuales pedidas, con servicios separados, persistencia privada, integración en frontend, pruebas simuladas y smoke tests reales contra Ximilar. La única particularidad externa encontrada fue que `Person Detection` no estuvo disponible para esta cuenta, así que el seguimiento corporal quedó protegido con fallback para no bloquear el producto.

## Rediseño posterior: análisis visual de alimentación (Tarea 1)

Se rediseñó `backend/src/services/nutrition-vision.service.ts` para que el análisis de comida entregue información útil y accionable en vez de tags técnicos de Ximilar:

- El resumen (`summary`) ya no lista los tags genéricos de Ximilar (`healthy`, `meal`, `diet`, `top`, etc.). Ahora se filtran solo los tags que corresponden a alimentos reales, vía la nueva `getRecognizedFoodTagNames` en `backend/src/services/visionShared.service.ts`.
- Se agregó `category_assessment`: cada plato se clasifica en Proteínas, Carbohidratos, Verduras, Frutas y Grasas saludables, cada una calificada como `excelente` / `adecuado` / `escaso` / `no_identificable` según la confianza promedio de los tags de Ximilar que caen en esa categoría. El aguacate cuenta a la vez como fruta y grasa saludable.
- Se agregó `balance_score` (0 a 10) calculado a partir de esas categorías, con `balance_score_note` aclarando que es una aproximación visual, no una medición nutricional.
- Se agregó `recommendations` (1 a 3 tips concretos) adaptadas al objetivo del perfil del usuario (`gain_muscle`, `lose_fat`, `strength`, `mobility`, general).
- Se agregó `uncertainty_notes`: cuando una categoría queda en `escaso`, se genera una nota explícita en vez de asumir que el alimento no está.
- Se agregó `disclaimer` fijo aclarando que es una evaluación visual educativa, sin cálculo de calorías/macronutrientes ni afirmaciones clínicas.
- Se ampliaron las listas de sinónimos por categoría (`FOOD_GROUP_RULES`) para reconocer más alimentos que Ximilar sí puede etiquetar (quinoa, couscous, grano, chickpeas, edamame, etc.).
- Se eliminaron `protein_strength`, `portion_detail`, `portion_estimate` y `practical_tip` (estimaciones de porción que no pedía el requerimiento).
- En el frontend (`frontend/src/pages/Progress.tsx`, `Progress.css`) se reemplazó el bloque de resultado por: barra de puntuación 0-10, grilla de categorías, lista de recomendaciones, notas de incertidumbre en cursiva y el disclaimer final. Se quitó el historial de comidas repetitivo (mostraba solo la fecha y el primer grupo detectado, poco informativo) junto con el fetch a `/vision/nutrition/history` que ya no se usa en esta vista.

**Limitación investigada y documentada:** Ximilar no ofrece un endpoint especializado de reconocimiento de comida/ingredientes — solo tagging genérico de escena (`photo/tags/v2/tags`). Por eso la detección de un alimento específico (p. ej. arroz o quinoa) depende de si el modelo genérico de Ximilar lo etiquetó o no; cuando no lo hace, el sistema muestra "No identificable" en vez de inventarlo.

## Rediseño posterior: seguimiento visual del progreso corporal (Tarea 2)

Se reescribió por completo `backend/src/services/body-progress-vision.service.ts`, `backend/src/types/body-progress-vision.types.ts` y `backend/src/repositories/body-progress-vision.repository.ts` para convertir el seguimiento corporal en una comparación estructurada entre registros, en vez de descripciones genéricas sueltas.

**Uso de Ximilar:**

- `photo/tags/v2/tags` sigue usándose para obtener tags visuales genéricos (zonas corporales, contexto de entrenamiento, señales de definición/volumen muscular).
- `identity/v2/person` (Person Detection) se usa únicamente para verificar presencia de persona(s) en la foto — **no** es reconocimiento facial biométrico. Se confirmó investigando la documentación pública de Ximilar (`docs.ximilar.com`) que no existe ningún endpoint de reconocimiento o verificación facial/biométrica en su catálogo actual (Computer Vision Platform, Collectibles AI, AI Image Tagging, Visual Search, Text Processing, Image Tools). Por eso `same_person_check` es honesto sobre su alcance: compara solo cantidad de personas detectadas entre la foto actual y la anterior (`consistente` / `personas_multiples` / `sin_persona_detectada` / `no_disponible`), y `same_person_note` deja explícito que no es una verificación biométrica. Como ya estaba documentado arriba, `identity/v2/person` puede devolver `404` según la cuenta/plan; el servicio sigue con fallback a inferencia por tags genéricos en ese caso.

**Primer registro (baseline):**

- Se guarda la imagen, fecha (`created_at`), postura inferida (`posture_inferred`, proxy de ángulo: frontal/lateral/posterior/pose), zonas corporales visibles (`visible_body_zones`) y tags detectados, marcando `is_baseline: true`.
- La respuesta solo indica que se creó el punto de referencia (`progress_summary`) y da recomendaciones para las próximas fotos (`next_capture_recommendations`), sin intentar comparar nada.

**Registros siguientes (comparación):**

- `category_comparison`: objeto con una entrada por cada una de las 10 categorías pedidas (`definicion_muscular`, `volumen_muscular`, `abdomen`, `brazos`, `hombros`, `pecho`, `espalda`, `piernas`, `postura`, `simetria`). Cada entrada indica si la zona fue visible en ambas fotos y su tendencia (`incremento`, `incremento_leve`, `reduccion`, `reduccion_leve`, `sin_cambio`, `no_visible`), calculada comparando la suma de probabilidades de los tags de Ximilar asociados a esa zona entre la foto actual y la anterior.
- `simetria` siempre se marca `no_visible` con una nota explícita: Ximilar no ofrece ninguna señal relacionada a simetría corporal con tagging genérico, así que se declara la incertidumbre en vez de inventar una lectura.
- `postura` compara el ángulo inferido (frontal/lateral/posterior/pose) entre fotos; si el ángulo cambió, se indica explícitamente que no es posible evaluar cambios de postura corporal (más/menos erguida) de forma confiable solo con tagging genérico, en vez de asumirlo.
- `overall_change_level` (`leve` / `moderado` / `alto`) se calcula contando cuántas categorías físicas visibles tuvieron cambios notables o leves.
- `observations`: lista de frases específicas generadas solo para categorías visibles con cambio (p. ej. "Se aprecia una reducción visual notable en el abdomen respecto al registro anterior.").
- `reliability_warning`: se activa cuando el solape de tags entre la foto actual y la anterior es bajo, o cuando el ángulo/postura difiere, avisando que la comparación puede perder precisión por condiciones distintas (iluminación, ropa, ángulo, postura).
- `measurement_disclaimer` (fijo): aclara que es una lectura visual aproximada y educativa, que no calcula porcentaje de grasa corporal, masa muscular ni medidas físicas reales, y que no reemplaza una evaluación profesional.
- `next_capture_recommendations`: 3 tips fijos para la próxima foto (mismo ángulo/distancia, misma ropa/iluminación, misma postura).

**Persistencia:** se agregó la migración `backend/sql/013_body_progress_comparison.sql`, que:

- vuelve opcionales las columnas antiguas `entry_summary`, `comparison_summary`, `comparison_notes` (se dejan de usar pero no se borran, por compatibilidad con filas existentes).
- agrega las columnas nuevas: `is_baseline`, `same_person_check`, `same_person_note`, `category_comparison` (jsonb), `overall_change_level`, `progress_summary`, `observations` (text[]), `reliability_warning`, `next_capture_recommendations` (text[]).

**Pendiente para el usuario:** aplicar `backend/sql/013_body_progress_comparison.sql` en Supabase (igual que las migraciones anteriores, no hay ejecución automática).

**Corrección:** la migración 013 se olvidó de la columna `measurement_disclaimer` (sí usada por el servicio). Se agregó `backend/sql/014_body_progress_measurement_disclaimer.sql` para agregarla. También hay que aplicar esta migración en Supabase.

**Limitación confirmada con datos reales:** comparando dos payloads reales de Ximilar para el mismo usuario (dos fotos de flexión de bíceps), los tags devueltos fueron casi idénticos y puramente de contexto general (`man, strong, sport, muscle, power, fitness, bodybuilding, biceps, triceps, weightlifting...`), sin ningún tag específico de zona corporal (`chest`, `shoulder`, `back`, `leg`, `abs`, `definition`, etc.). Se agregó `torso` a la categoría "pecho" (`PHYSICAL_CATEGORY_TAG_RULES.pecho` en `body-progress-vision.service.ts`) porque sí aparecía en ambas fotos con probabilidad distinta. El resto de categorías físicas seguirán mostrando "No visible" con este tipo de foto mientras Ximilar no devuelva vocabulario específico de esa zona — no es un bug de las reglas de mapeo, es el techo real del tagger genérico de Ximilar para este caso de uso. Una detección de cambio físico por zona verdaderamente fina requeriría un modelo de pose/segmentación corporal, que Ximilar no ofrece en su catálogo actual (confirmado en su documentación pública).

**Mejora posterior — comparación con LLM de visión (Groq), Ximilar solo para verificación de persona:**

A partir de la evidencia real de la limitación anterior, se cambió el motor principal de comparación: en vez de depender solo de coincidencias de tags genéricos de Ximilar, ahora se usa un modelo de visión de Groq (multimodal, recibe ambas fotos directamente) para generar la comparación estructurada, reutilizando la integración LLM que el proyecto ya tenía configurada para generación de rutinas (`GROQ_API_KEY`, `LLM_BASE_URL`) — sin necesidad de contratar OpenAI GPT Vision ni ningún servicio nuevo de pago.

- `backend/src/lib/visionLlm.ts` (nuevo): `compareBodyProgressWithVisionLLM()` envía ambas imágenes (anterior y actual, en base64) a un modelo de visión de Groq (`env.VISION_LLM_MODEL`, por defecto `meta-llama/llama-4-scout-17b-16e-instruct`, confirmado como modelo de visión vigente en la documentación pública de Groq) con un prompt de sistema que impone las mismas reglas que ya teníamos: nunca mencionar porcentajes de grasa/masa muscular/medidas reales, marcar `no_visible` en vez de inventar cambios, avisar si las condiciones entre fotos son muy distintas, y devolver únicamente las 10 categorías ya definidas. La respuesta se valida con `zod` contra el mismo esquema de categorías que ya usaba el heurístico de tags.
- `backend/src/config/env.ts`: se agregó `VISION_LLM_MODEL` (configurable, mismo patrón que `LLM_MODEL`).
- `backend/src/services/visionImageStorage.service.ts`: se agregó `downloadVisionImageAsBase64()` para poder descargar la foto anterior desde Supabase Storage y enviarla al LLM de visión.
- `backend/src/services/body-progress-vision.service.ts`: en `analyzeMyBodyProgress`, cuando hay registro anterior y la verificación de persona de Ximilar no descarta la comparación (no hay 0 ni >1 personas), se intenta primero el LLM de visión. Si la llamada falla, no hay `GROQ_API_KEY` configurada, o la respuesta no cumple el schema, cae automáticamente al heurístico de tags de Ximilar ya existente (`buildCategoryComparison` y funciones asociadas), que se conserva completo como respaldo — combinando ambos enfoques como se pidió.
- Se agregó el campo `comparison_method: 'vision_llm' | 'tag_heuristic'` (persistido, migración `backend/sql/015_body_progress_comparison_method.sql`) para que quede trazable qué motor generó cada análisis. El frontend lo muestra como una nota pequeña junto al nivel de cambio.
- **Ximilar queda limitado exactamente al rol que pidió el usuario**: verificar presencia de persona (no biométrica, según lo ya documentado) y no se usa para medir progreso físico — el análisis de evolución real ahora lo hace el modelo de visión.

**Costo:** Groq tiene capa gratuita (con límites de tasa) y esta llamada reutiliza la misma cuenta/API key que ya paga (o usa gratis) el proyecto para generar rutinas — no se agregó ningún proveedor ni costo nuevo. Si `GROQ_API_KEY` no está configurada, el sistema sigue funcionando con el heurístico de tags sin romperse.

**Pendiente para el usuario:** aplicar `backend/sql/015_body_progress_comparison_method.sql` en Supabase.

**Mejora posterior — botón "Analizar nuevamente":** se agregó `POST /api/vision/body-progress/reanalyze` (`reanalyzeMyLatestBodyProgress` en el servicio, `updateBodyProgressEntryComparison`/`getBodyProgressEntryById` en el repositorio). Vuelve a correr la comparación (LLM de visión con fallback a heurístico de tags) entre el registro más reciente y el anterior, usando las mismas dos fotos ya guardadas en Storage — no sube nada nuevo ni crea un registro adicional, solo actualiza el análisis del registro existente. Util para reintentar si la primera vez cayó al heurístico de respaldo (por ejemplo si Groq estaba con rate limit) o simplemente para regenerar la lectura. En el frontend aparece como el botón "Analizar nuevamente" dentro de la tarjeta de progreso corporal, visible solo cuando ya existe una comparación.

**Mejora posterior — comparación visual lado a lado:** se agregó `compared_to_image_url` a la respuesta (`backend/src/services/body-progress-vision.service.ts`, función `enrichBodyProgressEntry`), que resuelve la signed URL de la foto del registro anterior (`getBodyProgressEntryImagePathById` en el repositorio). En el frontend (`Progress.tsx`/`Progress.css`), cuando existe comparación se muestran ambas fotos lado a lado ("Anterior" / "Actual") en vez de solo la más reciente, para que el usuario pueda ver visualmente los cambios y no solo leerlos en texto.

**Frontend:** se actualizó `frontend/src/types/api.ts` (tipos `BodyCategoryKey`, `BodyCategoryTrend`, `BodyChangeLevel`, `SamePersonCheck`, `BodyProgressEntry`) y `frontend/src/pages/Progress.tsx` / `Progress.css`. La tarjeta "Seguimiento visual del progreso corporal" ahora muestra: resumen de progreso, insignia de nivel de cambio (leve/moderado/alto), grilla de las 10 categorías con su tendencia, lista de cambios detectados, nota de verificación de persona, advertencia de confiabilidad cuando aplica, recomendaciones para la próxima foto y el disclaimer de medición. Cuando es el primer registro, solo se muestra el mensaje de referencia inicial y las recomendaciones para próximas fotos.

**Pruebas:** se actualizó `backend/src/tests/body-progress-vision.service.test.ts` para cubrir el nuevo flujo de comparación (tendencia por categoría, nivel de cambio, verificación de persona, disclaimer).

**Corrección posterior — validación demasiado estricta del LLM de visión:** en pruebas reales, Groq a veces devolvía `"note": null` para categorías con `trend: "sin_cambio"` (en vez de un string), lo cual hacía fallar la validación de `zod` y forzaba el fallback al heurístico de tags aunque el LLM sí había respondido bien. Se corrigió `backend/src/lib/visionLlm.ts`: el campo `note` ahora acepta `null`/ausente y se reemplaza por un mensaje por defecto según la tendencia (`DEFAULT_TREND_NOTES`); lo mismo para `reliability_note`. Con esto el análisis del LLM de visión deja de descartarse por un detalle menor de formato.

**Corrección posterior — faltaba política RLS de UPDATE:** la migración original (`009`/`010`) solo creó políticas RLS de `SELECT` e `INSERT` para `body_progress_entries` (nunca hizo falta `UPDATE` porque el flujo original solo insertaba filas nuevas). Al agregar el botón "Analizar nuevamente", que hace un `UPDATE` sobre el registro existente, Supabase bloqueaba la operación silenciosamente por RLS (0 filas afectadas), lo que producía `PGRST116: Cannot coerce the result to a single JSON object`. Se agregó `backend/sql/016_body_progress_update_policy.sql` con la política `body_progress_entries_update_own` (mismo criterio `auth.uid() = user_id` que las demás). Falta aplicarla en Supabase.

**Mejora posterior — foto guiada con silueta y línea de tiempo de progreso:** para reducir la causa raíz de las advertencias de "condiciones distintas" (ángulo/distancia/iluminación inconsistentes entre fotos), se agregó `frontend/src/components/BodyCaptureCamera.tsx`: un modal que abre la cámara del dispositivo (`getUserMedia`) y superpone la foto anterior del usuario (semitransparente, `mix-blend-mode: screen`) sobre la vista en vivo, para que el usuario alinee su cuerpo antes de capturar. Incluye botón para ocultar/mostrar la guía, girar entre cámara frontal/trasera, y fallback explícito (mensaje + seguir usando "Subir foto corporal") si el navegador no soporta cámara o el usuario niega el permiso. En `Progress.tsx` se refactorizó `handleBodyFileChange` para extraer `submitBodyPhoto()`, compartida entre el flujo de archivo y el de cámara.

También se había agregado una línea de tiempo visual con los últimos registros corporales, pero se quitó a pedido del usuario (no aportaba claridad) — junto con el estado `bodyHistory` y el fetch a `/vision/body-progress/history` en `Progress.tsx`, que quedaron sin uso tras removerla. Además se ajustó `.pg-upload-row` (`Progress.css`) para que los tres botones ("Subir foto corporal", "Tomar foto guiada", "Analizar nuevamente") queden siempre en la misma fila, con scroll horizontal si no caben en pantallas angostas.

**Ajuste posterior — ubicación del botón "Analizar nuevamente":** estaba al final de la tarjeta (dentro del área con scroll), poco visible. Se movió junto al botón "Subir foto corporal" en `frontend/src/pages/Progress.tsx` (nuevo contenedor `.pg-upload-row` en `Progress.css`), siempre visible arriba de la tarjeta, sin necesidad de hacer scroll.

## Ajuste posterior de estado vacío

Se corrigió además el comportamiento de las rutas actuales de rutina para que la ausencia de una rutina activa/aprobada no se trate como error:

- `GET /api/routines/current/dashboard`
- `GET /api/routines/current/today`

Ahora ambas responden `null` cuando el usuario todavía no tiene rutina aprobada, y las vistas `Dashboard` y `Routine` muestran empty state en vez de propagar un 404.

También se reforzó la capa visual para registros existentes cuya imagen ya no pueda abrirse en Supabase Storage:

- si falla la generación de signed URL en `latest` o `history`
- el backend mantiene la respuesta del análisis
- `source_image_url` se devuelve en `null`
- la vista no se cae por un `500` solo porque la imagen privada no esté accesible
