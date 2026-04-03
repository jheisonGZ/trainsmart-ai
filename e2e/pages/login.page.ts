import type { Locator, Page } from "@playwright/test";

/**
 * Page Object Model para la página de Login (/).
 *
 * Selectores basados en la estructura real de Login.tsx:
 * - Formulario con clases lr-f, lr-btn, lr-gbtn
 * - SweetAlert2 con clase swal-ts-popup
 */
export class LoginPage {
  readonly page: Page;

  /* ── Locators ── */
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly googleButton: Locator;
  readonly forgotButton: Locator;
  readonly registerLink: Locator;
  readonly loginLink: Locator;
  readonly formTitle: Locator;

  /* ── Register-specific ── */
  readonly nameInput: Locator;
  readonly confirmPasswordInput: Locator;

  constructor(page: Page) {
    this.page = page;

    // Login form
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator(
      'input[autocomplete="current-password"], .lr-form input[type="password"]:first-of-type'
    );
    this.submitButton = page.locator("button.lr-btn");
    this.googleButton = page.locator("button.lr-gbtn");
    this.forgotButton = page.locator("button.lr-forgot");
    this.registerLink = page.locator("p.lr-sw button");
    this.loginLink = page.locator("p.lr-sw button");
    this.formTitle = page.locator("h2.lr-title");

    // Register form
    this.nameInput = page.locator('input[autocomplete="name"]');
    this.confirmPasswordInput = page.locator(
      'input[placeholder="Repite tu contraseña"]'
    );
  }

  /* ── Acciones ── */

  async goto() {
    await this.page.goto("/");
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async submitLogin() {
    await this.submitButton.click();
  }

  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submitLogin();
  }

  async switchToRegister() {
    await this.registerLink.click();
  }

  async switchToForgot() {
    await this.forgotButton.click();
  }

  /* ── Register ── */

  async fillRegisterForm(
    name: string,
    email: string,
    password: string,
    confirmPassword: string
  ) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    // En register, el password input es el primero dentro de .lr-iw
    await this.page
      .locator('.lr-form input[type="password"]')
      .first()
      .fill(password);
    await this.confirmPasswordInput.fill(confirmPassword);
  }

  /* ── SweetAlert2 helpers ── */

  /** Espera a que aparezca un SweetAlert2 y retorna su texto */
  async getAlertText(): Promise<string> {
    const popup = this.page.locator(".swal2-popup");
    await popup.waitFor({ state: "visible", timeout: 10_000 });
    const title =
      (await this.page.locator(".swal2-title").textContent()) ?? "";
    const text =
      (await this.page
        .locator(".swal2-html-container")
        .textContent()
        .catch(() => "")) ?? "";
    return `${title} ${text}`.trim();
  }

  /** Espera a que un SweetAlert2 de error aparezca */
  async waitForErrorAlert() {
    await this.page.locator(".swal2-popup .swal2-icon-error").waitFor({
      state: "visible",
      timeout: 10_000,
    });
  }

  /** Espera a que un SweetAlert2 de éxito aparezca */
  async waitForSuccessAlert() {
    await this.page.locator(".swal2-popup .swal2-icon-success").waitFor({
      state: "visible",
      timeout: 10_000,
    });
  }

  /** Cierra el SweetAlert2 clickeando el botón de confirmar */
  async dismissAlert() {
    const confirmBtn = this.page.locator(".swal2-confirm");
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }
    // Esperar a que desaparezca
    await this.page
      .locator(".swal2-popup")
      .waitFor({ state: "hidden", timeout: 5_000 })
      .catch(() => {});
  }

  /** Espera que el SweetAlert de loading aparezca */
  async waitForLoadingAlert() {
    await this.page.locator(".swal2-popup .swal2-loading").waitFor({
      state: "visible",
      timeout: 5_000,
    });
  }
}
