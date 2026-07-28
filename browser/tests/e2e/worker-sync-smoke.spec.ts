import { test, expect } from '@playwright/test';

test.describe('Sincronização Inicial e Boot do Jogo', () => {
  test('A UI deve aguardar e renderizar o estado do Worker corretamente sem dados vazios', async ({ page }) => {
    // Navega para a raiz da aplicação
    await page.goto('/');
    await page.click("button:has-text('Nova Campanha')");
    await page.click("button:has-text('Fundar Império')");
    await page.waitForSelector('#splash-screen', { state: 'hidden', timeout: 30000 });

    // 1. Verifica se o loop do jogo iniciou
    const statusValue = page.locator('#status-value');
    await expect(statusValue).toContainText(/Executando|Pausado/, { timeout: 10000 });

    // 2. Verifica se a lista de recursos (alimentada pelo Worker) foi populada
    const goldItem = page.locator('li[data-resource="gold"]');
    await expect(goldItem).toBeVisible();
    
    // Garante que o texto de Ouro possui um valor numérico renderizado (evitando NaN ou texto quebrado)
    await expect(goldItem).toHaveText(/Ouro: \d+/);

    const popItem = page.locator('li[data-resource="food"]');
    await expect(popItem).toHaveText(/Comida: \d+/);

    // 3. Testa a interação de estado básico da UI (Pausar/Retomar)
    const pauseButton = page.locator('#toggle-pause-btn');
    const currentStatus = await statusValue.textContent();
    
    await pauseButton.click();
    const nextStatus = currentStatus === 'Pausado' ? 'Executando' : 'Pausado';
    await expect(statusValue).toHaveText(nextStatus);
  });
});