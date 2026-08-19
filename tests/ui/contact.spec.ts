import fs from 'fs';
import { test, expect } from '../../src/fixtures/fixtures';
import { injectSession } from '../../src/utils/session';

const LONG_MESSAGE = 'This is a sufficiently long automated test message for the Toolshop contact form checks.';

async function fillContactForm(page: import('@playwright/test').Page, email: string): Promise<void> {
  await page.getByTestId('first-name').fill('Toolshop');
  await page.getByTestId('last-name').fill('Tester');
  await page.getByTestId('email').fill(email);
  await page.getByTestId('subject').selectOption({ label: 'Customer service' });
  await page.getByTestId('message').fill(LONG_MESSAGE);
}

test.describe('Contact', () => {
  test(
    'TC-077 | Form - Guest sends a message with valid data',
    { tag: ['@regression', '@contact'] },
    async ({ page }) => {
      await page.goto('/contact');
      await fillContactForm(page, `toolshop.e2e.c77.${Date.now()}@example.com`);
      await page.getByTestId('contact-submit').click();
      await expect(page.getByText(/thanks|success/i).first()).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'TC-078 | Form - Required-field validations',
    { tag: ['@regression', '@contact'] },
    async ({ page }) => {
      await page.goto('/contact');
      await page.getByTestId('contact-submit').click();
      await expect.poll(async () => page.getByText(/required/i).count()).toBeGreaterThanOrEqual(4);
    },
  );

  test(
    'TC-079 | Form - Logged-in user\'s message is linked to the account',
    { tag: ['@regression', '@contact'] },
    async ({ page, api, testUser }, testInfo) => {
      await injectSession(page, await api.login(testUser.email, testUser.password));
      await page.goto('/contact');
      await expect(page.getByTestId('subject')).toBeVisible();

      // Build difference: the deployed v5.0 shows empty identity fields when signed
      // in (no prefill — a finding); the upstream main build hides them. Accept both.
      const identityVisible = await page.getByTestId('first-name').isVisible().catch(() => false);
      if (identityVisible) {
        testInfo.annotations.push({
          type: 'finding',
          description: 'The contact form shows empty identity fields for signed-in users (no prefill); the message still links to the account.',
        });
        await fillContactForm(page, testUser.email);
      } else {
        await page.getByTestId('subject').selectOption({ label: 'Customer service' });
        await page.getByTestId('message').fill(LONG_MESSAGE);
      }
      await page.getByTestId('contact-submit').click();
      await expect(page.getByText(/thanks|success/i).first()).toBeVisible({ timeout: 10_000 });

      await page.goto('/account/messages');
      // The list shows the subject as a slug ("customer-service").
      await expect(page.locator('table tbody tr').first()).toContainText(/customer[- ]service/i);
    },
  );

  test(
    'TC-080 | Attachment - Allowed file is accepted',
    { tag: ['@regression', '@contact'] },
    async ({ page }, testInfo) => {
      // Discovered rule: the attachment must be empty (0 bytes) — "File should be empty."
      const emptyFile = testInfo.outputPath('empty.txt');
      fs.writeFileSync(emptyFile, '');

      await page.goto('/contact');
      await fillContactForm(page, `toolshop.e2e.c80.${Date.now()}@example.com`);
      await page.getByTestId('attachment').setInputFiles(emptyFile);
      await page.getByTestId('contact-submit').click();

      await expect(page.getByText(/thanks|success/i).first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('File should be empty.')).toBeHidden();
    },
  );

  test(
    'TC-081 | Attachment - Disallowed file type or size is rejected',
    { tag: ['@regression', '@contact'] },
    async ({ page }, testInfo) => {
      const nonEmptyFile = testInfo.outputPath('nonempty.txt');
      fs.writeFileSync(nonEmptyFile, 'this file has content');

      await page.goto('/contact');
      await fillContactForm(page, `toolshop.e2e.c81.${Date.now()}@example.com`);
      await page.getByTestId('attachment').setInputFiles(nonEmptyFile);
      await page.getByTestId('contact-submit').click();

      await expect(page.getByText('File should be empty.')).toBeVisible();
    },
  );

  test(
    'TC-082 | Form - Message shorter than the minimum length is rejected',
    { tag: ['@regression', '@contact'] },
    async ({ page }) => {
      await page.goto('/contact');
      await fillContactForm(page, `toolshop.e2e.c82.${Date.now()}@example.com`);
      await page.getByTestId('message').fill('help');
      await page.getByTestId('contact-submit').click();

      await expect(page.getByText('Message must be minimal 50 characters')).toBeVisible();
    },
  );
});
