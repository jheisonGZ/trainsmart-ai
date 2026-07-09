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
