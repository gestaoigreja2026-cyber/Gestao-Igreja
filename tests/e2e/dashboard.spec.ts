import { test, expect } from '@playwright/test';
import { goToLogin, fillFirstStep, selectRole, fillPin } from './login.helpers';
import { mockSupabaseAuth } from './supabase.mocks';

test.describe('Dashboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAuth(page, { email: 'pastor@igreja.com', role: 'pastor', name: 'Pastor Teste' });
    await fillFirstStep(page, 'Pastor Teste', 'pastor@igreja.com');
    await selectRole(page, 'Pastor');
    await fillPin(page, '123456');
    await page.click('button:has-text("Entrar")');
    await page.waitForURL(/\/dashboard/);
  });

  test('should display dashboard with user greeting', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Olá');
    await expect(page.locator('h1')).toContainText('Pastor');
  });

  test('should display quick action buttons', async ({ page }) => {
    await expect(page.locator('text=Ministérios')).toBeVisible();
    await expect(page.locator('text=Células')).toBeVisible();
    await expect(page.locator('text=Secretaria')).toBeVisible();
    await expect(page.locator('text=Relatórios')).toBeVisible();
  });

  test('should navigate to Ministries page', async ({ page }) => {
    await page.click('button:has-text("Ministérios")');
    await expect(page).toHaveURL(/\/ministerios/);
  });

  test('should navigate to Cells page', async ({ page }) => {
    await page.click('button:has-text("Células")');
    await expect(page).toHaveURL(/\/celulas/);
  });

  test('should navigate to Secretariat page', async ({ page }) => {
    await page.click('button:has-text("Secretaria")');
    await expect(page).toHaveURL(/\/secretaria/);
  });

  test('should navigate to Reports page', async ({ page }) => {
    await page.click('button:has-text("Relatórios")');
    await expect(page).toHaveURL(/\/relatorios/);
  });

  test('should navigate to Events page', async ({ page }) => {
    await page.click('button:has-text("Eventos")');
    await expect(page).toHaveURL(/\/eventos/);
  });

  test('should navigate to Daily Cash page', async ({ page }) => {
    await page.click('button:has-text("Caixa Diário")');
    await expect(page).toHaveURL(/\/caixa-diario/);
  });

  test('should display stats overview', async ({ page }) => {
    await expect(page.locator('[data-testid="stats-overview"]')).toBeVisible();
  });

  test('should display growth chart', async ({ page }) => {
    await expect(page.locator('[data-testid="growth-chart"]')).toBeVisible();
  });

  test('should display upcoming events widget', async ({ page }) => {
    await expect(page.locator('[data-testid="upcoming-events"]')).toBeVisible();
  });

  test('should display recent converts widget', async ({ page }) => {
    await expect(page.locator('[data-testid="recent-converts"]')).toBeVisible();
  });

  test('should display finance summary for pastor', async ({ page }) => {
    await expect(page.locator('[data-testid="finance-summary"]')).toBeVisible();
  });

  test('should display daily verse widget', async ({ page }) => {
    await expect(page.locator('[data-testid="daily-verse"]')).toBeVisible();
  });

  test('should display birthday card widget', async ({ page }) => {
    await expect(page.locator('[data-testid="birthday-card"]')).toBeVisible();
  });

  test('should display customize button', async ({ page }) => {
    await expect(page.locator('button:has-text("Customize")').or(page.locator('text=Personalizar'))).toBeVisible();
  });
});
