# Handoff Report: Domain Models, Character Creation & Session Boot Investigation (Milestone 1)

## 1. Observation

Direct code inspections of `src/` and `mobile/` revealed the following exact model definitions, boot flows, and persistence mechanisms:

### Architecture Directory Clarification
- **File path**: `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\orchestrator\PROJECT.md`
- **Line 16**: `- src/domain/: Core entities, ECS systems, game state models`
- **Actual path**: Domain models and core entities reside under `src/core/models/`, `src/core/simulation/`, and `src/core/ecs/`. The directory `src/domain/` does not exist in the repository.

### Character & Stats Models
- **File path**: `src/core/models/character.ts`
- **Lines 3-9**:
```typescript
export interface CharacterStats {
  administration: number;
  martial: number;
  diplomacy: number;
  intrigue: number;
  learning: number;
}
```
- **Lines 18-35**:
```typescript
export interface Character {
  id: string;
  historicalId?: string;
  name: string;
  title?: string;
  isLegendary: boolean;
  birthTick: TickId;
  deathTick: TickId | null;
  stats: CharacterStats;
  traits: string[];
  status: CharacterStatus;
  locationKingdomId: KingdomId | null;
  employerKingdomId: KingdomId | null;
  affinity: CharacterAffinity;
  personalWealth: number;
  influence: number;
  memory: string[];
}
```

### Culture Definitions State
- Searches for `culture` across `src/core/models/` and `src/application/boot/` confirmed that **culture definitions do not currently exist** in the engine data structures. 
- World identity and bonuses are currently handled via religions (`ReligionDefinition` in `src/core/models/static-world-data.ts:15-23`) and geographical zones (`RegionZone` in `src/core/models/world.ts:6-16`).

### Kingdom State & Territory Allocation
- **File path**: `src/core/models/game-state.ts`
- **Lines 26-46**: `KingdomState` contains `id: KingdomId`, `name: string`, `adjective: string`, `isPlayer: boolean`, `capitalRegionId: string`, `rulerId?: string`, `heirs: string[]`, `economy`, `population`, `religion`, etc.
- **File path**: `src/application/boot/create-initial-state.ts`
- **Lines 380-437**: `assignRegionOwners(definitions, playerStartRegionId)` initializes territorial control. `playerStartRegionId` defaults to a temperate land hex if undefined, spawning a territory cluster assigned to `"k_player"`.
- **Line 34-39**: Blueprint for player kingdom:
```typescript
{
  id: "k_player",
  name: "Primeira Tribo",
  adjective: "Primordial",
  isPlayer: true,
  preferredCapitalRegionId: ""
}
```

### Game Session Boot & Persistence
- **File path**: `src/application/boot/static-world-data.ts`
- **Line 128**: `createStaticWorldData()` builds map definitions, strategic routes, religions, and tenets.
- **File path**: `src/application/boot/create-initial-state.ts`
- **Line 594**: `createInitialState(staticData, playerStartRegionId, orderedDefinitions)` constructs `GameState` (version 4 schema), seeding kingdoms, ECS arrays (`ecsState`), wars, and events.
- **File path**: `src/application/game-session.ts`
- **Lines 162-230**: `bootstrap(initialState)` checks `gameStateRepository.loadCurrent()`, executes offline catch-up simulation if needed, sets speed to 0.5x, pauses execution, and persists current state.
- **File path**: `src/infrastructure/persistence/save-slots.ts`
- **Lines 3-6**: Save slots defined as `manual-1`, `manual-2`, `manual-3`, and `auto-1`.
- **File path**: `mobile/src/ui/screens/MenuScreen.tsx`
- **Lines 133-140**: UI triggers `createInitialState` and `session.resetToNewGame(initialState)` when starting a new game.

---

## 2. Logic Chain

1. **Observation**: `PROJECT.md` references `src/domain/`, but the actual implementation resides in `src/core/models/`.
   - **Reasoning**: Any architectural references or new models created for Milestone 1 must be placed in `src/core/models/` (and contracts in `src/core/contracts/`) to maintain consistency with the existing code structure.

2. **Observation**: `CharacterStats` already defines the exact 5 point-buy attributes (administration, martial, diplomacy, intrigue, learning), and `Character` defines full ruler entity properties (`id`, `name`, `title`, `stats`, `traits`, `status: "ruler"`). However, `KingdomState.rulerId` is currently unassigned upon new game boot in `create-initial-state.ts`.
   - **Reasoning**: Character creation choices (custom ruler name, title, point-buy attributes) can seamlessly map onto a newly instantiated `Character` object. This object will be stored in `state.world.characters[rulerId]`, and its ID assigned to `k_player.rulerId`.

3. **Observation**: Culture definitions (`CultureDefinition`) are entirely missing from `src/core/models/`. Milestone 1 requires 9 cultures.
   - **Reasoning**: A new interface `CultureDefinition` (containing `id`, `name`, `description`, `statModifiers`, `culturalTraits`, `heritage`) must be introduced in `src/core/models/culture.ts` (or `static-world-data.ts`) and registered within `StaticWorldData`. When the player selects a culture during character creation, its bonuses will apply to the generated ruler and player kingdom properties.

4. **Observation**: `assignRegionOwners()` in `create-initial-state.ts` accepts `playerStartRegionId` and spawns a starting kingdom cluster around that hex.
   - **Reasoning**: The territory selection choice from character creation maps directly into the existing `playerStartRegionId` parameter of `createInitialState()`. No major refactoring of territory allocation logic is required, only passing the selected ID down from the UI.

5. **Observation**: `GameSession.bootstrap()` and `SaveRepository` handle state persistence via `SaveEnvelope` (schema version 4) across slots (`auto-1`, `manual-1`..`3`). `buildSaveSummary()` automatically extracts `playerKingdomName` and ruler information for the menu display.
   - **Reasoning**: When character creation feeds custom parameters into `createInitialState()`, the resulting state will automatically persist into the save slots and display correctly in `MenuScreen.tsx` without breaking existing schema migration pipelines.

---

## 3. Caveats

- **Missing Culture Model**: Culture definitions do not currently exist in code. Creating the UI without adding `CultureDefinition` to `src/core/models/` will require fallback logic or temporary proxy objects using `ReligionDefinition`.
- **Character Storage Location**: `WorldState.characters` is optional (`characters?: Record<string, Character>`). Boot logic must ensure this dictionary is initialized before inserting the custom ruler.
- **Save Slot Overwrite**: `resetToNewGame()` currently overwrites the current session state but leaves manual save slots intact. UI prompt clarity should confirm saving habits.

---

## 4. Conclusion

The domain models in `src/core/models` (`Character`, `CharacterStats`, `KingdomState`) and application boot processes (`createInitialState`, `GameSession.bootstrap`) are fully equipped to support Milestone 1 character creation and state persistence with minimal schema adjustments:
1. **Character Creation Integration**: Create a new payload `CharacterCreationParams` (`cultureId`, `name`, `title`, `stats`, `startingRegionId`, `avatarSeed`).
2. **Boot Routine Extension**: Update `createInitialState()` to consume this payload, generate the player's ruler `Character` in `state.world.characters`, attach `rulerId` to `k_player`, apply chosen culture bonuses, and set `k_player.capitalRegionId` to `startingRegionId`.
3. **Persistence Continuity**: The existing persistence engine in `GameSession` and `save-schema.ts` will seamlessly serialize the created profile and ruler into save slots (`manual-1`, `auto-1`).

---

## 5. Verification Method

To independently verify this analysis:
1. **File Inspection**:
   - Inspect `src/core/models/character.ts` to confirm `CharacterStats` and `Character` interfaces.
   - Inspect `src/core/models/game-state.ts` (lines 26-46) to confirm `KingdomState` ruler and kingdom fields.
   - Inspect `src/application/boot/create-initial-state.ts` (lines 34-39 & 380-437) to verify starting region cluster assignment for `k_player`.
   - Inspect `mobile/src/ui/screens/MenuScreen.tsx` (lines 133-140) to see how new game state is created and passed to `session.resetToNewGame()`.
2. **Validation Commands**:
   - Run existing TypeScript compiler check to verify model types: `npx tsc --noEmit` (or project build command).
