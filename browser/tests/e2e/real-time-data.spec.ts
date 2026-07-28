import { test, expect } from '@playwright/test';

test.describe('Save and Load Cycle', () => {
  test('should save the game and then load it successfully', async ({ page }) => {
    // Navigate to the application.
    // The default URL for Vite is http://localhost:5173. Adjust if yours is different.
    await page.goto('http://localhost:5173');

    // --- 1. Start a new campaign from the splash screen ---
    // Wait for the splash screen to be visible
    await expect(page.locator('#splash-screen')).toBeVisible();

    // Click "New Campaign"
    await page.locator('#splash-new-btn').click();

    // The form becomes visible, click "Start Empire"
    await expect(page.locator('#splash-form')).toBeVisible();
    await page.locator('#splash-start-btn').click();

    // Wait for the main application UI to be ready after starting the game
    // We can wait for the main header to be visible.
    await expect(page.locator('.app-header')).toBeVisible({ timeout: 10000 });

    // --- 2. Navigate to Saves Tab and Manual Save ---
    const savesTabButton = page.locator('button.tab-btn[data-tab="saves"]');
    await savesTabButton.click();
    
    const manualSaveButton = page.locator('#manual-save-btn');
    await manualSaveButton.click();

    // --- 3. Assert Save Success ---
    const toastArea = page.locator('#toast-area');
    await expect(toastArea).toContainText('Save manual concluído.', { timeout: 5000 });

    // --- 4. Find the new save and click Load ---
    // The saves are listed in #save-list. We'll find the first one.
    const saveList = page.locator('#save-list');
    const firstSaveSlot = saveList.locator('.save-item').first();
    
    // Ensure the save slot is visible before trying to click load
    await expect(firstSaveSlot).toBeVisible();

    const loadButton = firstSaveSlot.locator('button:text("Carregar")');
    await loadButton.click();

    // --- 5. Assert Load Success ---
    await expect(toastArea).toContainText('Save restaurado com sucesso.', { timeout: 5000 });
    
    console.log('--- Test Passed: Save and Load cycle completed successfully! ---');
  });
});
