# TrainSmart AI Backend

Backend `Node.js + Express + TypeScript` para TrainSmart AI.

## Stack

- `Express`
- `TypeScript`
- `pg` para Postgres/Supabase
- Validacion con `zod`
- JWT de Supabase validado con JWKS publico

## Variables de entorno

El proyecto ya incluye [backend/.env](c:/Users/luisg/Downloads/VisualProjects/TrainSmartAI-git/trainsmart-ai/backend/.env) con las URLs de base de datos que compartiste.

Si vas a probar generacion con IA, solo falta completar:

- `OPENAI_API_KEY`

## Desarrollo

```bash
cd backend
npm install
npm run dev
```

Servidor local:

- `http://localhost:4000`
- health check: `GET /api/health`

## Notas importantes

- `SUPABASE_URL` se usa para validar access tokens de Supabase.
- El backend ya no depende de `SUPABASE_ANON_KEY` para funcionar.
- Para endpoints autenticados necesitas un bearer token real de Supabase.
- El frontend del repo sigue usando Firebase, así que para integrar end-to-end todavía toca migrar auth/persistencia del frontend.
