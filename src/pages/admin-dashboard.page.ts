import { Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class AdminDashboardPage extends BasePage {
  readonly navProducts: Locator = this.page.getByTestId('nav-admin-products');
  readonly navUsers: Locator = this.page.getByTestId('nav-admin-users');
  readonly navOrders: Locator = this.page.getByTestId('nav-admin-orders');
  readonly latestOrdersRows: Locator = this.page.locator('table tbody tr');
}
