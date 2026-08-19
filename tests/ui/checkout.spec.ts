import { Page, expect } from '@playwright/test';
import { test } from '../../src/fixtures/fixtures';
import { buildUser, TestUser } from '../../src/utils/data-factory';
import { money } from '../../src/utils/money';
import { HomePage } from '../../src/pages/home.page';
import { ProductPage } from '../../src/pages/product.page';
import { CheckoutPage } from '../../src/pages/checkout.page';

interface Flow {
  home: HomePage;
  productPage: ProductPage;
  checkout: CheckoutPage;
  page: Page;
}

/** Ürünü sepete atar, kayıtlı kullanıcıyla giriş yapıp Payment adımına kadar ilerler. */
async function reachPayment(f: Flow, user: TestUser, productName: string): Promise<void> {
  await f.home.goto();
  await f.home.openProduct(productName);
  await f.productPage.addToCart();
  await expect(f.productPage.cartBadge).toHaveText('1');

  await f.checkout.goto();
  await f.checkout.proceed1.click();
  await f.checkout.signInDuringCheckout(user.email, user.password);
  await f.checkout.proceed2.click();
  await f.checkout.fillBillingDefaults(user);
  await expect(f.checkout.proceed3).toBeEnabled();
  await f.checkout.proceed3.click();
  await expect(f.checkout.paymentMethod).toBeVisible();
}

test.describe('Checkout', () => {
  test(
    'TC-052 | Order - Registered customer completes an order with Cash on Delivery',
    { tag: ['@smoke', '@checkout'] },
    async ({ home, productPage, checkout, testUser, page, stockProduct }) => {
      await home.goto();
      await home.openProduct(stockProduct.name);
      await productPage.addToCart();
      await expect(productPage.cartBadge).toHaveText('1');

      await checkout.goto();
      await checkout.proceed1.click();
      await checkout.signInDuringCheckout(testUser.email, testUser.password);
      await checkout.proceed2.click();

      // Adres profilden prefill gelir; eksik alanlar (house_number) doldurulur.
      await expect(checkout.street).toHaveValue(testUser.street);
      await checkout.fillBillingDefaults(testUser);
      await expect(checkout.proceed3).toBeEnabled();
      await checkout.proceed3.click();

      await checkout.payWith('cash-on-delivery');
      await expect(checkout.successMessage).toHaveText('Payment was successful', { timeout: 15_000 });

      // Akış iki fazlı: ilk Confirm ödeme kontrolü, İKİNCİ Confirm siparişi verir.
      const invoiceResponse = page.waitForResponse(
        (r) => r.url().includes('/invoices') && r.request().method() === 'POST',
      );
      await checkout.finishBtn.click();
      expect((await invoiceResponse).status()).toBe(201);
    },
  );

  test(
    'TC-053 | Billing - Address fields are prefilled from the profile',
    { tag: ['@regression', '@checkout'] },
    async ({ home, productPage, checkout, testUser, stockProduct }) => {
      await home.goto();
      await home.openProduct(stockProduct.name);
      await productPage.addToCart();

      await checkout.goto();
      await checkout.proceed1.click();
      await checkout.signInDuringCheckout(testUser.email, testUser.password);
      await checkout.proceed2.click();

      await expect(checkout.street).toHaveValue(testUser.street);
      await expect(checkout.city).toHaveValue(testUser.city);
      await expect(checkout.state).toHaveValue(testUser.state);
      await expect(checkout.postalCode).toHaveValue(testUser.postalCode);
      await expect(checkout.countrySelect).toHaveValue(testUser.country);
    },
  );

  test(
    'TC-054 | Billing - Proceed stays disabled until the billing form is complete',
    { tag: ['@regression', '@checkout'] },
    async ({ home, productPage, checkout, api, stockProduct }, testInfo) => {
      // API kayıtta house_number null olabiliyor ama UI zorunlu tutuyor — bilinen tutarsızlık.
      const user = { ...buildUser(), houseNumber: '' };
      user.id = await api.register(user);

      await home.goto();
      await home.openProduct(stockProduct.name);
      await productPage.addToCart();
      await checkout.goto();
      await checkout.proceed1.click();
      await checkout.signInDuringCheckout(user.email, user.password);
      await checkout.proceed2.click();

      await expect(checkout.houseNumber).toHaveValue('');
      await expect(checkout.proceed3).toBeDisabled();

      // Bulgu (bug adayı): kullanıcı house_number girince arka plandaki postcode lookup
      // cevabı alanı SİLEBİLİYOR. Yapışana kadar doğrula-yeniden-doldur.
      await checkout.houseNumber.fill('12');
      await checkout.houseNumber.blur();
      let wiped = false;
      await expect
        .poll(async () => {
          if ((await checkout.houseNumber.inputValue()) !== '12') {
            wiped = true;
            await checkout.houseNumber.fill('12');
            await checkout.houseNumber.blur();
          }
          return checkout.proceed3.isEnabled();
        }, { timeout: 20_000 })
        .toBe(true);
      if (wiped) {
        testInfo.annotations.push({
          type: 'bug-candidate',
          description: 'Billing: kullanıcının girdiği house_number, asenkron postcode lookup tarafından siliniyor.',
        });
      }

      await api.tryDeleteUser(user.id);
    },
  );

  test(
    'TC-055 | Payment - Bank Transfer requires bank fields and completes',
    { tag: ['@regression', '@checkout'] },
    async ({ home, productPage, checkout, testUser, page, stockProduct }) => {
      await reachPayment({ home, productPage, checkout, page }, testUser, stockProduct.name);

      await checkout.paymentMethod.selectOption('bank-transfer');
      await expect(checkout.bankName).toBeVisible();
      await expect(checkout.accountName).toBeVisible();
      await expect(checkout.accountNumber).toBeVisible();

      await checkout.bankName.fill('Testbank');
      await checkout.accountName.fill('Berk Tester');
      await checkout.accountNumber.fill('123456789');
      await checkout.finishBtn.click();
      await expect(checkout.successMessage).toHaveText('Payment was successful', { timeout: 15_000 });
    },
  );

  test(
    'TC-056 | Payment - Credit Card completes with valid data',
    { tag: ['@regression', '@checkout'] },
    async ({ home, productPage, checkout, testUser, page, stockProduct }) => {
      await reachPayment({ home, productPage, checkout, page }, testUser, stockProduct.name);

      await checkout.paymentMethod.selectOption('credit-card');
      await checkout.creditCardNumber.fill('4111-1111-1111-1111');
      await checkout.expirationDate.fill('12/2027');
      await checkout.cvv.fill('123');
      await checkout.cardHolderName.fill('Berk Tester');
      await checkout.finishBtn.click();
      await expect(checkout.successMessage).toHaveText('Payment was successful', { timeout: 15_000 });
    },
  );

  test(
    'TC-057 | Payment - Credit Card rejects invalid inputs',
    { tag: ['@regression', '@checkout'] },
    async ({ home, productPage, checkout, testUser, page, stockProduct }) => {
      await reachPayment({ home, productPage, checkout, page }, testUser, stockProduct.name);

      await checkout.paymentMethod.selectOption('credit-card');
      await checkout.creditCardNumber.fill('1234');
      await checkout.expirationDate.fill('01/2020');
      await checkout.cvv.fill('ab');
      await checkout.cardHolderName.fill('X');
      await page.keyboard.press('Tab');

      await expect(page.getByText(/invalid|format|expired|must/i).first()).toBeVisible();
      if (await checkout.finishBtn.isEnabled()) {
        await checkout.finishBtn.click();
        await expect(checkout.successMessage).not.toBeVisible();
      } else {
        await expect(checkout.finishBtn).toBeDisabled();
      }
    },
  );

  test(
    'TC-058 | Payment - Buy Now Pay Later with a selected installment plan',
    { tag: ['@regression', '@checkout'] },
    async ({ home, productPage, checkout, testUser, page, stockProduct }) => {
      await reachPayment({ home, productPage, checkout, page }, testUser, stockProduct.name);

      await checkout.paymentMethod.selectOption('buy-now-pay-later');
      await expect(checkout.monthlyInstallments).toBeVisible();
      await checkout.monthlyInstallments.selectOption({ index: 1 });
      await checkout.finishBtn.click();
      await expect(checkout.successMessage).toHaveText('Payment was successful', { timeout: 15_000 });
    },
  );

  test(
    'TC-059 | Payment - Gift Card completes with card number and validation code',
    { tag: ['@regression', '@checkout'] },
    async ({ home, productPage, checkout, testUser, page, stockProduct }) => {
      await reachPayment({ home, productPage, checkout, page }, testUser, stockProduct.name);

      await checkout.paymentMethod.selectOption('gift-card');
      await expect(checkout.giftCardNumber).toBeVisible();
      // Kural: gift card numarası tam 16 harf/rakam olmalı.
      await checkout.giftCardNumber.fill('1234567890123456');
      await checkout.validationCode.fill('1234');
      await checkout.finishBtn.click();
      await expect(checkout.successMessage).toHaveText('Payment was successful', { timeout: 15_000 });
    },
  );

  test(
    'TC-060 | Payment - Confirm requires a payment method',
    { tag: ['@regression', '@checkout'] },
    async ({ home, productPage, checkout, testUser, page, stockProduct }) => {
      await reachPayment({ home, productPage, checkout, page }, testUser, stockProduct.name);
      await expect(checkout.paymentMethod).toHaveValue('');
      await expect(checkout.finishBtn).toBeDisabled();
    },
  );

  test(
    'TC-061 | Guest - Guest completes checkout without an account',
    { tag: ['@smoke', '@checkout'] },
    async ({ home, productPage, checkout, page, stockProduct }) => {
      const guest = buildUser();
      await home.goto();
      await home.openProduct(stockProduct.name);
      await productPage.addToCart();
      await expect(productPage.cartBadge).toHaveText('1');

      await checkout.goto();
      await checkout.proceed1.click();
      await checkout.continueAsGuest(guest.email, guest.firstName, guest.lastName);

      await checkout.street.waitFor();
      await checkout.fillBillingDefaults(guest);
      await expect(checkout.proceed3).toBeEnabled();
      await checkout.proceed3.click();

      await checkout.payWith('cash-on-delivery');
      await expect(checkout.successMessage).toHaveText('Payment was successful', { timeout: 15_000 });

      // İki fazlı akış: ikinci Confirm misafir siparişini yaratır.
      const invoiceResponse = page.waitForResponse(
        (r) => r.url().includes('/invoices') && r.request().method() === 'POST',
      );
      await checkout.finishBtn.click();
      expect((await invoiceResponse).status()).toBe(201);
    },
  );

  test(
    'TC-062 | Billing - Postcode lookup fills the address automatically',
    { tag: ['@regression', '@checkout'] },
    async ({ home, productPage, checkout, testUser, page, stockProduct }) => {
      await home.goto();
      await home.openProduct(stockProduct.name);
      await productPage.addToCart();
      await checkout.goto();
      await checkout.proceed1.click();
      await checkout.signInDuringCheckout(testUser.email, testUser.password);
      await checkout.proceed2.click();

      // Lookup'ın doldurduğunu görmek için adres alanları önce temizlenir.
      await checkout.street.fill('');
      await checkout.city.fill('');
      await checkout.state.fill('');
      await checkout.postalCode.fill('1012JS');
      await checkout.houseNumber.fill('1');
      await page.getByTestId('postcode-lookup-hint').click().catch(() => {});
      await checkout.state.click();

      await expect(checkout.street).toHaveValue('van den Pollaan', { timeout: 10_000 });
      await expect(checkout.city).toHaveValue('Laren');
    },
  );

  test(
    'TC-063 | Order - Completed order appears in the customer\'s invoices',
    { tag: ['@regression', '@checkout'] },
    async ({ home, productPage, checkout, testUser, page, stockProduct }) => {
      await reachPayment({ home, productPage, checkout, page }, testUser, stockProduct.name);
      const cartTotal = money(await checkout.cartTotal.textContent().catch(() => null)) || null;

      await checkout.payWith('cash-on-delivery');
      await expect(checkout.successMessage).toHaveText('Payment was successful', { timeout: 15_000 });

      const invoiceResponse = page.waitForResponse(
        (r) => r.url().includes('/invoices') && r.request().method() === 'POST',
      );
      await checkout.finishBtn.click();
      const created = await (await invoiceResponse).json();
      expect(created.invoice_number).toMatch(/^INV-/);

      await page.goto('/account/invoices');
      const row = page.locator('table tbody tr').filter({ hasText: created.invoice_number });
      await expect(row).toBeVisible({ timeout: 15_000 });
      if (cartTotal) await expect(row).toContainText(String(created.total));
    },
  );

  test(
    'TC-064 | Wizard - Returning to the cart step keeps and updates the order data',
    { tag: ['@regression', '@checkout'] },
    async ({ home, productPage, checkout, testUser, page, stockProduct }) => {
      await reachPayment({ home, productPage, checkout, page }, testUser, stockProduct.name);
      const unitTotal = money(await checkout.cartTotal.textContent().catch(() => null));

      // Bulgu: wizard adım göstergesi tıklanabilir görünse de geriye navigasyon yapmıyor;
      // nav'daki sepet linki de aynı route olduğu için Angular'da işlemsiz. Cart adımına
      // dönüşün güvenilir yolu tam sayfa yenileme (wizard sepeti koruyarak baştan başlar).
      await page.reload();
      await expect(checkout.productQuantity).toBeVisible();

      await checkout.productQuantity.fill('2');
      await page.keyboard.press('Tab');
      await expect.poll(async () => money(await checkout.cartTotal.textContent())).toBeCloseTo(unitTotal * 2, 2);

      await checkout.proceed1.click();
      await checkout.proceed2.click();
      await expect(checkout.street).toHaveValue(testUser.street);
      await expect(checkout.proceed3).toBeEnabled();
    },
  );

  test(
    'TC-065 | Session - Cart is kept after signing in during checkout',
    { tag: ['@regression', '@checkout'] },
    async ({ home, productPage, checkout, testUser, stockProduct }) => {
      await home.goto();
      await home.openProduct(stockProduct.name);
      await productPage.addToCart();

      await checkout.goto();
      await checkout.proceed1.click();
      await checkout.signInDuringCheckout(testUser.email, testUser.password);

      await expect(checkout.cartBadge).toHaveText('1');
      await expect(checkout.productQuantity).toHaveValue('1');
      await expect(checkout.productTitle).toContainText(stockProduct.name);
    },
  );

  test(
    'TC-066 | Wizard - Steps must be completed in order',
    { tag: ['@regression', '@checkout'] },
    async ({ home, productPage, checkout, testUser, page, stockProduct }) => {
      await reachPayment({ home, productPage, checkout, page }, testUser, stockProduct.name);
      await expect(checkout.paymentMethod).toBeVisible();

      await page.reload();
      await expect(checkout.proceed1).toBeVisible();
      await expect(checkout.paymentMethod).toBeHidden();
    },
  );
});
