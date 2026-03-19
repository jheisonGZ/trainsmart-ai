
# AGENTS.md — TrainSmart AI

> Este archivo le da contexto a cualquier agente de IA (Claude, Cursor, Copilot, etc.)
> que trabaje en este proyecto. Leelo antes de tocar cualquier archivo.

---

## ¿Qué es TrainSmart AI?

App web académica desarrollada para la  **Universidad del Valle** .
Genera rutinas de gimnasio personalizadas usando un LLM para usuarios principiantes.
El flujo principal es: Registro → Perfil físico → Historial de salud → Generación de rutina con IA → Revisión HITL → Dashboard.

**URL producción:** `https://trainsmart-ai-two.vercel.app`

---

## Stack técnico

### Frontend

* **React + TypeScript + Vite**
* **React Router v6** para navegación
* **Firebase Auth** — email/password + Google OAuth
* **Firestore** — base de datos en tiempo real
* **GSAP** — animaciones (`npm install gsap`)
* **SweetAlert2 (Swal)** — alertas y notificaciones
* **Lucide React** — iconos
* **CSS puro** — sin Tailwind, sin styled-components
* Deploy: **Vercel**

### Backend

* **Node.js + Express**
* **PostGreSQL + Supabase**
* Integración con LLM GROQ - llama-3.3-70b-versatile para generación de rutinas

---

## Estructura del proyecto

```
trainsmart-ai/
├── AGENTS.md
├── README.md
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Login.tsx           ✅ Funcional
│       │   ├── Profile.tsx         ✅ Funcional (vista resumen + formulario 3 pasos)
│       │   ├── Profile.css
│       │   ├── HealthHistory.tsx   ✅ Funcional (vista resumen + formulario 4 pasos)
│       │   ├── HealthHistory.css
│       │   ├── Dashboard.tsx       ✅ Funcional
│       │   ├── Dashboard.css
│       │   ├── Routine.tsx         ⏳ Pendiente (HU-06/07)
│       │   ├── Progress.tsx        ⏳ Pendiente (HU-10/11)
│       ├── routes/
│       │   └── AppRoutes.tsx       ✅ Funcional
│       ├── firebase.ts             ✅ Configurado
│       ├── App.tsx
│       └── main.tsx
├── backend/
├── database/
└── prompts/
```

---

## Firebase — Configuración actual

* **Proyecto:** TrainSmart
* **Auth habilitado:** Email/Password ✅ y Google OAuth ✅
* **Dominio autorizado:** `trainsmart-ai-two.vercel.app` ✅
* **Firestore:** región `southamerica-east1` ✅
* **Storage:** NO habilitado (plan Spark gratuito, no soporta Storage)

### Colección Firestore: `profiles/{uid}`

```typescript
{
  name: string,
  email: string,
  birthdate: string,
  age: number,
  sex: string,              // 'male' | 'female' | 'other'
  weight_kg: number,
  height_cm: number,
  imc: number,
  imc_category: string,     // 'Bajo peso' | 'Normal' | 'Sobrepeso' | 'Obesidad'
  experience_level: string, // 'beginner' | 'returning' | 'intermediate'
  goal: string,             // 'lose_fat' | 'gain_muscle' | 'general_fitness' | 'strength'
  days_per_week: number,    // 2-6
  time_per_session: number, // minutos
  completed: boolean,
  created_at: string,
  updated_at: string
}
```

### Colección Firestore: `health_history/{uid}`

```typescript
{
  injuries: string[],        // lesiones actuales o pasadas
  joint_problems: string[],  // problemas articulares
  conditions: string[],      // condiciones médicas
  limitations: string[],     // limitaciones físicas
  notes: string,             // observaciones adicionales (libre)
  completed: boolean,
  updated_at: string
}
```

---

## Flujo de navegación (AppRoutes.tsx)

```
/           → Login (público)
/dashboard  → RootRedirect:
              1. ¿profiles/{uid}.completed === true?  → NO → /profile
              2. ¿health_history/{uid}.completed === true? → NO → /health
              3. Todo completo → /home
/profile    → Vista resumen perfil / Formulario 3 pasos (privado)
/health     → Vista resumen historial / Formulario 4 pasos (privado)
/home       → Dashboard (privado)
/routine    → Routine (privado) ⏳
/progress   → Progress (privado) ⏳
```

**Guards:**

* `PrivateRoute` — redirige a `/` si no autenticado
* `PublicRoute` — redirige a `/dashboard` si ya autenticado
* `RootRedirect` — verifica perfil → historial → dashboard

---

## Patrón de páginas (Profile y HealthHistory)

Ambas páginas siguen el mismo patrón de dos modos:

```typescript
// Componente principal decide qué renderizar
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

* Variables globales en `:root`: `--r: #ff4a2b`, `--bg: #080808`, `--bg2: #101010`, `--bg3: #181818`, `--border: rgba(255,255,255,0.07)`, `--muted: rgba(255,255,255,0.4)`
* Tema **oscuro** con acento **rojo** (`#ff4a2b`)
* Clases con prefijo por página: `db-` (dashboard), `pf-` (profile), `hh-` (health history)
* **Sin Tailwind** , todo CSS puro en archivos `.css` por página

### SweetAlert2

Siempre usar el mixin `Alert` con tema oscuro:

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

### GSAP

* En desktop: animar sidebar con `x`, contenido con `y`
* En mobile: NO animar sidebar en entrada (solo abrir/cerrar menú hamburguesa)
* Siempre verificar si el elemento existe antes de animar:

```typescript
const els = document.querySelectorAll(".clase");
if (els.length > 0) gsap.fromTo(els, ...);
```

### Imágenes de perfil

* Si `user.photoURL` existe (Google) → mostrar foto
* Si no → mostrar inicial con círculo rojo
* Siempre `referrerPolicy="no-referrer"` en `<img>` de Google

---

## Product Backlog — Estado

| HU    | Descripción                                            | Estado                                   |
| ----- | ------------------------------------------------------- | ---------------------------------------- |
| HU-01 | Registro de usuario (email + Google)                    | ✅ Completado                            |
| HU-02 | Login seguro                                            | ✅ Completado                            |
| HU-03 | Perfil físico (formulario 3 pasos + vista resumen)     | ✅ Completado                            |
| HU-04 | Cálculo IMC + validación                              | ✅ Completado                            |
| HU-05 | Historial de salud (formulario 4 pasos + vista resumen) | ✅ Completado                            |
| HU-06 | Generación de rutina con IA (LLM)                      | ⏳ Pendiente                             |
| HU-07 | Revisión/aprobación rutina HITL                       | ⏳ Pendiente                             |
| HU-08 | Dashboard diario                                        | ✅ Completado (básico, sin rutina aún) |
| HU-09 | Biblioteca de ejercicios                                | ⏳ Pendiente                             |
| HU-10 | Registro de progreso + feedback                         | ⏳ Pendiente                             |
| HU-11 | Estadísticas con gráficos                             | ⏳ Pendiente                             |

---

## Qué NO tocar sin preguntar primero

* `firebase.ts` — configuración sensible
* `AppRoutes.tsx` — lógica de guards y redirecciones
* Las colecciones `profiles` y `health_history` en Firestore
* Cualquier archivo `.env`

---

## Errores conocidos y su solución

| Error                                      | Causa                                   | Solución                                         |
| ------------------------------------------ | --------------------------------------- | ------------------------------------------------- |
| `Cross-Origin-Opener-Policy`en consola   | `signInWithPopup`de Google            | Warning inofensivo, el login funciona igual       |
| `GSAP target not found`                  | Animar elemento que no existe en el DOM | Verificar con `querySelectorAll`antes de animar |
| Firebase 400 en signUp                     | Email/Password no habilitado            | Firebase Console → Auth → Métodos de acceso    |
| Dominio no autorizado                      | Deploy sin agregar dominio              | Firebase Console → Auth → Dominios autorizados  |
| Salud muestra formulario en vez de resumen | Código viejo desplegado                | Hacer deploy del nuevo HealthHistory.tsx          |

---

## Próximo paso

**HU-06 — Generación de rutina con IA:**

* Frontend envía `profiles/{uid}` + `health_history/{uid}` al backend
* Backend construye el prompt y llama al LLM
* LLM devuelve rutina estructurada en JSON
* Frontend muestra la rutina para revisión (HU-07 HITL)
* Usuario aprueba → se guarda en Firestore: `routines/{uid}`

**Requiere definir en el backend:**

* Endpoint: `POST /api/routine/generate`
* LLM a usar: por definir (OpenAI / Gemini / Claude)
* Estructura del JSON de respuesta de la rutina
