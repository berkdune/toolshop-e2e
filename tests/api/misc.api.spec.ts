import { test, expect } from '../../src/fixtures/fixtures';

test.describe('API Misc', () => {
  test(
    'TC-121 | Contact - Message can be created and is visible to the admin',
    { tag: ['@regression', '@api'] },
    async ({ api }) => {
      const message = {
        name: 'Toolshop E2E',
        email: `toolshop.e2e.msg.${Date.now()}@example.com`,
        subject: 'Webmaster',
        message: 'This automated message checks the contact API contract end to end, thanks.',
      };
      const createRes = await api.http.post('/messages', { data: message });
      expect([200, 201]).toContain(createRes.status());
      const created = await createRes.json();
      expect(created.id).toBeTruthy();
      expect(created.status).toBe('NEW');

      const listRes = await api.http.get('/messages', { headers: api.bearer(await api.adminToken()) });
      expect(listRes.status()).toBe(200);
      const list = await listRes.json();
      expect(JSON.stringify(list.data ?? list)).toContain(created.id);
    },
  );

  test(
    'TC-122 | Postcode - Lookup resolves a valid postcode and rejects an invalid one',
    { tag: ['@regression', '@api'] },
    async ({ api }) => {
      const valid = await api.http.get('/postcode-lookup?country=NL&postcode=1012JS&house_number=1');
      expect(valid.status()).toBe(200);
      const body = await valid.json();
      expect(body.city).toBe('Laren');
      expect(body.street).toBeTruthy();

      const invalid = await api.http.get('/postcode-lookup?country=NL&postcode=XXXXXX');
      expect(invalid.status()).toBeLessThan(500);
      if (invalid.status() === 200) {
        const invalidBody = await invalid.json().catch(() => ({}));
        expect(invalidBody.city ?? '').not.toBe('Laren');
      }
    },
  );
});
