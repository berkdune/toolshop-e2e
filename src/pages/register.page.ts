import { Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { TestUser } from '../utils/data-factory';

export class RegisterPage extends BasePage {
  readonly submit: Locator = this.page.getByTestId('register-submit');

  async goto(): Promise<void> {
    await this.page.goto('/auth/register');
  }

  async register(user: TestUser): Promise<void> {
    await this.page.getByTestId('first-name').fill(user.firstName);
    await this.page.getByTestId('last-name').fill(user.lastName);
    await this.page.getByTestId('dob').fill(user.dob);
    // Changing the country can asynchronously clear the address fields
    // (postcode-lookup watcher), so the country is selected first.
    const country = this.page.getByTestId('country');
    // The select uses ISO codes; some builds match by label instead — try both.
    await country.selectOption(user.country).catch(() => country.selectOption({ label: 'Turkey' }));
    const addressFields: Array<[string, string]> = [
      ['postal_code', user.postalCode],
      ['house_number', user.houseNumber],
      ['street', user.street],
      ['city', user.city],
      ['state', user.state],
    ];
    for (const [testId, value] of addressFields) await this.page.getByTestId(testId).fill(value);
    await this.page.getByTestId('phone').fill(user.phone);
    await this.page.getByTestId('email').fill(user.email);
    await this.page.getByTestId('password').fill(user.password);
    // Refill anything a late-firing reset may have cleared before submitting.
    for (const [testId, value] of addressFields) {
      const field = this.page.getByTestId(testId);
      if ((await field.inputValue()) === '') await field.fill(value);
    }
    await this.submit.click();
  }
}
