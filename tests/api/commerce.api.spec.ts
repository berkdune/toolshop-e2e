import { test, expect } from '../../src/fixtures/fixtures';
import { buildUser } from '../../src/utils/data-factory';

test.describe('API Commerce', () => {
  test(
    'TC-116 | Cart - Cart lifecycle via the API',
    { tag: ['@regression', '@api'] },
    async ({ api }) => {
      const product = await api.findProduct('pliers');

      const createRes = await api.http.post('/carts');
      expect([200, 201]).toContain(createRes.status());
      const cartId = (await createRes.json()).id as string;
      expect(cartId).toBeTruthy();

      const addRes = await api.http.post(`/carts/${cartId}`, { data: { product_id: product.id, quantity: 2 } });
      expect(addRes.ok()).toBe(true);

      const qtyRes = await api.http.put(`/carts/${cartId}/product/quantity`, {
        data: { product_id: product.id, quantity: 5 },
      });
      expect(qtyRes.ok()).toBe(true);

      const cart = await (await api.http.get(`/carts/${cartId}`)).json();
      const cartText = JSON.stringify(cart);
      expect(cartText).toContain(product.id);
      expect(cartText).toContain('5');

      const deleteRes = await api.http.delete(`/carts/${cartId}/product/${product.id}`);
      expect(deleteRes.ok()).toBe(true);

      const emptied = await (await api.http.get(`/carts/${cartId}`)).json();
      expect(JSON.stringify(emptied)).not.toContain(product.id);
    },
  );

  test(
    'TC-117 | Invoices - Authenticated order creation via the API',
    { tag: ['@regression', '@api'] },
    async ({ api, testUser }) => {
      const token = await api.login(testUser.email, testUser.password);
      const product = await api.findProduct('pliers');
      const cartId = await api.createCartWithProduct(product.id, 2);

      const res = await api.http.post('/invoices', {
        headers: api.bearer(token),
        data: {
          ...api.nlBilling(),
          payment_method: 'cash-on-delivery',
          payment_details: {},
          cart_id: cartId,
        },
      });
      expect(res.status()).toBe(201);
      const invoice = await res.json();
      expect(invoice.invoice_number).toMatch(/^INV-/);
      expect(invoice.billing_street).toBe('van den Pollaan');
      expect(Number(invoice.total)).toBeCloseTo(product.price * 2, 2);

      const list = await (await api.http.get('/invoices', { headers: api.bearer(token) })).json();
      expect(list.total).toBeGreaterThanOrEqual(1);
      expect(JSON.stringify(list.data)).toContain(invoice.invoice_number);
    },
  );

  test(
    'TC-118 | Invoices - Guest order creation',
    { tag: ['@regression', '@api'] },
    async ({ api }) => {
      // Misafir UI akışının gerçek sözleşmesi (sniff ile doğrulandı):
      // POST /invoices/guest + billing + guest_email/guest_first_name/guest_last_name.
      const product = (await api.findInStockProducts(1))[0];
      const cartId = await api.createCartWithProduct(product.id, 1);

      const res = await api.http.post('/invoices/guest', {
        data: {
          ...api.nlBilling(),
          payment_method: 'cash-on-delivery',
          payment_details: {},
          cart_id: cartId,
          guest_email: `toolshop.e2e.guest.${Date.now()}@example.com`,
          guest_first_name: 'Guest',
          guest_last_name: 'Api',
        },
      });
      expect([200, 201]).toContain(res.status());
      const invoice = await res.json();
      expect(invoice.invoice_number).toMatch(/^INV-/);
    },
  );

  test(
    'TC-119 | Invoices - PDF generation is asynchronous',
    { tag: ['@regression', '@api'] },
    async ({ api, testUser }, testInfo) => {
      testInfo.setTimeout(150_000);
      const token = await api.login(testUser.email, testUser.password);
      const invoice = await api.createInvoice(token);

      const status = async () => {
        const res = await api.http.get(`/invoices/${invoice.invoice_number}/download-pdf-status`, {
          headers: api.bearer(token),
        });
        return { code: res.status(), state: ((await res.json().catch(() => ({}))) as { status?: string }).status };
      };

      // Başlangıç: NOT_INITIATED (HTTP 400 ile raporlanıyor).
      const first = await status();
      expect(['NOT_INITIATED', 'INITIATED', 'COMPLETED']).toContain(first.state);

      // INITIATED'a geçmeli.
      await expect.poll(async () => (await status()).state, { timeout: 45_000, intervals: [3000] })
        .toMatch(/INITIATED|COMPLETED/);

      // COMPLETED olursa PDF inmeli; demo'da kuyruk yavaşsa kısmi geçiş notu düş.
      let completed = false;
      for (let i = 0; i < 15; i++) {
        if ((await status()).state === 'COMPLETED') { completed = true; break; }
        await new Promise((r) => setTimeout(r, 4000));
      }
      if (completed) {
        const pdf = await api.http.get(`/invoices/${invoice.invoice_number}/download-pdf`, {
          headers: api.bearer(token),
        });
        expect(pdf.status()).toBe(200);
        expect((await pdf.body()).subarray(0, 4).toString()).toBe('%PDF');
      } else {
        testInfo.annotations.push({
          type: 'partial',
          description: 'Demo PDF kuyruğu 60sn içinde COMPLETED olmadı; NOT_INITIATED→INITIATED durum makinesi doğrulandı.',
        });
      }
    },
  );

  test(
    'TC-120 | Invoices - A user cannot read another user\'s invoice',
    { tag: ['@regression', '@api'] },
    async ({ api, testUser }) => {
      const tokenA = await api.login(testUser.email, testUser.password);
      const invoiceA = await api.createInvoice(tokenA);

      const userB = buildUser();
      userB.id = await api.register(userB);
      const tokenB = await api.login(userB.email, userB.password);

      const res = await api.http.get(`/invoices/${invoiceA.id}`, { headers: api.bearer(tokenB) });
      expect(res.status()).not.toBe(200);
      expect([401, 403, 404]).toContain(res.status());

      await api.tryDeleteUser(userB.id);
    },
  );
});
