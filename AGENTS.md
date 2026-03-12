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
* **GSAP** — animaciones (instalado con `npm install gsap`)
* **SweetAlert2 (Swal)** — alertas y notificaciones
* **Lucide React** — iconos
* **CSS puro** — sin Tailwind, sin styled-components
* Deploy: **Vercel**

### Backend

* **Node.js + Express**
* **MySQL + Sequelize**
* Integración con LLM para generación de rutinas

---

## Estructura del proyecto

```
trainsmart-ai/
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Login.tsx          ✅ Funcional
│       │   ├── Profile.tsx        ✅ Funcional
│       │   ├── Profile.css
│       │   ├── Dashboard.tsx      ✅ Funcional
│       │   ├── Dashboard.css
│       │   ├── HealthHistory.tsx  ⏳ Pendiente (HU-05)
│       │   ├── Routine.tsx        ⏳ Pendiente (HU-06/07)
│       │   ├── Progress.tsx       ⏳ Pendiente (HU-10/11)
│       ├── routes/
│       │   └── AppRoutes.tsx      ✅ Funcional
│       ├── firebase.ts            ✅ Configurado
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
  sex: string,              // 'male' | 'female'
  weight_kg: number,
  height_cm: number,
  imc: number,
  imc_category: string,     // 'Bajo peso' | 'Normal' | 'Sobrepeso' | 'Obesidad'
  experience_level: string, // 'beginner' | 'returning' | 'intermediate'
  goal: string,             // 'lose_fat' | 'gain_muscle' | 'general_fitness' | 'strength'
  days_per_week: number,    // 2-6
  time_per_session: number, // minutos
  completed: boolean,       // true cuando completó el formulario de perfil
  created_at: string,
  updated_at: string
}
```

---

## Flujo de navegación (AppRoutes.tsx)

```
/           → Login (público)
/dashboard  → RootRedirect:
              si profiles/{uid}.completed === true → /home
              si no → /profile
/profile    → Formulario 3 pasos (privado)
/home       → Dashboard (privado)
/health     → HealthHistory (privado) ⏳
/routine    → Routine (privado) ⏳
/progress   → Progress (privado) ⏳
```

**Guards:**

* `PrivateRoute` — redirige a `/` si no autenticado
* `PublicRoute` — redirige a `/dashboard` si ya autenticado

---

## Convenciones de código

### CSS

* Variables globales en `:root`: `--r: #ff4a2b`, `--bg: #080808`, `--bg2: #101010`, `--bg3: #181818`, `--border: rgba(255,255,255,0.07)`, `--muted: rgba(255,255,255,0.4)`
* Tema **oscuro** con acento **rojo** (`#ff4a2b`)
* Clases con prefijo por página: `db-` (dashboard), `pf-` (profile), etc.
* **Sin Tailwind** , todo CSS puro en archivos `.css` por página

### TypeScript

* Siempre tipar interfaces para datos de Firestore
* Importar `type` separado: `import type { User } from "firebase/auth"`
* En `useEffect` con `onAuthStateChanged`: tipar el callback `(u: User | null) => {}`

### Notificaciones

* Usar **SweetAlert2** para todas las alertas, errores y confirmaciones
* Tema oscuro consistente:

```typescript
import Swal from 'sweetalert2';
Swal.fire({
  background: '#111',
  color: '#f0f0f0',
  confirmButtonColor: '#ff4a2b',
  iconColor: '#ff4a2b',
});
```

### Animaciones

* Usar **GSAP** para animaciones de entrada y transiciones
* En desktop: animar sidebar con `x`, contenido con `y`
* En mobile: NO animar sidebar en entrada (solo en abrir/cerrar menú hamburguesa)
* Siempre verificar si el elemento existe antes de animar:

```typescript
const els = document.querySelectorAll(".clase");
if (els.length > 0) gsap.fromTo(els, ...);
```

### Imágenes de perfil

* Si `user.photoURL` existe (login con Google) → mostrar foto
* Si no → mostrar inicial del nombre con círculo rojo
* Siempre agregar `referrerPolicy="no-referrer"` en `<img>` de Google

---

## Product Backlog — Estado

| HU    | Descripción                                | Estado                                   |
| ----- | ------------------------------------------- | ---------------------------------------- |
| HU-01 | Registro de usuario (email + Google)        | ✅ Completado                            |
| HU-02 | Login seguro                                | ✅ Completado                            |
| HU-03 | Perfil físico (formulario 3 pasos)         | ✅ Completado                            |
| HU-04 | Cálculo IMC + validación                  | ✅ Completado (integrado en Profile)     |
| HU-05 | Historial de salud (lesiones, limitaciones) | ⏳ Pendiente                             |
| HU-06 | Generación de rutina con IA (LLM)          | ⏳ Pendiente                             |
| HU-07 | Revisión/aprobación rutina HITL           | ⏳ Pendiente                             |
| HU-08 | Dashboard diario                            | ✅ Completado (básico, sin rutina aún) |
| HU-09 | Biblioteca de ejercicios                    | ⏳ Pendiente                             |
| HU-10 | Registro de progreso + feedback             | ⏳ Pendiente                             |
| HU-11 | Estadísticas con gráficos                 | ⏳ Pendiente                             |

---

## Qué NO tocar sin preguntar primero

* `firebase.ts` — configuración sensible
* `AppRoutes.tsx` — lógica de guards y redirecciones
* La colección `profiles` en Firestore — estructura definida
* Cualquier archivo `.env` — variables de entorno de Firebase

---

## Errores conocidos y su solución

| Error                                    | Causa                                   | Solución                                         |
| ---------------------------------------- | --------------------------------------- | ------------------------------------------------- |
| `Cross-Origin-Opener-Policy`en consola | `signInWithPopup`de Google            | Es un warning inofensivo, el login funciona igual |
| `GSAP target not found`                | Animar elemento que no existe en el DOM | Verificar con `querySelectorAll`antes de animar |
| Firebase 400 en signUp                   | Email/Password no habilitado            | Firebase Console → Auth → Métodos de acceso    |
| Dominio no autorizado                    | Deploy en Vercel sin agregar dominio    | Firebase Console → Auth → Dominios autorizados  |

---

## Próximo paso

**HU-05 — Historial de salud:**
Formulario donde el usuario registra:

* Lesiones actuales o pasadas
* Problemas articulares
* Enfermedades crónicas o condiciones médicas
* Limitaciones físicas

Guardar en Firestore: `health_history/{uid}`
Esta info la consume el LLM al generar la rutina en HU-06.
