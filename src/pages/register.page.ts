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
    // Ülke değişimi adres alanlarını asenkron temizleyebiliyor (postcode-lookup watcher'ı)
    // → ülke ÖNCE seçilir, adres sonra doldurulur.
    const country = this.page.getByTestId('country');
    // Select değeri ISO kod; bazı sürümlerde label ile eşleşebilir — iki yol da denenir.
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
    // Geç tetiklenen bir temizleme alanı boşaltmışsa submit öncesi geri doldur.
    for (const [testId, value] of addressFields) {
      const field = this.page.getByTestId(testId);
      if ((await field.inputValue()) === '') await field.fill(value);
    }
    await this.submit.click();
  }
}
