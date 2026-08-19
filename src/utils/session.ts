import { Page } from '@playwright/test';

// The app keeps its JWT in localStorage under 'auth-token'. Injecting it
// avoids repeated UI logins (and the demo's login throttling).
export async function injectSession(page: Page, token: string): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => localStorage.setItem('auth-token', t), token);
}
