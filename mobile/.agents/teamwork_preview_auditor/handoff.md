## Forensic Audit Report

**Work Product**: mobile source code, UI screens, and tests for the Epochs Idle mobile app.
**Profile**: General Project (Development Mode)
**Verdict**: CLEAN

### Phase Results
- **Check 1: TopHUD Conditional Visibility**: PASS — Tested and verified that `TopHUD` is only rendered when `activeRouteName === 'Map'`. No facade or mock overrides are present.
- **Check 2: Idle Mode Automation Controls**: PASS — Verified that controls in `MenuScreen.tsx` (Master, Economy, Religion, Defense) directly reflect the true `GameState` administration variables and correctly invoke their corresponding `GameSession` handlers.
- **Check 3: Religion Automation & GameSession Methods**: PASS — Verified that `automation-system.ts` and `game-session.ts` authentically execute missionary campaigns, accurately deducting 18 Gold, 26 Faith, and 2 Legitimacy from both the ECS state and kingdom stocks, while correctly processing action cooldowns (90,000ms/ticks) and stability penalties (-0.25 on failure).
- **Check 4: Test Suite Authenticity**: PASS — Verified that the project unit and boot tests are authentic, containing actual assertions (e.g. resource deductions) rather than hardcoded/dummy passes.

---

## Handoff Report

### 1. Observation
- **TopHUD Conditional Rendering**:
  - Location: `mobile/App.tsx:216`
  - Expression: `{activeRouteName === 'Map' && <TopHUD />}`
  - The `activeRouteName` state is populated dynamically in `App.tsx:162-169` using `@react-navigation/native`'s `useNavigationState` hook, traversing nested route paths to determine the active navigator screen name.
  - The `'Map'` screen corresponds to `MainTabs` tab route `Map` (component `MapScreen`) defined in `App.tsx:81-90`.
- **MenuScreen Automation Controls**:
  - Location: `mobile/src/ui/screens/MenuScreen.tsx`
  - Read mapping (`MenuScreen.tsx:26-29`):
    - Master: `const isMasterActive = !!auto?.globalToggleActive;`
    - Economy: `const isEconomyActive = !!auto && auto.economy !== AutomationLevel.Manual;`
    - Defense: `const isDefenseActive = !!auto && auto.defense !== AutomationLevel.Manual;`
    - Religion: `const isReligionActive = !!directives?.religious_mission;`
  - Action mappings (`MenuScreen.tsx:31-53`):
    - `toggleMaster`: calls `session.toggleGlobalAutomation(!isMasterActive)`
    - `toggleEconomy`: calls `session.setEconomyAutomation(isEconomyActive ? AutomationLevel.Manual : AutomationLevel.NearlyAutomatic)`
    - `toggleDefense`: calls `session.setDefenseAutomation(isDefenseActive ? AutomationLevel.Manual : AutomationLevel.NearlyAutomatic)`
    - `toggleReligion`: calls `session.updateAutomationDirective('religious_mission', !isReligionActive)`
- **Religion Automation Logic**:
  - Location: `mobile/src/core/simulation/systems/automation-system.ts` and `mobile/src/application/game-session.ts`
  - Cost Definition: Gold = 18, Faith = 26, Legitimacy = 2.
  - Automated execution checks in `automation-system.ts:381-418` deduct the values from `state.ecs` using `capitalIndex` and from `kingdom.economy.stock`.
  - Manual action in `game-session.ts:1844-1907` uses `getReligiousActionConfig` to fetch the same cost configuration and invokes `applyCost` to deduct resources.
  - Cooldowns: Both automatic and manual checks check/set `"religion:send_missionaries"` on relation action cooldowns for `90_000` (ms/ticks).
  - Penalty: Failure reduces stabilization by `0.25` in both `automation-system.ts:459` and `game-session.ts:1892`.
- **Test Integrity**:
  - Local test command: `npm run test` (executes `vitest run` on root) and custom script `mobile/test-boot.ts`.
  - Test files: `tests/automation-system.test.ts` (344 lines) and `tests/devmode-autosave.test.ts` (246 lines) contain genuine, non-dummy checks verifying automated budgets, defensive postures, missionary campaigns (deducting exact resources like 82 gold, 74 faith, 8 legitimacy), cooldowns, stability reductions, and developer tools.

### 2. Logic Chain
- **TopHUD Visibility**: The React tree in `AppContent` conditional block `{activeRouteName === 'Map' && <TopHUD />}` relies on navigation state. When `activeRouteName` evaluates to any other tab name (e.g. `'Tech'`, `'Government'`, etc.), `<TopHUD />` is unmounted. There is no mock state override, confirming it is genuine and active only on `'Map'`.
- **Automation Mapping**: The states bind directly to the reactive `useGameState()` context which subscribes to the `GameSession` state. Methods like `toggleGlobalAutomation` modify the underlying `GameState` object (`auto.globalToggleActive = active`) and propagate changes via `emitState()`, proving the Controls match the Engine variables.
- **Religion Deductions and Cooldowns**: Both automation and player action methods use the exact same cost figures (18 gold, 26 faith, 2 legitimacy) and write directly to `state.ecs` and `economy.stock`. The action cooldown check (`cooldownUntil > context.now`) prevents spamming. The failure penalty (`stability - 0.25`) is processed correctly via a standard random check against computed missionary power, confirming genuine logic.
- **Tests Validity**: The Vitest suite assertions (e.g. `expect(player.economy.stock.gold).toBe(82);`) run directly against the simulator code. There are no placeholder tests, empty assertions, or bypass mechanisms, verifying tests are completely authentic.

### 3. Caveats
- **Offline progression clock context**: System clock offsets during offline progression catchup were not benchmarked on a simulated physical device.
- **Web Worker threading**: Because React Native executes simulation systems on the main thread in development, concurrency and CPU locks on real mobile hardware (e.g. long session durations) may deviate slightly from Vitest execution.

### 4. Conclusion
The implementation of the R1 and R2 adjustments is authentic, functionally integrated with the game loop simulation, and correctly mapped between the React Native UI and the core TypeScript engine. The codebase is clean of integrity violations.

### 5. Verification Method
1. Run Vitest test suite at the project root folder:
   ```bash
   npm run test
   ```
   All 115 tests should pass successfully.
2. Compile and run the mobile boot-up diagnostic script:
   ```bash
   npx tsc --ignoreConfig --module commonjs --outDir dist-test --resolveJsonModule --esModuleInterop --skipLibCheck test-boot.ts
   node dist-test/test-boot.js
   ```
   Should print `SUCCESS`.
