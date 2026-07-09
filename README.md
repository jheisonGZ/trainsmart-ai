
# 🏋️ TrainSmart AI — Frontend

Aplicación web inteligente que genera rutinas de entrenamiento personalizadas usando IA (LLM). Desarrollada con  **React + TypeScript + Vite** .

---

## 📋 Requisitos previos

Antes de instalar, asegúrate de tener instalado:

| Herramienta | Versión mínima   | Verificar         |
| ----------- | ------------------ | ----------------- |
| Node.js     | 18.x o superior    | `node -v`       |
| npm         | 9.x o superior     | `npm -v`        |
| Git         | cualquier versión | `git --version` |

---

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/jheisonGZ/trainsmart-ai.git
cd trainsmart-ai
```

### 2. Ir a la carpeta del frontend

```bash
cd frontend
```

### 3. Instalar dependencias

```bash
npm install
```

Esto instalará automáticamente todas las dependencias del `package.json`:

**Dependencias principales:**

| Librería            | Versión  | Uso                            |
| -------------------- | --------- | ------------------------------ |
| `react`            | ^19.2.0   | Framework UI principal         |
| `react-dom`        | ^19.2.0   | Renderizado en el DOM          |
| `react-router-dom` | ^7.13.1   | Navegación entre páginas     |
| `firebase`         | ^12.10.0  | Autenticación y base de datos |
| `lucide-react`     | ^0.577.0  | Iconos SVG                     |
| `sweetalert2`      | ^11.26.22 | Alertas y modales estilizados  |

**Dependencias de desarrollo:**

| Librería                | Versión | Uso                              |
| ------------------------ | -------- | -------------------------------- |
| `vite`                 | ^7.3.1   | Bundler y servidor de desarrollo |
| `typescript`           | ~5.9.3   | Tipado estático                 |
| `@vitejs/plugin-react` | ^5.1.1   | Soporte React en Vite            |
| `eslint`               | ^9.39.1  | Linter de código                |

### 4. Configurar variables de entorno

Crea un archivo `.env` en la raíz de `/frontend` con las credenciales operativas:

```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
VITE_OAUTH_REDIRECT_URL=http://localhost:5173/auth/callback
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_proyecto_id
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

> ⚠️ **Importante:** Nunca subas el archivo `.env` al repositorio. Ya está incluido en `.gitignore`.
> Solicita las credenciales a un integrante del equipo.

### 5. Agregar imagen del login

Coloca la imagen de fondo del login en:

```
frontend/public/images/login.png
```

> La imagen no está incluida en el repositorio por su tamaño. Solicítala al equipo o usa cualquier imagen `.png` de gimnasio.

---

## ▶️ Ejecutar el proyecto

### Modo desarrollo

```bash
npm run dev
```

Abre el navegador en: **http://localhost:5173**

### Otros comandos

```bash
# Compilar para producción
npm run build

# Previsualizar build de producción
npm run preview

# Ejecutar linter
npm run lint
```

## Voz y dictado

La pantalla de `Rutina` ahora incluye dos ayudas del navegador:

```text
- Dictado por voz para completar instrucciones al generar o regenerar la rutina.
- Temporizador guiado con conteo por voz y aviso cuando quedan 10 segundos.
- Retroalimentación breve durante la sesión al avanzar entre bloques.
- Resumen final por voz al completar el día de entrenamiento.
```

Consideraciones:

```text
- El dictado usa Web Speech API y funciona mejor en Chrome o Edge.
- El saludo y el temporizador por voz usan Speech Synthesis del navegador.
- No requieren nuevas variables de entorno ni cambios en backend.
```

---

## 📁 Estructura del proyecto

```
frontend/
├── public/
│   └── images/
│       └── login.png        # Imagen de fondo del login
├── src/
│   ├── assets/              # Recursos estáticos (SVGs, etc.)
│   ├── components/          # Componentes reutilizables
│   │   ├── ExerciseCard.tsx
│   │   └── Navbar.tsx
│   ├── pages/               # Páginas de la aplicación
│   │   ├── Dashboard.tsx
│   │   ├── HealthHistory.tsx
│   │   ├── Login.tsx
│   │   ├── Login.css
│   │   ├── Profile.tsx
│   │   ├── Progress.tsx
│   │   └── Routine.tsx
│   ├── routes/
│   │   └── AppRoutes.tsx    # Definición de rutas
│   ├── services/
│   │   ├── api.ts           # Llamadas al backend
│   │   ├── authService.ts   # Lógica de autenticación Firebase
│   │   └── routineService.ts
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   └── main.tsx
├── .env                     # Variables de entorno (NO subir)
├── .env.example             # Ejemplo de variables (sí subir)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## ⚙️ Configuración de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona el proyecto **TrainSmart AI**
3. Ve a **Configuración del proyecto → General → Tus apps**
4. Copia las credenciales al archivo `.env`

### Servicios de Firebase utilizados

* **Authentication** — Login con email/contraseña y Google
* **Firestore** *(si aplica)* — Base de datos en tiempo real

---

## 🧠 Nueva funcionalidad — Análisis del entorno y equipo disponible

Se agregó la primera propuesta del MVP dentro de `Routine.tsx`.

### ¿Qué hace?

* Permite subir una foto del espacio de entrenamiento del usuario
* Envía la imagen al backend para analizarla con Ximilar
* Detecta equipo visible como silla, colchoneta o mancuernas
* Guarda el resultado y lo reutiliza al generar o regenerar rutinas

### Flujo técnico

1. El usuario sube una foto desde la vista de rutina.
2. El frontend envía la imagen al backend en formato `data:image/...;base64`.
3. El backend llama a `POST /api/vision/environment/analyze`.
4. El backend usa Ximilar `photo/tags/v2/tags`.
5. El resultado se normaliza a equipo útil de entrenamiento.
6. La imagen se guarda en Supabase Storage privado.
7. El análisis queda disponible en `GET /api/vision/environment/latest`.
8. La IA de rutinas usa automáticamente este contexto visual si existe.

### Consideraciones relevantes

* El token de Ximilar se usa solo en backend
* Las imágenes del entorno se almacenan en bucket privado con signed URLs
* Para habilitar esta funcionalidad también debes configurar el backend y aplicar la migración `backend/sql/008_environment_vision.sql`

---

## 🍽️ Nueva funcionalidad — Análisis visual de alimentación

Se agregó una sección nueva dentro de `Progress.tsx`.

### ¿Qué hace?

* Permite subir una foto de una comida
* Envía la imagen al backend para analizarla con Ximilar
* Detecta grupos visibles como proteína, carbohidratos, vegetales, fruta o grasas
* Genera una orientación educativa aproximada y una lectura alineada con el objetivo del perfil
* Guarda el historial reciente de análisis

### Flujo técnico

1. El usuario sube una foto desde la vista de progreso.
2. El frontend envía la imagen al backend en formato `data:image/...;base64`.
3. El backend llama a `POST /api/vision/nutrition/analyze`.
4. El backend usa Ximilar `photo/tags/v2/tags`.
5. El resultado se normaliza a grupos alimentarios.
6. La imagen se guarda en Supabase Storage privado.
7. El análisis queda disponible en:
   * `GET /api/vision/nutrition/latest`
   * `GET /api/vision/nutrition/history`

### Consideraciones relevantes

* La lectura es educativa y aproximada
* No calcula calorías exactas
* No reemplaza a un nutricionista
* Requiere aplicar la migración `backend/sql/009_nutrition_vision.sql`

---

## 📸 Nueva funcionalidad — Seguimiento visual del progreso corporal

Se agregó una sección nueva dentro de `Progress.tsx`.

### ¿Qué hace?

* Permite subir fotos periódicas del progreso corporal
* Genera un resumen visual del registro actual
* Compara el nuevo registro con el anterior de forma aproximada
* Guarda historial reciente para seguimiento

### Flujo técnico

1. El usuario sube una foto desde la vista de progreso.
2. El frontend envía la imagen al backend en formato `data:image/...;base64`.
3. El backend llama a `POST /api/vision/body-progress/analyze`.
4. El backend usa Ximilar `photo/tags/v2/tags`.
5. Si `Person Detection` de Ximilar no está disponible para la cuenta, el backend hace fallback a una inferencia visual basada en tagging genérico.
6. La imagen se guarda en Supabase Storage privado.
7. El análisis queda disponible en:
   * `GET /api/vision/body-progress/latest`
   * `GET /api/vision/body-progress/history`

### Consideraciones relevantes

* La comparación es orientativa, no clínica
* Puede verse afectada por luz, ángulo, ropa o postura
* Requiere aplicar la migración `backend/sql/010_body_progress_vision.sql`

---

## ✅ Pruebas de las 3 funcionalidades

Se dejaron pruebas automáticas para las tres integraciones visuales.

### Pruebas simuladas

Simulan:

* guardado en base de datos
* guardado en Supabase Storage
* respuestas de Ximilar por mocks

Ejecutar:

```bash
cd backend
npm run test:vision
```

### Smoke tests reales con Ximilar

Ejecutan llamadas reales a Ximilar usando el token configurado en `backend/.env`.

Ejecutar:

```bash
cd backend
$env:RUN_XIMILAR_LIVE_TESTS="true"
npm run test:vision:live
```

### Validaciones usadas durante esta implementación

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

---

## 🛠️ Solución de problemas comunes

**Error: `Cannot find module` al correr `npm run dev`**

```bash
# Borra node_modules y reinstala
rm -rf node_modules
npm install
```

**Error: imagen del login no carga**

* Verifica que el archivo esté en `public/images/login.png`
* Prueba abriendo `http://localhost:5173/images/login.png` en el navegador

**Error: `Failed to resolve import "./Login.css"`**

* Verifica que `Login.css` esté en la misma carpeta que `Login.tsx` (`src/pages/`)

**Error con Firebase: `auth/invalid-api-key`**

* Verifica que el archivo `.env` exista y tenga las credenciales correctas
* Recuerda que las variables deben empezar con `VITE_`

---

👥 Equipo de desarrollo

| Nombre                       | Código |
| ---------------------------- | ------- |
| Jheison Estiben Gomez Muñoz | 2310215 |
| Cristian Daniel Medina Ortiz | 2310117 |
| Juan José Moreno Jaramillo  | 2310038 |
| Anderson Johan Alban Angulo  | 2310006 |
| Luis Gabriel Rodriguez       | 1943075 |

**Docente:** Dr. Carlos Mauricio Gaona Cuevas

**Curso:** Proyecto Integrador 2 — Universidad del Valle
