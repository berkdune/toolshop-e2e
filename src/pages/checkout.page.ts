import { Locator } from '@playwright/test';
import { BasePage } from './base.page';

/** /checkout tek sayfa 4 adımlı sihirbaz: CART → SIGN IN → BILLING → PAYMENT */
export class CheckoutPage extends BasePage {
  // Adım 1 — Cart
  readonly productTitle: Locator = this.page.getByTestId('product-title');
  readonly productQuantity: Locator = this.page.getByTestId('product-quantity');
  readonly productPrice: Locator = this.page.getByTestId('product-price');
  readonly linePrice: Locator = this.page.getByTestId('line-price');
  readonly cartTotal: Locator = this.page.getByTestId('cart-total');
  readonly continueShopping: Locator = this.page.getByTestId('continue-shopping');
  readonly proceed1: Locator = this.page.getByTestId('proceed-1');

  // Adım 2 — Sign in / Guest
  readonly loginEmail: Locator = this.page.getByTestId('email');
  readonly loginPassword: Locator = this.page.getByTestId('password');
  readonly loginSubmit: Locator = this.page.getByTestId('login-submit');
  readonly guestEmail: Locator = this.page.getByTestId('guest-email');
  readonly guestFirstName: Locator = this.page.getByTestId('guest-first-name');
  readonly guestLastName: Locator = this.page.getByTestId('guest-last-name');
  readonly guestSubmit: Locator = this.page.getByTestId('guest-submit');
  readonly proceed2: Locator = this.page.getByTestId('proceed-2');

  // Adım 3 — Billing
  readonly street: Locator = this.page.getByTestId('street');
  readonly houseNumber: Locator = this.page.getByTestId('house_number');
  readonly city: Locator = this.page.getByTestId('city');
  readonly state: Locator = this.page.getByTestId('state');
  readonly postalCode: Locator = this.page.getByTestId('postal_code');
  readonly countrySelect: Locator = this.page.getByTestId('country');
  readonly proceed3: Locator = this.page.getByTestId('proceed-3');

  // Adım 4 — Payment (yöntem seçimine göre dinamik alt alanlar)
  readonly paymentMethod: Locator = this.page.getByTestId('payment-method');
  readonly finishBtn: Locator = this.page.getByTestId('finish');
  readonly successMessage: Locator = this.page.getByTestId('payment-success-message');
  readonly bankName: Locator = this.page.getByTestId('bank_name');
  readonly accountName: Locator = this.page.getByTestId('account_name');
  readonly accountNumber: Locator = this.page.getByTestId('account_number');
  readonly creditCardNumber: Locator = this.page.getByTestId('credit_card_number');
  readonly expirationDate: Locator = this.page.getByTestId('expiration_date');
  readonly cvv: Locator = this.page.getByTestId('cvv');
  readonly cardHolderName: Locator = this.page.getByTestId('card_holder_name');
  readonly monthlyInstallments: Locator = this.page.getByTestId('monthly_installments');
  readonly giftCardNumber: Locator = this.page.getByTestId('gift_card_number');
  readonly validationCode: Locator = this.page.getByTestId('validation_code');

  async goto(): Promise<void> {
    await this.page.goto('/checkout');
  }

  async signInDuringCheckout(email: string, password: string): Promise<void> {
    await this.loginEmail.fill(email);
    await this.loginPassword.fill(password);
    await this.loginSubmit.click();
    await this.proceed2.waitFor();
  }

  async continueAsGuest(email: string, firstName: string, lastName: string): Promise<void> {
    // Misafir formu ayrı bir sekmede; alanlar sekme açılmadan görünmez.
    await this.page.getByRole('tab', { name: 'Continue as Guest' }).click();
    await this.guestEmail.fill(email);
    await this.guestFirstName.fill(firstName);
    await this.guestLastName.fill(lastName);
    await this.guestSubmit.click();
    // Misafir onayı sonrası "Proceed to checkout" butonu geç render olur; click auto-wait eder.
    await this.proceed2
      .or(this.page.getByRole('button', { name: /proceed to checkout/i }))
      .first()
      .click();
  }

  /**
   * Billing formunu güvenilir şekilde doldurur. Ülke değişimi adres alanlarını asenkron
   * temizleyebildiği için ülke ÖNCE seçilir; ardından değerler doğrulanıp gerekirse
   * yeniden yazılır (house_number UI'da zorunlu — bilinen API/UI tutarsızlığı).
   */
  async fillBillingDefaults(d: {
    street: string;
    houseNumber: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  }): Promise<void> {
    if (d.country && (await this.countrySelect.inputValue()) !== d.country) {
      await this.countrySelect.selectOption(d.country);
      await this.page.waitForTimeout(300);
    }
    const fields: Array<[Locator, string]> = [
      [this.postalCode, d.postalCode],
      [this.houseNumber, d.houseNumber],
      [this.street, d.street],
      [this.city, d.city],
      [this.state, d.state],
    ];
    for (let round = 0; round < 3; round++) {
      let allSet = true;
      for (const [locator, value] of fields) {
        if ((await locator.inputValue()) !== value) {
          allSet = false;
          await locator.fill(value);
        }
      }
      if (allSet && (await this.proceed3.isEnabled().catch(() => false))) return;
      await this.page.waitForTimeout(400);
    }
  }

  async payWith(method: string): Promise<void> {
    await this.paymentMethod.selectOption(method);
    await this.finishBtn.click();
  }
}
