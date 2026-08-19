import { test, expect } from '../../src/fixtures/fixtures';
import { money } from '../../src/utils/money';

test.describe('Cart', () => {
  test(
    'TC-044 | Content - Cart shows the added product with correct amounts',
    { tag: ['@smoke', '@cart'] },
    async ({ home, productPage, checkout, stockProduct }) => {
      await home.goto();
      await home.openProduct(stockProduct.name);
      const unitPrice = await productPage.unitPrice();
      await productPage.addToCart();
      await expect(productPage.cartBadge).toHaveText('1');

      await checkout.goto();
      await expect(checkout.productTitle).toContainText(stockProduct.name);
      await expect(checkout.productQuantity).toHaveValue('1');
      expect(money(await checkout.productPrice.textContent())).toBeCloseTo(unitPrice, 2);
      expect(money(await checkout.linePrice.textContent())).toBeCloseTo(unitPrice, 2);
      expect(money(await checkout.cartTotal.textContent())).toBeCloseTo(unitPrice, 2);
    },
  );

  test(
    'TC-045 | Update - Changing quantity recalculates line price and total',
    { tag: ['@regression', '@cart'] },
    async ({ home, productPage, checkout, page, stockProduct }) => {
      await home.goto();
      await home.openProduct(stockProduct.name);
      const unitPrice = await productPage.unitPrice();
      await productPage.addToCart();

      await checkout.goto();
      await checkout.productQuantity.fill('3');
      await page.keyboard.press('Tab');

      await expect.poll(async () => money(await checkout.linePrice.textContent())).toBeCloseTo(unitPrice * 3, 2);
      await expect.poll(async () => money(await checkout.cartTotal.textContent())).toBeCloseTo(unitPrice * 3, 2);
      await expect(checkout.cartBadge).toHaveText('3');
    },
  );

  test(
    'TC-046 | Remove - Product can be removed from the cart',
    { tag: ['@regression', '@cart'] },
    async ({ home, productPage, checkout, page, stockProduct }) => {
      await home.goto();
      await home.openProduct(stockProduct.name);
      await productPage.addToCart();

      await checkout.goto();
      await expect(checkout.productTitle).toBeVisible();
      // The row delete control has no data-test; it is the red button at the row end.
      await page.locator('table tbody tr').first().locator('a.btn-danger').click();

      await expect(checkout.productTitle).toBeHidden();
      await expect(checkout.cartBadge).toBeHidden();
    },
  );

  test(
    'TC-047 | Content - Multiple products appear as separate lines',
    { tag: ['@regression', '@cart'] },
    async ({ home, productPage, checkout, page, api }) => {
      const [p1, p2] = await api.findInStockProducts(2);
      await home.goto();
      await home.openProduct(p1.name);
      await productPage.addToCart();
      await home.goto();
      await home.openProduct(p2.name);
      await productPage.addToCart();
      await expect(productPage.cartBadge).toHaveText('2');

      await checkout.goto();
      await expect(page.locator('table tbody tr')).toHaveCount(2);

      const lines = (await checkout.linePrice.allTextContents()).map(money);
      const total = money(await checkout.cartTotal.textContent());
      expect(total).toBeCloseTo(lines.reduce((a, b) => a + b, 0), 2);
    },
  );

  test(
    'TC-048 | Update - Adding the same product again increases its quantity',
    { tag: ['@regression', '@cart'] },
    async ({ home, productPage, checkout, page, stockProduct }) => {
      await home.goto();
      await home.openProduct(stockProduct.name);
      await productPage.addToCart();
      await expect(productPage.cartBadge).toHaveText('1');

      await home.goto();
      await home.openProduct(stockProduct.name);
      await productPage.addToCart();
      await expect(productPage.cartBadge).toHaveText('2');

      await checkout.goto();
      await expect(page.locator('table tbody tr')).toHaveCount(1);
      await expect(checkout.productQuantity).toHaveValue('2');
    },
  );

  test(
    'TC-049 | Persistence - Cart is kept across navigation and page refresh',
    { tag: ['@regression', '@cart'] },
    async ({ home, productPage, checkout, page, stockProduct }) => {
      await home.goto();
      await home.openProduct(stockProduct.name);
      await productPage.addToCart();

      await home.goto();
      await checkout.goto();
      await page.reload();

      await expect(checkout.productTitle).toContainText(stockProduct.name);
      await expect(checkout.cartBadge).toHaveText('1');
    },
  );

  test(
    'TC-050 | Navigation - Continue shopping returns to the catalog and keeps the cart',
    { tag: ['@regression', '@cart'] },
    async ({ home, productPage, checkout, stockProduct }) => {
      await home.goto();
      await home.openProduct(stockProduct.name);
      await productPage.addToCart();

      await checkout.goto();
      await checkout.continueShopping.click();

      await expect(home.productCards.first()).toBeVisible();
      await expect(checkout.cartBadge).toHaveText('1');
    },
  );

  test(
    'TC-051 | Empty - Checkout cannot proceed with an empty cart',
    { tag: ['@regression', '@cart'] },
    async ({ checkout }) => {
      await checkout.goto();
      await expect(checkout.proceed1).toBeHidden();
      await expect(checkout.productTitle).toBeHidden();
    },
  );
});
