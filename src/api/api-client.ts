import { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../config';
import { TestUser } from '../utils/data-factory';

// JWT ~5 dk geçerli; admin token'ı worker içinde 4 dk'ya kadar cache'lenir.
let adminTokenCache: { token: string; at: number } | undefined;

export class ApiClient {
  constructor(readonly http: APIRequestContext) {}

  registerPayload(user: TestUser) {
    return {
      first_name: user.firstName,
      last_name: user.lastName,
      address: {
        street: user.street,
        // API house_number'ı null kabul eder (UI checkout'ta zorunlu — bilinen tutarsızlık);
        // boş string yollamak yerine null'a çevrilir ki TC-054 gibi senaryolar kurulabilsin.
        house_number: user.houseNumber || null,
        city: user.city,
        state: user.state,
        country: user.country,
        postal_code: user.postalCode,
      },
      phone: user.phone,
      dob: user.dob,
      email: user.email,
      password: user.password,
    };
  }

  async registerRaw(user: TestUser): Promise<APIResponse> {
    return this.http.post('/users/register', { data: this.registerPayload(user) });
  }

  async register(user: TestUser): Promise<string> {
    // Suite başında tüm worker'lar aynı anda kayıt açar; paylaşılan demo bunu
    // throttle edebiliyor → geçici hatalarda kısa backoff'lu retry.
    let lastError = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await this.registerRaw(user);
      if (res.status() === 201) return (await res.json()).id as string;
      lastError = `${res.status()} ${await res.text()}`;
      if (res.status() < 500 && res.status() !== 429) break; // kalıcı hata, retry anlamsız
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
    throw new Error(`register failed: ${lastError}`);
  }

  async loginRaw(email: string, password: string): Promise<APIResponse> {
    return this.http.post('/users/login', { data: { email, password } });
  }

  async login(email: string, password: string): Promise<string> {
    const res = await this.loginRaw(email, password);
    if (!res.ok()) throw new Error(`login failed: ${res.status()} ${await res.text()}`);
    return (await res.json()).access_token as string;
  }

  async adminToken(): Promise<string> {
    if (!adminTokenCache || Date.now() - adminTokenCache.at > 240_000) {
      const token = await this.login(config.admin.email, config.admin.password);
      adminTokenCache = { token, at: Date.now() };
    }
    return adminTokenCache.token;
  }

  /** Best-effort cleanup: faturası olan kullanıcı 409 döner, sessizce tolere edilir. */
  async tryDeleteUser(id?: string): Promise<void> {
    if (!id) return;
    try {
      const token = await this.adminToken();
      await this.http.delete(`/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    } catch {
      /* cleanup asla testi düşürmez */
    }
  }

  async tryDeleteUserByEmail(email: string): Promise<void> {
    try {
      const token = await this.adminToken();
      const res = await this.http.get(`/users/search?q=${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const users: Array<{ id: string }> = (await res.json()).data ?? [];
      for (const u of users) await this.tryDeleteUser(u.id);
    } catch {
      /* cleanup asla testi düşürmez */
    }
  }

  bearer(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  async me(token: string): Promise<Record<string, unknown>> {
    const res = await this.http.get('/users/me', { headers: this.bearer(token) });
    return res.json();
  }

  /** Katalogdan bir ürün döndürür (paylaşılan demoda ID'ler reset'le değişir — her seferinde taze çözülür). */
  async findProduct(query = 'pliers'): Promise<{ id: string; name: string; price: number }> {
    const res = await this.http.get(`/products/search?q=${encodeURIComponent(query)}`);
    const item = (await res.json()).data[0];
    if (!item) throw new Error(`ürün bulunamadı: ${query}`);
    return { id: item.id, name: item.name, price: Number(item.price) };
  }

  /**
   * STOKTA olan (in_stock=true, rental olmayan) ilk N ürünü döndürür.
   * Paylaşılan demoda siparişler stok tüketir; sabit ürün adına bağlanmak suite'i çökertir.
   */
  async findInStockProducts(count = 1): Promise<Array<{ id: string; name: string; price: number }>> {
    const found: Array<{ id: string; name: string; price: number }> = [];
    for (let pageNo = 1; pageNo <= 3 && found.length < count; pageNo++) {
      const res = await this.http.get(`/products?page=${pageNo}`);
      const items: Array<{ id: string; name: string; price: number; in_stock: boolean; is_rental: boolean }> =
        (await res.json()).data ?? [];
      for (const item of items) {
        if (item.in_stock && !item.is_rental && found.length < count) {
          found.push({ id: item.id, name: item.name, price: Number(item.price) });
        }
      }
      if (!items.length) break;
    }
    if (found.length < count) throw new Error(`stokta yeterli ürün yok (istenen ${count}, bulunan ${found.length})`);
    return found;
  }

  async createCartWithProduct(productId: string, quantity = 1): Promise<string> {
    const cart = await (await this.http.post('/carts')).json();
    const add = await this.http.post(`/carts/${cart.id}`, { data: { product_id: productId, quantity } });
    if (!add.ok()) throw new Error(`cart add failed: ${add.status()}`);
    return cart.id as string;
  }

  /** Geo-doğrulamadan geçtiği kanıtlanmış NL fatura adresi (sitenin postcode-lookup çıktısı). */
  nlBilling() {
    return {
      billing_street: 'van den Pollaan',
      billing_city: 'Laren',
      billing_state: 'Gelderland',
      billing_country: 'NL',
      billing_postal_code: '1012JS',
    };
  }

  /** Token sahibi kullanıcı için API'den sipariş oluşturur; invoice gövdesini döndürür. */
  async createInvoice(
    token: string,
    opts: { quantity?: number; paymentMethod?: string; productQuery?: string } = {},
  ): Promise<{ id: string; invoice_number: string; total: number }> {
    const product = opts.productQuery
      ? await this.findProduct(opts.productQuery)
      : (await this.findInStockProducts(1))[0];
    const cartId = await this.createCartWithProduct(product.id, opts.quantity ?? 1);
    const res = await this.http.post('/invoices', {
      headers: this.bearer(token),
      data: {
        ...this.nlBilling(),
        payment_method: opts.paymentMethod ?? 'cash-on-delivery',
        payment_details: {},
        cart_id: cartId,
      },
    });
    if (res.status() !== 201) throw new Error(`invoice failed: ${res.status()} ${await res.text()}`);
    return res.json();
  }

  /** Admin token'ıyla API'den ürün yaratır (admin UI testlerine hızlı fixture). */
  async createProduct(name: string, opts: { brandId?: string } = {}): Promise<{ id: string; name: string }> {
    const token = await this.adminToken();
    const [brands, categories, images] = await Promise.all([
      (await this.http.get('/brands')).json(),
      (await this.http.get('/categories')).json(),
      (await this.http.get('/images')).json(),
    ]);
    const res = await this.http.post('/products', {
      headers: this.bearer(token),
      data: {
        name,
        description: 'Created by the Toolshop E2E suite; safe to delete.',
        price: 9.99,
        stock: 10,
        category_id: categories[0].id,
        brand_id: opts.brandId ?? brands[0].id,
        product_image_id: images[0].id,
        is_location_offer: false,
        is_rental: false,
      },
    });
    if (res.status() !== 201) throw new Error(`product create failed: ${res.status()} ${await res.text()}`);
    return res.json();
  }

  async createBrand(name: string, slug: string): Promise<{ id: string; name: string }> {
    const token = await this.adminToken();
    const res = await this.http.post('/brands', { headers: this.bearer(token), data: { name, slug } });
    if (res.status() !== 201) throw new Error(`brand create failed: ${res.status()} ${await res.text()}`);
    return res.json();
  }

  async tryDeleteProduct(id?: string): Promise<void> {
    if (!id) return;
    try {
      const token = await this.adminToken();
      await this.http.delete(`/products/${id}`, { headers: this.bearer(token) });
    } catch {
      /* cleanup asla testi düşürmez */
    }
  }

  async tryDeleteBrand(id?: string): Promise<void> {
    if (!id) return;
    try {
      const token = await this.adminToken();
      await this.http.delete(`/brands/${id}`, { headers: this.bearer(token) });
    } catch {
      /* cleanup asla testi düşürmez */
    }
  }
}
