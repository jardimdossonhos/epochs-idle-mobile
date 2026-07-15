## 2026-07-07T12:30:23Z

You are a worker agent. Your task is to implement Milestone 1 (Core Engine & Clock Fixes) for Epochs Idle mobile.

Please perform the following tasks:
1. Fix Clock/Engine Freeze:
   - In `src/application/game-session.ts`, modify the `bootstrap` method to call `this.start()` so that when starting a "New Game", the engine clock tick loop starts immediately, instead of waiting for a save slot load.
2. Fix court candidate generation and succession locks:
   - In `src/application/boot/create-initial-state.ts`, initialize a valid ruler character (age ~30, birthTick = -360) and 2 heir characters (age ~8, birthTick = -96) for each kingdom (except k_nature). Add these characters to the `state.world.characters` object, and link them to the kingdom's `rulerId` and `heirs` list. You can import `generateCulturalName`, `generatePortraitSeed`, and `getRandomGender` from `../../core/simulation/systems/culture-generator` (or relative path depending on file) to generate cultural names/genders/portraits based on the kingdom's culture.
   - In `src/core/simulation/systems/council-system.ts`, modify the yearly candidate generation check (`state.meta.tick % 12 === 0`) to be tick-independent so that offline progress/ticks scale jump doesn't skip generation. Use the context's `tickScale` to check if a year boundary has been crossed during the step (e.g. `Math.floor(state.meta.tick / 12) !== Math.floor((state.meta.tick + (context.tickScale ?? 1)) / 12)`).
   - In `src/core/simulation/systems/character-system.ts`, modify the character tick modulo check (`state.meta.tick % 12 === 0`) to be tick-independent (using `context.tickScale`) so that character aging and deaths are processed correctly during offline ticks and tick jumps.
3. Fix AI inactivity & expansion:
   - In `src/core/simulation/systems/population-system.ts`, modify the population system to also update/grow the region-specific population values in `context.nextState.ecs.populationTotal` (for each region owned by the kingdom) based on the region's initial growth rate in `context.nextState.ecs.populationGrowthRate` and any growth penalty, so that AI region populations can grow past the migration threshold (150) and expand. You'll need to pass `orderedDefinitions` to the population system (update its creation signature in `create-default-systems.ts` and `population-system.ts`).
4. Fix relational metrics mirroring:
   - In `src/infrastructure/diplomacy/local-diplomacy-resolver.ts`, introduce asymmetry in how trust and rivalry are updated on tick (incorporating acting kingdom archetype/personality attributes and a slight deterministic/sinusoidal fluctuation based on the tick and relation values) so that diplomacy values between player and AI, and AI and AI, evolve independently and are not mirrored.

Verification:
Compile the test harness and run it:
`npx tsc test-boot.ts --outDir dist-test --module commonjs --target es2022 --moduleResolution node --skipLibCheck --ignoreConfig --ignoreDeprecations 6.0 --resolveJsonModule`
`node dist-test/test-boot.js`
It should return SUCCESS.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your changes and build results to handoff.md in your working directory: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\.agents\teamwork_preview_worker_engine_sprint2
