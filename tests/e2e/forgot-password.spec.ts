import { test, expect } from '@playwright/test';
import { mockSupabasePasswordReset } from './supabase.mocks';

test.describe('NewLogin forgot password', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should send password reset link for valid email', async ({ page }) => {
    await mockSupabasePasswordReset(page, 'joao@igreja.com');
    await page.click('button:has-text("Esqueci minha senha")');
    await page.fill('input[placeholder="seu@email.com"]', 'joao@igreja.com');
    await page.click('button:has-text("Enviar Link")');

    const toastTitle = page.locator('div.text-sm.font-semibold:has-text("E-mail enviado")').first();
    await expect(toastTitle).toBeVisible({ timeout: 10000 });
  });

  test('should show error for invalid reset email', async ({ page }) => {
    await page.click('button:has-text("Esqueci minha senha")');
    const emailInput = page.locator('input[placeholder="seu@email.com"]');
    await emailInput.fill('joao@');
    await page.click('button:has-text("Enviar Link")');

    const validationMessage = await emailInput.evaluate((input: HTMLInputElement) => input.validationMessage);
    expect(validationMessage.length).toBeGreaterThan(0);
  });
});
