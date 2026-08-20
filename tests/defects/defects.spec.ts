import fs from 'fs';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../src/fixtures/fixtures';
import { buildUser } from '../../src/utils/data-factory';
import { injectSession } from '../../src/utils/session';

/**
 * Defect-reproduction suite — EXPECTED TO FAIL.
 *
 * Each test asserts the behavior the application SHOULD have; every failure
 * below is live evidence of a documented defect (docs/DEFECTS.md). This suite
 * is intentionally excluded from the gating runs: run it with
 * `npm run test:defects`.
 */

function documentedAs(id: string) {
  return { type: 'defect', description: `Documented as ${id} in docs/DEFECTS.md` };
}

test.describe('Defect reproductions (expected to fail)', () => {
  test(
    'BUG-001 | An order should be placed after the first Confirm',
    { tag: ['@defect'] },
    async ({ home, productPage, checkout, testUser, api }, testInfo) => {
      testInfo.annotations.push(documentedAs('BUG-001'));
      await home.goto();
      const stockProduct = (await api.findInStockProducts(1))[0];
      await home.openProduct(stockProduct.name);
      await productPage.addToCart();
      await expect(productPage.cartBadge).toHaveText('1');

      await checkout.goto();
      await checkout.proceed1.click();
      await checkout.signInDuringCheckout(testUser.email, testUser.password);
      await checkout.proceed2.click();
      await checkout.fillBillingDefaults(testUser);
      await checkout.proceed3.click();
      await checkout.payWith('cash-on-delivery');
      await expect(checkout.successMessage).toHaveText('Payment was successful', { timeout: 15_000 });

      // A user who sees "Payment was successful" and leaves should have an order.
      const token = await api.login(testUser.email, testUser.password);
      await expect
        .poll(
          async () => ((await (await api.http.get('/invoices', { headers: api.bearer(token) })).json()).total as number),
          { timeout: 8_000 },
        )
        .toBeGreaterThan(0);
    },
  );

  test(
    'BUG-002 | The invoice API should accept a valid Turkish city/country pair',
    { tag: ['@defect'] },
    async ({ api, testUser }, testInfo) => {
      testInfo.annotations.push(documentedAs('BUG-002'));
      const token = await api.login(testUser.email, testUser.password);
      const product = (await api.findInStockProducts(1))[0];
      const cartId = await api.createCartWithProduct(product.id, 1);

      const res = await api.http.post('/invoices', {
        headers: api.bearer(token),
        data: {
          billing_street: 'Test Street 1',
          billing_city: 'Izmir',
          billing_state: 'Aegean',
          billing_country: 'TR',
          billing_postal_code: '35000',
          payment_method: 'cash-on-delivery',
          payment_details: {},
          cart_id: cartId,
        },
      });
      expect(res.status(), `Izmir/TR was rejected: ${await res.text()}`).toBe(201);
    },
  );

  test(
    'BUG-003 | A user-typed house number should survive the postcode lookup',
    { tag: ['@defect'] },
    async ({ home, productPage, checkout, api, page }, testInfo) => {
      testInfo.annotations.push(documentedAs('BUG-003'));
      const user = { ...buildUser(), houseNumber: '' };
      user.id = await api.register(user);

      await home.goto();
      const stockProduct = (await api.findInStockProducts(1))[0];
      await home.openProduct(stockProduct.name);
      await productPage.addToCart();
      await checkout.goto();
      await checkout.proceed1.click();
      await checkout.signInDuringCheckout(user.email, user.password);
      // The wipe is a race against the lookup's latency; give the response a
      // realistic delay so the reproduction does not depend on network speed.
      await page.route('**/postcode-lookup*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await route.continue();
      });
      await checkout.proceed2.click();
      await expect(checkout.houseNumber).toHaveValue('');

      const lookup = page
        .waitForResponse((r) => r.url().includes('postcode-lookup'), { timeout: 10_000 })
        .catch(() => null);
      await checkout.houseNumber.fill('12');
      await checkout.houseNumber.blur();
      await lookup;
      // The async lookup response must not wipe what the user typed.
      await expect(checkout.houseNumber).toHaveValue('12');

      await api.tryDeleteUser(user.id);
    },
  );

  test(
    'BUG-004 | The product edit form should load fully prefilled',
    { tag: ['@defect'] },
    async ({ page, api }, testInfo) => {
      testInfo.annotations.push(documentedAs('BUG-004'));
      const product = await api.createProduct(`Defect Repro ${Date.now()}`);
      await injectSession(page, await api.adminToken());

      await page.goto(`/admin/products/edit/${product.id}`);
      await expect(page.getByTestId('name')).toHaveValue(product.name, { timeout: 10_000 });
      // The product was created with stock 10; an edit form must show existing data.
      await expect(page.getByTestId('stock')).toHaveValue('10');

      await api.tryDeleteProduct(product.id);
    },
  );

  test(
    'BUG-005 | The forgot-password confirmation should be human-readable',
    { tag: ['@defect'] },
    async ({ page, testUser }, testInfo) => {
      testInfo.annotations.push(documentedAs('BUG-005'));
      await page.goto('/auth/forgot-password');
      await page.getByTestId('email').fill(testUser.email);
      await page.getByTestId('forgot-password-submit').click();

      const alert = page.locator('.alert').first();
      await expect(alert).toBeVisible();
      await expect(alert).not.toContainText('page.forgot-password.confirm');
    },
  );

  test(
    'BUG-006 | The register API should validate the email format server-side',
    { tag: ['@defect'] },
    async ({ api }, testInfo) => {
      testInfo.annotations.push(documentedAs('BUG-006'));
      const res = await api.http.post('/users/register', {
        data: { email: 'not-an-email', password: 'short' },
      });
      expect(res.status()).toBe(422);
      const body = await res.json();
      expect(body, '422 body has no "email" key — format is only validated client-side').toHaveProperty('email');
    },
  );

  test(
    'BUG-007 | A normal non-empty text attachment should be accepted',
    { tag: ['@defect'] },
    async ({ page }, testInfo) => {
      testInfo.annotations.push(documentedAs('BUG-007'));
      const file = testInfo.outputPath('note.txt');
      fs.writeFileSync(file, 'a perfectly normal attachment');

      await page.goto('/contact');
      await page.getByTestId('first-name').fill('Defect');
      await page.getByTestId('last-name').fill('Repro');
      await page.getByTestId('email').fill(`toolshop.e2e.d7.${Date.now()}@example.com`);
      await page.getByTestId('subject').selectOption({ label: 'Customer service' });
      await page.getByTestId('message').fill('This message carries a small, perfectly ordinary text attachment.');
      await page.getByTestId('attachment').setInputFiles(file);
      await page.getByTestId('contact-submit').click();

      await expect(page.getByText('File should be empty.')).toBeHidden();
      await expect(page.getByText(/thanks|success/i).first()).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'BUG-008 | Core pages should have no serious or critical WCAG violations',
    { tag: ['@defect'] },
    async ({ home, page }, testInfo) => {
      testInfo.annotations.push(documentedAs('BUG-008'));
      await home.goto();
      await expect(home.productCards.first()).toBeVisible();
      const homeScan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

      await page.goto('/auth/login');
      await expect(page.getByTestId('login-form')).toBeVisible();
      const loginScan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

      const seriousOrWorse = [...homeScan.violations, ...loginScan.violations]
        .filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))
        .map((v) => `${v.id} [${v.impact}]: ${v.help}`);
      expect(seriousOrWorse).toEqual([]);
    },
  );
});
