import { test, expect } from '../../src/fixtures/fixtures';

interface CategoryNode {
  id: string;
  name: string;
  sub_categories?: CategoryNode[];
  children?: CategoryNode[];
}

function findCategory(nodes: CategoryNode[], name: string): CategoryNode | undefined {
  for (const node of nodes) {
    if (node.name === name) return node;
    const found = findCategory(node.sub_categories ?? node.children ?? [], name);
    if (found) return found;
  }
  return undefined;
}

test.describe('API Products', () => {
  test(
    'TC-110 | Products - Product listing returns a paginated structure',
    { tag: ['@smoke', '@api'] },
    async ({ api }) => {
      const res = await api.http.get('/products');
      expect(res.status()).toBe(200);

      const body = await res.json();
      expect(body.current_page).toBe(1);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.total).toBeGreaterThan(0);

      const item = body.data[0];
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(Number(item.price)).toBeGreaterThan(0);
    },
  );

  test(
    'TC-111 | Products - Filtering and sorting parameters shape the result',
    { tag: ['@regression', '@api'] },
    async ({ api }) => {
      const tree: CategoryNode[] = await (await api.http.get('/categories/tree')).json();
      const pliers = findCategory(tree, 'Pliers');
      expect(pliers, 'Pliers kategorisi ağaçta bulunamadı').toBeTruthy();

      const res = await api.http.get(`/products?by_category=${pliers!.id}&between=price,1,15&sort=price,asc`);
      expect(res.status()).toBe(200);
      const items: Array<{ id: string; price: number }> = (await res.json()).data;
      expect(items.length).toBeGreaterThan(0);

      const prices = items.map((p) => Number(p.price));
      for (const price of prices) {
        expect(price).toBeGreaterThanOrEqual(1);
        expect(price).toBeLessThanOrEqual(15);
      }
      expect([...prices].sort((a, b) => a - b)).toEqual(prices);

      // Kategori doğrulaması: ilk ürünün detayı Pliers kategorisini içermeli.
      const detail = await (await api.http.get(`/products/${items[0].id}`)).json();
      expect(JSON.stringify(detail)).toContain('Pliers');
    },
  );

  test(
    'TC-112 | Products - Search endpoint returns matching products',
    { tag: ['@regression', '@api'] },
    async ({ api }) => {
      const res = await api.http.get('/products/search?q=pliers');
      expect(res.status()).toBe(200);
      const items: Array<{ name: string }> = (await res.json()).data;
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) expect(item.name.toLowerCase()).toContain('pliers');
    },
  );

  test(
    'TC-113 | Products - Product by id and its related products',
    { tag: ['@regression', '@api'] },
    async ({ api }) => {
      const product = await api.findProduct('pliers');

      const detailRes = await api.http.get(`/products/${product.id}`);
      expect(detailRes.status()).toBe(200);
      const detail = await detailRes.json();
      expect(detail.name).toBe(product.name);
      expect(detail.category ?? detail.category_id).toBeTruthy();
      expect(detail.brand ?? detail.brand_id).toBeTruthy();

      const relatedRes = await api.http.get(`/products/${product.id}/related`);
      expect(relatedRes.status()).toBe(200);
      const related: Array<{ id: string }> = await relatedRes.json();
      expect(related.length).toBeGreaterThan(0);
      for (const r of related) expect(r.id).not.toBe(product.id);
    },
  );

  test(
    'TC-114 | Products - Unknown product id returns 404',
    { tag: ['@regression', '@api'] },
    async ({ api }) => {
      const res = await api.http.get('/products/nonexistent-id-123456');
      expect(res.status()).toBe(404);
      const body = await res.json();
      expect(body.message).toBeTruthy();
    },
  );

  test(
    'TC-115 | Categories - Category tree matches the storefront structure',
    { tag: ['@regression', '@api'] },
    async ({ api }) => {
      const res = await api.http.get('/categories/tree');
      expect(res.status()).toBe(200);
      const tree: CategoryNode[] = await res.json();
      expect(Array.isArray(tree)).toBe(true);
      expect(tree.length).toBeGreaterThan(0);

      const handTools = findCategory(tree, 'Hand Tools');
      expect(handTools, 'Hand Tools kök kategorisi bulunamadı').toBeTruthy();
      const children = handTools!.sub_categories ?? handTools!.children ?? [];
      expect(children.map((c) => c.name)).toContain('Pliers');
    },
  );
});
