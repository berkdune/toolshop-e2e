import { Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class HomePage extends BasePage {
  readonly productCards: Locator = this.page.locator('a[data-test^="product-"]');
  readonly productNames: Locator = this.page.getByTestId('product-name');
  readonly searchQuery: Locator = this.page.getByTestId('search-query');
  readonly searchSubmit: Locator = this.page.getByTestId('search-submit');
  readonly searchCaption: Locator = this.page.getByTestId('search-caption');
  readonly searchResultCount: Locator = this.page.getByTestId('search-result-count');
  readonly sortSelect: Locator = this.page.getByTestId('sort');
  readonly paginationNext: Locator = this.page.getByTestId('pagination-next');
  readonly paginationPrev: Locator = this.page.getByTestId('pagination-prev');

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async searchFor(term: string): Promise<void> {
    await this.searchQuery.fill(term);
    await this.searchSubmit.click();
    // The app renders this marker when a search completes — a deterministic wait.
    await this.page.getByTestId('search_completed').waitFor();
  }

  /**
   * IDs change on demo resets, so products are always opened via search.
   * An exact-name match is tried first ("Pliers" would substring-match
   * "Combination Pliers"); long names can be truncated on cards, hence the prefix fallback.
   */
  async openProduct(name: string): Promise<void> {
    await this.searchFor(name);
    await this.productNames.first().waitFor({ timeout: 10_000 });
    const exact = new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
    const exactMatch = this.productNames.filter({ hasText: exact });
    if (await exactMatch.count()) {
      await exactMatch.first().click();
      return;
    }
    await this.productNames.filter({ hasText: name.slice(0, 20) }).first().click();
  }
}
