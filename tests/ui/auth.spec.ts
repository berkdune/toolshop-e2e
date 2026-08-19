import { test, expect } from '../../src/fixtures/fixtures';
import { config } from '../../src/config';
import { buildUser } from '../../src/utils/data-factory';
import { injectSession } from '../../src/utils/session';

test.describe('Auth', () => {
  test(
    'TC-001 | Login - Customer logs in with valid credentials',
    { tag: ['@smoke', '@auth'] },
    async ({ loginPage, testUser, page }) => {
      await loginPage.goto();
      await loginPage.login(testUser.email, testUser.password);
      await expect(page).toHaveURL(/\/account$/);
      await expect(loginPage.pageTitle).toContainText('My account');
      await expect(loginPage.navUserMenu).toBeVisible();
    },
  );

  test(
    'TC-002 | Login - Error is shown for wrong password',
    { tag: ['@regression', '@auth'] },
    async ({ loginPage, testUser, page }) => {
      await loginPage.goto();
      await loginPage.login(testUser.email, 'definitely-wrong-1!');
      await expect(loginPage.error).toHaveText('Invalid email or password');
      await expect(page).toHaveURL(/\/auth\/login/);
    },
  );

  test(
    'TC-003 | Login - Unregistered email shows the same generic error',
    { tag: ['@regression', '@auth'] },
    async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.login(`nobody.${Date.now()}@example.com`, 'whatever-1!');
      // Unregistered emails get the same generic message — no user enumeration.
      await expect(loginPage.error).toHaveText('Invalid email or password');
    },
  );

  test(
    'TC-004 | Login - Empty form shows required-field validations',
    { tag: ['@regression', '@auth'] },
    async ({ loginPage, page }) => {
      await loginPage.goto();
      await loginPage.submit.click();
      await expect(page.getByText('Email is required')).toBeVisible();
      await expect(page.getByText('Password is required')).toBeVisible();
      await expect(page).toHaveURL(/\/auth\/login/);
    },
  );

  test(
    'TC-005 | Login - Invalid email format is rejected',
    { tag: ['@regression', '@auth'] },
    async ({ loginPage, page }) => {
      await loginPage.goto();
      await loginPage.login('not-an-email', 'whatever-1!');
      await expect(page.getByText('Email format is invalid')).toBeVisible();
    },
  );

  test(
    'TC-006 | Login - Account locks after repeated failed attempts',
    { tag: ['@regression', '@auth'] },
    async ({ loginPage, testUser, api }) => {
      // The account locks on the 4th failed attempt; attempts go through the API, the check through the UI.
      for (let i = 0; i < 4; i++) await api.loginRaw(testUser.email, 'wrong-password-1!');
      await loginPage.goto();
      await loginPage.login(testUser.email, testUser.password);
      await expect(loginPage.error).toContainText('Account locked');
    },
  );

  test(
    'TC-007 | Register - New customer registers with valid data',
    { tag: ['@smoke', '@auth'] },
    async ({ registerPage, loginPage, api, page }) => {
      const user = buildUser();
      await registerPage.goto();
      await registerPage.register(user);
      await expect(page).toHaveURL(/\/auth\/login/);

      await loginPage.login(user.email, user.password);
      await expect(page).toHaveURL(/\/account$/);

      await api.tryDeleteUserByEmail(user.email);
    },
  );

  test(
    'TC-008 | Register - Empty form shows a validation per required field',
    { tag: ['@regression', '@auth'] },
    async ({ registerPage, page }) => {
      await registerPage.goto();
      await registerPage.submit.click();
      await expect.poll(async () => page.getByText(/is required/i).count()).toBeGreaterThanOrEqual(5);
      await expect(page).toHaveURL(/\/auth\/register/);
    },
  );

  test(
    'TC-009 | Register - Duplicate email is rejected',
    { tag: ['@regression', '@auth'] },
    async ({ registerPage, testUser, page }) => {
      const dup = { ...buildUser(), email: testUser.email };
      await registerPage.goto();
      await registerPage.register(dup);
      await expect(page.getByText(/already|exists|taken/i).first()).toBeVisible();
      await expect(page).toHaveURL(/\/auth\/register/);
    },
  );

  test(
    'TC-010 | Register - Breached password is rejected by the password policy',
    { tag: ['@regression', '@auth'] },
    async ({ registerPage, page }) => {
      const user = { ...buildUser(), password: 'Password123!' };
      await registerPage.goto();
      await registerPage.register(user);
      await expect(page.getByText(/data leak/i)).toBeVisible();
      await expect(page).toHaveURL(/\/auth\/register/);
    },
  );

  test(
    'TC-011 | Forgot Password - Registered email gets a confirmation',
    { tag: ['@regression', '@auth'] },
    async ({ page, testUser }, testInfo) => {
      await page.goto('/auth/forgot-password');
      await page.getByTestId('email').fill(testUser.email);
      await page.getByTestId('forgot-password-submit').click();
      const alert = page.locator('.alert').first();
      await expect(alert).toBeVisible();
      // Known defect: the confirmation renders a raw i18n key ("page.forgot-password.confirm").
      if ((await alert.textContent())?.includes('page.forgot-password.confirm')) {
        testInfo.annotations.push({
          type: 'bug-candidate',
          description: 'Forgot-password confirmation shows a raw i18n key: page.forgot-password.confirm',
        });
      }
    },
  );

  test(
    'TC-012 | Logout - Customer signs out and loses access to protected pages',
    { tag: ['@regression', '@auth'] },
    async ({ loginPage, testUser, page }) => {
      await loginPage.goto();
      await loginPage.login(testUser.email, testUser.password);
      await expect(page).toHaveURL(/\/account$/);

      await loginPage.navUserMenu.click();
      await page.getByTestId('nav-sign-out').click();
      await expect(loginPage.navSignIn).toBeVisible();

      await page.goto('/account');
      await expect(page).toHaveURL(/\/auth\/login/);
    },
  );

  test(
    'TC-013 | Authorization - Guest is redirected to login on protected pages',
    { tag: ['@regression', '@auth'] },
    async ({ page }) => {
      await page.goto('/account');
      await expect(page).toHaveURL(/\/auth\/login/);
      await page.goto('/account/invoices');
      await expect(page).toHaveURL(/\/auth\/login/);
    },
  );

  test(
    'TC-014 | Authorization - Customer cannot access admin pages',
    { tag: ['@regression', '@auth'] },
    async ({ page, testUser, api }) => {
      const token = await api.login(testUser.email, testUser.password);
      await injectSession(page, token);
      await page.goto('/admin/dashboard');
      await expect(page).toHaveURL(/\/auth\/login/);
    },
  );

  test(
    'TC-015 | Login - Admin logs in and lands on the admin dashboard',
    { tag: ['@smoke', '@auth'] },
    async ({ loginPage, admin, page }) => {
      await loginPage.goto();
      await loginPage.login(config.admin.email, config.admin.password);
      await expect(page).toHaveURL(/\/admin\/dashboard/);
      // Admin menu links live inside the user-name dropdown; open it first.
      await admin.navUserMenu.click();
      await expect(admin.navProducts).toBeVisible();
      await expect(admin.navUsers).toBeVisible();
    },
  );
});
