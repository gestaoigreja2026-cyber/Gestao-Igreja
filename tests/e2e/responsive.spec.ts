import { test, expect, devices } from '@playwright/test';
import { goToLogin } from './login.helpers';
import { mockSupabaseAuth } from './supabase.mocks';

const mobile = devices['Pixel 5'];

test.describe('NewLogin responsive layout', () => {
  test('should render login flow on mobile viewport', async ({ browser }) => {
    const context = await browser.newContext({
      ...mobile,
      viewport: mobile.viewport,
      userAgent: mobile.userAgent,
    });
    const page = await context.newPage();

    await mockSupabaseAuth(page);
    await page.goto('/login');

    await expect(page.locator('text=Seja bem Vindo')).toBeVisible();
    await expect(page.locator('button:has-text("Próximo")')).toBeVisible();
    await expect(page.locator('button:has-text("Esqueci minha senha")')).toBeVisible();

    await page.close();
    await context.close();
  });
});
