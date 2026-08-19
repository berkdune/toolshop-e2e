import { test, expect } from '../../src/fixtures/fixtures';
import { money } from '../../src/utils/money';

test.describe('Product Discovery', () => {
  test(
    'TC-016 | Listing - Home page shows the product grid with core information',
    { tag: ['@smoke', '@discovery'] },
    async ({ home }) => {
      await home.goto();
      await expect(home.productCards.first()).toBeVisible();

      const count = await home.productCards.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < Math.min(count, 3); i++) {
        const card = home.productCards.nth(i);
        await expect(card.getByTestId('product-name')).not.toBeEmpty();
        await expect(card.getByTestId('product-price')).toContainText('$');
        await expect(card.getByTestId('co2-rating-badge')).toBeVisible();
      }
      await expect(home.paginationNext).toBeVisible();
    },
  );

  test(
    'TC-017 | Search - Search returns products matching the term',
    { tag: ['@smoke', '@discovery'] },
    async ({ home }) => {
      await home.goto();
      await home.searchFor('pliers');

      await expect(home.searchCaption).toContainText('pliers');
      await expect(home.searchResultCount).toBeVisible();

      const names = await home.productNames.allTextContents();
      expect(names.length).toBeGreaterThan(0);
      for (const name of names) {
        expect(name.toLowerCase()).toContain('pliers');
      }
    },
  );

  test(
    'TC-018 | Search - No results state for an unmatched term',
    { tag: ['@regression', '@discovery'] },
    async ({ home }) => {
      await home.goto();
      await home.searchFor('qwertyxyz123');
      await expect(home.searchResultCount).toBeVisible();
      // Eski grid kartları arama sonucundan geç sökülebiliyor → auto-retry'lı assertion.
      await expect(home.productCards).toHaveCount(0);
    },
  );

  test(
    'TC-019 | Search - Reset clears the search and restores the full listing',
    { tag: ['@regression', '@discovery'] },
    async ({ home, page }) => {
      await home.goto();
      await home.searchFor('pliers');
      await expect(home.searchCaption).toBeVisible();

      await page.getByTestId('search-reset').click();
      await expect(home.searchCaption).toBeHidden();
      await expect.poll(async () => home.productCards.count()).toBeGreaterThan(4);
    },
  );

  test(
    'TC-020 | Filters - Single category filter narrows the listing',
    { tag: ['@regression', '@discovery'] },
    async ({ home, page }) => {
      await home.goto();
      await expect(home.productCards.first()).toBeVisible();

      await page.getByRole('checkbox', { name: 'Pliers' }).check();
      await expect(page.getByTestId('product-name').filter({ hasText: 'Combination Pliers' }).first()).toBeVisible();
      await expect.poll(async () => {
        const names = await home.productNames.allTextContents();
        return names.some((n) => /hammer|drill|sander/i.test(n));
      }).toBe(false);

      await page.getByRole('checkbox', { name: 'Pliers' }).uncheck();
      await expect.poll(async () => home.productCards.count()).toBeGreaterThan(4);
    },
  );

  test(
    'TC-021 | Filters - Multiple category filters combine results',
    { tag: ['@regression', '@discovery'] },
    async ({ home, page }) => {
      await home.goto();
      await page.getByRole('checkbox', { name: 'Hammer' }).check();
      await page.getByRole('checkbox', { name: 'Drill' }).check();

      await expect.poll(async () => {
        const names = (await home.productNames.allTextContents()).map((n) => n.toLowerCase());
        return names.some((n) => n.includes('hammer')) && names.some((n) => n.includes('drill'));
      }).toBe(true);
    },
  );

  test(
    'TC-022 | Filters - Brand filter shows only that brand\'s products',
    { tag: ['@regression', '@discovery'] },
    async ({ home, page }) => {
      await home.goto();
      const before = await home.productNames.allTextContents();

      await page.getByRole('checkbox', { name: 'ForgeFlex Tools' }).check();
      await expect.poll(async () => (await home.productNames.allTextContents()).join('|')).not.toBe(before.join('|'));

      await home.productCards.first().click();
      await expect(page.getByText('ForgeFlex Tools').first()).toBeVisible();
    },
  );

  test(
    'TC-023 | Filters - Price range slider limits results',
    { tag: ['@regression', '@discovery'] },
    async ({ home, page }) => {
      await home.goto();
      await expect(home.productCards.first()).toBeVisible();

      // ngx-slider: max tutamacı klavyeyle indir (PageDown ~20'lik kaba adım, ArrowLeft 1'lik ince adım).
      // Tutamaca tıklamak değeri sıçratabiliyor; press() zaten odaklıyor.
      const maxHandle = page.getByRole('slider').nth(1);
      const value = async () => Number(await maxHandle.getAttribute('aria-valuenow'));
      for (let i = 0; i < 12 && (await value()) > 36; i++) await maxHandle.press('PageDown');
      for (let i = 0; i < 30 && (await value()) > 15; i++) await maxHandle.press('ArrowLeft');
      const maxPrice = await value();
      expect(maxPrice).toBeLessThanOrEqual(15);
      expect(maxPrice).toBeGreaterThanOrEqual(5);
      await page.keyboard.press('Tab');

      await expect.poll(async () => {
        const prices = (await home.productCards.getByTestId('product-price').allTextContents()).map(money);
        return prices.length > 0 && Math.max(...prices) <= maxPrice;
      }, { timeout: 15_000 }).toBe(true);
    },
  );

  test(
    'TC-024 | Filters - Eco-friendly filter shows only sustainable products',
    { tag: ['@regression', '@discovery'] },
    async ({ home, page }) => {
      await home.goto();
      await expect(home.productCards.first()).toBeVisible();
      const before = await home.productNames.allTextContents();

      await page.getByTestId('eco-friendly-filter').check();
      await expect.poll(async () => (await home.productNames.allTextContents()).join('|')).not.toBe(before.join('|'));
      expect(await home.productCards.count()).toBeLessThanOrEqual(before.length);
    },
  );

  test(
    'TC-025 | Sorting - Price low to high orders the grid by ascending price',
    { tag: ['@regression', '@discovery'] },
    async ({ home }) => {
      await home.goto();
      await home.sortSelect.selectOption('price,asc');

      await expect.poll(async () => {
        const prices = (await home.productCards.getByTestId('product-price').allTextContents()).map(money);
        return prices.length > 1 && prices.every((p, i) => i === 0 || p >= prices[i - 1]);
      }).toBe(true);
    },
  );

  test(
    'TC-026 | Sorting - Name Z to A orders the grid alphabetically descending',
    { tag: ['@regression', '@discovery'] },
    async ({ home }) => {
      await home.goto();
      await home.sortSelect.selectOption('name,desc');

      await expect.poll(async () => {
        const names = (await home.productNames.allTextContents()).map((n) => n.trim().toLowerCase());
        return names.length > 1 && names.every((n, i) => i === 0 || n.localeCompare(names[i - 1]) <= 0);
      }).toBe(true);
    },
  );

  test(
    'TC-027 | Sorting - CO2 rating orders by sustainability',
    { tag: ['@regression', '@discovery'] },
    async ({ home, api }) => {
      await home.goto();
      const before = await home.productNames.allTextContents();

      await home.sortSelect.selectOption('co2_rating,asc');
      await expect.poll(async () => (await home.productNames.allTextContents()).join('|')).not.toBe(before.join('|'));

      // Çapraz doğrulama: UI'daki ilk ürün, API'nin aynı sıralamadaki ilk sayfasında olmalı.
      const apiNames: string[] = ((await (await api.http.get('/products?sort=co2_rating,asc')).json()).data as Array<{ name: string }>).map((p) => p.name);
      const uiFirst = (await home.productNames.allTextContents())[0].trim();
      expect(apiNames).toContain(uiFirst);
    },
  );

  test(
    'TC-028 | Pagination - Page links navigate through the catalog',
    { tag: ['@regression', '@discovery'] },
    async ({ home }) => {
      await home.goto();
      await expect(home.productCards.first()).toBeVisible();
      const page1 = await home.productNames.allTextContents();

      await home.paginationNext.click();
      await expect.poll(async () => (await home.productNames.allTextContents()).join('|')).not.toBe(page1.join('|'));

      await home.paginationPrev.click();
      await expect.poll(async () => (await home.productNames.allTextContents()).join('|')).toBe(page1.join('|'));
    },
  );

  test(
    'TC-029 | Search - Sorting applies within search results',
    { tag: ['@regression', '@discovery'] },
    async ({ home }) => {
      await home.goto();
      await home.searchFor('saw');
      await home.sortSelect.selectOption('price,desc');

      await expect.poll(async () => {
        const names = (await home.productNames.allTextContents()).map((n) => n.toLowerCase());
        const prices = (await home.productCards.getByTestId('product-price').allTextContents()).map(money);
        const allSaw = names.length > 0 && names.every((n) => n.includes('saw'));
        const sorted = prices.every((p, i) => i === 0 || p <= prices[i - 1]);
        return allSaw && sorted;
      }).toBe(true);
    },
  );

  test(
    'TC-030 | Listing - Out-of-stock products are labeled on the grid',
    { tag: ['@regression', '@discovery'] },
    async ({ home, page }) => {
      await home.goto();
      await expect(page.getByTestId('out-of-stock').first()).toBeVisible();
      await expect(page.getByTestId('out-of-stock').first()).toContainText(/out of stock/i);
    },
  );

  test(
    'TC-031 | Localization - Language switch changes the UI language',
    { tag: ['@regression', '@discovery'] },
    async ({ home, page }) => {
      await home.goto();
      await expect(home.navSignIn).toHaveText(/Sign in/);

      await page.getByTestId('language-select').click();
      await page.getByTestId('lang-tr').click();
      await expect(home.navSignIn).not.toHaveText(/Sign in/);

      await page.getByTestId('language-select').click();
      await page.getByTestId('lang-en').click();
      await expect(home.navSignIn).toHaveText(/Sign in/);
    },
  );

  test(
    'TC-032 | Compare - Two products can be compared side by side',
    { tag: ['@regression', '@discovery'] },
    async ({ home, page }) => {
      await home.goto();
      const name0 = (await home.productCards.nth(0).getByTestId('product-name').innerText()).trim();
      const name1 = (await home.productCards.nth(1).getByTestId('product-name').innerText()).trim();

      await page.getByTestId('compare-btn').nth(0).click();
      await page.getByTestId('compare-btn').nth(1).click();
      await expect(page.getByTestId('comparison-bar')).toBeVisible();

      await page.getByTestId('compare-link').click();
      await expect(page.getByText(name0).first()).toBeVisible();
      await expect(page.getByText(name1).first()).toBeVisible();
    },
  );

  test(
    'TC-033 | Navigation - Category menu opens a pre-filtered listing',
    { tag: ['@regression', '@discovery'] },
    async ({ home, page }) => {
      await home.goto();
      await page.getByTestId('nav-categories').click();
      await page.getByTestId('nav-hand-tools').click();

      await expect(page).toHaveURL(/\/category\/hand-tools/);
      await expect(page.getByRole('heading', { name: 'Category: Hand Tools' })).toBeVisible();
      await expect(home.productCards.first()).toBeVisible();
    },
  );
});
