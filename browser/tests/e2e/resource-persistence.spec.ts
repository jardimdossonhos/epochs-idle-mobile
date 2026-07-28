
import { test, expect } from "@playwright/test";

test.describe("Resource Persistence", () => {
  test("should persist resources after a page reload", async ({ page }) => {
    // 1. Start a new game
    await page.goto("/");
    await page.click("button:has-text('Nova Campanha')");
    await page.click("button:has-text('Fundar Império')");

    // Wait for the game to load and some resources to be generated
    await page.waitForSelector("#resource-list li[data-resource='gold']", { timeout: 15000 });
    await page.waitForTimeout(5000);

    // 2. Get initial resource values
    const initialGoldText = await page.locator("#resource-list li[data-resource='gold']").innerText();
    const initialGold = parseInt(initialGoldText.split(":")[1].trim().replace(/\./g, ""));

    // 3. Reload the page
    await page.reload();

    // 4. Wait for the game to load again
    await page.waitForSelector("#resource-list li[data-resource='gold']", { timeout: 15000 });
    await page.waitForTimeout(5000);

    // 5. Get final resource values
    const finalGoldText = await page.locator("#resource-list li[data-resource='gold']").innerText();
    const finalFoodText = await page.locator("#resource-list li[data-resource='food']").innerText();
    const finalGold = parseInt(finalGoldText.split(":")[1].trim().replace(/\./g, ""));
    const finalFood = parseInt(finalFoodText.split(":")[1].trim().replace(/\./g, ""));

    // 6. Assert that resources have been persisted
    expect(finalGold).toBeGreaterThanOrEqual(initialGold);
    expect(typeof finalFood).toBe('number');
  });
});
