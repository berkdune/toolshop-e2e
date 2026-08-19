import { test as base, expect } from '@playwright/test';
import { config } from '../config';
import { ApiClient } from '../api/api-client';
import { buildUser, TestUser } from '../utils/data-factory';
import { HomePage } from '../pages/home.page';
import { ProductPage } from '../pages/product.page';
import { LoginPage } from '../pages/login.page';
import { RegisterPage } from '../pages/register.page';
import { CheckoutPage } from '../pages/checkout.page';
import { AdminDashboardPage } from '../pages/admin-dashboard.page';

interface Fixtures {
  home: HomePage;
  productPage: ProductPage;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  checkout: CheckoutPage;
  admin: AdminDashboardPage;
  api: ApiClient;
  /** Fresh API-provisioned user; best-effort deleted with the admin token afterwards. */
  testUser: TestUser;
  /** An in-stock product for cart/order flows (shared demo stock can run out). */
  stockProduct: { id: string; name: string; price: number };
}

export const test = base.extend<Fixtures>({
  api: async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext({
      baseURL: config.apiURL,
      extraHTTPHeaders: { 'User-Agent': config.browserUA },
    });
    await use(new ApiClient(ctx));
    await ctx.dispose();
  },
  testUser: async ({ api }, use) => {
    const user = buildUser();
    user.id = await api.register(user);
    await use(user);
    await api.tryDeleteUser(user.id);
  },
  stockProduct: async ({ api }, use) => {
    await use((await api.findInStockProducts(1))[0]);
  },
  home: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
  checkout: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  admin: async ({ page }, use) => {
    await use(new AdminDashboardPage(page));
  },
});

export { expect };
