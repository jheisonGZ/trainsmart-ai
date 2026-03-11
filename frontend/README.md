# 🏋️ TrainSmart AI — Frontend

Aplicación web inteligente que genera rutinas de entrenamiento personalizadas usando IA (LLM). Desarrollada con **React + TypeScript + Vite**.

---

## 📋 Requisitos previos

Antes de instalar, asegúrate de tener instalado:

| Herramienta | Versión mínima | Verificar |
|-------------|---------------|-----------|
| Node.js     | 18.x o superior | `node -v` |
| npm         | 9.x o superior  | `npm -v`  |
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

| Librería | Versión | Uso |
|----------|---------|-----|
| `react` | ^19.2.0 | Framework UI principal |
| `react-dom` | ^19.2.0 | Renderizado en el DOM |
| `react-router-dom` | ^7.13.1 | Navegación entre páginas |
| `firebase` | ^12.10.0 | Autenticación y base de datos |
| `lucide-react` | ^0.577.0 | Iconos SVG |
| `sweetalert2` | ^11.26.22 | Alertas y modales estilizados |

**Dependencias de desarrollo:**

| Librería | Versión | Uso |
|----------|---------|-----|
| `vite` | ^7.3.1 | Bundler y servidor de desarrollo |
| `typescript` | ~5.9.3 | Tipado estático |
| `@vitejs/plugin-react` | ^5.1.1 | Soporte React en Vite |
| `eslint` | ^9.39.1 | Linter de código |

### 4. Configurar variables de entorno

Crea un archivo `.env` en la raíz de `/frontend` con las credenciales de Firebase:

```env
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

- **Authentication** — Login con email/contraseña y Google
- **Firestore** *(si aplica)* — Base de datos en tiempo real

---

## 🛠️ Solución de problemas comunes

**Error: `Cannot find module` al correr `npm run dev`**
```bash
# Borra node_modules y reinstala
rm -rf node_modules
npm install
```

**Error: imagen del login no carga**
- Verifica que el archivo esté en `public/images/login.png`
- Prueba abriendo `http://localhost:5173/images/login.png` en el navegador

**Error: `Failed to resolve import "./Login.css"`**
- Verifica que `Login.css` esté en la misma carpeta que `Login.tsx` (`src/pages/`)

**Error con Firebase: `auth/invalid-api-key`**
- Verifica que el archivo `.env` exista y tenga las credenciales correctas
- Recuerda que las variables deben empezar con `VITE_`

---

## 👥 Equipo de desarrollo

| Nombre | Código |
|--------|--------|
| Jheison Estiben Gomez Muñoz | 2310215 |
| Cristian Daniel Medina Ortiz | 2310117 |
| Juan José Moreno Jaramillo | 2310038 |
| Anderson Johan Alban Angulo | 2310006 |
| Luis Gabriel Rodriguez | 1943075 |

**Docente:** Dr. Carlos Mauricio Gaona Cuevas  
**Curso:** Proyecto Integrador 2 — Universidad del Valle
