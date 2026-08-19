import AxeBuilder from '@axe-core/playwright';
import { Page, TestInfo } from '@playwright/test';
import { test, expect } from '../../src/fixtures/fixtures';

/**
 * Known accessibility violations by axe rule id, reported as defects.
 * The tests tolerate these and guard against any new violations.
 */
const KNOWN_VIOLATIONS: Record<string, string[]> = {
  // 'list': the category filter tree nests <ul> directly inside <ul> (serious, 3 nodes)
  home: ['list'],
  // 'button-name': icon button without an accessible name (critical, 1 node)
  // 'list': non-<li> direct child in the password-requirements list (serious, 1 node)
  login: ['button-name', 'list'],
  register: ['button-name', 'list'],
  product: [],
  contact: [],
};

async function expectNoNewA11yViolations(page: Page, key: string, testInfo: TestInfo): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const seriousOrWorse = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
  await testInfo.attach(`axe-${key}.json`, {
    body: JSON.stringify(seriousOrWorse, null, 2),
    contentType: 'application/json',
  });

  const known = KNOWN_VIOLATIONS[key] ?? [];
  for (const id of known) {
    if (seriousOrWorse.some((v) => v.id === id)) {
      testInfo.annotations.push({ type: 'known-a11y-issue', description: `${key}: ${id} (reported as a defect)` });
    }
  }
  const unexpected = seriousOrWorse.filter((v) => !known.includes(v.id));
  expect(unexpected.map((v) => `${v.id} [${v.impact}]: ${v.help} (${v.nodes.length} node)`)).toEqual([]);
}

test.describe('Quality', () => {
  test(
    'TC-123 | A11y - Home page has no serious accessibility violations',
    { tag: ['@regression', '@a11y'] },
    async ({ home, page }, testInfo) => {
      await home.goto();
      await expect(home.productCards.first()).toBeVisible();
      await expectNoNewA11yViolations(page, 'home', testInfo);
    },
  );

  test(
    'TC-124 | A11y - Login and registration pages have no serious violations',
    { tag: ['@regression', '@a11y'] },
    async ({ page }, testInfo) => {
      await page.goto('/auth/login');
      await expect(page.getByTestId('login-form')).toBeVisible();
      await expectNoNewA11yViolations(page, 'login', testInfo);

      await page.goto('/auth/register');
      await expect(page.getByTestId('register-form')).toBeVisible();
      await expectNoNewA11yViolations(page, 'register', testInfo);
    },
  );

  test(
    'TC-125 | A11y - Product detail page has no serious violations',
    { tag: ['@regression', '@a11y'] },
    async ({ home, productPage, page, stockProduct }, testInfo) => {
      await home.goto();
      await home.openProduct(stockProduct.name);
      await expect(productPage.addToCartBtn).toBeVisible();
      await expectNoNewA11yViolations(page, 'product', testInfo);
    },
  );

  test(
    'TC-126 | A11y - Contact page has no serious violations',
    { tag: ['@regression', '@a11y'] },
    async ({ page }, testInfo) => {
      await page.goto('/contact');
      await expect(page.getByTestId('subject')).toBeVisible();
      await expectNoNewA11yViolations(page, 'contact', testInfo);
    },
  );

  // Visual regression examples on static pages. Baselines are platform-specific
  // (generated on macOS), so CI skips these via --grep-invert @visual.
  test(
    'TC-127 | Visual - Login page matches the approved baseline',
    { tag: ['@regression', '@visual'] },
    async ({ page }) => {
      await page.goto('/auth/login');
      await expect(page.getByTestId('login-form')).toBeVisible();
      await expect(page).toHaveScreenshot('login-page.png', {
        fullPage: true,
        animations: 'disabled',
        maxDiffPixelRatio: 0.02,
      });
    },
  );

  test(
    'TC-128 | Visual - Contact page matches the approved baseline',
    { tag: ['@regression', '@visual'] },
    async ({ page }) => {
      await page.goto('/contact');
      await expect(page.getByTestId('subject')).toBeVisible();
      await expect(page).toHaveScreenshot('contact-page.png', {
        fullPage: true,
        animations: 'disabled',
        maxDiffPixelRatio: 0.02,
      });
    },
  );
});
