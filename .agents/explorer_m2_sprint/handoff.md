# Handoff Report — Sprint M2 Exploration

## 1. Observation

Direct observations from codebase inspection:

### R3: HUD Clock Month Skips
- **File**: `mobile/src/ui/components/TopHUD.tsx` (lines 35-40):
  ```typescript
  35:         <Text style={styles.eraText}>
  36:           {t('topHud.eraText', {
  37:             year: Math.floor(gameState.meta.tick / 12) + 1,
  38:             month: (gameState.meta.tick % 12) + 1
  39:           })}
  40:         </Text>
  ```
  *Month and year are calculated directly from `gameState.meta.tick`.*
- **File**: `mobile/src/application/game-session.ts` (lines 2243-2250):
  ```typescript
  2243:     // UI Render Throttling: Max 10 FPS to prevent React Native UI thread (JS) from freezing 
  2244:     // when simulation runs at high speed (30x / 15+ ticks per second)
  2245:     const now = Date.now();
  2246:     if (now - this.lastEmitTime < 100) {
  2247:       return; // Skip UI update, let engine run freely
  2248:     }
  2249:     this.lastEmitTime = now;
  ```
  *UI state emission is throttled at 10 FPS (100ms interval).*
- **File**: `mobile/src/application/game-session.ts` (lines 1916-1922):
  ```typescript
  1916:       let ticksProcessedThisCycle = 0;
  1917:       const MAX_TICKS_PER_FRAME = 5;
  1918:       let progressed = false;
  1919:       let simNow = current.meta.lastUpdatedAt;
  1920: 
  1921:       while (this.accumulatedMs >= tickDurationMs && ticksProcessedThisCycle < MAX_TICKS_PER_FRAME) {
  ```
  *The engine processes up to 5 ticks (months) in a single frame/cycle, emitting state only at the end of the batch.*

### R4: Autosave slot auto-1 empty
- **File**: `mobile/src/application/game-session.ts` (lines 1947-1950):
  ```typescript
  1947:         if (this.ticksSinceAutosave >= (this.deps.autosaveEveryTicks ?? 300)) {
  1948:           this.ticksSinceAutosave = 0;
  1949:           this.runAutosave();
  1950:         }
  ```
  *Autosave is triggered only every 300 ticks (5 minutes of play at 1x speed).*
- **File**: `mobile/src/ui/GameProvider.tsx` (lines 136-141):
  ```typescript
  136:     const subscription = AppState.addEventListener('change', (nextAppState) => {
  137:       if (nextAppState.match(/inactive|background/)) {
  138:         console.log('[GameProvider] App going to background. Forcing save to disk.');
  139:         newSession.forceSaveToDisk();
  140:       }
  141:     });
  ```
  *On backgrounding, the provider calls `newSession.forceSaveToDisk()` which writes only to the current state repository (`MobileGameStateRepository`), but never calls `runAutosave()` or writes to slot `auto-1` in the `SaveRepository`.*
- **File**: `mobile/src/ui/components/LoadGameModal.tsx` (lines 28-29):
  ```typescript
  28:       const repo = new MobileSaveRepository();
  29:       const rawSlots = session ? await session.listSaveSlots() : await repo.listSlots();
  ```
  *The UI lists only save slots stored in `MobileSaveRepository` (slots like `auto-1`, `manual-1`, etc.).*

### R5: Secret Developer Mode
- **File**: `mobile/src/ui/screens/MainMenuScreen.tsx` (lines 57-61):
  ```typescript
  57:       <View style={styles.header}>
  58:         <Text style={styles.title}>{t('mainMenu.title')}</Text>
  ```
  *Title container is a standard View and has no touch handler.*
- **File**: `mobile/src/application/god-mode.ts` contains a DOM-based helper:
  ```typescript
  1: export class GodModeConsole {
  2:   private clickCount = 0;
  ...
  56:     this.panelElement = document.createElement("div");
  ```
  *This developer mode console is built using web-browser DOM APIs and cannot be directly executed in React Native.*

### R6: General Audit
- **File**: `mobile/src/ui/GameProvider.tsx` (lines 136-141) has an un-awaited call:
  ```typescript
  139:         newSession.forceSaveToDisk();
  ```
  *The async `forceSaveToDisk()` promise is left dangling on app backgrounding.*
- **File**: `mobile/src/application/game-session.ts` (lines 1961-1965):
  ```typescript
  1961:       // Drop de frames pesados se a acumulação sair do controle (limite de 120 ticks na fila)
  1962:       if (this.accumulatedMs > 120000) {
  1963:         Diagnostic.warn("SYS-PERF", "Dívida de CPU massiva detectada. Descartando backlog de simulação.");
  1964:         this.accumulatedMs = 1000;
  1965:       }
  ```
  *Dumping accumulated catchup time on resume triggers a warning and clears the catch-up backlog.*
- **File**: `mobile/src/ui/screens/character-creation/steps/CultureSelectStep.tsx` and `StatPointBuyStep.tsx` contain hardcoded English strings.
- **File**: `mobile/src/ui/GameProvider.tsx` does not unsubscribe from `newSession.subscribe`:
  ```typescript
  109:       newSession.subscribe((newState) => {
  110:         setGameState({ ...newState });
  111:       });
  ```

---

## 2. Logic Chain

### R3: HUD Clock Month Skips
1. At 1x speed, ticks happen at 1000ms intervals, and the UI receives them individually because they occur slower than the 100ms emission throttle threshold.
2. At higher speeds (e.g. 5x, 10x, 30x) or offline progression catchup, multiple ticks are processed in a single cycle in `pumpSimulationQueue` (up to 5 ticks per frame).
3. Since `emitState()` is called only at the end of the `pumpSimulationQueue` batch, the intermediate ticks (e.g. ticks 2, 3, 4) are never emitted.
4. Furthermore, any intermediate states emitted in quick succession are discarded by the `100ms` throttle check (`now - this.lastEmitTime < 100`).
5. As a result, month rendering jumps directly (e.g., from Month 2 to Month 5).
6. **Solution Conclusion**: We must decouple the rendering of the clock in `TopHUD.tsx` from the raw `gameState.meta.tick` updates. The UI should run a visual clock counter using a local `visualTick` state. An `useEffect` will sequentially increment this `visualTick` by 1 towards the `gameState.meta.tick` target using a small `setTimeout` (e.g., 30ms or 50ms) during normal speed, while snapping instantly for massive jumps (e.g., loaded games or offline progression exceeding 24 ticks).

### R4: Autosave slot auto-1 empty
1. `doCommitAutosave()` saves to `AUTOSAVE_SLOT_ID` (`"auto-1"`) in the `SaveRepository` (implemented as `MobileSaveRepository` on mobile, writing to `epochs_save_auto-1.json`).
2. This autosave is only executed when `ticksSinceAutosave >= 300` in the simulation loop.
3. Mobile play sessions are often shorter than 5 minutes (300 ticks at 1x speed).
4. When the user suspends the app (goes to background), `AppState` listener calls `forceSaveToDisk()`, which writes the current state to `MobileGameStateRepository` (`epochs_idle_current.json`), but does **not** call `doCommitAutosave()` or write to `auto-1`.
5. As a result, the `LoadGameModal` (which lists slots from `MobileSaveRepository`) finds `epochs_save_auto-1.json` does not exist, showing the slot as empty or not rendering it.
6. **Solution Conclusion**: Expose a public method `triggerAutosave()` in `GameSession.ts` that commits an autosave instantly. Call this method in the `AppState` background event listener inside `GameProvider.tsx` before suspends. Also, update `LoadGameModal.tsx` to list all known slots (e.g., `auto-1`, `manual-1`, `manual-2`, `manual-3`) and visually display empty ones as "Empty Slot" rather than omitting them entirely.

### R5: Secret Developer Mode
1. The DOM-based `GodModeConsole` cannot run in React Native due to `document` and `HTMLElement` dependencies.
2. We must build a React Native overlay modal in `MainMenuScreen.tsx` with a dark background `#0D1117` and a title click counter (5 taps within 500ms on "EPOCHS" title triggers visibility).
3. The 9 tools will interface with the `GameSession` as follows:
   - **a) Fog of War**: Add `fogOfWarDisabled: boolean` in `gameState.meta`. If true, `WorldMapSkia.tsx` bypasses `calculateVisibility` and returns a Set of all region IDs.
   - **b) +1000 Recursos**: A session method to increment `state.ecs.[gold|food|wood|iron|faith|legitimacy|manpower]` arrays at `capitalIndex`, legacy stocks in `player.economy.stock`, reserve manpower, and `personalWealth` on the player character.
   - **c) Complete Research/Construction**: Since constructions are instant on mobile, only research needs completion. Add a method to set `player.technology.accumulatedResearch` to the active technology's cost (or unlock it directly).
   - **d) Unlock All Eras**: Since Eras are not explicitly modeled in `GameState`, unlock all technologies in `player.technology.unlocked` by populating it with all node IDs from the `NODES` technology tree array.
   - **e) AI Decisions**: Render a log list in the Dev panel reading `gameState.kingdoms[npcId].npc.memories` or subscribing to the `eventBus` for `"npc.decision"` events.
   - **f) Swap Civilization Control**: Add a method to swap the `isPlayer` flag between the player kingdom and the target kingdom. Disable NPC AI on the new player kingdom (`kingdom.npc = undefined`) and enable it on the old player kingdom.
   - **g) Autoplay 100x**: Temporarily enable NPC behavior on the player kingdom (`player.npc = { archetype: NpcArchetype.Diplomatic, memories: [], lastDecisionTick: 0 }`) and relax the speed clamp in `setSpeed()` to allow up to `100.0`.
   - **h) Relationship Matrix**: Render a grid of `k1.id` vs `k2.id` reading `k1.diplomacy.relations[k2.id].score` (trust, rivalry, fear) and status.
   - **i) Quick Combat Simulator**: Clone `attacker` and `defender` kingdom states, run a fast-forward battle loop (simulating `resolveTick` calculations in isolation for up to 50 ticks) and return predicted casualties and victory path.

### R6: General Audit
1. **Un-awaited async calls**: `newSession.forceSaveToDisk()` on app backgrounding in `GameProvider.tsx` needs to be handled properly to prevent the OS from suspending the VM before saving completes.
2. **CPU Debt Warning**: During resume from background, `resumeFromBackground()` dumps all catchup milliseconds into `accumulatedMs`. In the next frame, this exceeds the `120,000ms` safety limit in `pumpSimulationQueue()`, triggering the warnings and wiping out the entire offline progression. To fix this, `resumeFromBackground()` should run the catchup in batch steps (like `bootstrap`'s offline progression) and clear `accumulatedMs`. We should also scale the safety clamp threshold with the current `speedMultiplier` (e.g. `120,000ms * speedMultiplier`).
3. **English Texts**: The Character Creation Screens (`CultureSelectStep.tsx`, etc.) contain hardcoded English texts. They should be moved to `translations.ts` and loaded via `t(...)`.
4. **Memory Leaks**: `GameProvider.tsx` subscribes to state updates using `newSession.subscribe(...)` but fails to call the unsubscribe cleanup function on unmount. We must store the returned unsubscribe callback and run it.

---

## 3. Caveats
- Evaluated under the assumption that the mobile client (Expo/React Native) executes synchronously on a single JavaScript thread, making UI throttling critical to prevent JS thread starvation.
- Assuming "Eras" refer to the technology tree tiers, as there is no historical "Era" state entity in the codebase.

---

## 4. Conclusion
The implementation strategy is actionable:
1. Decouple `TopHUD.tsx` month text rendering via visual tick interpolation.
2. Expose `triggerAutosave()` in `GameSession.ts` and call it on app suspend to populate `auto-1`.
3. Add a React Native modal overlay triggered by 5 taps in `MainMenuScreen.tsx`, wrapping state changes cleanly.
4. Address the dangling promise in background saving, scale/resolve the CPU debt safety clamp on background resume, translate character creation strings, and execute the unsubscribe callback in `GameProvider.tsx` to prevent leaks.

---

## 5. Verification Method

- **Clock ticking**: Set speed multiplier to `10x`. Inspect `TopHUD` year/month text. It must tick sequentially (e.g., Month 1, 2, 3...) instead of jumping directly (e.g. Month 1 to 4).
- **Autosave Slot**: Start a new game. Instantly put the app in the background. Relaunch and open "Carregar Jogo". Slot `AUTO-1` must show up with ruler culture and correct tick details instead of appearing empty.
- **Developer Mode**: Tap 5 times within 500ms on "EPOCHS IDLE" title on the main menu. The Dev console with background `#0D1117` must open.
- **CPU Debt Warning**: Stay out of the app for 5 minutes. Resume. Check console logs. There should be no `'Dívida de CPU massiva detectada'` warning and offline progression must apply correctly.
