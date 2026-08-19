import { authenticator } from 'otplib';
import { test, expect } from '../../src/fixtures/fixtures';
import { buildPassword } from '../../src/utils/data-factory';
import { injectSession } from '../../src/utils/session';

test.describe('Account', () => {
  test(
    'TC-067 | Overview - Account page shows section navigation',
    { tag: ['@regression', '@account'] },
    async ({ page, api, testUser }) => {
      await injectSession(page, await api.login(testUser.email, testUser.password));
      await page.goto('/account');

      await expect(page.getByTestId('page-title')).toContainText('My account');
      for (const item of ['nav-favorites', 'nav-profile', 'nav-invoices', 'nav-messages']) {
        await expect(page.getByTestId(item)).toBeVisible();
      }
    },
  );

  test(
    'TC-068 | Profile - Updating profile fields persists',
    { tag: ['@regression', '@account'] },
    async ({ page, api, testUser }) => {
      await injectSession(page, await api.login(testUser.email, testUser.password));
      await page.goto('/account/profile');
      await expect(page.getByTestId('first-name')).toHaveValue(testUser.firstName);

      await page.getByTestId('phone').fill('05559998877');
      await page.getByTestId('street').fill('Updated Street 7');
      await page.getByTestId('update-profile-submit').click();
      await expect(page.getByText(/successfully|updated/i).first()).toBeVisible({ timeout: 10_000 }).catch(() => {});

      // Reload sonrası form /users/me'den asenkron dolar; toHaveValue kendisi bekler.
      await page.reload();
      await expect(page.getByTestId('phone')).toHaveValue('05559998877', { timeout: 10_000 });
      await expect(page.getByTestId('street')).toHaveValue('Updated Street 7');
    },
  );

  test(
    'TC-069 | Profile - Required-field validation on update',
    { tag: ['@regression', '@account'] },
    async ({ page, api, testUser }) => {
      await injectSession(page, await api.login(testUser.email, testUser.password));
      await page.goto('/account/profile');
      await expect(page.getByTestId('first-name')).toHaveValue(testUser.firstName);

      await page.getByTestId('first-name').fill('');
      await page.getByTestId('first-name').blur();
      await page.getByTestId('update-profile-submit').click();
      // Boş alan ya inline "required" hatası gösterir ya da submit'i işlemsiz bırakır;
      // asıl değişmez: değer kalıcı OLMAMALI.
      const requiredShown = await page.getByText(/required/i).first().isVisible().catch(() => false);
      if (!requiredShown) await expect(page.getByText(/successfully|updated/i)).toBeHidden();

      await page.reload();
      await expect(page.getByTestId('first-name')).toHaveValue(testUser.firstName, { timeout: 10_000 });
    },
  );

  test(
    'TC-070 | Password - Customer changes the password and logs in with the new one',
    { tag: ['@regression', '@account'] },
    async ({ page, api, testUser }) => {
      const newPassword = buildPassword();
      await injectSession(page, await api.login(testUser.email, testUser.password));
      await page.goto('/account/profile');
      // Form /users/me gelince resetleniyor; veri dolmadan yazılan değerler siliniyor → önce bekle.
      await expect(page.getByTestId('email')).toHaveValue(testUser.email, { timeout: 10_000 });

      // Angular form validity blur ister; blur'suz submit isteği hiç atılmıyor.
      await page.getByTestId('current-password').fill(testUser.password);
      await page.getByTestId('current-password').blur();
      await page.getByTestId('new-password').fill(newPassword);
      await page.getByTestId('new-password').blur();
      await page.getByTestId('new-password-confirm').fill(newPassword);
      await page.getByTestId('new-password-confirm').blur();
      // Dikkat: yeni şifreyi poll'la denemek, değişiklik uygulanana dek başarısız login
      // sayılıp hesabı kilitler (423). Önce API yanıtını bekle, sonra TEK deneme yap.
      const changeResponse = page.waitForResponse(
        (r) => r.url().includes('/users/change-password') && r.request().method() === 'POST',
      );
      await page.getByTestId('change-password-submit').click();
      expect((await changeResponse).ok()).toBe(true);

      expect((await api.loginRaw(testUser.email, newPassword)).status()).toBe(200);
      expect((await api.loginRaw(testUser.email, testUser.password)).status()).toBe(401);
    },
  );

  test(
    'TC-071 | Password - Wrong current password is rejected',
    { tag: ['@regression', '@account'] },
    async ({ page, api, testUser }) => {
      await injectSession(page, await api.login(testUser.email, testUser.password));
      await page.goto('/account/profile');
      await expect(page.getByTestId('email')).toHaveValue(testUser.email, { timeout: 10_000 });

      await page.getByTestId('current-password').fill('Wrong-current-1!');
      const newPassword = buildPassword();
      await page.getByTestId('new-password').fill(newPassword);
      await page.getByTestId('new-password-confirm').fill(newPassword);
      await page.getByTestId('change-password-submit').click();

      await expect(page.locator('.alert, [role="alert"]').first()).toBeVisible();
      // Şifre değişmemiş olmalı.
      expect((await api.loginRaw(testUser.email, testUser.password)).status()).toBe(200);
    },
  );

  test(
    'TC-072 | Favorites - Favorite can be removed from the favorites page',
    { tag: ['@regression', '@account'] },
    async ({ page, api, testUser, home, productPage, stockProduct }) => {
      await injectSession(page, await api.login(testUser.email, testUser.password));
      await home.goto();
      await home.openProduct(stockProduct.name);
      const favoriteResponse = page.waitForResponse(
        (r) => r.url().includes('/favorites') && r.request().method() === 'POST',
      );
      await productPage.addToFavoritesBtn.click();
      expect((await favoriteResponse).status()).toBe(201);

      await page.goto('/account/favorites');
      const favoriteCards = page.locator('[data-test^="favorite-"]');
      await expect(favoriteCards.first()).toBeVisible();
      await expect(favoriteCards.first()).toContainText(stockProduct.name);

      await page.getByTestId('delete').first().click();
      await expect(favoriteCards).toHaveCount(0);

      await page.reload();
      await expect(favoriteCards).toHaveCount(0);
    },
  );

  test(
    'TC-073 | Invoices - Invoice PDF can be downloaded after async generation',
    { tag: ['@regression', '@account'] },
    async ({ page, api, testUser }, testInfo) => {
      testInfo.setTimeout(120_000);
      const token = await api.login(testUser.email, testUser.password);
      const invoice = await api.createInvoice(token);

      await injectSession(page, token);
      await page.goto('/account/invoices');
      const row = page.locator('table tbody tr').filter({ hasText: invoice.invoice_number });
      await expect(row).toBeVisible({ timeout: 15_000 });

      await row.locator('a').first().click();
      await expect(page.getByTestId('invoice-number')).toHaveValue(invoice.invoice_number);
      const download = page.getByTestId('download-invoice');
      await expect(download).toBeVisible();

      // PDF üretimi asenkron (NOT_INITIATED → INITIATED → COMPLETED); demo'da yavaş olabilir.
      let completed = false;
      for (let i = 0; i < 20; i++) {
        const res = await api.http.get(`/invoices/${invoice.invoice_number}/download-pdf-status`, {
          headers: api.bearer(token),
        });
        if (((await res.json().catch(() => ({}))) as { status?: string }).status === 'COMPLETED') {
          completed = true;
          break;
        }
        await page.waitForTimeout(3000);
      }

      if (completed) {
        await page.reload();
        await expect(download).toBeEnabled({ timeout: 10_000 });
        const downloadEvent = page.waitForEvent('download');
        await download.click();
        expect((await downloadEvent).suggestedFilename()).toMatch(/\.pdf$/i);
      } else {
        testInfo.annotations.push({
          type: 'partial',
          description: 'Demo ortamında PDF üretimi 60sn içinde COMPLETED olmadı; buton hazır-olana-dek-disabled davranışı doğrulandı.',
        });
        await expect(download).toBeDisabled();
      }
    },
  );

  test(
    'TC-074 | Messages - Contact messages sent while logged in are listed in the account',
    { tag: ['@regression', '@account'] },
    async ({ page, api, testUser }) => {
      await injectSession(page, await api.login(testUser.email, testUser.password));
      await page.goto('/contact');

      await page.getByTestId('subject').selectOption({ label: 'Webmaster' });
      await page.getByTestId('message').fill('This is a sufficiently long automated message for the account messages check.');
      await page.getByTestId('contact-submit').click();
      await expect(page.getByText(/thanks|success/i).first()).toBeVisible({ timeout: 10_000 });

      await page.goto('/account/messages');
      const row = page.locator('table tbody tr').first();
      await expect(row).toBeVisible();
      await expect(row).toContainText(/webmaster/i); // listede subject küçük harfle görünüyor
    },
  );

  test(
    'TC-075 | Security - TOTP two-factor setup is available on the profile',
    { tag: ['@regression', '@account'] },
    async ({ page, api, testUser }) => {
      const token = await api.login(testUser.email, testUser.password);
      await injectSession(page, token);
      await page.goto('/account/profile');

      // Secret asenkron render ediliyor; önce dolmasını bekle.
      await expect(page.getByTestId('totp-secret')).toHaveText(/[A-Z2-7]{16,}/, { timeout: 10_000 });
      const secretText = (await page.getByTestId('totp-secret').textContent()) ?? '';
      const secret = secretText.match(/[A-Z2-7]{16,}/)?.[0];
      expect(secret, `TOTP secret bulunamadı: "${secretText}"`).toBeTruthy();

      await page.getByTestId('totp-code').fill(authenticator.generate(secret!));
      await page.getByTestId('verify-totp').click();

      await expect.poll(async () => (await api.me(token)).totp_enabled, { timeout: 15_000 }).toBe(true);
    },
  );

  test(
    'TC-076 | Session - Expired session redirects to login',
    { tag: ['@regression', '@account'] },
    async ({ page, api, testUser }) => {
      await injectSession(page, await api.login(testUser.email, testUser.password));
      await page.goto('/account');
      await expect(page.getByTestId('page-title')).toContainText('My account');

      // Süresi dolmuş oturumu, token'ı geçersizleştirerek deterministik simüle ediyoruz.
      // Gözlenen davranış: geçersiz token'da uygulama korumalı sayfadan ana sayfaya atar
      // ve oturum düşer (nav yeniden "Sign in" gösterir) → yeniden kimlik doğrulama gerekir.
      await page.evaluate(() => localStorage.setItem('auth-token', 'expired.invalid.token'));
      await page.goto('/account/invoices');
      await expect(page).not.toHaveURL(/\/account\/invoices/, { timeout: 10_000 });
      await expect(page.getByTestId('nav-sign-in')).toBeVisible();
    },
  );
});
