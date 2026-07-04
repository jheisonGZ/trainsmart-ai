# TrainSmart AI Backend

Backend `Node.js + Express + TypeScript` para TrainSmart AI.

## Stack

- `Express`
- `TypeScript`
- `pg` para Postgres/Supabase
- Validacion con `zod`
- JWT de Supabase validado con JWKS publico
- Ximilar para analisis visual

## Variables de entorno

El proyecto ya incluye [backend/.env](c:/Users/luisg/Downloads/VisualProjects/TrainSmartAI-git/trainsmart-ai/backend/.env) con las URLs de base de datos que compartiste.

Si vas a probar generacion con IA y las funcionalidades visuales, completa:

- `GROQ_API_KEY`
- `XIMILAR_API_TOKEN`
- `XIMILAR_BASE_URL=https://api.ximilar.com`
- `SUPABASE_ENVIRONMENT_IMAGES_BUCKET=environment-images-private`
- `SUPABASE_MEAL_IMAGES_BUCKET=meal-images-private`
- `SUPABASE_BODY_PROGRESS_IMAGES_BUCKET=body-progress-images-private`

## Desarrollo

```bash
cd backend
npm install
npm run dev
```

Servidor local:

- `http://localhost:3000`
- health check: `GET /api/health`

## Notas importantes

- `SUPABASE_URL` se usa para validar access tokens de Supabase.
- El backend ya no depende de `SUPABASE_ANON_KEY` para funcionar.
- Para endpoints autenticados necesitas un bearer token real de Supabase.
- El frontend del repo sigue usando Firebase, así que para integrar end-to-end todavía toca migrar auth/persistencia del frontend.

## Nuevas funcionalidades visuales con Ximilar

Se agregaron tres módulos nuevos de backend:

- análisis del entorno y equipo disponible
- análisis visual de alimentación
- seguimiento visual del progreso corporal

### Endpoints nuevos

- `GET /api/vision/environment/latest`
- `POST /api/vision/environment/analyze`
- `GET /api/vision/nutrition/latest`
- `GET /api/vision/nutrition/history`
- `POST /api/vision/nutrition/analyze`
- `GET /api/vision/body-progress/latest`
- `GET /api/vision/body-progress/history`
- `POST /api/vision/body-progress/analyze`

### Qué hacen

- reciben imágenes del entorno, comidas y progreso corporal
- consultan Ximilar `photo/tags/v2/tags`
- usan `identity/v2/person` cuando está disponible para progreso corporal
- hacen fallback a tagging genérico si `Person Detection` no está disponible para la cuenta
- normalizan tags a contexto útil para cada caso
- guardan imágenes en Supabase Storage privado
- persisten análisis en base de datos
- incorporan el análisis del entorno al `context_snapshot` de generación de rutina

### Migraciones necesarias

Aplica:

- `backend/sql/008_environment_vision.sql`
- `backend/sql/009_nutrition_vision.sql`
- `backend/sql/010_body_progress_vision.sql`

Estas migraciones crean:

- tabla `environment_analyses`
- tabla `meal_analyses`
- tabla `body_progress_entries`
- bucket privado `environment-images-private`
- bucket privado `meal-images-private`
- bucket privado `body-progress-images-private`
- políticas RLS para registros e imágenes

## Pruebas

### Simuladas

```bash
cd backend
npm run test:vision
```

Estas pruebas simulan:

- llamadas a Ximilar
- guardado en tablas
- guardado en buckets privados

### Smoke tests reales con Ximilar

```bash
cd backend
$env:RUN_XIMILAR_LIVE_TESTS="true"
npm run test:vision:live
```

Estas pruebas:

- hacen llamadas reales a Ximilar
- usan imágenes locales del proyecto
- simulan persistencia en base de datos y storage con una fake Supabase client
