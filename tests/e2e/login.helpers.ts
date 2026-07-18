import { Page } from '@playwright/test';

export async function goToLogin(page: Page) {
  await page.goto('/login', {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  await page.waitForSelector('input[placeholder="Seu Nome"]', {
    state: 'visible',
    timeout: 60_000,
  });
}

export async function fillFirstStep(page: Page, name: string, email: string) {
  await page.fill('input[placeholder="Seu Nome"]', name);
  await page.fill('input[placeholder="E-mail"]', email);
  await page.click('button:has-text("Próximo")');
}

export async function selectRole(page: Page, roleLabel: string) {
  await page.click(`button:has-text("${roleLabel}")`);
}

export async function fillPin(page: Page, pin: string) {
  const digits = pin.split('');
  await page.locator('input[type="tel"]').first().waitFor({ state: 'visible', timeout: 60_000 });
  for (let index = 0; index < digits.length; index += 1) {
    await page.locator('input[type="tel"]').nth(index).fill(digits[index]);
  }
}

export async function expectRoleSelected(page: Page, roleLabel: string) {
  await page.locator(`button:has-text("${roleLabel}")`).waitFor({ state: 'visible' });
}
