import { test, expect, devices } from '@playwright/test';
import { goToLogin, fillFirstStep, selectRole, fillPin } from './login.helpers';
import { mockSupabaseAuth } from './supabase.mocks';

const mobile = devices['Pixel 5'];
const tablet = devices['iPad'];
const desktop = devices['Desktop Chrome'];

test.describe('Responsive design - Main pages', () => {
  test.describe('Login page', () => {
    test('should render correctly on mobile', async ({ browser }) => {
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

    test('should render correctly on tablet', async ({ browser }) => {
      const context = await browser.newContext({
        ...tablet,
        viewport: tablet.viewport,
        userAgent: tablet.userAgent,
      });
      const page = await context.newPage();

      await mockSupabaseAuth(page);
      await page.goto('/login');

      await expect(page.locator('text=Seja bem Vindo')).toBeVisible();
      await expect(page.locator('button:has-text("Próximo")')).toBeVisible();

      await page.close();
      await context.close();
    });

    test('should render correctly on desktop', async ({ browser }) => {
      const context = await browser.newContext({
        ...desktop,
        viewport: desktop.viewport,
        userAgent: desktop.userAgent,
      });
      const page = await context.newPage();

      await mockSupabaseAuth(page);
      await page.goto('/login');

      await expect(page.locator('text=Seja bem Vindo')).toBeVisible();
      await expect(page.locator('button:has-text("Próximo")')).toBeVisible();

      await page.close();
      await context.close();
    });
  });

  test.describe('Dashboard page', () => {
    test.beforeEach(async ({ page }) => {
      await mockSupabaseAuth(page, { email: 'pastor@igreja.com', role: 'pastor', name: 'Pastor Teste' });
      await fillFirstStep(page, 'Pastor Teste', 'pastor@igreja.com');
      await selectRole(page, 'Pastor');
      await fillPin(page, '123456');
      await page.click('button:has-text("Entrar")');
      await page.waitForURL(/\/dashboard/);
    });

    test('should render correctly on mobile', async ({ browser }) => {
      const context = await browser.newContext({
        ...mobile,
        viewport: mobile.viewport,
        userAgent: mobile.userAgent,
      });
      const page = await context.newPage();

      await mockSupabaseAuth(page, { email: 'pastor@igreja.com', role: 'pastor', name: 'Pastor Teste' });
      await fillFirstStep(page, 'Pastor Teste', 'pastor@igreja.com');
      await selectRole(page, 'Pastor');
      await fillPin(page, '123456');
      await page.click('button:has-text("Entrar")');
      await page.waitForURL(/\/dashboard/);

      await expect(page.locator('h1')).toContainText('Olá');
      await expect(page.locator('[data-testid="stats-overview"]')).toBeVisible();

      await page.close();
      await context.close();
    });

    test('should render correctly on tablet', async ({ browser }) => {
      const context = await browser.newContext({
        ...tablet,
        viewport: tablet.viewport,
        userAgent: tablet.userAgent,
      });
      const page = await context.newPage();

      await mockSupabaseAuth(page, { email: 'pastor@igreja.com', role: 'pastor', name: 'Pastor Teste' });
      await fillFirstStep(page, 'Pastor Teste', 'pastor@igreja.com');
      await selectRole(page, 'Pastor');
      await fillPin(page, '123456');
      await page.click('button:has-text("Entrar")');
      await page.waitForURL(/\/dashboard/);

      await expect(page.locator('h1')).toContainText('Olá');
      await expect(page.locator('[data-testid="stats-overview"]')).toBeVisible();
      await expect(page.locator('[data-testid="growth-chart"]')).toBeVisible();

      await page.close();
      await context.close();
    });

    test('should render correctly on desktop', async ({ browser }) => {
      const context = await browser.newContext({
        ...desktop,
        viewport: desktop.viewport,
        userAgent: desktop.userAgent,
      });
      const page = await context.newPage();

      await mockSupabaseAuth(page, { email: 'pastor@igreja.com', role: 'pastor', name: 'Pastor Teste' });
      await fillFirstStep(page, 'Pastor Teste', 'pastor@igreja.com');
      await selectRole(page, 'Pastor');
      await fillPin(page, '123456');
      await page.click('button:has-text("Entrar")');
      await page.waitForURL(/\/dashboard/);

      await expect(page.locator('h1')).toContainText('Olá');
      await expect(page.locator('[data-testid="stats-overview"]')).toBeVisible();
      await expect(page.locator('[data-testid="growth-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="upcoming-events"]')).toBeVisible();
      await expect(page.locator('[data-testid="recent-converts"]')).toBeVisible();
      await expect(page.locator('[data-testid="finance-summary"]')).toBeVisible();

      await page.close();
      await context.close();
    });
  });

  test.describe('Members page', () => {
    test('should render correctly on mobile', async ({ browser }) => {
      const context = await browser.newContext({
        ...mobile,
        viewport: mobile.viewport,
        userAgent: mobile.userAgent,
      });
      const page = await context.newPage();

      await mockSupabaseAuth(page, { email: 'secretario@igreja.com', role: 'secretario', name: 'Secretário Teste' });
      await fillFirstStep(page, 'Secretário Teste', 'secretario@igreja.com');
      await selectRole(page, 'Secretário');
      await fillPin(page, '123456');
      await page.click('button:has-text("Entrar")');
      await page.waitForURL(/\/dashboard/);

      await page.click('button:has-text("Membros")');
      await expect(page).toHaveURL(/\/membros/);

      await expect(page.locator('text=Lista de Membros').or(page.locator('text=Membros'))).toBeVisible();
      await expect(page.locator('button:has-text("Adicionar")').or(page.locator('button:has-text("Novo Membro")'))).toBeVisible();

      await page.close();
      await context.close();
    });

    test('should render correctly on desktop', async ({ browser }) => {
      const context = await browser.newContext({
        ...desktop,
        viewport: desktop.viewport,
        userAgent: desktop.userAgent,
      });
      const page = await context.newPage();

      await mockSupabaseAuth(page, { email: 'secretario@igreja.com', role: 'secretario', name: 'Secretário Teste' });
      await fillFirstStep(page, 'Secretário Teste', 'secretario@igreja.com');
      await selectRole(page, 'Secretário');
      await fillPin(page, '123456');
      await page.click('button:has-text("Entrar")');
      await page.waitForURL(/\/dashboard/);

      await page.click('button:has-text("Membros")');
      await expect(page).toHaveURL(/\/membros/);

      await expect(page.locator('text=Lista de Membros').or(page.locator('text=Membros'))).toBeVisible();
      await expect(page.locator('table')).toBeVisible();

      await page.close();
      await context.close();
    });
  });

  test.describe('Orientation changes', () => {
    test('should handle mobile orientation change', async ({ browser }) => {
      const context = await browser.newContext({
        ...mobile,
        viewport: mobile.viewport,
        userAgent: mobile.userAgent,
      });
      const page = await context.newPage();

      await mockSupabaseAuth(page);
      await page.goto('/login');

      await page.setViewportSize({ width: 812, height: 375 }); // Landscape
      await expect(page.locator('text=Seja bem Vindo')).toBeVisible();

      await page.setViewportSize({ width: 375, height: 812 }); // Portrait
      await expect(page.locator('text=Seja bem Vindo')).toBeVisible();

      await page.close();
      await context.close();
    });
  });
});
