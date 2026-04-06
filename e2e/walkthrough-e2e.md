# Walkthrough — Pruebas E2E con Playwright

## Qué se hizo

Se configuró un entorno completo de pruebas E2E usando **Playwright + TypeScript** con patrón **Page Object Model** y aislamiento **Docker**.

## Estructura creada

```
trainsmart-ai/
├── e2e/                              ← Workspace aislado
│   ├── package.json                  ← @playwright/test + dotenv
│   ├── tsconfig.json
│   ├── playwright.config.ts          ← webServer auto-start backend+frontend
│   ├── .env.test                     ← Credenciales de prueba
│   ├── .gitignore
│   ├── pages/
│   │   ├── login.page.ts             ← POM: Login
│   │   └── dashboard.page.ts         ← POM: Post-login
│   └── tests/
│       ├── login.spec.ts             ← 11 tests
│       └── navigation-guards.spec.ts ← 6 tests
├── frontend/
│   └── Dockerfile.test               ← Vite dev server en Docker
└── docker-compose.test.yml           ← 3 servicios aislados
```

## Tests — 17 total

### login.spec.ts (11 tests)

| Test | Qué verifica |
|------|-------------|
| Formulario login por defecto | Título, campos, botón visibles |
| Botón de Google | Visible con texto correcto |
| Login exitoso redirige | email/pass → SweetAlert success → /dashboard→/profile/home |
| Credenciales inválidas | SweetAlert error aparece |
| Botón disabled durante loading | `disabled` attribute tras click |
| Formulario vacío | Submit falla con error |
| Switch a registro | Vista cambia a "Crear Cuenta" |
| Switch a recuperación | Vista cambia a "Recuperar Acceso" |
| Volver de forgot a login | Botón back funciona |
| Register → login link | Link "Inicia sesión" funciona |
| Dots indicadores | Clase `lr-dot--on` cambia con la vista |

### navigation-guards.spec.ts (6 tests)

| Test | Qué verifica |
|------|-------------|
| /home sin auth → / | PrivateRoute redirige |
| /profile sin auth → / | PrivateRoute redirige |
| /health sin auth → / | PrivateRoute redirige |
| /dashboard sin auth → / | PrivateRoute redirige |
| Ruta inexistente → / | Catch-all redirige |
| / con sesión → /dashboard | PublicRoute redirige |

## Verificación

```
$ npx playwright test --list
Listing tests:
  [chromium] › login.spec.ts (11 tests)
  [chromium] › navigation-guards.spec.ts (6 tests)
Total: 17 tests in 2 files ✅
```

## Cómo usar

```bash
# ── Local ──
cd e2e
npm install                        # Ya hecho
npx playwright install chromium    # Ya hecho

# Configurar credenciales en .env.test
# Ejecutar tests (levanta backend+frontend automáticamente):
npx playwright test

# Ver reporte HTML:
npx playwright show-report

# Modo visual:
npx playwright test --headed

# ── Docker (aislado) ──
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit
```

> [!IMPORTANT]
> Antes de ejecutar los tests, edita [e2e/.env.test](file:///Users/cristianmedina/Documents/Projects/Univall/trainsmart-ai/e2e/.env.test) con las credenciales de un usuario real de Supabase.
