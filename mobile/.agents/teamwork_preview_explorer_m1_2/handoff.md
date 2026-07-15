# Handoff Report — Explorer Teamwork (teamwork_preview_explorer_m1_2)

This handoff covers the analysis of Sprint 3 requirements: R2 (Performance Optimization x30) and R5 (Current Code Progression Document).

---

## 1. Observation

Direct observations from codebase inspection:
*   **File Path**: `c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/src/core/utils/clone-game-state.ts` (lines 3-24):
    ```typescript
    export function cloneGameStateForSimulation(previousState: GameState): GameState {
      return {
        meta: {
          ...previousState.meta
        },
        campaign: previousState.campaign,
        world: {
          mapId: previousState.world.mapId,
          regions: structuredClone(previousState.world.regions),
          religions: structuredClone(previousState.world.religions),
          characters: previousState.world.characters ? structuredClone(previousState.world.characters) : undefined,
          eventChains: previousState.world.eventChains ? structuredClone(previousState.world.eventChains) : undefined
        },
        kingdoms: structuredClone(previousState.kingdoms),
        ...
    ```
*   **File Path**: `c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/src/core/simulation/tick-pipeline.ts` (lines 38-44):
    ```typescript
      run(previousState: GameState, deltaMs: number, now: number): TickResult {
        const nextState = cloneGameStateForSimulation(previousState);
        
        // Bypass de Corrupção: Restaura o ponteiro real do Float64Array destruído pelo clone
        nextState.ecs = previousState.ecs;
    
        const events = this.runInPlace(nextState, deltaMs, now, 1);
    ```
*   **File Path**: `c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/src/application/game-session.ts` (lines 2430-2440):
    ```typescript
          while (this.accumulatedMs >= tickDurationMs && ticksProcessedThisCycle < MAX_TICKS_PER_FRAME) {
            simNow = Math.max(simNow, this.currentState.meta.lastUpdatedAt) + tickDurationMs;
            const previousTick = this.currentState.meta.tick;
            const tickStartedAt = this.monotonicNow();
            
            const ecsBackup = this.currentState.ecs;
            const result = this.pipeline.run(this.currentState, tickDurationMs, simNow);
    ```
*   **File Path**: `c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/src/core/simulation/systems/utils.ts` (lines 29-33):
    ```typescript
    export function getOwnedRegionIds(state: GameState, kingdomId: KingdomId): string[] {
      let cache = ownedRegionsCache.get(state.world.regions);
      if (!cache) {
        cache = new Map<string, string[]>();
        // Preenche o cache iterando apenas UMA VEZ por tick (O(N) em vez de O(K * N log N))
    ```
*   **File Path**: `c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/src/ui/GameProvider.tsx` (lines 109-116):
    ```typescript
          // Subscribe to React state updates
          const unsubscribe = newSession.subscribe((newState) => {
            // We MUST shallow clone the state, otherwise React ignores the update because the Engine mutates the object in-place!
            setGameState({ ...newState });
          });
    
          // Since we run synchronously on mobile (no Web Worker yet), we instantly mark the worker as ready.
          newSession.markWorkerReady();
    ```

---

## 2. Logic Chain

1.  **Observation 1** (`clone-game-state.ts`) shows that state cloning uses `structuredClone` on several heavy objects (e.g., regions, kingdoms) every time a tick is run.
2.  **Observation 2** (`tick-pipeline.ts`) shows that `run` performs this deep copy on every tick execution.
3.  **Observation 3** (`game-session.ts`) reveals that during periods of high speed (such as x30), multiple ticks (up to `MAX_TICKS_PER_FRAME = 5`) are executed in a single clock cycle inside a `while` loop. This means `structuredClone` is called up to 5 times in a single frame.
4.  **Observation 4** (`utils.ts`) shows that the cache for owned regions is stored on `state.world.regions` in a `WeakMap`. Since `structuredClone` recreates this object on every single tick, the cache is instantly destroyed, forcing an O(N) traversal of all regions on every tick.
5.  **Observation 5** (`GameProvider.tsx`) shows that the simulation runs synchronously on the main thread in React Native (mobile) because no native Web Worker is instantiated.
6.  **Conclusion**: Running `structuredClone` multiple times per frame sychronously on the main thread is the primary cause of UI freezing, particularly at x30 speed.

---

## 3. Caveats

*   This is a read-only investigation. No implementations were made or committed to source files.
*   Assumed that React Native's Hermes engine performance behavior matches typical benchmarks regarding `structuredClone` overhead.
*   We did not investigate custom React Native worker native modules or WebView-based worker setups in detail, only proposed them as recommendations.

---

## 4. Conclusion

To achieve R2 (smooth x30 ticks without UI freeze) and satisfy R5 (progression rules cataloged):
1.  We have created `progression_design.md` at the project root documenting all mathematical formulas (Economy, Population, ECS, Tech, Administration, Military, and War).
2.  The UI freeze is caused by sychronous `structuredClone` execution on the JS thread.
3.  We propose:
    *   Performing **in-place mutations** on the state during intermediate ticks in a frame, and doing only one shallow clone of the root state at the end of the frame.
    *   Replacing WeakMap region caching with an incremental O(1) tracking list in the `KingdomState` object.
    *   Running the simulation in a separate thread/worker via WebView or native threading tools.

---

## 5. Verification Method

To verify the game simulation and the progression rules, you can run the existing simulation tests:
1.  **Command**: `npx tsx test-boot.ts` (Validates ruler and heirs, relationship asymmetry, ECS population growth, and building construction queue).
2.  **Command**: `npx tsx test-2000-years.ts` (Runs a headless long-term simulation to verify math stability and log outputs).
3.  Ensure `progression_design.md` exists and contains correct latex-formatted formulas mapping the systems.
