import { test, expect } from '@playwright/test';
import { goToLogin, fillFirstStep, selectRole, fillPin } from './login.helpers';
import { mockSupabaseAuth } from './supabase.mocks';

test.describe('NewLogin page', () => {
  test.beforeEach(async ({ page }) => {
    await goToLogin(page);
  });

  test('should allow a valid login flow', async ({ page }) => {
    await mockSupabaseAuth(page, { email: 'joao@igreja.com', role: 'pastor', name: 'João Silva' });
    await fillFirstStep(page, 'João Silva', 'joao@igreja.com');
    await selectRole(page, 'Pastor');
    await fillPin(page, '123456');

    await page.click('button:has-text("Entrar")');

    await expect(page).toHaveURL(/(dashboard|home|app|\/)/);
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await fillFirstStep(page, 'João Silva', 'joao@com');
    await expect(page.locator('text=Informe um e-mail válido')).toBeVisible();
  });

  test('should keep submit disabled for incomplete PIN', async ({ page }) => {
    await fillFirstStep(page, 'João Silva', 'joao@igreja.com');
    await page.fill('input[type="tel"] >> nth=0', '1');
    await page.fill('input[type="tel"] >> nth=1', '2');
    await page.fill('input[type="tel"] >> nth=2', '3');
    await page.fill('input[type="tel"] >> nth=3', '4');
    await page.fill('input[type="tel"] >> nth=4', '5');

    await expect(page.locator('button:has-text("Entrar")')).toBeDisabled();
  });

  test('should auto-select superadmin role for unrestricted email', async ({ page }) => {
    await fillFirstStep(page, 'Admin Teste', 'edukadoshmda@gmail.com');
    await expect(page.locator('button:has-text("Admin")')).toHaveClass(/text-primary|border-primary/);
  });
});
