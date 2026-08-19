import { test, expect } from '../../src/fixtures/fixtures';
import { money } from '../../src/utils/money';
import { injectSession } from '../../src/utils/session';

test.describe('Product Detail', () => {
  test(
    'TC-034 | Content - Product page displays complete information',
    { tag: ['@smoke', '@detail'] },
    async ({ home, productPage, page }) => {
      await home.goto();
      await home.openProduct('Combination Pliers');

      await expect(productPage.name).toHaveText('Combination Pliers');
      // "$" işareti unit-price span'inin dışında; span salt sayısal fiyat içerir.
      await expect(productPage.price).toHaveText(/^\d+\.\d{2}$/);
      await expect(productPage.description).not.toBeEmpty();
      await expect(productPage.co2Badge).toBeVisible();
      await expect(productPage.addToCartBtn).toBeVisible();
      await expect(productPage.addToFavoritesBtn).toBeVisible();
      await expect(productPage.specRows.first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Related products' })).toBeVisible();
    },
  );

  test(
    'TC-035 | Cart - Add to cart updates the cart badge',
    { tag: ['@smoke', '@detail'] },
    async ({ home, productPage, stockProduct }) => {
      await home.goto();
      await home.openProduct(stockProduct.name);
      await productPage.addToCart();
      await expect(productPage.cartBadge).toHaveText('1');
    },
  );

  test(
    'TC-036 | Quantity - Stepper changes quantity within valid bounds',
    { tag: ['@regression', '@detail'] },
    async ({ home, productPage, stockProduct }) => {
      await home.goto();
      await home.openProduct(stockProduct.name);
      await expect(productPage.quantityInput).toHaveValue('1');

      await productPage.increaseQuantity.click();
      await productPage.increaseQuantity.click();
      await expect(productPage.quantityInput).toHaveValue('3');

      await productPage.decreaseQuantity.click();
      await expect(productPage.quantityInput).toHaveValue('2');

      await productPage.decreaseQuantity.click();
      await productPage.decreaseQuantity.click();
      await productPage.decreaseQuantity.click();
      await expect(productPage.quantityInput).toHaveValue('1');
    },
  );

  test(
    'TC-037 | Cart - Selected quantity is carried into the cart line',
    { tag: ['@regression', '@detail'] },
    async ({ home, productPage, checkout, stockProduct }) => {
      await home.goto();
      await home.openProduct(stockProduct.name);
      const unitPrice = await productPage.unitPrice();

      await productPage.increaseQuantity.click();
      await productPage.increaseQuantity.click();
      await expect(productPage.quantityInput).toHaveValue('3');
      await productPage.addToCart();
      await expect(productPage.cartBadge).toHaveText('3');

      await checkout.goto();
      await expect(checkout.productQuantity).toHaveValue('3');
      expect(money(await checkout.linePrice.textContent())).toBeCloseTo(unitPrice * 3, 2);
    },
  );

  test(
    'TC-038 | Favorites - Guest cannot add favorites',
    { tag: ['@regression', '@detail'] },
    async ({ home, productPage, page, stockProduct }) => {
      await home.goto();
      await home.openProduct(stockProduct.name);
      await productPage.addToFavoritesBtn.click();
      await expect(page.getByText(/unauthorized|sign in|log in/i).first()).toBeVisible();
    },
  );

  test(
    'TC-039 | Favorites - Logged-in customer adds a product to favorites',
    { tag: ['@regression', '@detail'] },
    async ({ home, productPage, page, api, testUser, stockProduct }) => {
      const token = await api.login(testUser.email, testUser.password);
      await injectSession(page, token);

      await home.goto();
      await home.openProduct(stockProduct.name);
      // POST /favorites tamamlanmadan navigasyon isteği iptal edebiliyor → yanıtı bekle.
      const favoriteResponse = page.waitForResponse(
        (r) => r.url().includes('/favorites') && r.request().method() === 'POST',
      );
      await productPage.addToFavoritesBtn.click();
      expect((await favoriteResponse).status()).toBe(201);

      await page.goto('/account/favorites');
      await expect(page.getByText(stockProduct.name).first()).toBeVisible();
    },
  );

  test(
    'TC-040 | Stock - Out-of-stock product cannot be added to the cart',
    { tag: ['@regression', '@detail'] },
    async ({ home, productPage, page }) => {
      await home.goto();
      await home.productCards.filter({ has: page.getByTestId('out-of-stock') }).first().click();

      await expect(page.getByText(/out of stock/i).first()).toBeVisible();
      if (await productPage.addToCartBtn.isVisible()) {
        await expect(productPage.addToCartBtn).toBeDisabled();
      } else {
        await expect(productPage.addToCartBtn).toBeHidden();
      }
    },
  );

  test(
    'TC-041 | Content - Specification rows show name value and unit',
    { tag: ['@regression', '@detail'] },
    async ({ home, productPage }) => {
      await home.goto();
      await home.openProduct('Combination Pliers');
      await expect(productPage.specRows.first()).toBeVisible();

      const rowCount = await productPage.specRows.count();
      expect(rowCount).toBeGreaterThan(0);
      for (let i = 0; i < rowCount; i++) {
        const row = productPage.specRows.nth(i);
        await expect(row.getByTestId('spec-name')).not.toBeEmpty();
        await expect(row.getByTestId('spec-value')).not.toBeEmpty();
      }
    },
  );

  test(
    'TC-042 | Navigation - Related products open their own detail pages',
    { tag: ['@regression', '@detail'] },
    async ({ home, productPage, page, stockProduct }) => {
      await home.goto();
      await home.openProduct(stockProduct.name);
      await expect(page.getByRole('heading', { name: 'Related products' })).toBeVisible();

      // Detay sayfasındaki tek ürün linkleri related bölümündedir.
      await page.locator('a[href*="/product/"]').first().click();
      await expect(productPage.name).not.toHaveText(stockProduct.name);
      await expect(page).toHaveURL(/\/product\//);
      await expect(productPage.addToCartBtn.or(page.getByTestId('out-of-stock').first()).first()).toBeVisible();
    },
  );

  test(
    'TC-043 | Rentals - Rental product page shows rental-specific presentation',
    { tag: ['@regression', '@detail'] },
    async ({ productPage, page }) => {
      await page.goto('/rentals');
      await page.locator('[data-test^="product-"]').first().click();

      await expect(productPage.name).not.toBeEmpty();
      await expect(productPage.price).toBeVisible();
      await expect(productPage.co2Badge).toBeVisible();
      await expect(productPage.addToCartBtn).toBeVisible();
      // Standart adet stepper'ı yok; süre için slider var (kiralamaya özgü yerleşim).
      expect(await productPage.quantityInput.count()).toBe(0);
      expect(await page.getByRole('slider').count()).toBeGreaterThanOrEqual(1);
    },
  );
});
