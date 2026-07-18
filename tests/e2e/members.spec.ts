import { test, expect } from '@playwright/test';
import { goToLogin, fillFirstStep, selectRole, fillPin } from './login.helpers';
import { mockSupabaseAuth } from './supabase.mocks';

test.describe('Member management', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAuth(page, { email: 'secretario@igreja.com', role: 'secretario', name: 'Secretário Teste' });
    await fillFirstStep(page, 'Secretário Teste', 'secretario@igreja.com');
    await selectRole(page, 'Secretário');
    await fillPin(page, '123456');
    await page.click('button:has-text("Entrar")');
    await page.waitForURL(/\/dashboard/);
  });

  test('should navigate to members page', async ({ page }) => {
    await page.click('button:has-text("Membros")');
    await expect(page).toHaveURL(/\/membros/);
  });

  test('should display members list', async ({ page }) => {
    await page.click('button:has-text("Membros")');
    await expect(page.locator('text=Lista de Membros').or(page.locator('text=Membros'))).toBeVisible();
  });

  test('should display search input', async ({ page }) => {
    await page.click('button:has-text("Membros")');
    await expect(page.locator('input[placeholder*="Buscar"]').or(page.locator('input[placeholder*="Pesquisar"]'))).toBeVisible();
  });

  test('should display add member button', async ({ page }) => {
    await page.click('button:has-text("Membros")');
    await expect(page.locator('button:has-text("Adicionar")').or(page.locator('button:has-text("Novo Membro")'))).toBeVisible();
  });

  test('should open add member dialog', async ({ page }) => {
    await page.click('button:has-text("Membros")');
    await page.click('button:has-text("Adicionar")');
    await expect(page.locator('text=Adicionar Membro').or(page.locator('text=Novo Membro'))).toBeVisible();
  });

  test('should fill member form and submit', async ({ page }) => {
    await page.click('button:has-text("Membros")');
    await page.click('button:has-text("Adicionar")');
    
    await page.fill('input[name="name"]', 'João da Silva');
    await page.fill('input[name="email"]', 'joao@example.com');
    await page.fill('input[name="phone"]', '11999999999');
    
    await page.click('button:has-text("Salvar")');
    
    // Verifica se o formulário foi submetido com sucesso
    await expect(page.locator('text=Membro adicionado').or(page.locator('text=Sucesso'))).toBeVisible({ timeout: 5000 });
  });

  test('should display member details when clicking on a member', async ({ page }) => {
    await page.click('button:has-text("Membros")');
    
    // Clica no primeiro membro da lista
    await page.click('table tbody tr:first-child');
    
    await expect(page.locator('text=Detalhes do Membro').or(page.locator('text=Informações'))).toBeVisible();
  });

  test('should edit member information', async ({ page }) => {
    await page.click('button:has-text("Membros")');
    await page.click('table tbody tr:first-child');
    
    await page.click('button:has-text("Editar")');
    
    await page.fill('input[name="name"]', 'João Silva Editado');
    await page.click('button:has-text("Salvar")');
    
    await expect(page.locator('text=Membro atualizado').or(page.locator('text=Sucesso'))).toBeVisible({ timeout: 5000 });
  });

  test('should delete member with confirmation', async ({ page }) => {
    await page.click('button:has-text("Membros")');
    await page.click('table tbody tr:first-child');
    
    await page.click('button:has-text("Excluir")');
    
    // Confirma a exclusão
    await page.click('button:has-text("Confirmar")');
    
    await expect(page.locator('text=Membro excluído').or(page.locator('text=Sucesso'))).toBeVisible({ timeout: 5000 });
  });

  test('should filter members by status', async ({ page }) => {
    await page.click('button:has-text("Membros")');
    
    await page.click('button:has-text("Filtrar")');
    await page.click('text=Ativo');
    
    await expect(page.locator('table tbody tr')).toBeVisible();
  });

  test('should search members by name', async ({ page }) => {
    await page.click('button:has-text("Membros")');
    
    const searchInput = page.locator('input[placeholder*="Buscar"]').or(page.locator('input[placeholder*="Pesquisar"]'));
    await searchInput.fill('João');
    
    await page.waitForTimeout(500);
    await expect(page.locator('table tbody tr')).toBeVisible();
  });

  test('should display member statistics', async ({ page }) => {
    await page.click('button:has-text("Membros")');
    
    await expect(page.locator('text=Total').or(page.locator('text=Estatísticas'))).toBeVisible();
  });

  test('should upload member photo', async ({ page }) => {
    await page.click('button:has-text("Membros")');
    await page.click('table tbody tr:first-child');
    
    await page.click('button:has-text("Foto")');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-photo.jpg');
    
    await expect(page.locator('text=Foto atualizada').or(page.locator('text=Sucesso'))).toBeVisible({ timeout: 5000 });
  });

  test('should navigate back to dashboard from members page', async ({ page }) => {
    await page.click('button:has-text("Membros")');
    
    await page.click('button:has-text("Voltar")');
    
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
