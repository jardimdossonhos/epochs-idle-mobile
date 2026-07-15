# Implementation Report: Sprint 3 (R2 & R6)

This report details the implementation of Sprint 3 requirements: **R2 (Performance Optimization x30)** and **R6 (AI Randomness & Personalities)**.

---

## 1. Requirement R2: Otimização de Performance (Velocidade x30)

### 1.1 structuredClone Elimination in Tick Loops
- **Problem**: In x30 speed mode, the game processed up to 5 ticks per frame. Calling `structuredClone` (via `pipeline.run`) on every tick caused significant main-thread overhead, resulting in UI freezes.
- **Solution**: 
  - Exposed a new method `runMutating(state, deltaMs, now)` in `TickPipeline` that executes the simulation systems directly in-place without performing any clones.
  - Modified the tick accumulation loop (`pumpSimulationQueue` in `game-session.ts`) to call `runMutating` for all ticks processed in a frame cycle.
  - Performed exactly **one** necessary clone via `cloneGameStateForSimulation` at the very end of the loop (if any ticks were processed) to generate a new state reference with restored `ecs` pointer, ensuring React correctly registers state changes and triggers UI updates.

### 1.2 getOwnedRegionIds Optimization
- **Problem**: The territory query `getOwnedRegionIds` used a `WeakMap` cached on `state.world.regions`. Because the state was cloned regularly, the cache was invalidated every tick, forcing O(N) traversals of all regions on every tick.
- **Solution**:
  - Re-architected `getOwnedRegionIds` in `src/core/simulation/systems/utils.ts` to cache the owned region IDs directly on the `KingdomState` object under an optional `ownedRegionIds` property.
  - In `getOwnedRegionIds`, if the cache is missing, it is built in a single O(N) scan for all kingdoms at once, sorted, and cached on the respective kingdoms. Subsequent lookups in the same tick are O(1).
  - Geopolitical changes that mutate regional ownership (`ownerId`) now invalidate the cache by setting `ownedRegionIds = undefined` on all kingdoms in the state. This invalidation happens in three specific places:
    1. `game-session.ts` (inside `executeRegionAction` for "exodus" and "colonize").
    2. `migration-system.ts` (at the end of `run` for organic migrations or extinctions).
    3. `local-war-resolver.ts` (inside `conquerRandomRegion` for war conquest transfers).

---

## 2. Requirement R6: Aleatoriedade e Personalidade das IAs

### 2.1 Sovereign Traits and Random Stats [1, 20]
- **Predefined Traits**: Added the `SovereignTrait` interface and the predefined `SOVEREIGN_TRAITS` list in `src/core/models/character.ts`. Traits modify character stats (e.g. militarist gives `martial +2`, `diplomacy -1`) and NPC behavior personality scores.
- **Sovereign Generator (Initial State)**:
  - Updated `createInitialCharacter` in `create-initial-state.ts` to generate base stats in the bounds `[1, 20]`.
  - Picked a random sovereign trait for each character (both rulers and heirs), applied its stat modifiers, and clamped all final stats in the bounds `[1, 20]`.
- **NPC Personality Variance**:
  - In `createInitialState` (inside `create-initial-state.ts`), updated the initial loop to modify the kingdom's NPC behavior state (`kingdom.npc.personality`):
    1. Added a random variance of `±0.12` to all base personality properties (ambition, caution, greed, zeal, honor, betrayalTendency).
    2. Applied modifier values from the ruler's sovereign trait.
    3. Clamped all final personality scores between `0.0` and `1.0`.

### 2.2 Succession and Heir Creation
- **Heir Generation**: In `generateHeir` (in `character-system.ts`), new heirs inherit stats from their monarch with a small variance, clamped in `[1, 20]`. They are also assigned a random sovereign trait, and their stats are adjusted accordingly.
- **Succession Behavior Changes**: In `processSuccession` (in `character-system.ts`), when a new ruler takes over, the kingdom's NPC behavior personality is dynamically updated using the new ruler's trait modifiers and a random variance, ensuring the gameplay profile changes dynamically with succession.

### 2.3 Photo & Avatar Styling (Culture, Gender, Phenotype)
- **Avatar Component**: Modified `src/ui/components/AvatarRenderer.tsx` and its `getAvatarUrl` function to style avatars using culture-specific configurations:
  - **Nordic/Celtic**: adventurers style with fair skin and blonde/red/light hair options.
  - **Eastern/Indigenous**: avataaars style with East Asian/indigenous skin and black/dark hair options.
  - **Desert/Savanna/Vedic**: micah style with darker skin tones and black/dark hair options.
  - **Gender Configuration**: Appended query parameters to disable facial hair (`facialHairProbability=0&facialHair[]`) for female sovereigns, while enabling a `50%` facial hair probability for male sovereigns.

---

## 3. Verification Results
- All files compile cleanly under the TypeScript checker.
- Running the Sprint 3 E2E test runner validates all 82 test cases successfully, including performance stress tests and sovereign profile range checks.
