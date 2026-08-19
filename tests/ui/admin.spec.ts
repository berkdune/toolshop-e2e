import { Page } from '@playwright/test';
import { test, expect } from '../../src/fixtures/fixtures';
import { config } from '../../src/config';
import { ApiClient } from '../../src/api/api-client';
import { buildPassword, buildUser, uniqueStamp } from '../../src/utils/data-factory';
import { injectSession } from '../../src/utils/session';

async function adminSession(page: Page, api: ApiClient): Promise<void> {
  await injectSession(page, await api.adminToken());
}

/** Form submit'i tıklar ve ilgili API yanıtını bekler (erken navigasyon isteği iptal eder). */
async function submitAndWait(page: Page, submitTestId: string, urlPart: string): Promise<void> {
  const response = page.waitForResponse(
    (r) => r.url().includes(urlPart) && ['POST', 'PUT', 'PATCH'].includes(r.request().method()),
  );
  await page.getByTestId(submitTestId).click();
  expect((await response).ok()).toBe(true);
}

/**
 * Admin listelerinde arar ve eşleşen satırı döndürür.
 * Liste sayfası bootstrap sırasında search tıklaması yutulabiliyor (gözlenen flake)
 * → sonuç gelene dek aramayı yeniden gönderir.
 */
async function adminSearch(page: Page, entity: 'product' | 'brand' | 'category' | 'user' | 'order', query: string) {
  const rows = page.locator('table tbody tr').filter({ hasText: query });
  await page.getByTestId(`${entity}-search-query`).fill(query);
  await page.getByTestId(`${entity}-search-submit`).click();
  await expect
    .poll(async () => {
      if (await rows.count()) return true;
      await page.getByTestId(`${entity}-search-submit`).click();
      return (await rows.count()) > 0;
    }, { timeout: 15_000, intervals: [1500] })
    .toBe(true);
  return rows.first();
}

test.describe('Admin', () => {
  test(
    'TC-083 | Dashboard - Admin sees sales chart and latest orders',
    { tag: ['@smoke', '@admin'] },
    async ({ loginPage, admin, page }) => {
      await loginPage.goto();
      await loginPage.login(config.admin.email, config.admin.password);
      await expect(page).toHaveURL(/\/admin\/dashboard/);

      await expect(page.getByRole('heading', { name: 'Sales over the years' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Latest orders' })).toBeVisible();
      await expect(admin.latestOrdersRows.first()).toBeVisible();
    },
  );

  test(
    'TC-084 | Products - Admin creates a product',
    { tag: ['@regression', '@admin'] },
    async ({ page, api, home }) => {
      const name = `E2E Product ${uniqueStamp()}`;
      await adminSession(page, api);
      await page.goto('/admin/products/add');

      await page.getByTestId('name').fill(name);
      await page.getByTestId('description').fill('Created by the Toolshop E2E suite; safe to delete.');
      await page.getByTestId('stock').fill('10');
      await page.getByTestId('price').fill('12.34');
      await page.getByTestId('co2-rating').selectOption({ index: 1 });
      await page.getByTestId('brand-id').selectOption({ index: 1 });
      await page.getByTestId('category-id').selectOption({ index: 1 });
      await page.getByTestId('product-image-id').selectOption({ index: 1 });
      await submitAndWait(page, 'product-submit', '/products');

      await page.goto('/admin/products');
      await expect(await adminSearch(page, 'product', name)).toBeVisible();

      // Vitrinde de görünmeli.
      await home.goto();
      await home.searchFor(name);
      await expect(home.productNames.filter({ hasText: name }).first()).toBeVisible();

      const created = await api.findProduct(name);
      await api.tryDeleteProduct(created.id);
    },
  );

  test(
    'TC-085 | Products - Admin edits a product',
    { tag: ['@regression', '@admin'] },
    async ({ page, api, home }, testInfo) => {
      testInfo.annotations.push({
        type: 'bug-candidate',
        description: 'Ürün edit formu stock ve dropdown alanlarını prefill etmiyor; dokunulmamış kayıt "Quantity is required" ile reddediliyor.',
      });
      const name = `E2E Product ${uniqueStamp()}`;
      const renamed = `${name} Edited`;
      const product = await api.createProduct(name);

      await adminSession(page, api);
      await page.goto('/admin/products');
      await expect(await adminSearch(page, 'product', name)).toBeVisible();

      await page.getByTestId(`product-edit-${product.id}`).click();
      await expect(page.getByTestId('name')).toHaveValue(name);
      // Bulgu (bug adayı): edit formu stock ve dropdown'ları prefill ETMİYOR;
      // hiçbir şey değiştirmeden kaydetmek bile "Quantity is required" hatası verir.
      await page.getByTestId('name').fill(renamed);
      await page.getByTestId('price').fill('19.99');
      await page.getByTestId('stock').fill('10');
      await page.getByTestId('co2-rating').selectOption({ index: 1 });
      await page.getByTestId('brand-id').selectOption({ index: 1 });
      await page.getByTestId('category-id').selectOption({ index: 1 });
      await page.getByTestId('product-image-id').selectOption({ index: 1 });
      await submitAndWait(page, 'product-submit', '/products');

      await page.goto('/admin/products');
      await expect(await adminSearch(page, 'product', renamed)).toBeVisible();

      // Vitrin: arama indeksi gecikebiliyor → doğrudan ürün detay sayfasından doğrula.
      // Not: eco ürünlerde h1 başlığa "ECO" rozeti ekleniyor → contains eşleşmesi.
      await page.goto(`/product/${product.id}`);
      await expect(page.getByTestId('product-name')).toContainText(renamed);
      await expect(page.getByTestId('unit-price')).toHaveText('19.99');

      await api.tryDeleteProduct(product.id);
    },
  );

  test(
    'TC-086 | Products - Admin deletes a product',
    { tag: ['@regression', '@admin'] },
    async ({ page, api, home }) => {
      const name = `E2E Product ${uniqueStamp()}`;
      const product = await api.createProduct(name);

      await adminSession(page, api);
      page.on('dialog', (d) => d.accept());
      await page.goto('/admin/products');
      const row = await adminSearch(page, 'product', name);
      await expect(row).toBeVisible();

      await page.getByTestId(`product-delete-${product.id}`).click();
      await expect(row).toBeHidden();

      await home.goto();
      await home.searchFor(name);
      // Arama bazen bootstrap'la yarışıp tüm grid'i gösterebiliyor; asıl değişmez:
      // silinen ürünün adı vitrinde HİÇBİR yerde görünmemeli.
      await expect(home.productNames.filter({ hasText: name })).toHaveCount(0);
    },
  );

  test(
    'TC-087 | Products - Admin product search filters the list',
    { tag: ['@regression', '@admin'] },
    async ({ page, api }) => {
      await adminSession(page, api);
      await page.goto('/admin/products');
      await expect(page.locator('table tbody tr').first()).toBeVisible();
      const totalRows = await page.locator('table tbody tr').count();

      await page.getByTestId('product-search-query').fill('Pliers');
      await page.getByTestId('product-search-submit').click();
      await expect.poll(async () => {
        const rows = await page.locator('table tbody tr').allTextContents();
        return rows.length > 0 && rows.every((r) => /plier/i.test(r));
      }).toBe(true);

      await page.getByTestId('product-search-reset').click();
      await expect.poll(async () => page.locator('table tbody tr').count()).toBeGreaterThanOrEqual(totalRows);
    },
  );

  test(
    'TC-088 | Brands - Admin manages a brand end to end',
    { tag: ['@regression', '@admin'] },
    async ({ page, api }) => {
      const stamp = uniqueStamp();
      const name = `E2E Brand ${stamp}`;
      const renamed = `${name} Edited`;
      await adminSession(page, api);
      page.on('dialog', (d) => d.accept());

      await page.goto('/admin/brands/add');
      await page.getByTestId('name').fill(name);
      await page.getByTestId('slug').fill(`e2e-brand-${stamp}`);
      await submitAndWait(page, 'brand-submit', '/brands');

      await page.goto('/admin/brands');
      const row = await adminSearch(page, 'brand', name);
      await expect(row).toBeVisible();
      const editAttr = (await row.locator('[data-test$="-edit"]').getAttribute('data-test')) ?? '';
      const id = editAttr.replace('brand-', '').replace('-edit', '');

      await row.locator('[data-test$="-edit"]').click();
      await expect(page.getByTestId('name')).toHaveValue(name); // form asenkron dolana kadar bekle
      await page.getByTestId('name').fill(renamed);
      await submitAndWait(page, 'brand-submit', '/brands');

      await page.goto('/admin/brands');
      const renamedRow = await adminSearch(page, 'brand', renamed);
      await expect(renamedRow).toBeVisible();

      await page.getByTestId(`brand-${id}-delete`).click();
      await expect(renamedRow).toBeHidden();
    },
  );

  test(
    'TC-089 | Categories - Admin manages a category end to end',
    { tag: ['@regression', '@admin'] },
    async ({ page, api }) => {
      const stamp = uniqueStamp();
      const name = `E2E Category ${stamp}`;
      const renamed = `${name} Edited`;
      await adminSession(page, api);
      page.on('dialog', (d) => d.accept());

      await page.goto('/admin/categories/add');
      await page.getByTestId('name').fill(name);
      await page.getByTestId('slug').fill(`e2e-category-${stamp}`);
      await submitAndWait(page, 'category-submit', '/categories');

      await page.goto('/admin/categories');
      const row = await adminSearch(page, 'category', name);
      await expect(row).toBeVisible();
      // Not: kategori kontrolleri fiil-önce adlandırılmış (category-edit-{id}), marka ise brand-{id}-edit.
      const editAttr = (await row.locator('[data-test^="category-edit-"]').getAttribute('data-test')) ?? '';
      const id = editAttr.replace('category-edit-', '');

      await row.locator('[data-test^="category-edit-"]').click();
      await expect(page.getByTestId('name')).toHaveValue(name); // form asenkron dolana kadar bekle
      await page.getByTestId('name').fill(renamed);
      await submitAndWait(page, 'category-submit', '/categories');

      await page.goto('/admin/categories');
      const renamedRow = await adminSearch(page, 'category', renamed);
      await expect(renamedRow).toBeVisible();

      await page.getByTestId(`category-delete-${id}`).click();
      await expect(renamedRow).toBeHidden();
    },
  );

  test(
    'TC-090 | Users - Admin creates a user who can log in',
    { tag: ['@regression', '@admin'] },
    async ({ page, api }) => {
      const user = buildUser();
      user.password = buildPassword();
      await adminSession(page, api);
      await page.goto('/admin/users/add');

      await page.getByTestId('first-name').fill(user.firstName);
      await page.getByTestId('last-name').fill(user.lastName);
      await page.getByTestId('dob').fill(user.dob);
      await page.getByTestId('street').fill(user.street);
      await page.getByTestId('postal_code').fill(user.postalCode);
      await page.getByTestId('city').fill(user.city);
      await page.getByTestId('state').fill(user.state);
      const country = page.getByTestId('country');
      await country.selectOption(user.country).catch(() => country.selectOption({ label: 'The Netherlands' }));
      await page.getByTestId('phone').fill(user.phone);
      await page.getByTestId('email').fill(user.email);
      await page.getByTestId('enabled').check();
      await page.getByTestId('failed_login_attempts').fill('0');
      await page.getByTestId('password').fill(user.password);
      await submitAndWait(page, 'user-submit', '/users');

      await page.goto('/admin/users');
      await expect(await adminSearch(page, 'user', user.email)).toBeVisible();

      expect((await api.loginRaw(user.email, user.password)).status()).toBe(200);
      await api.tryDeleteUserByEmail(user.email);
    },
  );

  test(
    'TC-091 | Users - Admin edits a user',
    { tag: ['@regression', '@admin'] },
    async ({ page, api, testUser }) => {
      await adminSession(page, api);
      await page.goto('/admin/users');
      const row = await adminSearch(page, 'user', testUser.email);
      await expect(row).toBeVisible();

      await row.locator('[data-test^="user-edit-"]').click();
      await expect(page.getByTestId('first-name')).toHaveValue(testUser.firstName);
      await page.getByTestId('first-name').fill('EditedName');
      await submitAndWait(page, 'user-submit', '/users');

      await page.goto('/admin/users');
      const editedRow = await adminSearch(page, 'user', testUser.email);
      await expect(editedRow).toContainText('EditedName');
    },
  );

  test(
    'TC-092 | Users - Admin deletes a user without related records',
    { tag: ['@regression', '@admin'] },
    async ({ page, api }) => {
      const user = buildUser();
      user.id = await api.register(user);

      await adminSession(page, api);
      page.on('dialog', (d) => d.accept());
      await page.goto('/admin/users');
      const row = await adminSearch(page, 'user', user.email);
      await expect(row).toBeVisible();

      await page.getByTestId(`user-delete-${user.id}`).click();
      await expect(row).toBeHidden();

      expect((await api.loginRaw(user.email, user.password)).status()).toBe(401);
    },
  );

  test(
    'TC-093 | Orders - Admin updates an order status',
    { tag: ['@regression', '@admin'] },
    async ({ page, api, testUser }) => {
      const token = await api.login(testUser.email, testUser.password);
      const invoice = await api.createInvoice(token);

      await adminSession(page, api);
      await page.goto('/admin/orders');
      const row = await adminSearch(page, 'order', invoice.invoice_number);
      await expect(row).toBeVisible();

      await row.locator('[data-test^="order-edit-"]').click();
      await expect(page.getByTestId('invoice-number')).toHaveValue(invoice.invoice_number);
      await page.getByTestId('order-status').selectOption('SHIPPED');
      // PUT /invoices/{id}/status tamamlanmadan sayfadan ayrılmak isteği iptal eder.
      const statusResponse = page.waitForResponse(
        (r) => r.url().includes('/status') && r.request().method() === 'PUT',
      );
      await page.getByTestId('update-status-submit').click();
      expect((await statusResponse).status()).toBe(200);

      await page.goto('/admin/orders');
      const updatedRow = await adminSearch(page, 'order', invoice.invoice_number);
      await expect(updatedRow).toContainText('SHIPPED');
    },
  );

  test(
    'TC-094 | Messages - Admin replies to a contact message',
    { tag: ['@regression', '@admin'] },
    async ({ page, api, testUser }, testInfo) => {
      // Mesaj kullanıcı token'ıyla açılır ki hesapla ilişkilensin.
      const token = await api.login(testUser.email, testUser.password);
      const messageBody = `E2E message for reply flow ${Date.now()} - please reply to this automated message.`;
      const createRes = await api.http.post('/messages', {
        headers: api.bearer(token),
        data: { name: `${testUser.firstName} ${testUser.lastName}`, email: testUser.email, subject: 'Webmaster', message: messageBody },
      });
      expect(createRes.ok()).toBe(true);
      const messageId = (await createRes.json()).id as string;

      // Admin mesajı listede görür ve açabilir.
      await adminSession(page, api);
      await page.goto('/admin/messages');
      const row = page.locator('table tbody tr').filter({ hasText: testUser.lastName }).first();
      await expect(row).toBeVisible({ timeout: 10_000 });
      await row.locator('a, button').first().click();
      await expect(page.getByText(messageBody.slice(0, 40))).toBeVisible();

      // Yanıt sözleşme üzerinden (POST /messages/{id}/reply) verilir — keşifte doğrulanan akış.
      const replyText = `E2E admin reply ${Date.now()}`;
      const replyRes = await api.http.post(`/messages/${messageId}/reply`, {
        headers: api.bearer(await api.adminToken()),
        data: { subject: 'Webmaster', message: replyText },
      });
      expect(replyRes.ok()).toBe(true);
      testInfo.annotations.push({ type: 'note', description: 'Yanıt API sözleşmesiyle gönderildi; müşteri tarafı UI ile doğrulanıyor.' });

      // Müşteri yanıtı hesabındaki mesaj detayında görmeli.
      await injectSession(page, token);
      await page.goto('/account/messages');
      await page.locator('table tbody tr').first().locator('a, button').first().click();
      await expect(page.getByText(replyText)).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'TC-095 | Statistics - Admin statistics pages render report data',
    { tag: ['@regression', '@admin'] },
    async ({ page, api, admin }) => {
      await adminSession(page, api);
      await page.goto('/admin/dashboard');
      await admin.navUserMenu.click();
      const monthHref = await page.getByTestId('nav-average-month-sales').getAttribute('href');
      const weekHref = await page.getByTestId('nav-average-week-sales').getAttribute('href');

      await page.goto(monthHref ?? '/admin/reports/average-sales-per-month');
      await expect(page.getByRole('heading', { name: /average sales per month/i })).toBeVisible();
      await expect(page.locator('canvas')).toHaveCount(1);

      await page.goto(weekHref ?? '/admin/reports/average-sales-per-week');
      await expect(page.getByRole('heading', { name: /average sales per week/i })).toBeVisible();
      await expect(page.locator('canvas')).toHaveCount(1);
    },
  );

  test(
    'TC-096 | Validation - Product form rejects invalid input',
    { tag: ['@regression', '@admin'] },
    async ({ page, api }) => {
      await adminSession(page, api);
      await page.goto('/admin/products/add');

      await page.getByTestId('product-submit').click();
      await expect.poll(async () => page.getByText(/required/i).count()).toBeGreaterThanOrEqual(3);

      await page.getByTestId('name').fill('E2E Invalid Price Product');
      await page.getByTestId('description').fill('Validation check');
      await page.getByTestId('stock').fill('5');
      await page.getByTestId('price').fill('-5');
      await page.getByTestId('price').blur();
      await page.getByTestId('product-submit').click();

      await expect(page).toHaveURL(/\/admin\/products\/add/);
      await expect(page.getByText(/price|greater|positive|invalid|required/i).first()).toBeVisible();
    },
  );

  test(
    'TC-097 | Integrity - Brand in use cannot be deleted',
    { tag: ['@regression', '@admin'] },
    async ({ page, api }, testInfo) => {
      // Paylaşılan demoda seed markaya dokunmuyoruz: kendi markamız + onu kullanan ürünle test.
      const stamp = uniqueStamp();
      const brand = await api.createBrand(`E2E InUse Brand ${stamp}`, `e2e-inuse-${stamp}`);
      const product = await api.createProduct(`E2E InUse Product ${stamp}`, { brandId: brand.id });

      await adminSession(page, api);
      page.on('dialog', (d) => d.accept());
      await page.goto('/admin/brands');
      const row = await adminSearch(page, 'brand', `E2E InUse Brand ${stamp}`);
      await expect(row).toBeVisible();

      await page.getByTestId(`brand-${brand.id}-delete`).click();
      await page.waitForTimeout(1500);
      await page.goto('/admin/brands');
      await expect(await adminSearch(page, 'brand', `E2E InUse Brand ${stamp}`)).toBeVisible();
      testInfo.annotations.push({ type: 'note', description: 'Kullanımda olan marka silinemedi (beklenen bütünlük davranışı).' });

      await api.tryDeleteProduct(product.id);
      await api.tryDeleteBrand(brand.id);
    },
  );
});
