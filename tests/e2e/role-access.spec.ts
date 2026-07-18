import { test, expect } from '@playwright/test';
import { goToLogin, fillFirstStep, selectRole, fillPin } from './login.helpers';
import { mockSupabaseAuth } from './supabase.mocks';

test.describe('Role-based access control', () => {
  test.describe('Pastor role', () => {
    test('should have access to all features', async ({ page }) => {
      await mockSupabaseAuth(page, { email: 'pastor@igreja.com', role: 'pastor', name: 'Pastor Teste' });
      await fillFirstStep(page, 'Pastor Teste', 'pastor@igreja.com');
      await selectRole(page, 'Pastor');
      await fillPin(page, '123456');
      await page.click('button:has-text("Entrar")');
      await page.waitForURL(/\/dashboard/);

      // Verifica acesso a todas as funcionalidades
      await expect(page.locator('button:has-text("Ministérios")')).toBeVisible();
      await expect(page.locator('button:has-text("Células")')).toBeVisible();
      await expect(page.locator('button:has-text("Secretaria")')).toBeVisible();
      await expect(page.locator('button:has-text("Relatórios")')).toBeVisible();
      await expect(page.locator('button:has-text("Financeiro")')).toBeVisible();
      await expect(page.locator('button:has-text("Membros")')).toBeVisible();
    });

    test('should be able to access financial reports', async ({ page }) => {
      await mockSupabaseAuth(page, { email: 'pastor@igreja.com', role: 'pastor', name: 'Pastor Teste' });
      await fillFirstStep(page, 'Pastor Teste', 'pastor@igreja.com');
      await selectRole(page, 'Pastor');
      await fillPin(page, '123456');
      await page.click('button:has-text("Entrar")');
      await page.waitForURL(/\/dashboard/);

      await page.click('button:has-text("Financeiro")');
      await expect(page).toHaveURL(/\/financeiro/);
    });
  });

  test.describe('Secretário role', () => {
    test('should have access to secretariat and members', async ({ page }) => {
      await mockSupabaseAuth(page, { email: 'secretario@igreja.com', role: 'secretario', name: 'Secretário Teste' });
      await fillFirstStep(page, 'Secretário Teste', 'secretario@igreja.com');
      await selectRole(page, 'Secretário');
      await fillPin(page, '123456');
      await page.click('button:has-text("Entrar")');
      await page.waitForURL(/\/dashboard/);

      await expect(page.locator('button:has-text("Secretaria")')).toBeVisible();
      await expect(page.locator('button:has-text("Membros")')).toBeVisible();
    });

    test('should not have access to financial reports', async ({ page }) => {
      await mockSupabaseAuth(page, { email: 'secretario@igreja.com', role: 'secretario', name: 'Secretário Teste' });
      await fillFirstStep(page, 'Secretário Teste', 'secretario@igreja.com');
      await selectRole(page, 'Secretário');
      await fillPin(page, '123456');
      await page.click('button:has-text("Entrar")');
      await page.waitForURL(/\/dashboard/);

      await expect(page.locator('button:has-text("Financeiro")')).not.toBeVisible();
    });
  });

  test.describe('Tesoureiro role', () => {
    test('should have access to financial features', async ({ page }) => {
      await mockSupabaseAuth(page, { email: 'tesoureiro@igreja.com', role: 'tesoureiro', name: 'Tesoureiro Teste' });
      await fillFirstStep(page, 'Tesoureiro Teste', 'tesoureiro@igreja.com');
      await selectRole(page, 'Tesoureiro');
      await fillPin(page, '123456');
      await page.click('button:has-text("Entrar")');
      await page.waitForURL(/\/dashboard/);

      await expect(page.locator('button:has-text("Financeiro")')).toBeVisible();
      await expect(page.locator('button:has-text("Caixa Diário")')).toBeVisible();
    });

    test('should be able to access daily cash', async ({ page }) => {
      await mockSupabaseAuth(page, { email: 'tesoureiro@igreja.com', role: 'tesoureiro', name: 'Tesoureiro Teste' });
      await fillFirstStep(page, 'Tesoureiro Teste', 'tesoureiro@igreja.com');
      await selectRole(page, 'Tesoureiro');
      await fillPin(page, '123456');
      await page.click('button:has-text("Entrar")');
      await page.waitForURL(/\/dashboard/);

      await page.click('button:has-text("Caixa Diário")');
      await expect(page).toHaveURL(/\/caixa-diario/);
    });
  });

  test.describe('Membro role', () => {
    test('should have limited access', async ({ page }) => {
      await mockSupabaseAuth(page, { email: 'membro@igreja.com', role: 'membro', name: 'Membro Teste' });
      await fillFirstStep(page, 'Membro Teste', 'membro@igreja.com');
      await selectRole(page, 'Membro');
      await fillPin(page, '123456');
      await page.click('button:has-text("Entrar")');
      await page.waitForURL(/\/dashboard/);

      // Verifica acesso limitado
      await expect(page.locator('button:has-text("Ministérios")')).not.toBeVisible();
      await expect(page.locator('button:has-text("Financeiro")')).not.toBeVisible();
      await expect(page.locator('button:has-text("Secretaria")')).not.toBeVisible();
    });

    test('should be able to view profile', async ({ page }) => {
      await mockSupabaseAuth(page, { email: 'membro@igreja.com', role: 'membro', name: 'Membro Teste' });
      await fillFirstStep(page, 'Membro Teste', 'membro@igreja.com');
      await selectRole(page, 'Membro');
      await fillPin(page, '123456');
      await page.click('button:has-text("Entrar")');
      await page.waitForURL(/\/dashboard/);

      await page.click('button:has-text("Perfil")');
      await expect(page).toHaveURL(/\/perfil/);
    });
  });

  test.describe('Lider Célula role', () => {
    test('should have access to cells features', async ({ page }) => {
      await mockSupabaseAuth(page, { email: 'lider@igreja.com', role: 'lider_celula', name: 'Lider Célula Teste' });
      await fillFirstStep(page, 'Lider Célula Teste', 'lider@igreja.com');
      await selectRole(page, 'Líder de Célula');
      await fillPin(page, '123456');
      await page.click('button:has-text("Entrar")');
      await page.waitForURL(/\/dashboard/);

      await expect(page.locator('button:has-text("Células")')).toBeVisible();
    });

    test('should be able to manage their cell', async ({ page }) => {
      await mockSupabaseAuth(page, { email: 'lider@igreja.com', role: 'lider_celula', name: 'Lider Célula Teste' });
      await fillFirstStep(page, 'Lider Célula Teste', 'lider@igreja.com');
      await selectRole(page, 'Líder de Célula');
      await fillPin(page, '123456');
      await page.click('button:has-text("Entrar")');
      await page.waitForURL(/\/dashboard/);

      await page.click('button:has-text("Células")');
      await expect(page).toHaveURL(/\/celulas/);
    });
  });

  test.describe('Admin role', () => {
    test('should have full administrative access', async ({ page }) => {
      await mockSupabaseAuth(page, { email: 'admin@igreja.com', role: 'admin', name: 'Admin Teste' });
      await fillFirstStep(page, 'Admin Teste', 'admin@igreja.com');
      await selectRole(page, 'Admin');
      await fillPin(page, '123456');
      await page.click('button:has-text("Entrar")');
      await page.waitForURL(/\/dashboard/);

      // Verifica acesso administrativo completo
      await expect(page.locator('button:has-text("Administração")').or(page.locator('button:has-text("Configurações")'))).toBeVisible();
    });

    test('should be able to access settings', async ({ page }) => {
      await mockSupabaseAuth(page, { email: 'admin@igreja.com', role: 'admin', name: 'Admin Teste' });
      await fillFirstStep(page, 'Admin Teste', 'admin@igreja.com');
      await selectRole(page, 'Admin');
      await fillPin(page, '123456');
      await page.click('button:has-text("Entrar")');
      await page.waitForURL(/\/dashboard/);

      await page.click('button:has-text("Configurações")');
      await expect(page).toHaveURL(/\/configuracoes/);
    });
  });

  test.describe('Superadmin role', () => {
    test('should have super admin access', async ({ page }) => {
      await mockSupabaseAuth(page, { email: 'superadmin@igreja.com', role: 'superadmin', name: 'Superadmin Teste' });
      await fillFirstStep(page, 'Superadmin Teste', 'superadmin@igreja.com');
      await selectRole(page, 'Superadmin');
      await fillPin(page, '123456');
      await page.click('button:has-text("Entrar")');
      await page.waitForURL(/\/dashboard/);

      // Verifica acesso super admin
      await expect(page.locator('button:has-text("Administração")').or(page.locator('button:has-text("Configurações")'))).toBeVisible();
    });
  });

  test.describe('Unauthorized access prevention', () => {
    test('should redirect unauthorized user from protected route', async ({ page }) => {
      await mockSupabaseAuth(page, { email: 'membro@igreja.com', role: 'membro', name: 'Membro Teste' });
      await fillFirstStep(page, 'Membro Teste', 'membro@igreja.com');
      await selectRole(page, 'Membro');
      await fillPin(page, '123456');
      await page.click('button:has-text("Entrar")');
      await page.waitForURL(/\/dashboard/);

      // Tenta acessar rota protegida
      await page.goto('/financeiro');
      
      // Deve ser redirecionado para dashboard ou mostrar erro
      await expect(page).toHaveURL(/\/dashboard|\/login/);
    });
  });
});
