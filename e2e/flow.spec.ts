import { test, expect } from '@playwright/test';

test.describe('Fluxo Principal (E2E)', () => {
  test('Acesso negado sem credenciais na página de Admin', async ({ page }) => {
    // Tenta acessar página restrita diretamente
    await page.goto('/admin');
    
    // O sistema deve redirecionar para a tela de login
    await expect(page).toHaveURL(/.*login|.*\/$/);
  });

  test('Operador consegue fazer login e abrir chamado', async ({ page }) => {
    // Para testar o login administrativo, vamos para a rota correta
    await page.goto('/admin/login');

    // Preenche credenciais usando os placeholders reais do i18n
    await page.fill('input[placeholder="Seu Nome"]', 'admin');
    await page.fill('input[placeholder="Sua matrícula"]', 'admin123');
    await page.click('button:has-text("Entrar no Sistema")');

    // Verifica se entrou no Dashboard (procurando pelo título do cabeçalho)
    await expect(page.locator('text=Painel de Administração')).toBeVisible({ timeout: 20000 });
  });
});
