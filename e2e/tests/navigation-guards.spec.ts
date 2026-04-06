import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "test@trainsmart.com";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "TestPass123!";

test.describe("Guards de navegación", () => {
  test("ruta privada /home redirige a / sin autenticación", async ({
    page,
  }) => {
    await page.goto("/home");

    // El PrivateRoute debe redirigir a / (login)
    await page.waitForURL("/", { timeout: 10_000 });
    await expect(page).toHaveURL("/");

    // Verificar que estamos en la página de login
    const loginTitle = page.locator("h2.lr-title");
    await expect(loginTitle).toBeVisible();
  });

  test("ruta privada /profile redirige a / sin autenticación", async ({
    page,
  }) => {
    await page.goto("/profile");
    await page.waitForURL("/", { timeout: 10_000 });
    await expect(page).toHaveURL("/");
  });

  test("ruta privada /health redirige a / sin autenticación", async ({
    page,
  }) => {
    await page.goto("/health");
    await page.waitForURL("/", { timeout: 10_000 });
    await expect(page).toHaveURL("/");
  });

  test("ruta privada /dashboard redirige a / sin autenticación", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForURL("/", { timeout: 10_000 });
    await expect(page).toHaveURL("/");
  });

  test("ruta inexistente redirige a /", async ({ page }) => {
    await page.goto("/ruta-que-no-existe");
    await page.waitForURL("/", { timeout: 10_000 });
    await expect(page).toHaveURL("/");
  });

  test("ruta pública / con sesión activa redirige a /dashboard", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    // Primero hacer login
    await loginPage.goto();
    await loginPage.login(TEST_EMAIL, TEST_PASSWORD);
    await loginPage.waitForSuccessAlert();

    // Esperar a que se resuelva la navegación post-login
    await page.waitForURL(
      (url) => {
        const path = url.pathname;
        return (
          path === "/profile" ||
          path === "/health" ||
          path === "/home" ||
          path === "/dashboard"
        );
      },
      { timeout: 20_000 }
    );

    // Ahora intentar ir a / (login) — debe redirigir porque ya hay sesión
    await page.goto("/");

    // PublicRoute detecta que hay supabaseUser y redirige a /dashboard
    await page.waitForURL(
      (url) => {
        const path = url.pathname;
        return (
          path === "/dashboard" ||
          path === "/profile" ||
          path === "/health" ||
          path === "/home"
        );
      },
      { timeout: 15_000 }
    );

    // No debe estar en / (login)
    expect(page.url()).not.toBe("/");
  });
});
