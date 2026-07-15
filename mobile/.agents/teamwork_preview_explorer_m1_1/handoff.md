# Sprint 3 Codebase Exploration Handoff Report

## 1. Observation

Direct observations and file references in the codebase:

### R1: Territory Selection
- **File**: `c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/src/ui/screens/character-creation/CharacterCreationScreen.tsx`
  - Lines 121–123:
    ```typescript
    await session.bootstrap(initialState);
    session.markWorkerReady();
    session.start();
    ```
- **File**: `c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/src/application/game-session.ts`
  - Lines 176–178 inside `bootstrap`:
    ```typescript
    const persisted = await this.deps.gameStateRepository.loadCurrent();
    const recovered = persisted ?? (await this.restoreFromSnapshotOrSave());
    const baseState = recovered ?? initialState;
    ```
- **File**: `c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/src/ui/GameProvider.tsx`
  - Lines 105-106 inside `initGame`:
    ```typescript
    const initialState = createInitialState(staticWorldData, undefined, WORLD_DEFINITIONS_V1);
    await newSession.bootstrap(initialState);
    ```

### R3: Autosave Visibility
- **File**: `c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/src/application/game-session.ts`
  - Lines 1324-1327 (`triggerAutosave`):
    ```typescript
    public async triggerAutosave(): Promise<void> {
      this.doCommitAutosave();
    }
    ```
  - Lines 1988-1999 (`doCommitAutosave`):
    ```typescript
    private doCommitAutosave(): void {
      ...
      const snapshot = this.buildSaveSlotSnapshot(AUTOSAVE_SLOT_ID);
      this.deps.saveRepository.saveToSlot(snapshot);
      ...
    }
    ```
- **File**: `c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/src/ui/components/LoadGameModal.tsx`
  - Lines 82-84:
    ```typescript
    if (!summary) {
      return (
        <View style={[styles.slotCard, styles.emptyCard]}>
    ```

### R4: Play/Pause Responsiveness
- **File**: `c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/src/application/game-session.ts`
  - Lines 2753-2758 inside `emitState`:
    ```typescript
    const now = Date.now();
    if (now - this.lastEmitTime < 100) {
      return; // Skip UI update, let engine run freely
    }
    ```

### R7: Fog of War and IA Boundaries
- **File**: `c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/src/ui/components/WorldMapSkia.tsx`
  - Lines 284-285:
    ```typescript
    const neighborColor = regionColors[neighborId];
    if (neighborColor === finalColor) {
    ```
  - Lines 159-165 (relationship status colors for distant NPCs):
    ```typescript
    const relation = playerRelations[ownerId]?.status;
    switch (relation) {
      ...
      default: finalColor = '#3A445C'; break; // Outro NPC distante
    }
    ```

### TypeScript Compiler Diagnostics (Existing Errors)
Running `npx tsc --noEmit` fails with exit code 1 due to existing type issues:
1. `src/core/simulation/systems/character-system.ts(30,3): error TS2739: Type '{ id: string; ... }' is missing the following properties from type 'Character': level, experience, unspentTalentPoints`
2. `src/infrastructure/persistence/save-schema.ts(149,7): error TS2739: Type '{ id: string; ... }' is missing the following properties from type 'Character': level, experience, unspentTalentPoints`
3. `src/ui/components/WorldMapSkia.tsx(280,27): error TS7006: Parameter 'neighborId' implicitly has an 'any' type.`

---

## 2. Logic Chain

- **R1**: Because `GameProvider.tsx` runs immediately on app startup, it calls `bootstrap` with an `undefined` starting territory, which initializes and saves a default state to `epochs_idle_current.json`. When the user completes character creation and clicks "Iniciar Campanha", `CharacterCreationScreen.tsx` calls `session.bootstrap(initialState)`. However, `bootstrap` loads the persisted state from disk (which has the default/fallback territory) and discards the new `initialState`. This overrides the user's selection. Calling `resetToNewGame(initialState)` instead of `bootstrap` correctly stops the clock, clears the old save, writes the custom configuration, and starts the session.
- **R3**: When the app transitions to the background, `triggerAutosave()` triggers `doCommitAutosave()`. However, `doCommitAutosave` does not await `saveRepository.saveToSlot(snapshot)`. Since the write operation is asynchronous and the returned promise is discarded, `triggerAutosave` resolves instantly. The React Native app is then suspended by the OS before the write finishes, leading to lost or corrupt saves. When the load game modal runs, it checks slot data, sees `summary === null`, and displays it as an empty slot that is unclickable and non-loadable. Returning a promise from `doCommitAutosave` and awaiting it in `triggerAutosave` resolves the issue.
- **R4**: The simulation tick loop triggers `emitState()` continuously. To preserve performance, `emitState()` is throttled to 10 FPS (100ms). When a player presses play/pause, the pause state is set and `emitState()` is called. If the call happens within 100ms of a tick emission, it is skipped. Since the game is now paused, no future simulation ticks occur, and the UI never receives the updated pause state (remaining frozen). Adding a `force` flag to bypass the 100ms throttle for user interactions ensures immediate responsiveness.
- **R7**: In `isMergedView` (merged kingdom borders), boundaries are hidden if adjacent regions have the same color. In `viewMode === 'owner'`, all neutral NPC kingdoms default to the relationship status color `#3A445C`. Since they share the same color, the map merges them into a single monolithic block and omits the borders between different kingdoms. Modifying `WorldMapSkia.tsx` to compare `ownerId` instead of color for `viewMode === 'owner'` ensures boundaries are drawn between distinct kingdoms, making them fully visible when Fog of War is disabled.
- **Diagnostics**: The compilation errors must be resolved by the implementer when applying these modifications. Specifically:
  - In `character-system.ts` and `save-schema.ts`, add the missing properties (`level`, `experience`, `unspentTalentPoints`) when mock character objects are created.
  - In `WorldMapSkia.tsx` line 280, add type annotation `(neighborId: string)` to fix the implicit `any` error.

---

## 3. Caveats

- Checked TypeScript types by running `npx tsc --noEmit` and identified 3 pre-existing compilation errors that must be resolved.
- Assumed the Expo FileSystem API behaves identically on iOS and Android regarding file system operations during background transitions.
- We did not investigate Web-specific preferences (such as IndexedDB repositories) since the target platform is Mobile (React Native).

---

## 4. Conclusion

The exploration successfully identified the root causes and provided concrete strategies for all four Sprint 3 requirements:
- **R1**: Replace `session.bootstrap` with `session.resetToNewGame` in `CharacterCreationScreen.tsx`.
- **R3**: Update `doCommitAutosave` to return a `Promise<void>`, await the file write, and update periodic/trigger callers in `GameSession.ts` to wait for its completion.
- **R4**: Introduce a `force` parameter in `emitState()` to bypass throttling, and call `emitState(true)` when toggling pause, changing speed, or loading slots.
- **R7**: Modify the boundary comparison in `WorldMapSkia.tsx` to check `neighborOwnerId === ownerId` instead of comparing colors when `viewMode === 'owner'`.
- **Diagnostics**: Fix the 3 TS compiler errors during sprint implementation.

---

## 5. Verification Method

- Run the following command in the `mobile/` directory to verify code compilation and type checking (after the TS errors and our sprint fixes are applied):
  `npx tsc --noEmit`
- Manual verification steps:
  - **R1**: Create a new game, select a non-default territory (e.g. Vale dos Grandes Rios), and check if the player's capital is correctly situated there.
  - **R3**: Run the app, play, send the app to the background, and resume it. Open the Load Game modal and confirm the "Auto Salvar" slot is populated and loadable.
  - **R4**: Rapidly tap the play/pause button and check that the pause/play HUD text toggles instantly.
  - **R7**: Go to DevMode, disable Fog of War, enable Merged View (puzzle icon), and verify that all kingdoms have distinct borders drawn between them.
