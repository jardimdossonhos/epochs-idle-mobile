# Review and Adversarial stress-test Report (Reviewer 2)

## 1. Observation
We directly observed and verified the implementation of Requirements R1 and R2 across the mobile codebase:

- **TopHUD Render Restriction** in `mobile/App.tsx`:
  - Line 216:
    ```typescript
    {activeRouteName === 'Map' && <TopHUD />}
    ```
  - Codebase search confirmed that no other UI screen or global layout element imports or renders `<TopHUD />`.
  
- **Idle Mode Automation UI Controls** in `mobile/src/ui/screens/MenuScreen.tsx`:
  - Lines 22-29:
    ```typescript
    const kingdom = gameState?.kingdoms?.[playerKingdomId];
    const auto = kingdom?.administration?.automation;
    const directives = kingdom?.administration?.directives;

    const isMasterActive = !!auto?.globalToggleActive;
    const isEconomyActive = auto?.economy !== AutomationLevel.Manual;
    const isDefenseActive = auto?.defense !== AutomationLevel.Manual;
    const isReligionActive = !!directives?.religious_mission;
    ```
  - Lines 122-176: Toggles render button controls with explicit triggers:
    - Master toggle -> calls `session.toggleGlobalAutomation(!isMasterActive)`
    - Economy toggle -> calls `session.setEconomyAutomation(...)`
    - Defense toggle -> calls `session.setDefenseAutomation(...)`
    - Religion toggle -> calls `session.updateAutomationDirective('religious_mission', !isReligionActive)`

- **Religion Automation Logic** in `mobile/src/core/simulation/systems/automation-system.ts`:
  - Lines 352-462: Loops through all sorted border kingdoms, checks cooldown `religion:send_missionaries`, validates resource sufficiency via `canAfford(...)` (using ECS resource coordinates) and stock values, deducts resources (Gold: 18, Faith: 26, Legitimacy: 2), applies mutual 90,000ms cooldown, runs probability check, and increases external influence on success or reduces stability by 0.25 on failure.

- **GameSession API Toggles** in `mobile/src/application/game-session.ts`:
  - Lines 402-435: `toggleGlobalAutomation(active: boolean)` sets the master toggle, stores previous automation configuration, and defaults sub-automation systems.
  - Lines 752-771: `updateAutomationDirective(key: string, enabled: boolean)` updates `player.administration.directives` and persists the state.

- **Verification Script Runs**:
  - `npx tsc --noEmit` in `mobile/` completed successfully with **0 errors**.
  - `npx tsx test-boot.ts` in `mobile/` completed successfully and outputted `SUCCESS`.
  - `npm run test` in root directory successfully ran **115 tests** across **31 files** (including `tests/automation-system.test.ts`).

---

## 2. Logic Chain
1. **Observation 1 (App.tsx)** shows that `TopHUD` is conditionally wrapped around `activeRouteName === 'Map'`. A global search verified no other screen references `TopHUD`. Therefore, we conclude R1 is successfully implemented.
2. **Observation 2 (MenuScreen.tsx)** shows four interactive toggles linked to `isMasterActive`, `isEconomyActive`, `isDefenseActive`, and `isReligionActive`. Pressing them directly calls the respective GameSession setter methods. Therefore, we conclude the UI requirements for R2 are fully met.
3. **Observation 3 (automation-system.ts & game-session.ts)** shows the backend logic for setting directives and processing automated missionary actions is implemented. It safely calculates mutual borders, checks constraints, prevents negative stocks, and implements cooldowns. The corresponding tests in `tests/automation-system.test.ts` fully cover success, failure, and state setting behaviors. Therefore, we conclude the automation engine logic for R2 is correct and robust.
4. **Observation 4 (execution of tests)** shows type checks, boot diagnostics, and unit tests are green. Therefore, the implementation is type-safe and has no execution regressions.

---

## 3. Caveats
No caveats. All files have been thoroughly read, their logic traced, and their outputs tested locally.

---

## 4. Conclusion
We issue an **APPROVE** verdict. There are no integrity violations, dummy facade bypasses, or missing test coverages. The solution is complete, clean, and highly robust.

---

## 5. Verification Method
To verify this report independently:
1. Run `npx tsc --noEmit` in `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile` to ensure type-safety.
2. Run `npx tsx test-boot.ts` in `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile` to verify successful bootstrapping.
3. Run `npm run test` in `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle` to execute all unit tests.

---

# Quality Review Report

**Verdict**: APPROVE

### Findings
- *No critical or major issues found.*
- **Observation (Minor)**: The automation system updates the ECS coordinates and local stocks simultaneously. In case of discrepancies in state updates, the local stocks are guarded by `Math.max(0, ...)` which prevents integer underflow.

### Verified Claims
- TopHUD restriction to Map screen -> Verified via file inspection and grep search -> **PASS**
- Idle Mode automation toggles in Menu -> Verified via file inspection -> **PASS**
- Religion automation system logic -> Verified via vitest unit tests and code tracing -> **PASS**

---

# Adversarial Review Report

**Overall Risk Assessment**: LOW

### Challenges
- **Assumption Challenged**: Multi-frontier missionary spam could lead to negative resources.
  - *Attack Scenario*: Player has multiple border kingdoms and enables Religion automation while having barely enough resources for one campaign.
  - *Result*: The system executes targets sequentially and checks `canAfford` and stock values after each subtraction, correctly failing subsequent checks if resources run out. No negative resources are produced.
- **Assumption Challenged**: Cooldown actions could block player inputs or raise conflicts.
  - *Result*: Cooldown is shared mutually, locking both sender and receiver from spamming missionary actions for 90 seconds. This is standard and matches the intended game balance.
