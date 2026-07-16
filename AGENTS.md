
# AGENTS.md — TrainSmart AI

> Este archivo le da contexto a cualquier agente de IA (Claude, Cursor, Copilot, etc.)
> que trabaje en este proyecto. Leelo antes de tocar cualquier archivo.

---

## ¿Qué es TrainSmart AI?

App web académica desarrollada para la **Universidad del Valle**.
Genera rutinas de gimnasio personalizadas usando un LLM para usuarios principiantes, hace seguimiento real de progreso y analiza fotos (comida, progreso corporal, equipo de gimnasio) con visión por computador.

Flujo principal: Registro → Perfil físico → Historial de salud → Generación de rutina con IA → Revisión HITL → Dashboard → Sesiones de entrenamiento diarias.

**URL producción:** `https://trainsmart-ai-two.vercel.app`

---

## Stack técnico

### Frontend (`/frontend`)

* **React + TypeScript + Vite**
* **React Router v7** para navegación
* **Supabase Auth** — email/password + Google OAuth (no Firebase)
* **GSAP** — animaciones
* **SweetAlert2 (Swal)** — alertas y notificaciones
* **Lucide React** — iconos
* **CSS puro** — sin Tailwind, sin styled-components
* Deploy: **Vercel** (monorepo, ver `vercel.json` en la raíz)

### Backend (`/backend`)

* **Node.js + Express + TypeScript**
* **Supabase** (Postgres + Auth + Storage) como único backend-as-a-service
* **Groq** (`llama-3.3-70b-versatile`) — generación de rutinas con LLM
* **Google Gemini Vision** — análisis de fotos (comida / progreso corporal / entorno de entrenamiento)
* **ElevenLabs** — narración de audio de rutinas (opcional, detrás de `ELEVENLABS_ENABLED`)
* **Zod** — validación de esquemas
* **Multer** — subida de imágenes (memoria, no disco)

---

## Estructura del proyecto

```
trainsmart-ai/
├── AGENTS.md
├── README.md
├── vercel.json                  # Deploy monorepo: frontend + backend como servicios
├── backend/
│   ├── sql/                     # Migraciones SQL (001 → 008), aplicadas contra Supabase
│   └── src/
│       ├── config/env.ts        # Única fuente de verdad de variables de entorno (Zod schema)
│       ├── routes/               # Definición de rutas Express, montadas en routes/index.ts
│       ├── controllers/          # Un archivo por recurso, llaman a services/
│       ├── services/             # Lógica de negocio (LLM, visión, audio, storage)
│       ├── repositories/         # Único lugar que habla con Supabase (queries)
│       ├── middlewares/          # auth, validate, upload
│       ├── validators/           # Esquemas Zod por recurso
│       ├── prompts/              # Prompts del LLM para generar rutinas
│       ├── lib/                  # Clientes: supabase, gemini-vision, exercisedb, llm, logger
│       └── types/                # Tipos compartidos por dominio
└── frontend/
    └── src/
        ├── pages/                # Login, Profile, HealthHistory, Dashboard, Routine, VisualAnalysis, Progress
        ├── components/
        │   ├── AppShell.tsx       # Layout con sidebar + topbar, envuelve todas las páginas privadas
        │   ├── ExerciseGif.tsx    # GIF animado de ejercicio (ExerciseDB) + hook useExerciseGifUrl
        │   ├── RoutineAudioPlayer.tsx
        │   └── charts/            # StatTile, Meter, BarChart, HorizontalBarChart, Sparkline (SVG/CSS)
        ├── context/AuthContext.tsx
        ├── lib/api.ts             # Cliente HTTP hacia el backend (fetch + cache de GET)
        ├── lib/supabaseClient.ts
        ├── routes/AppRoutes.tsx   # Rutas + guards
        └── types/api.ts           # Tipos de las respuestas del backend
```

---

## Supabase — Configuración actual

Supabase es el único backend-as-a-service (Auth + Postgres + Storage). No hay Firebase ni Firestore en el proyecto.

* **Auth habilitado:** Email/Password y Google OAuth.
* **Autorización:** Row Level Security (RLS) en Postgres — cada política filtra por `auth.uid() = user_id`. El backend usa el cliente de Supabase autenticado con el token del request (no el service role), así que RLS siempre aplica.
* **Migraciones:** `backend/sql/001` a `008`, deben correrse en orden desde el SQL Editor de Supabase. Ya están aplicadas contra el proyecto de producción — no las re-ejecutes sin revisar antes si son idempotentes.

### Tablas principales (Postgres)

`profiles`, `health_history`, `body_metrics`, `exercises`, `exercise_media`, `routines`, `routine_versions`, `routine_days`, `routine_day_exercises`, `workout_sessions`, `workout_session_exercises`, `routine_audio_narrations`, `meal_analyses`, `body_progress_analyses`, `environment_analyses`.

### Buckets de Storage

`routine-audio-private`, `meal-images-private`, `body-progress-images-private`, `environment-images-private`. Todos privados; el acceso se hace con signed URLs de corta duración generadas por el backend.

---

## Flujo de navegación (AppRoutes.tsx)

```
/                  → Login (público)
/auth/callback     → AuthCallback (intercambio OAuth)
/dashboard         → RootRedirect:
                     1. ¿perfil completo?    → NO → /profile
                     2. ¿historial de salud completo? → NO → /health
                     3. Todo completo → /home
/home              → Dashboard (privado, dentro de AppShell)
/profile           → Perfil físico — vista resumen / formulario 3 pasos
/health            → Historial de salud — vista resumen / formulario 4 pasos
/routine           → Rutina del día, generación IA, sesiones de entrenamiento
/visual-analysis   → Análisis Visual con IA (comida / cuerpo / entorno)
/progress          → Progreso real con gráficos
```

**Guards:**

* `PrivateRoute` — redirige a `/` si no autenticado
* `PublicRoute` — redirige a `/dashboard` si ya autenticado
* `RootRedirect` — verifica perfil → historial → dashboard
* Las rutas privadas (`/home`, `/profile`, `/health`, `/routine`, `/visual-analysis`, `/progress`) están anidadas dentro de `AppShell`, que provee el sidebar/topbar comunes.

---

## Patrón de páginas (Profile y HealthHistory)

Ambas páginas siguen el mismo patrón de dos modos:

```typescript
export default function Page() {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);

  if (!data)   return <Form existing={null} onSaved={...} />;
  if (editing) return <Form existing={data} onSaved={...} />;
  return <Summary data={data} onEdit={() => setEditing(true)} />;
}
```

* **Sin datos** → formulario de creación → al guardar navega a `/dashboard` (que redirige al siguiente paso)
* **Con datos, modo vista** → resumen con tarjetas + botón Editar
* **Con datos, modo edición** → formulario precargado → al guardar vuelve a vista resumen

---

## Convenciones de código

### CSS

* Variables globales en `:root` por página: `--r: #ff4a2b` (acento), `--bg`/`--bg2`/`--bg3` (fondo, oscuro a claro), `--border`, `--muted`.
* Tema **oscuro** con acento **rojo** (`#ff4a2b`) en toda la aplicación.
* Clases con prefijo por página: `db-` (dashboard), `pf-` (profile), `hh-` (health history), `rt-` (routine), `pg-` (progress), `va-` (visual analysis), `app-shell__` (layout compartido).
* Los componentes de gráficos comparten el prefijo `viz-` y sus variables `--viz-*` (`frontend/src/components/charts/charts.css`) — ver la skill `dataviz` antes de tocarlos o agregar uno nuevo.
* Sin Tailwind, todo CSS puro en archivos `.css` por página o componente.

### SweetAlert2

Siempre usar el mixin `Alert` con tema oscuro (definido localmente en cada página que lo necesita):

```typescript
const Alert = Swal.mixin({
  background: "#111",
  color: "#f0f0f0",
  confirmButtonColor: "#ff4a2b",
  cancelButtonColor: "#222",
  iconColor: "#ff4a2b",
  customClass: { popup: "swal-ts-popup", title: "swal-ts-title", confirmButton: "swal-ts-btn" },
});
```

Úsalo para confirmaciones de acciones destructivas (`showCancelButton: true`) y para notificar éxito/error — no uses `window.confirm`/`alert` nativos.

### GSAP

* En desktop: animar sidebar con `x`, contenido con `y`.
* En mobile: NO animar sidebar en entrada (solo abrir/cerrar menú hamburguesa).
* Siempre verificar si el elemento existe antes de animar:

```typescript
const els = document.querySelectorAll(".clase");
if (els.length > 0) gsap.fromTo(els, ...);
```

### Imágenes de perfil

* Si el usuario inició sesión con Google y tiene avatar → mostrar foto (`getAvatarUrl` en `lib/supabaseUserDisplay.ts`).
* Si no → mostrar inicial con círculo rojo.
* Siempre `referrerPolicy="no-referrer"` en `<img>` que apunte a una foto de Google.

### GIFs de ejercicios

* `frontend/src/components/ExerciseGif.tsx` expone el componente `ExerciseGif` y el hook `useExerciseGifUrl(name)` (mismo caché en memoria, úsalo si necesitas saber si un ejercicio tiene GIF antes de decidir qué renderizar).
* El backend traduce nombres de ejercicio de español a inglés antes de consultar ExerciseDB en `backend/src/lib/exercisedb.ts` (diccionario `ES_TO_EN_TERMS`, ordenado de frase más larga a más corta). Si agregas ejercicios nuevos al LLM y su GIF no aparece, revisa primero si falta una entrada ahí.
* Si ExerciseDB no tiene el ejercicio o la imagen falla al cargar, el comportamiento esperado es no mostrar nada (o el ícono de mancuerna, según la página) — no es un bug.

### Variables de entorno del backend

* `backend/src/config/env.ts` es la única fuente de verdad; usa Zod y falla rápido si falta algo obligatorio (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
* El servidor de desarrollo (`tsx watch`) **no** recarga cuando cambia `.env` — hay que reiniciarlo manualmente (Ctrl+C + `npm run dev`) después de cualquier cambio de variables de entorno o de archivos que ese proceso ya tenía cargados.

---

## Estado del backlog

| Área                                         | Estado                                                    |
| --------------------------------------------- | ---------------------------------------------------------- |
| Registro y login (email + Google)             | Completado                                                |
| Perfil físico (formulario 3 pasos + resumen) | Completado                                                |
| Cálculo de IMC y validaciones                 | Completado                                                |
| Historial de salud (formulario 4 pasos + resumen) | Completado                                            |
| Generación de rutina con IA (LLM)             | Completado                                                |
| Revisión/aprobación de rutina (HITL)          | Completado                                                |
| Dashboard con rutina de hoy                    | Completado                                                |
| Sesiones de entrenamiento (iniciar/cerrar por bloque) | Completado                                        |
| Narración de audio de rutinas (ElevenLabs)     | Completado (opcional, requiere `ELEVENLABS_ENABLED=true`) |
| Biblioteca de ejercicios + GIFs animados       | Completado                                                |
| Análisis Visual con IA (comida/cuerpo/entorno) | Completado                                                |
| Progreso con gráficos reales                   | Completado                                                |
| Deploy en Vercel (monorepo)                    | Configurado, verificar tras cada push a `main`            |

---

## Qué NO tocar sin preguntar primero

* `backend/src/config/env.ts` y cualquier archivo `.env` — configuración sensible.
* `frontend/src/routes/AppRoutes.tsx` — lógica de guards y redirecciones.
* Las políticas RLS y migraciones ya aplicadas en `backend/sql/` — no reordenar ni re-ejecutar sin verificar que sean idempotentes.
* Autoría de commits: el usuario pidió explícitamente que los commits no lleven ningún trailer ni mención de IA/Claude como coautor.
* `git push --force`, `git rebase`, o cualquier reescritura de historia en `main`.

---

## Errores conocidos y su solución

| Error                                                      | Causa                                                        | Solución                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Generación de rutina falla con `429`                       | Groq alcanzó el límite de la capa gratuita                   | Esperar unos segundos o revisar la API key en console.groq.com             |
| Narración de audio responde `503`                          | En realidad es un `402` de ElevenLabs (voz de biblioteca no disponible en el plan free) | Usar una voz "premade" (por defecto `JBFqnCBsd6RMkjVDRZzb`), no una de biblioteca |
| Análisis Visual responde `503` / "high demand"              | Sobrecarga transitoria de la API de Gemini                    | El backend ya reintenta con backoff (`backend/src/lib/gemini-vision.ts`); si persiste, reintentar más tarde |
| ExerciseDB no encuentra un ejercicio                        | El nombre en español no tiene traducción en `ES_TO_EN_TERMS`, o el ejercicio no existe en el catálogo | Agregar la traducción correspondiente en `backend/src/lib/exercisedb.ts` |
| Cambios de `.env` no se reflejan en el backend               | `tsx watch` no recarga variables de entorno                  | Reiniciar el proceso (Ctrl+C + `npm run dev`)                              |
| `Cross-Origin-Opener-Policy` en consola durante login Google | `signInWithPopup`/OAuth popup                                 | Advertencia inofensiva, el login funciona igual                            |
| `GSAP target not found`                                     | Se intenta animar un elemento que no existe en el DOM         | Verificar con `querySelectorAll` antes de animar                          |

---

## Estado actual

Todas las funcionalidades del backlog original están implementadas end-to-end (auth, perfil, salud, rutinas con IA + HITL, sesiones, audio, GIFs, análisis visual, progreso) y el proyecto corre sobre Supabase + Groq + Gemini + ElevenLabs. El deploy a Vercel está configurado como monorepo (`vercel.json`); confirma que el build de ambos servicios pase después de cada push a `main` antes de dar por cerrado un cambio.
