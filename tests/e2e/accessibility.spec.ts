import { test, expect } from '@playwright/test';
import { goToLogin } from './login.helpers';

test.describe('NewLogin accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await goToLogin(page);
  });

  test('should navigate through the form using keyboard', async ({ page }) => {
    await page.focus('input[placeholder="Seu Nome"]');
    await expect(page.locator('input[placeholder="Seu Nome"]')).toBeFocused();

    await page.keyboard.type('João Silva', { delay: 20, timeout: 60000 });
    await page.keyboard.press('Tab');
    await expect(page.locator('input[placeholder="E-mail"]')).toBeFocused();

    await page.keyboard.type('joao@igreja.com', { delay: 20, timeout: 60000 });
    await page.keyboard.press('Tab');
    await expect(page.locator('button:has-text("Próximo")')).toBeFocused();
  });

  test('should keep focus order in step 2 and allow role selection by keyboard', async ({ page }) => {
    await page.fill('input[placeholder="Seu Nome"]', 'João Silva');
    await page.fill('input[placeholder="E-mail"]', 'joao@igreja.com');
    await page.click('button:has-text("Próximo")');

    await expect(page.locator('button:has-text("Pastor")')).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(page.locator('button:has-text("Pastor")')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('button:has-text("Secretário")')).toBeFocused();
  });
});
