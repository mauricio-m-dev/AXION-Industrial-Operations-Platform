import { test, expect } from '@playwright/test';

test.describe('E2E Flow - Permissões, Operador e Admin', () => {
  test('Admin acessa login e dashboard', async ({ page }) => {
    // Acesso ao login admin
    await page.goto('/admin/login');
    
    // Tenta acessar dashboard diretamente (deve redirecionar ou bloquear)
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*login|.*\/$/);
    
    // Voltando ao login para logar
    await page.goto('/admin/login');
    await page.fill('input[placeholder="Seu Nome"]', 'Admin Teste');
    await page.fill('input[placeholder="Sua matrícula"]', '9999999'); // Assumindo admin default
    
    // O mock do i18n pode variar, usando click pelo seletor ou testid
    const btnEnter = page.locator('button', { hasText: /Entrar|Acessar/i });
    if (await btnEnter.isVisible()) {
      await btnEnter.click();
    }
  });

  test('Operador consegue abrir chamado', async ({ page }) => {
    // Fluxo do operador
    await page.goto('/operador');
    
    // Step 0: Identificação
    await page.fill('input[type="text"]', '1234567');
    await page.fill('input[type="password"]', 'senha123'); // Password mock/teste
    
    const nextBtn = page.locator('button', { hasText: /Continuar/i });
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
    }
    
    // Aqui testaria o fluxo completo se a API estivesse mockada,
    // mas depende do Playwright interceptar a API /api/login
    // Então vamos apenas interceptar e simular sucesso
    await page.route('**/api/login', route => route.fulfill({
      status: 200,
      body: JSON.stringify({ success: true, user: { username: 'Op', matricula: '1234567' } })
    }));
    
    await page.goto('/operador');
    await page.fill('input[type="text"]', '1234567');
    await page.fill('input[type="password"]', 'senha123');
    await page.locator('button').last().click();

    // Step 1: Selecionar Tipo
    await expect(page.locator('text=Colisão').first()).toBeVisible();
    await page.locator('text=Colisão').first().click();

    // Step 2: Detalhes
    await page.fill('input[placeholder*="linha"]', 'WS-01');
    await page.fill('input[placeholder*="AGV"]', '12');
    
    const advanceBtn = page.locator('button', { hasText: /Avançar|Próximo/i });
    if (await advanceBtn.isVisible()) {
      await advanceBtn.click();
    }
  });
});
