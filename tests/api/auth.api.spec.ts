import { test, expect } from '../../src/fixtures/fixtures';
import { buildUser } from '../../src/utils/data-factory';

test.describe('API Auth', () => {
  test(
    'TC-098 | Auth - Login returns a JWT for valid credentials',
    { tag: ['@smoke', '@api'] },
    async ({ api, testUser }) => {
      const res = await api.loginRaw(testUser.email, testUser.password);
      expect(res.status()).toBe(200);

      const body = await res.json();
      expect(body.access_token).toMatch(/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/);
      expect(String(body.token_type).toLowerCase()).toBe('bearer');
      expect(body.expires_in).toBeGreaterThan(0);
    },
  );

  test(
    'TC-099 | Auth - Login with wrong password returns 401',
    { tag: ['@regression', '@api'] },
    async ({ api, testUser }) => {
      const res = await api.loginRaw(testUser.email, 'wrong-password-1!');
      expect(res.status()).toBe(401);
      expect(await res.json()).toEqual({ error: 'Unauthorized' });
    },
  );

  test(
    'TC-100 | Auth - Repeated failures lock the account',
    { tag: ['@regression', '@api'] },
    async ({ api, testUser }) => {
      // Keşif: 4. yanlış denemede 423 dönüyor (ilk 3'ü 401).
      const statuses: number[] = [];
      for (let i = 0; i < 5; i++) statuses.push((await api.loginRaw(testUser.email, 'wrong-1!')).status());
      expect(statuses[0]).toBe(401);
      expect(statuses).toContain(423);

      const correct = await api.loginRaw(testUser.email, testUser.password);
      expect(correct.status()).toBe(423);
      expect((await correct.json()).error).toContain('Account locked');
    },
  );

  test(
    'TC-101 | Auth - Register creates a user without exposing the password',
    { tag: ['@smoke', '@api'] },
    async ({ api }) => {
      const user = buildUser();
      const res = await api.registerRaw(user);
      expect(res.status()).toBe(201);

      const body = await res.json();
      expect(body.id).toBeTruthy();
      expect(body.email).toBe(user.email);
      expect(body).not.toHaveProperty('password');

      await api.tryDeleteUser(body.id);
    },
  );

  test(
    'TC-102 | Auth - Register returns 422 with per-field validation errors',
    { tag: ['@regression', '@api'] },
    async ({ api }, testInfo) => {
      const res = await api.http.post('/users/register', {
        data: { email: 'not-an-email', password: 'short' },
      });
      expect(res.status()).toBe(422);
      const body = await res.json();
      expect(body).toHaveProperty('first_name');
      expect(body).toHaveProperty('last_name');
      expect(JSON.stringify(body.password)).toContain('at least 8 characters');
      // Gözlem: bozuk e-posta formatı API'de flag'lenmiyor (yalnızca client-side) — bug adayı.
      if (!body.email) {
        testInfo.annotations.push({
          type: 'bug-candidate',
          description: 'Register API bozuk e-posta formatına validasyon hatası dönmüyor (email anahtarı yok).',
        });
      }
    },
  );

  test(
    'TC-103 | Auth - Register rejects breached passwords',
    { tag: ['@regression', '@api'] },
    async ({ api }) => {
      const res = await api.registerRaw({ ...buildUser(), password: 'Password123!' });
      expect(res.status()).toBe(422);
      const body = await res.json();
      expect(JSON.stringify(body)).toContain('appeared in a data leak');
    },
  );

  test(
    'TC-104 | Auth - /users/me returns the authenticated profile',
    { tag: ['@regression', '@api'] },
    async ({ api, testUser }) => {
      const token = await api.login(testUser.email, testUser.password);
      const me = await api.me(token);
      expect(me.id).toBe(testUser.id);
      expect(me.email).toBe(testUser.email);
      expect(me).toHaveProperty('totp_enabled');
    },
  );

  test(
    'TC-105 | Auth - Protected endpoints require a valid token',
    { tag: ['@regression', '@api'] },
    async ({ api }) => {
      const noHeader = await api.http.get('/users/me');
      expect(noHeader.status()).toBe(401);

      const badToken = await api.http.get('/users/me', { headers: api.bearer('garbage.invalid.token') });
      expect(badToken.status()).toBe(401);
    },
  );

  test(
    'TC-106 | Auth - Token refresh issues a new token',
    { tag: ['@regression', '@api'] },
    async ({ api, testUser }) => {
      const token = await api.login(testUser.email, testUser.password);
      const res = await api.http.get('/users/refresh', { headers: api.bearer(token) });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.access_token).toMatch(/^eyJ/);
      expect(body.access_token).not.toBe(token);
    },
  );

  test(
    'TC-107 | Users - A customer cannot delete accounts',
    { tag: ['@regression', '@api'] },
    async ({ api, testUser }) => {
      const token = await api.login(testUser.email, testUser.password);
      const res = await api.http.delete(`/users/${testUser.id}`, { headers: api.bearer(token) });
      expect(res.status()).toBe(403);
      expect((await res.json()).message).toBe('Forbidden');
    },
  );

  test(
    'TC-108 | Users - Admin deletes a user without relations',
    { tag: ['@regression', '@api'] },
    async ({ api }) => {
      const user = buildUser();
      user.id = await api.register(user);

      const res = await api.http.delete(`/users/${user.id}`, { headers: api.bearer(await api.adminToken()) });
      expect(res.status()).toBe(204);

      expect((await api.loginRaw(user.email, user.password)).status()).toBe(401);
    },
  );

  test(
    'TC-109 | Users - Deleting a user with invoices returns 409',
    { tag: ['@regression', '@api'] },
    async ({ api, testUser }) => {
      const token = await api.login(testUser.email, testUser.password);
      await api.createInvoice(token);

      const res = await api.http.delete(`/users/${testUser.id}`, { headers: api.bearer(await api.adminToken()) });
      expect(res.status()).toBe(409);

      // Kullanıcı hâlâ giriş yapabilmeli (silinmedi).
      expect((await api.loginRaw(testUser.email, testUser.password)).status()).toBe(200);
    },
  );
});
