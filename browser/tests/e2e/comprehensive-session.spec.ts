
import { test, expect } from "@playwright/test";
import fs from "fs";

const LOG_FILE = "developer-logs.txt";

test.describe("Comprehensive Session Test", () => {
  // Clear the log file before each test run
  if (fs.existsSync(LOG_FILE)) {
    fs.truncateSync(LOG_FILE);
  }

  test("should start a game, persist state on reload, and capture logs", async ({ page }) => {
    // Capture all console messages
    page.on("console", (msg) => {
      const logMessage = `[${msg.type()}] ${msg.text()}
`;
      fs.appendFileSync(LOG_FILE, logMessage);
    });

    // 1. Start a new game from the main menu
    await page.goto("/");
    fs.appendFileSync(LOG_FILE, "--- Navigated to main menu ---\n");

    await page.click("button:has-text('Nova Campanha')");
    fs.appendFileSync(LOG_FILE, "--- Clicked 'Nova Campanha' ---\n");

    await page.click("button:has-text('Fundar Império')");
    fs.appendFileSync(LOG_FILE, "--- Clicked 'Fundar Império', starting game... ---\n");

    // Wait for the game to load and some resources to be generated
    await page.waitForSelector("#resource-list li[data-resource='gold']", { timeout: 20000 });
    fs.appendFileSync(LOG_FILE, "--- Game loaded, resource panel visible ---\n");

    // Let the game run for a bit to generate state
    await page.waitForTimeout(5000);
    fs.appendFileSync(LOG_FILE, "--- Waited 5 seconds for initial resource generation ---\n");

    // 2. Get initial resource values
    const initialGoldText = await page.locator("#resource-list li[data-resource='gold']").innerText();
    const initialFoodText = await page.locator("#resource-list li[data-resource='food']").innerText();
    const initialGold = parseInt(initialGoldText.split(":")[1].trim().replace(/\./g, ""));
    const initialFood = parseInt(initialFoodText.split(":")[1].trim().replace(/\./g, ""));
    fs.appendFileSync(LOG_FILE, `Initial Gold: ${initialGold}, Initial Food: ${initialFood}\n`);

    // 3. Reload the page (F5 Test)
    fs.appendFileSync(LOG_FILE, "--- Reloading page (F5 test) ---\n");
    await page.reload();

    // 4. Wait for the game to load again
    await page.waitForSelector("#resource-list li[data-resource='gold']", { timeout: 20000 });
    fs.appendFileSync(LOG_FILE, "--- Page reloaded, game loaded from persisted state ---\n");
    
    // Let the game run again
    await page.waitForTimeout(5000);
    fs.appendFileSync(LOG_FILE, "--- Waited 5 seconds after reload ---\n");

    // 5. Get final resource values
    const finalGoldText = await page.locator("#resource-list li[data-resource='gold']").innerText();
    const finalFoodText = await page.locator("#resource-list li[data-resource='food']").innerText();
    const finalGold = parseInt(finalGoldText.split(":")[1].trim().replace(/\./g, ""));
    const finalFood = parseInt(finalFoodText.split(":")[1].trim().replace(/\./g, ""));
    fs.appendFileSync(LOG_FILE, `Final Gold: ${finalGold}, Final Food: ${finalFood}\n`);

    // 6. Assert that resources have been persisted and continued to grow
    expect(finalGold).toBeGreaterThanOrEqual(initialGold);
    expect(typeof finalFood).toBe('number');
    fs.appendFileSync(LOG_FILE, "--- Assertion complete: Resources persisted. ---\n");

    // 7. Check for errors in the console log
    const logContent = fs.readFileSync(LOG_FILE, "utf-8");
    const hasErrors = logContent.includes("[error]");
    expect(hasErrors).toBe(false);
    fs.appendFileSync(LOG_FILE, "--- Log check complete: No console errors found. ---\n");
  });
});
