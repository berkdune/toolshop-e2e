import { Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { money } from '../utils/money';

export class ProductPage extends BasePage {
  readonly name: Locator = this.page.getByTestId('product-name');
  readonly price: Locator = this.page.getByTestId('unit-price');
  readonly description: Locator = this.page.getByTestId('product-description');
  readonly co2Badge: Locator = this.page.getByTestId('co2-rating-badge');
  readonly quantityInput: Locator = this.page.getByTestId('quantity');
  readonly increaseQuantity: Locator = this.page.getByTestId('increase-quantity');
  readonly decreaseQuantity: Locator = this.page.getByTestId('decrease-quantity');
  readonly addToCartBtn: Locator = this.page.getByTestId('add-to-cart');
  readonly addToFavoritesBtn: Locator = this.page.getByTestId('add-to-favorites');
  readonly specsTable: Locator = this.page.getByTestId('product-specs');
  readonly specRows: Locator = this.page.getByTestId('spec-row');

  async unitPrice(): Promise<number> {
    return money(await this.price.textContent());
  }

  async addToCart(): Promise<void> {
    await this.addToCartBtn.click();
    // The cart write is async; navigating before the badge shows races an empty cart.
    await this.cartBadge.waitFor();
  }
}
