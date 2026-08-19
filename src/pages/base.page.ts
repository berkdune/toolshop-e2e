import { Locator, Page } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  get cartBadge(): Locator {
    return this.page.getByTestId('cart-quantity');
  }
  get navSignIn(): Locator {
    return this.page.getByTestId('nav-sign-in');
  }
  /** Login sonrası kullanıcı adının göründüğü menü. */
  get navUserMenu(): Locator {
    return this.page.getByTestId('nav-menu');
  }
  get pageTitle(): Locator {
    return this.page.getByTestId('page-title');
  }
}
