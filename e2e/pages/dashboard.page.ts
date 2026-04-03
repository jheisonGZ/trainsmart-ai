import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Page Object Model para el Dashboard / post-login.
 *
 * Tras un login exitoso el flujo es:
 *   /dashboard → RootRedirect → /profile | /health | /home
 *
 * Este POM verifica en qué ruta terminó el usuario.
 */
export class DashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Espera a que la navegación post-login se estabilice.
   * RootRedirect llama a /api/auth/me y redirige según el estado.
   */
  async waitForPostLoginRedirect(timeoutMs = 20_000) {
    // Esperar a que salga de /dashboard (RootRedirect) y llegue a un destino final
    await this.page.waitForURL(
      (url) => {
        const path = url.pathname;
        return (
          path === "/profile" ||
          path === "/health" ||
          path === "/home" ||
          path === "/"
        );
      },
      { timeout: timeoutMs }
    );
  }

  /** Verifica que la ruta actual sea /profile */
  async expectAtProfile() {
    await expect(this.page).toHaveURL(/\/profile/);
  }

  /** Verifica que la ruta actual sea /health */
  async expectAtHealth() {
    await expect(this.page).toHaveURL(/\/health/);
  }

  /** Verifica que la ruta actual sea /home (Dashboard principal) */
  async expectAtHome() {
    await expect(this.page).toHaveURL(/\/home/);
  }

  /** Verifica que estemos en alguna de las rutas protegidas post-login */
  async expectAuthenticated() {
    const url = this.page.url();
    const isProtected =
      url.includes("/profile") ||
      url.includes("/health") ||
      url.includes("/home") ||
      url.includes("/dashboard");

    expect(isProtected).toBe(true);
  }

  /** Retorna la ruta actual */
  getCurrentPath(): string {
    return new URL(this.page.url()).pathname;
  }
}
