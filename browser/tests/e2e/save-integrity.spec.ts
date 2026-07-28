
import { test, expect, Page } from "@playwright/test";
import type { GameState, KingdomState } from "../../src/core/models/game-state";

// Helper function to get the full state from the debug session
async function getGameState(page: Page): Promise<GameState> {
  const state = await page.evaluate(() => {
    // This is a bit of a hack to get a clean, serializable object
    return JSON.parse(JSON.stringify((window as any).__DEBUG_SESSION.getState()));
  });
  return state as GameState;
}

// Helper function to find the player's kingdom
function getPlayerKingdom(state: GameState): KingdomState | undefined {
  return Object.values(state.kingdoms).find(k => k.isPlayer);
}

// Helper function to create a "fingerprint" of the state we want to verify
function createKingdomFingerprint(kingdom: KingdomState) {
  if (!kingdom) {
    return null;
  }
  return {
    name: kingdom.name,
    adjective: kingdom.adjective,
    capitalRegionId: kingdom.capitalRegionId,
    stock: kingdom.economy.stock,
    taxPolicy: kingdom.economy.taxPolicy,
    budgetPriority: kingdom.economy.budgetPriority,
    unlockedTechs: [...kingdom.technology.unlocked].sort(),
    activeResearchId: kingdom.technology.activeResearchId,
    researchFocus: kingdom.technology.researchFocus,
    stateFaith: kingdom.religion.stateFaith,
    posture: kingdom.military.posture,
    legitimacy: kingdom.legitimacy,
    stability: kingdom.stability,
  };
}

test.describe("Save/Load Data Integrity", () => {
  test("should persist and restore the full game state accurately", async ({ page }) => {
    // 1. Start a new game and let it run
    await page.goto("/");
    await page.click("button:has-text('Nova Campanha')");
    await page.click("button:has-text('Fundar Império')");
    await page.waitForFunction(() => (window as any).__DEBUG_SESSION, { timeout: 15000 });
    await page.waitForTimeout(7000); // Wait for the state to evolve

    // 2. Capture the pre-save game state fingerprint
    const preSaveState = await getGameState(page);
    const playerKingdomPreSave = getPlayerKingdom(preSaveState);
    const preSaveFingerprint = createKingdomFingerprint(playerKingdomPreSave!);
    expect(preSaveFingerprint).not.toBeNull();

    // 3. Perform a manual save
    await page.click("#open-saves-btn");
    await page.click("#manual-save-btn");
    await expect(page.locator("#toast-area")).toContainText("Save manual concluído.", { timeout: 5000 });

    // 4. Load the game from the created save slot
    const firstSaveSlot = page.locator("#save-list .save-item").first();
    await expect(firstSaveSlot).toBeVisible();
    await firstSaveSlot.locator('button:text("Carregar")').click();
    await expect(page.locator("#toast-area")).toContainText("Save restaurado com sucesso.", { timeout: 5000 });
    
    // 5. Capture the post-load game state fingerprint
    // Wait a moment for the state to be fully restored and propagated
    await page.waitForTimeout(500); 
    const postLoadState = await getGameState(page);
    const playerKingdomPostLoad = getPlayerKingdom(postLoadState);
    const postLoadFingerprint = createKingdomFingerprint(playerKingdomPostLoad!);
    expect(postLoadFingerprint).not.toBeNull();

    // 6. Compare the fingerprints
    // We don't compare the whole state because tick and timestamps will change.
    // The fingerprint ensures the important, stable parts are identical.
    expect(postLoadFingerprint).toEqual(preSaveFingerprint);
  });
});
