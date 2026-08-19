import { Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  readonly email: Locator = this.page.getByTestId('email');
  readonly password: Locator = this.page.getByTestId('password');
  readonly submit: Locator = this.page.getByTestId('login-submit');
  readonly error: Locator = this.page.getByTestId('login-error');

  async goto(): Promise<void> {
    await this.page.goto('/auth/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
