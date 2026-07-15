# Handoff Report - Sprint 2 Exploration

## 1. Observation
Here are the direct observations from the codebase for each of the 9 items:

### Item 1: Clock/Engine Freeze
* **File Path**: `src/application/game-session.ts`
* **Bootstrap Method (Lines 142-154)**:
  ```typescript
  public async bootstrap(initialState: GameState): Promise<void> {
    this._currentState = initialState;
    this.recordPlayerCommand("session.bootstrap", {});
    this.persistCurrent();
    this.emitState();
  }
  ```
  *Observe*: There is no call to `this.start()` or `this.deps.clock.start(...)` in `bootstrap`.
* **LoadSlot Method (Lines 183-207)**:
  ```typescript
  public async loadSlot(slotId: SaveSlotId): Promise<PlayerActionResult> {
    ...
    this._currentState = snapshot.state;
    this.start();
    ...
  }
  ```
  *Observe*: `loadSlot` calls `this.start()` which runs the clock.

---

### Item 2: Relational Metrics Mirroring
* **File Path**: `src/infrastructure/diplomacy/local-diplomacy-resolver.ts`
* **ResolveTick Method (Lines 172-184)**:
  ```typescript
  for (const relationId of Object.keys(kingdom.diplomacy.relations).sort()) {
    const relation = kingdom.diplomacy.relations[relationId];
    ...
    relation.score.trust = roundTo(clamp(relation.score.trust + alliedBias - hostilityBias - relation.grievance * 0.008 + 0.002, 0, 1));
    relation.score.rivalry = roundTo(
      clamp(relation.score.rivalry + relation.score.borderTension * 0.004 + hostilityBias * 0.7 - alliedBias * 0.5, 0, 1)
    );
  ```
  *Observe*: All tick-based updates to relation scores (trust, rivalry, fear, tradeValue) are calculated using symmetric formulas. The only potentially asymmetric block is the dominant pressure check (lines 220-227), but it is never triggered because AI kingdoms are inactive and never expand to trigger the dominant share threshold.

---

### Item 3: AI Inactivity & Expansion
* **File Path**: `src/core/simulation/systems/migration-system.ts` (Lines 48-88):
  ```typescript
  const currentPop = state.ecs?.populationTotal?.[i] || 0;
  ...
  // Atingiu o Teto de Suporte (Carrying Capacity) local
  if (currentPop < MIGRATION_THRESHOLD) {
    continue;
  }
  ```
  *Observe*: AI organic expansion/migration is gated behind `currentPop >= 150` (MIGRATION_THRESHOLD).
* **File Path**: `src/core/simulation/systems/population-system.ts` (Lines 17-21):
  ```typescript
  const naturalGrowth = kingdom.population.total * kingdom.population.growthRatePerTick;
  ...
  kingdom.population.total = Math.max(120_000, kingdom.population.total + populationDelta);
  ```
  *Observe*: While the POO `kingdom.population.total` is updated and clamped to `120_000`, the ECS per-hex population array `state.ecs.populationTotal` (which starts at `20`) is never modified or grown by the population system. Thus, hex populations remain at `20` indefinitely, which is below the threshold of `150`.

---

### Item 4: Court Candidates Generation
* **File Path**: `src/core/simulation/systems/council-system.ts` (Lines 523-532):
  ```typescript
  // 1. Manutenção do Mercado de Trabalho (A cada ~1 Mês de jogo)
  if (state.meta.tick % 12 === 0) {
    // Demite candidatos velhos aleatoriamente
    if (player.administration.candidatePool.length > 6) {
      player.administration.candidatePool.shift(); 
    }
    // Gera novos talentos para o jogador
    if (player.administration.candidatePool.length < 8) {
      player.administration.candidatePool.push(generateCandidate(state.meta.tick));
    }
  }
  ```
  *Observe*: Candidate generation and candidate pool maintenance are gated behind a strict modulo check `state.meta.tick % 12 === 0` (1 year).
* **File Path**: `src/core/simulation/tick-pipeline.ts` (Lines 72-78):
  ```typescript
  while (processedTicks < ticks) {
    const remainingTicks = ticks - processedTicks;
    const tickScale = collectEvents ? 1 : Math.min(coarseStepTicks, remainingTicks);
  ```
  *Observe*: During offline progression and test simulations, `coarseStepTicks` can be 2, 5, 10, or 20, causing the simulation tick to jump and skip multiples of 12 completely.

---

### Item 5: Building Construction Feedback
* **File Path**: `src/application/game-session.ts` (Lines 1310-1325):
  ```typescript
  region.buildings = region.buildings || [];
  ...
  this.applyCost(config.cost);
  region.buildings.push(buildingType);
  ```
  *Observe*: Structures are constructed instantly. There is no property or system tracking build progress or duration, and no progress tracking field exists on the `RegionState`.

---

### Item 6: Map Interactivity, Zoom, and Click
* **File Path**: `src/ui/components/WorldMapSkia.tsx` (Lines 273-292):
  *Observe*: The Skia-based map wrapper only contains `panGesture` and `pinchGesture`. It lacks a `tapGesture` or click handler altogether. Therefore, tapping regions on the canvas does not invoke `onRegionPress`.

---

### Item 7: Territorial Merger (Mega-Polygons)
* **File Path**: `src/ui/components/WorldMapSkia.tsx` (Lines 323-331):
  ```typescript
  <Path path={path} color={color} style="fill" />
  <Path path={path} color="rgba(0,0,0,0.4)" style="stroke" strokeWidth={1} />
  ```
  *Observe*: Every hexagon is rendered as a distinct shape with an individual outline stroke (`rgba(0,0,0,0.4)`), resulting in borders drawn between adjacent hexagons belonging to the same kingdom.

---

### Item 8: DevMode Trigger & Settings Footer
* **File Path**: `src/ui/screens/MainMenuScreen.tsx` (Lines 24-41):
  *Observe*: The DevMode trigger is located on the game title text. Tapping it 5 times within a 1-second interval toggles `session.devModeActive`.
* **File Path**: `src/ui/i18n/translations.ts` (Lines 65 and 175):
  *Observe*: The settings footer text is defined under the key `settings.footer` in both `'pt-BR'` and `'en-US'`.

---

### Item 9: Headless Test & Build System
* **File Path**: `test-boot.ts` and `package.json`
  *Observe*: Running `npx tsc test-boot.ts --outDir dist-test --module commonjs --target es2022 --moduleResolution node --skipLibCheck --ignoreConfig --ignoreDeprecations 6.0 --resolveJsonModule` compiles the headless test harness successfully. Running `node dist-test/test-boot.js` prints `SUCCESS`.

---

## 2. Logic Chain

1. **Clock Freeze**: Since `bootstrap()` sets the state but never calls `start()` (which is what kicks off the clock tick loop), the game clock remains frozen at tick 0 on "New Game". On load, `loadSlot()` explicitly calls `start()`, enabling ticks to process normally.
2. **Relational Mirroring & AI Inactivity**: Because `state.ecs.populationTotal` is never grown by the simulation systems, the population of AI hexes remains stuck at `20` (below the 150 threshold). As a result, AI kingdoms never expand or gain power, so they never declare wars or cause asymmetric events. Consequently, only the symmetric tick equations in `LocalDiplomacyResolver.resolveTick` run, keeping diplomatic opinions perfectly mirrored between player and AI.
3. **Court Candidates**: Modulo checks (`state.meta.tick % 12 === 0`) are skipped during offline catch-up chunks (which jump by `coarseStepTicks`), meaning years of candidate pool rotation are bypassed. Also, initial generation is restricted to 1 candidate per year, meaning it takes 8 years to fill the pool. Lastly, once a ruler dies around age 55, a succession crisis leaves the kingdom without a valid ruler, impacting council systems.
4. **Building Progress**: Since `executeBuildStructure` pushes the building directly to the `buildings` array upon purchase, construction is instantaneous, explaining the lack of progress feedback.
5. **Map Clicks**: Because no `Gesture.Tap()` is registered in `WorldMapSkia.tsx`, user tap inputs on the Skia Canvas are ignored, making it impossible to select hexes directly on the map.

---

## 3. Caveats
* We assumed that the offline progression tick scale jumps are the primary cause of candidate generation freezes, though other UI-related event loop choking could contribute.
* The mock event bus in `test-boot.ts` was not tested under high concurrency (e.g. simulating 2000 years in one single event loop chunk), which might require chunking to prevent memory bloat.

---

## 4. Conclusion
1. **Clock Freeze**: Call `this.start()` at the end of `bootstrap(initialState)` in `game-session.ts`.
2. **Relations & AI Inactivity**: Grow `state.ecs.populationTotal` inside `population-system.ts` for each region based on regional growth rates.
3. **Court Candidates**: Modify `council-system.ts` and `character-system.ts` to trigger yearly updates when `state.meta.tick` has crossed a multiple of 12, rather than checking strict equality (`% 12 === 0`). Populate heirs on game start to prevent succession locks.
4. **Building Progress**: Add a `constructionQueue` to regions, advance progress per tick, and render a progress bar in `RegionDetailPanel.tsx`.
5. **Map Clicks**: Implement a tap gesture handler in `WorldMapSkia.tsx` that projects screen coordinates back to map space and finds the nearest hex center.
6. **Mega-Polygons**: In "merged view", only render outlines for hex edges where the adjacent hex owner differs.

---

## 5. Verification Method
1. **Headless Boot Test**:
   ```bash
   npx tsc test-boot.ts --outDir dist-test --module commonjs --target es2022 --moduleResolution node --skipLibCheck --ignoreConfig --ignoreDeprecations 6.0 --resolveJsonModule
   node dist-test/test-boot.js
   ```
   *Expected Output*: `SUCCESS`.
2. **Headless 2000-Year Test**: Create a copy of `test-boot.ts` that runs `newSession.runOfflineProgression(24000, 3000)` inside `run()` and logs the final game state. Verify that the simulation completes without throwing exceptions.
