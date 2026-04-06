import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";

/*
 * ── Variables de entorno ──
 * Se cargan desde e2e/.env.test vía playwright.config.ts (dotenv)
 */
const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "test@trainsmart.com";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "TestPass123!";

test.describe("Login — Flujo de autenticación", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test("debe mostrar el formulario de login por defecto", async () => {
    await expect(loginPage.formTitle).toHaveText("Inicia Sesión");
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.submitButton).toHaveText("Ingresar al sistema");
  });

  test("debe mostrar el botón de Google", async () => {
    await expect(loginPage.googleButton).toBeVisible();
    await expect(loginPage.googleButton).toContainText("Continuar con Google");
  });

  test("login exitoso redirige al dashboard", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await loginPage.login(TEST_EMAIL, TEST_PASSWORD);

    // Esperar al SweetAlert de éxito
    await loginPage.waitForSuccessAlert();

    // El SweetAlert se cierra automáticamente (timer: 2000)
    // Esperar a que la navegación post-login se estabilice
    await dashboardPage.waitForPostLoginRedirect();
    await dashboardPage.expectAuthenticated();
  });

  test("login con credenciales inválidas muestra error", async () => {
    await loginPage.login("wrong@email.com", "WrongPassword123!");

    // Esperar el SweetAlert de error
    await loginPage.waitForErrorAlert();
    const alertText = await loginPage.getAlertText();

    expect(alertText).toContain("Error");
  });

  test("el botón submit se deshabilita durante el loading", async () => {
    await loginPage.fillEmail(TEST_EMAIL);
    await loginPage.fillPassword(TEST_PASSWORD);

    // Click y verificar inmediatamente que se deshabilita
    await loginPage.submitButton.click();
    await expect(loginPage.submitButton).toBeDisabled();
  });

  test("formulario vacío no permite submit (HTML validation bypass)", async ({
    page,
  }) => {
    // El formulario usa noValidate, así que no hay validación HTML nativa.
    // Verificar que los campos están vacíos
    await expect(loginPage.emailInput).toHaveValue("");
    await expect(loginPage.passwordInput).toHaveValue("");

    // Click submit con campos vacíos — debe intentar auth y fallar
    await loginPage.submitButton.click();

    // Esperar el loading alert (aunque sea breve, significa que sí se envió)
    // y luego un error porque las credenciales están vacías
    await loginPage.waitForErrorAlert();
    const alertText = await loginPage.getAlertText();
    expect(alertText.length).toBeGreaterThan(0);
  });
});

test.describe("Login — Navegación entre vistas", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test("switch a vista de registro", async () => {
    await loginPage.switchToRegister();
    await expect(loginPage.formTitle).toHaveText("Crear Cuenta");
    await expect(loginPage.nameInput).toBeVisible();
    await expect(loginPage.confirmPasswordInput).toBeVisible();
  });

  test("switch a vista de recuperación de contraseña", async () => {
    await loginPage.switchToForgot();
    await expect(loginPage.formTitle).toHaveText("Recuperar Acceso");
    await expect(loginPage.emailInput).toBeVisible();
    // El botón de submit debe decir "Enviar enlace de recuperación"
    await expect(loginPage.submitButton).toHaveText(
      "Enviar enlace de recuperación"
    );
  });

  test("volver de forgot a login", async ({ page }) => {
    await loginPage.switchToForgot();
    await expect(loginPage.formTitle).toHaveText("Recuperar Acceso");

    // Click en "Volver al login"
    const backButton = page.locator("button.lr-back");
    await backButton.click();

    await expect(loginPage.formTitle).toHaveText("Inicia Sesión");
  });

  test("register → login link funciona", async () => {
    await loginPage.switchToRegister();
    await expect(loginPage.formTitle).toHaveText("Crear Cuenta");

    // Click "Inicia sesión"
    await loginPage.loginLink.click();
    await expect(loginPage.formTitle).toHaveText("Inicia Sesión");
  });

  test("los dots indicadores reflejan la vista activa", async ({ page }) => {
    // En login, el primer dot debe estar activo
    const dots = page.locator("button.lr-dot");
    await expect(dots.nth(0)).toHaveClass(/lr-dot--on/);
    await expect(dots.nth(1)).not.toHaveClass(/lr-dot--on/);

    // Switch a register
    await loginPage.switchToRegister();
    await expect(dots.nth(1)).toHaveClass(/lr-dot--on/);
    await expect(dots.nth(0)).not.toHaveClass(/lr-dot--on/);
  });
});
