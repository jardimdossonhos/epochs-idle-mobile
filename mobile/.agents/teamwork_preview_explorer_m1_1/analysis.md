# Sprint 3 Codebase Exploration Report - Epochs Idle

This report details the findings and proposals to address the requirements of Sprint 3.

---

## TypeScript Compiler Diagnostics (Existing Issues)

Before implementing the Sprint 3 fixes, running `npx tsc --noEmit` fails with exit code 1 due to the following pre-existing errors:

1. **Character Property Mismatches**:
   - **Errors**:
     - `src/core/simulation/systems/character-system.ts(30,3): error TS2739: Type '{ ... }' is missing the following properties from type 'Character': level, experience, unspentTalentPoints`
     - `src/infrastructure/persistence/save-schema.ts(149,7): error TS2739: Type '{ ... }' is missing the following properties from type 'Character': level, experience, unspentTalentPoints`
   - **Context**: The `Character` interface in `src/core/models/character.ts` has been extended to include `level: number; experience: number; unspentTalentPoints: number;`. However, system mocks and save migration schemas in the files above construct Character instances without providing these fields.
   - **Fix**: Add default fields (`level: 1, experience: 0, unspentTalentPoints: 0`) to these object instantiations.

2. **Implicit Any Parameter**:
   - **Error**: `src/ui/components/WorldMapSkia.tsx(280,27): error TS7006: Parameter 'neighborId' implicitly has an 'any' type.`
   - **Context**: Inside the boundary drawing loop, the parameter `neighborId` of the `forEach` call lacks type annotation under a strict implicit-any rule.
   - **Fix**: Change it to `(neighborId: string) => {`.

---

## R1: Respeito à Seleção de Território (Universal)

### 1. Components Involved
- **File**: `src/ui/screens/character-creation/CharacterCreationScreen.tsx`
  - **Line Range**: 121–123
- **File**: `src/application/game-session.ts`
  - **Line Range**: 171–199 (inside `bootstrap`)
- **File**: `src/ui/GameProvider.tsx`
  - **Line Range**: 100–106 (inside `initGame`)

### 2. Current Implementation and Issue Details
When the application starts, `GameProvider.tsx` mounts immediately and calls:
```typescript
const initialState = createInitialState(staticWorldData, undefined, WORLD_DEFINITIONS_V1);
await newSession.bootstrap(initialState);
```
This initializes a default game state with the starting region as `undefined` (which falls back to a temperate biome region, such as `r_hex_38160` - Península Ibérica). It then saves this state in the persistent game repository.

Later, when the player completes the login process (Google, Guest, or Mock), they reach the main menu and can select "New Game" to enter the character creation wizard. After choosing their preferred culture, stats, and starting territory (e.g. Vale dos Grandes Rios or Oásis do Saara), the character creation wizard triggers:
```typescript
const initialState = createInitialState(staticWorldData, selectedRegionId, WORLD_DEFINITIONS_V1);
await session.bootstrap(initialState);
```
However, inside `GameSession.bootstrap(initialState)`, the logic is implemented as:
```typescript
const persisted = await this.deps.gameStateRepository.loadCurrent();
const recovered = persisted ?? (await this.restoreFromSnapshotOrSave());
const baseState = recovered ?? initialState;
```
Because the `GameProvider` had already bootstrapped and saved a default state during startup, `persisted` is not null. Therefore, `GameSession` discards the newly created `initialState` (which contains the user's selected region) and loads the default-region state instead. Consequently, the player always starts in the fallback region, regardless of their choice in the territory selector.

### 3. Proposed Resolution Strategy
Instead of calling `bootstrap(initialState)` when starting a new game, the character creation wizard should call `resetToNewGame(initialState)`.
`resetToNewGame(initialState)` is a built-in method in `GameSession` designed to stop the active simulation, clear the persisted state from disk, and initialize memory/disk with the fresh state:
```typescript
  async resetToNewGame(initialState: GameState): Promise<void> {
    this.stop();
    await this.clearCurrentState();
    
    this.currentState = structuredClone(initialState);
    this.currentState.meta.lastUpdatedAt = this.deps.clock.now();
    this.currentState.meta.paused = true;
    
    await this.deps.gameStateRepository.saveCurrent(this.currentState);
    (this.deps.eventBus as any).publish({ type: "game.loaded", payload: this.currentState });
    this.emitState();
    this.start();
  }
```

#### Proposed Code Changes
In `src/ui/screens/character-creation/CharacterCreationScreen.tsx`:
```typescript
<<<<
      // 3. Bootstrap game session with custom state
      await session.bootstrap(initialState);
      session.markWorkerReady();
      session.start();
====
      // 3. Reset game session with custom state
      await session.resetToNewGame(initialState);
>>>>
```

---

## R3: Autosave Visibilidade e Carregamento

### 1. Components Involved
- **File**: `src/application/game-session.ts`
  - **Line Ranges**: 1324–1327 (`triggerAutosave`), 1973–1976 (`doCommitAutosave` call), 1988–2005 (`doCommitAutosave` definition), 2491–2496 (`runAutosave`)
- **File**: `src/ui/components/LoadGameModal.tsx`
  - **Line Range**: 80–120 (`renderSlotItem`)

### 2. Current Implementation and Issue Details
The mobile app triggers an autosave when the application transitions to the background:
```typescript
// GameProvider.tsx
const subscription = AppState.addEventListener('change', async (nextAppState) => {
  if (nextAppState.match(/inactive|background/)) {
    await newSession.triggerAutosave();
  }
});
```
However, in `GameSession.ts`, the autosave process is not properly awaited:
```typescript
  public async triggerAutosave(): Promise<void> {
    this.doCommitAutosave();
  }

  private doCommitAutosave(): void {
    if (!this.currentState) return;
    ...
    const snapshot = this.buildSaveSlotSnapshot(AUTOSAVE_SLOT_ID);
    this.deps.saveRepository.saveToSlot(snapshot); // Fails to await this Promise!
```
Because `doCommitAutosave` is synchronous from the caller's perspective and `saveToSlot` returns a Promise that is not awaited, `triggerAutosave` resolves instantly. The React Native lifecycle then suspends the JS thread before the file writing (`FileSystem.writeAsStringAsync`) is completed, causing the autosave to be lost or corrupted.
As a result, when opening the load game menu, `repo.loadFromSlot('auto-1')` returns null. The load modal (`LoadGameModal.tsx`) checks the slot data, sees `summary === null`, and displays it as an empty slot which is unclickable/non-loadable.

### 3. Proposed Resolution Strategy
Convert the autosave execution path to be fully asynchronous so that the file system write operations are successfully completed before the OS suspends the app.

#### Proposed Code Changes
In `src/application/game-session.ts`:
```typescript
<<<<
  public async triggerAutosave(): Promise<void> {
    this.doCommitAutosave();
  }
====
  public async triggerAutosave(): Promise<void> {
    await this.doCommitAutosave();
  }
>>>>
```

```typescript
<<<<
  private doCommitAutosave(): void {
    if (!this.currentState) return;
    
    (this.deps.eventBus as any).publish({
      type: "game.autosaved",
      payload: { tick: this.currentState.meta.tick }
    });
    const snapshot = this.buildSaveSlotSnapshot(AUTOSAVE_SLOT_ID);
    this.deps.saveRepository.saveToSlot(snapshot);
    this.recordSystemCommand("save.autosave", { slotId: AUTOSAVE_SLOT_ID });
    this.captureSnapshot("autosave");
  }
====
  private async doCommitAutosave(): Promise<void> {
    if (!this.currentState) return;
    
    (this.deps.eventBus as any).publish({
      type: "game.autosaved",
      payload: { tick: this.currentState.meta.tick }
    });
    const snapshot = this.buildSaveSlotSnapshot(AUTOSAVE_SLOT_ID);
    await this.deps.saveRepository.saveToSlot(snapshot);
    this.recordSystemCommand("save.autosave", { slotId: AUTOSAVE_SLOT_ID });
    this.captureSnapshot("autosave");
  }
>>>>
```

```typescript
<<<<
      if (this.pendingAutosave) {
        this.doCommitAutosave();
        this.pendingAutosave = false;
      }
====
      if (this.pendingAutosave) {
        this.doCommitAutosave().catch(console.error);
        this.pendingAutosave = false;
      }
>>>>
```

```typescript
<<<<
  private runAutosave(): void {
    if (!this.currentState) {
      return;
    }
    this.doCommitAutosave();
  }
====
  private runAutosave(): void {
    if (!this.currentState) {
      return;
    }
    this.doCommitAutosave().catch(console.error);
  }
>>>>
```

---

## R4: Revisão Visual e Lógica do Play/Pause

### 1. Components Involved
- **File**: `src/application/game-session.ts`
  - **Line Ranges**: 2746–2764 (`emitState` definition), 310–315 (`setPaused`), 346–357 (`setSpeed`), 1245–1270 (`loadSlot`), 1283–1300 (`resetToNewGame`), 171–199 (`bootstrap`)
- **File**: `src/ui/screens/SettingsScreen.tsx`
  - **Line Range**: 38–41 (DevMode toggle)

### 2. Current Implementation and Issue Details
The game session uses a 100ms throttle in `emitState()` to prevent freezing the UI thread at high simulation speeds:
```typescript
  public emitState(): void {
    if (!this.currentState) return;
    
    const now = Date.now();
    if (now - this.lastEmitTime < 100) {
      return; // Skip UI update, let engine run freely
    }
    this.lastEmitTime = now;
    ...
```
When a player taps the play/pause button, it toggles `state.meta.paused` and calls `emitState()`. If a simulation tick happened less than 100ms ago, this user-triggered emission is discarded. Because the game is now paused, no future simulation ticks occur to trigger another emission. As a result, the UI remains permanently out-of-sync, leaving the play/pause button display frozen and non-responsive.

### 3. Proposed Resolution Strategy
Add an optional `force` boolean argument to `emitState(force = false)`. If `force` is `true`, bypass the 100ms throttle and update the UI immediately. Call `emitState(true)` for all user actions (toggling pause, changing speed) and session startup/load operations.

#### Proposed Code Changes
In `src/application/game-session.ts`:
```typescript
<<<<
  public emitState(): void {
    if (!this.currentState) {
      return;
    }
    
    // UI Render Throttling: Max 10 FPS to prevent React Native UI thread (JS) from freezing 
    // when simulation runs at high speed (30x / 15+ ticks per second)
    const now = Date.now();
    if (now - this.lastEmitTime < 100) {
      return; // Skip UI update, let engine run freely
    }
    this.lastEmitTime = now;

    for (const listener of this.listeners) {
      listener(this.currentState);
    }
  }
====
  public emitState(force = false): void {
    if (!this.currentState) {
      return;
    }
    
    const now = Date.now();
    if (!force && (now - this.lastEmitTime < 100)) {
      return; // Skip UI update, let engine run freely
    }
    if (!force) {
      this.lastEmitTime = now;
    }

    for (const listener of this.listeners) {
      listener(this.currentState);
    }
  }
>>>>
```

Then update callers that should bypass throttling:
```typescript
  // Inside setPaused(paused: boolean)
  this.emitState(true);

  // Inside setSpeed(multiplier: number)
  this.emitState(true);

  // Inside bootstrap(initialState: GameState)
  this.emitState(true);

  // Inside loadSlot(slotId: SaveSlotId)
  this.emitState(true);

  // Inside resetToNewGame(initialState: GameState)
  this.emitState(true);

  // Inside toggleFogOfWar()
  this.emitState(true);
```

In `src/ui/screens/SettingsScreen.tsx`:
```typescript
<<<<
        if (session) {
          session.devModeActive = !session.devModeActive;
          session.emitState();
          Alert.alert(
====
        if (session) {
          session.devModeActive = !session.devModeActive;
          session.emitState(true);
          Alert.alert(
>>>>
```

---

## R7: Visibilidade Plena no Modo Desenvolvedor (Fog of War)

### 1. Components Involved
- **File**: `src/ui/components/WorldMapSkia.tsx`
  - **Line Range**: 275–302 (inside `strokePath` grouping logic)

### 2. Current Implementation and Issue Details
The map boundaries between kingdoms (IA boundaries) are drawn inside `WorldMapSkia.tsx` when `isMergedView` is true. The logic merges adjacent hexagons if their rendered color is identical:
```typescript
          const neighborColor = regionColors[neighborId];
          if (neighborColor === finalColor) {
            // hides the boundary edge
          }
```
However, in owner view mode (`viewMode === 'owner'`), distant/neutral NPC kingdoms do not have distinct banner colors. Instead, they all default to the same relationship status color (`#3A445C`). Consequently:
1. All neutral NPC kingdoms are incorrectly merged into a single huge grey block, and the borders between different NPC kingdoms are completely omitted.
2. Even if Fog of War is disabled (`fogOfWarDisabled = true`) in DevMode, revealing all regions on the map, this color-based merging is still applied, and the boundaries between neutral NPC kingdoms remain invisible.

### 3. Proposed Resolution Strategy
In owner view mode (`viewMode === 'owner'`), the merging logic should compare actual ownership (`ownerId`) instead of rendered color. This ensures borders are drawn between different kingdoms, even if they share the same color. For other view modes (religion, economy, military), the color-based comparison remains correct and should be preserved.

#### Proposed Code Changes
In `src/ui/components/WorldMapSkia.tsx`:
```typescript
<<<<
      // Stroke boundaries
      if (isMergedView) {
        const edgesToDraw = [true, true, true, true, true, true];
        const neighbors = regionDef.neighbors || [];
        
        neighbors.forEach(neighborId => {
          const neighborDef = staticWorldData.definitions[neighborId];
          if (!neighborDef || !neighborDef.center) return;
          
          const neighborColor = regionColors[neighborId];
          if (neighborColor === finalColor) {
====
      // Stroke boundaries
      if (isMergedView) {
        const edgesToDraw = [true, true, true, true, true, true];
        const neighbors = regionDef.neighbors || [];
        
        neighbors.forEach(neighborId => {
          const neighborDef = staticWorldData.definitions[neighborId];
          if (!neighborDef || !neighborDef.center) return;
          
          let shouldMerge = false;
          if (viewMode === 'owner') {
            const neighborOwnerId = gameState.world.regions[neighborId]?.ownerId ?? '';
            shouldMerge = neighborOwnerId === ownerId;
          } else {
            const neighborColor = regionColors[neighborId];
            shouldMerge = neighborColor === finalColor;
          }
          
          if (shouldMerge) {
>>>>
```
