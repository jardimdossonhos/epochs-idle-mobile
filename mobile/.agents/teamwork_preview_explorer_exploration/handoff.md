# Handoff Report — Codebase Investigation of Epochs Idle Mobile

## 1. Observation

### HUD Components (Especially `TopHUD`)
- **Rendering**: In `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\App.tsx` lines 205-211:
  ```tsx
  return (
    <>
      <TopHUD />
      <MainTabs />
      <EventPopup />
    </>
  );
  ```
- **Definition**: In `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\src\ui\components\TopHUD.tsx`. It displays the active era/date (tick-based, with visual interpolation), a play/pause button that calls `session.togglePause()`, and controlled regions, population, and gold metrics.
  - The metrics are obtained via `session.getKingdomMetrics(playerKingdomId)` and the `gameState.kingdoms[playerKingdomId]` economy state.

### Navigation / Routing Configuration
- **Configuration**: Set up in `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\App.tsx` lines 52-153 using `@react-navigation/bottom-tabs` (`createBottomTabNavigator`).
  - Active screens/tabs:
    - `"Tech"` (component `TechScreen`)
    - `"Map"` (component `MapScreen`)
    - `"Government"` (component `GovScreen`) — rendered conditionally based on `isCivilizationUnlocked` (`gameState.meta.tick > 10`)
    - `"Diplomacy"` (component `DiplomacyScreen`) — rendered conditionally
    - `"Characters"` (component `CharacterScreen`) — rendered conditionally
    - `"Menu"` (component `MenuScreen`)
    - `"Settings"` (component `SettingsScreen`)
- **Checking Active Screen (`MapScreen`)**:
  - Within a React functional component inside the `NavigationContainer`, the active route name can be checked using hooks from `@react-navigation/native`:
    ```typescript
    import { useNavigationState } from '@react-navigation/native';
    const activeRouteName = useNavigationState(state => state?.routes[state?.index]?.name);
    const isMapActive = activeRouteName === 'Map';
    ```
  - Directly inside `MapScreen` itself, we can use:
    ```typescript
    import { useIsFocused } from '@react-navigation/native';
    const isFocused = useIsFocused();
    ```

### "Menu" Tab / Screen / Component
- **Definition**: Defined in `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\src\ui\screens\MenuScreen.tsx`.
- **Functionality**:
  - Implements game time speed control (1x, 5x, 15x, 30x) via `(session as any).setSpeed(speed)`.
  - Shows save slot lists ("Autosave", "Slot 1", "Slot 2", "Slot 3") and performs save/load operations via `session.saveManual(slotId)` and `session.loadSlot(slotId)`.
  - Provides a "God Mode" button that dumps the memory snapshot via `AILogger.logStateDump(gameState)`.
  - Offers a "Iniciar Novo Jogo" (Start New Game) option using `createInitialState` and `session.resetToNewGame(initialState)`.

### State Management & Automation / Idle Mode Settings
- **State Provider**: Defined in `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\src\ui\GameProvider.tsx`. It instantiates `GameSession` (passing mobile-specific state repositories and default simulation systems) and exposes it via `GameContext`.
  - Hook for consumption: `useGameState()` which returns `{ gameState, session, playerKingdomId, staticWorldData }`.
- **Automation / Idle Mode settings**:
  - The UI (`c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\src\ui\screens\GovScreen.tsx` on the "Idle / Auto" tab) controls a dictionary called `directives` of type `Record<DirectiveKey, boolean>` containing keys:
    - `'territorial_expansion'`, `'gold_focus'`, `'war_mode'`, `'aggressive_diplomacy'`, `'accelerated_research'`, `'religious_mission'`
  - Toggling these directives in the UI updates the state using:
    ```typescript
    (session as any).updateAutomationDirective(key, newEnabled);
    ```
    which saves them to `gameState.kingdoms[playerKingdomId].administration.directives`.
  - However, in the simulation systems (specifically `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\src\core\simulation\systems\automation-system.ts`), the engine actually checks `kingdom.administration.automation` which is of type `AutomationPolicy` (keys: `economy`, `construction`, `defense`, `diplomacyReactive`, `expansion`, `technology` of type `AutomationLevel`):
    - `AutomationLevel` values are: `Manual = "manual"`, `Assisted = "assisted"`, `NearlyAutomatic = "nearly_automatic"`.
  - The engine automation routines automatically handle budget priority adjustment, construction of markets/barracks/etc., recruitment, target regions selection, and technology research based on these automation levels.
  - To integrate or adjust these settings programmatically, we can call:
    - `session.setExpansionAutomation(level)`
    - `session.setConstructionAutomation(level)`
    - `session.setTechnologyAutomation(level)`
    - `session.toggleGlobalAutomation(active)`

### Building and Running Tests
- **Mobile Project**:
  - No `test` script is configured in `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\package.json`.
  - A mock/bootstrap integration test exists in `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\test-boot.ts`. It can be run using the CLI command:
    ```powershell
    npx tsx test-boot.ts
    ```
  - Static type-checking can be verified via:
    ```powershell
    npx tsc --noEmit
    ```
- **Root Project (shared engine logic)**:
  - Unit/integration tests are placed in `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\tests\` and use **Vitest**.
  - CLI command to run unit tests:
    ```powershell
    npm run test
    ```
    (runs `vitest run`).
  - CLI command to run E2E/Playwright tests:
    ```powershell
    npm run test:e2e
    ```
    (runs `playwright test`).

---

## 2. Logic Chain
1. We searched for files named `*HUD*` or `*Hud*` under `mobile/` and located `src/ui/components/TopHUD.tsx`. We inspected `App.tsx` and saw it imports and renders `<TopHUD />` inside the main component tree when the game state is loaded.
2. We analyzed `App.tsx` and observed the instantiation of `createBottomTabNavigator` (`const Tab = createBottomTabNavigator()`) and the `MainTabs` navigator. Since navigation is standard React Navigation, standard React Navigation hooks (`useNavigationState` or `useIsFocused`) can be used to query active screen details.
3. We located `src/ui/screens/MenuScreen.tsx` using `find_by_name` and verified via `view_file` that it contains the UI controls for speed multiplier, saving/loading manual slots, resetting game, and exporting state to AI.
4. We inspected `GameProvider.tsx` and saw how the `GameSession` is initialized and exposed. We then investigated `game-session.ts` and `automation-system.ts` and noticed that while the UI (`GovScreen.tsx`) currently updates `administration.directives` via `updateAutomationDirective()`, the actual simulation systems check `administration.automation` (`economy`, `construction`, etc.) using the `AutomationLevel` enum. The session class provides concrete methods (e.g. `setExpansionAutomation()`) that allow programmatic control of these features.
5. We searched for test scripts in `mobile/package.json` and found none. We discovered `mobile/test-boot.ts` and successfully ran it via `npx tsx test-boot.ts` (returning `SUCCESS`). We then located root `package.json` and the root `tests` folder, where we verified that unit tests are run via `vitest` (`npm run test`) and successfully ran them to ensure a passing test suite.

---

## 3. Caveats
- Directives (`directives` dictionary on `administration` state) are updated in the UI and stored, but they do not have corresponding simulation code in `src/core/simulation/systems/automation-system.ts`. The actual simulation uses `automation` fields (like `automation.expansion`, `automation.economy`, etc.). Therefore, any automation integrations must interact with the `automation` policies or implement the directives execution.

---

## 4. Conclusion
- The mobile UI is modularly structured into Screens (`src/ui/screens/`) and components (`src/ui/components/`), with `App.tsx` acting as the central tab-navigator.
- `GameSession` is the key state orchestrator.
- Testing is split: mobile-specific bootstrapping is verified via `test-boot.ts`, and core simulation logic is validated by the root project's Vitest suite.

---

## 5. Verification Method

### 1. Verification of the Boot Test
Run the boot test in the mobile directory to verify that bootstrapping works:
```powershell
cd "c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile"
npx tsx test-boot.ts
```
Expected output:
```
SUCCESS
```

### 2. Verification of Type Safety
Run typescript type checking in the mobile directory:
```powershell
cd "c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile"
npx tsc --noEmit
```
Expected output:
- Runs and completes with no compilation/type errors.

### 3. Verification of Unit Tests (Root Project)
Run unit tests in the root project directory:
```powershell
cd "c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle"
npm run test
```
Expected output:
- All 112 unit tests pass.
