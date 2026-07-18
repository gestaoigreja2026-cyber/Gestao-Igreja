import { test, expect } from '@playwright/test';

test.describe('NewLogin supabase diagnostics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should show connection diagnostics status', async ({ page }) => {
    await page.click('button:has-text("Status da Conexão")');
    await expect(page.locator('text=URL do Banco')).toBeVisible();
    await expect(page.locator('text=Chave de API')).toBeVisible();
  });
});
