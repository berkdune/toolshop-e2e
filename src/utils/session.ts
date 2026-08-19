import { Page } from '@playwright/test';

// Uygulama JWT'yi localStorage 'auth-token' anahtarında tutuyor (keşifte doğrulandı).
// UI login yerine token enjeksiyonu: hızlı ve paylaşılan demoda login throttle'ından bağımsız.
export async function injectSession(page: Page, token: string): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => localStorage.setItem('auth-token', t), token);
}
