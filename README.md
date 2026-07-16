

<h1 align="center">TrainSmart AI</h1>

<p align="center">
  <img width="679" height="380" alt="image" src="https://github.com/user-attachments/assets/6f102185-ea51-4206-a791-849793cd42dc" />
</p>

Aplicación web full-stack que genera rutinas de entrenamiento personalizadas con IA, hace seguimiento de progreso real y analiza fotos (comida, progreso corporal, equipo de gimnasio) con visión por computador.

Desarrollada con **React + TypeScript + Vite** en el frontend y **Node.js + Express + TypeScript** en el backend, sobre **Supabase** (Auth + Postgres + Storage).

**URL de producción:** [trainsmart-ai-two.vercel.app](https://trainsmart-ai-two.vercel.app)

---

## Funcionalidades principales

* **Rutinas con IA** — genera rutinas personalizadas con un LLM (Groq), con un flujo de revisión humana (HITL) antes de activarlas.
* **Seguimiento de sesiones** — inicia, registra y cierra sesiones de entrenamiento día por día, con narración de audio opcional generada con ElevenLabs.
* **Análisis Visual con IA** — sube una foto de tu comida, tu progreso corporal o tu espacio de entrenamiento y recibe un análisis generado con Gemini Vision (calorías/macros estimados, observaciones de composición corporal, equipo detectado).
* **Progreso real** — dashboard con métricas reales (sesiones totales, racha, consistencia semanal, progresión de peso por ejercicio) usando gráficos propios en SVG/CSS.
* **GIFs animados de ejercicios** — cada ejercicio de tu rutina muestra su GIF demostrativo (vía ExerciseDB).
* **Perfil y salud** — formularios guiados de perfil físico e historial de salud, usados para personalizar las rutinas generadas.

---

## Stack técnico

### Frontend (`/frontend`)

| Tecnología         | Uso                                |
| ------------------- | ----------------------------------- |
| React + TypeScript + Vite | Framework UI y bundler       |
| React Router v7     | Navegación entre páginas          |
| Supabase JS         | Autenticación (email/contraseña + Google) |
| SweetAlert2         | Confirmaciones y notificaciones     |
| Lucide React        | Iconos SVG                          |
| GSAP                | Animaciones                         |
| CSS puro            | Sin frameworks de estilos (Tailwind, etc.) |

### Backend (`/backend`)

| Tecnología                  | Uso                                          |
| ---------------------------- | --------------------------------------------- |
| Node.js + Express + TypeScript | API REST                                   |
| Supabase (Postgres + Auth + Storage) | Base de datos, autenticación y almacenamiento de imágenes/audio |
| Groq (`llama-3.3-70b-versatile`) | Generación de rutinas con LLM             |
| Google Gemini Vision         | Análisis de fotos (comida / cuerpo / entorno) |
| ElevenLabs                   | Narración de audio de las rutinas (opcional) |
| Zod                          | Validación de esquemas                       |
| Multer                       | Subida de imágenes                           |

---

## Requisitos previos

| Herramienta | Versión mínima   | Verificar         |
| ----------- | ------------------ | ----------------- |
| Node.js     | 20.x o superior    | `node -v`       |
| npm         | 9.x o superior     | `npm -v`        |
| Git         | cualquier versión | `git --version` |

Además necesitas cuentas gratuitas en:

* [Supabase](https://supabase.com) — Auth + Postgres + Storage
* [Groq](https://console.groq.com) — LLM para generación de rutinas
* [Google AI Studio](https://aistudio.google.com) — API key de Gemini para Análisis Visual
* [ElevenLabs](https://elevenlabs.io) *(opcional)* — narración de audio de rutinas

---

## Estructura del proyecto

```
trainsmart-ai/
├── backend/                    # API REST (Express + TypeScript)
│   ├── src/
│   │   ├── config/             # Variables de entorno (env.ts)
│   │   ├── controllers/        # Controladores por recurso
│   │   ├── routes/             # Definición de rutas Express
│   │   ├── services/           # Lógica de negocio (LLM, visión, audio, storage)
│   │   ├── repositories/       # Acceso a datos (Supabase)
│   │   ├── middlewares/        # Auth, validación, upload de imágenes
│   │   ├── validators/         # Esquemas Zod
│   │   ├── prompts/            # Prompts del LLM para generar rutinas
│   │   ├── lib/                # Clientes de Supabase, Gemini, ExerciseDB, etc.
│   │   └── types/              # Tipos compartidos
│   └── sql/                    # Migraciones SQL de Supabase (001 → 008)
├── frontend/                   # SPA (React + TypeScript + Vite)
│   └── src/
│       ├── pages/              # Login, Profile, HealthHistory, Dashboard, Routine, VisualAnalysis, Progress
│       ├── components/         # AppShell, ExerciseGif, RoutineAudioPlayer, charts/, etc.
│       ├── context/             # AuthContext
│       ├── lib/                 # Cliente de API y de Supabase
│       ├── routes/              # AppRoutes.tsx
│       └── types/               # Tipos de la API
└── vercel.json                 # Config de deploy monorepo (frontend + backend como servicios)
```

---

## Instalación y ejecución

### 1. Clonar el repositorio

```bash
git clone https://github.com/jheisonGZ/trainsmart-ai.git
cd trainsmart-ai
```

### 2. Backend

```bash
cd backend
npm install
```

Crea un archivo `.env` en `/backend` (toma `.env.example` como base):

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
GROQ_API_KEY=
LLM_MODEL=llama-3.3-70b-versatile
LLM_BASE_URL=https://api.groq.com/openai/v1
GEMINI_API_KEY=
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_VISION_MODEL=gemini-3.5-flash
SUPABASE_MEAL_IMAGES_BUCKET=meal-images-private
SUPABASE_BODY_PROGRESS_IMAGES_BUCKET=body-progress-images-private
SUPABASE_ENVIRONMENT_IMAGES_BUCKET=environment-images-private
SUPABASE_ROUTINE_AUDIO_BUCKET=routine-audio-private
ELEVENLABS_API_KEY=
ELEVENLABS_ENABLED=false
NODE_ENV=development
```

> Solo `SUPABASE_URL` y `SUPABASE_ANON_KEY` son obligatorios; el resto tiene valores por defecto razonables (ver `backend/src/config/env.ts`).

Corre las migraciones de `backend/sql/` (de `001` a `008`, en orden) contra tu proyecto de Supabase desde el **SQL Editor** — crean las tablas, las políticas RLS y los buckets de Storage que la API necesita.

```bash
npm run dev
```

La API queda disponible en **[http://localhost:3000](http://localhost:3000)**.

### 3. Frontend

```bash
cd frontend
npm install
```

Crea un archivo `.env` en `/frontend`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_OAUTH_REDIRECT_URL=http://localhost:5173/auth/callback
```

```bash
npm run dev
```

Abre el navegador en **[http://localhost:5173](http://localhost:5173)**.

> El backend debe estar corriendo para que el frontend funcione: el frontend consume la API en `/api/*`.
> Nunca subas ningún archivo `.env` al repositorio — ya están en `.gitignore`.

---

## Comandos disponibles

### Backend

```bash
npm run dev         # Servidor de desarrollo (recarga automática)
npm run build       # Compilar a dist/
npm start            # Ejecutar el build compilado
npm run typecheck    # Chequeo de tipos
```

### Frontend

```bash
npm run dev       # Servidor de desarrollo
npm run build     # Build de producción
npm run preview   # Previsualizar el build
npm run lint      # Linter
```

---

## Deploy

El proyecto se despliega en **Vercel** como monorepo, usando el `vercel.json` de la raíz: frontend y backend corren como dos servicios independientes dentro del mismo proyecto, donde las rutas `/api/*` se enrutan al backend y el resto al frontend. Al configurar el proyecto en Vercel hay que definir ahí las mismas variables de entorno que en los `.env` locales de `backend/` y `frontend/`.

---

## Solución de problemas comunes

**El backend no arranca: `Invalid environment configuration`**

* Revisa que `.env` tenga al menos `SUPABASE_URL` y `SUPABASE_ANON_KEY` válidos.

**Error al generar rutina (`429` o falla del LLM)**

* Groq tiene límite de uso gratuito; espera unos segundos o revisa tu API key en [console.groq.com](https://console.groq.com).

**Análisis Visual devuelve error 503 / "high demand"**

* Es un error transitorio de la API de Gemini bajo alta demanda; el backend ya reintenta automáticamente, pero puede tardar unos segundos en responder.

**La narración de audio no se genera**

* Verifica que `ELEVENLABS_ENABLED=true` y que `ELEVENLABS_API_KEY` sea válida. Es una función opcional: si no la necesitas, déjala en `false`.

**No cargan los GIFs de algunos ejercicios**

* Es esperado: no todos los nombres de ejercicio tienen equivalente en ExerciseDB. Si el GIF no existe o falla al cargar, simplemente no se muestra.

**`Cannot find module` al correr `npm run dev`**

```bash
# Borra node_modules y reinstala (dentro de frontend/ o backend/)
rm -rf node_modules
npm install
```

---

## Equipo de desarrollo

| Nombre                       | Código |
| ---------------------------- | ------- |
| Jheison Estiben Gomez Muñoz | 2310215 |
| Cristian Daniel Medina Ortiz | 2310117 |
| Juan José Moreno Jaramillo  | 2310038 |
| Anderson Johan Alban Angulo  | 2310006 |
| Luis Gabriel Rodriguez       | 1943075 |

**Docente:** Dr. Carlos Mauricio Gaona Cuevas

**Curso:** Proyecto Integrador 2 — Universidad del Valle
