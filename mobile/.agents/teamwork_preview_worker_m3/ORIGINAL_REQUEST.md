## 2026-07-10T10:57:29Z
You are teamwork_preview_worker_m3.
Your working directory is: c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/.agents/teamwork_preview_worker_m3/
Your parent conversation ID is: 2c32fe3f-0327-496e-b1f9-65c93610ccdc.

Your task is to implement the following Sprint 3 requirements:
- R2: Otimização de Performance (Velocidade x30) - ensure smooth ticks without UI freeze.
- R6: Aleatoriedade e Personalidade das IAs - NPC kingdoms generate random traits/options and distinct gameplay profiles (gender, culture, phenotypes, Dicebear photo assets, and stats in bounds [1, 20]).

Please read the handoff and analysis reports from:
1. Explorer 2 (Performance optimization R2 and current code progression R5): `c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/.agents/teamwork_preview_explorer_m1_2/handoff.md` and `analysis.md`
2. Explorer 3 (AI Randomness & personalities R6 and LLM chat R8): `c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/.agents/teamwork_preview_explorer_m1_3/handoff.md` and `analysis.md`

Summary of changes to make:
- For R2: Avoid doing `structuredClone` for intermediate ticks in a frame simulation loop. Perform in-place mutations of game state during intermediate ticks, doing only one shallow/necessary clone at the end of the tick loop to trigger React state updates. Re-architect or optimize `getOwnedRegionIds` to avoid WeakMap invalidation (for example, maintain owned region lists incrementally in the kingdom state or cache them efficiently without triggering O(N) recalculations on every tick).
- For R6: Implement the sovereign generator inside `create-initial-state.ts` ( rulers) and `character-system.ts`/`generateHeir` (for heirs). Rulers/NPCs should generate distinct traits from a predefined list of `SOVEREIGN_TRAITS` (which modify their stats and behaviors, e.g., militarism, expansion rate, trust). Stats should be randomized in the range [1, 20]. Ensure the photo rendering in `AvatarRenderer.tsx` respects the sovereign's gender, culture, and phenotype (by configuring specific Dicebear options like disabling facial hair for female sovereigns and using culture-specific skin/hair options).

MANDATORY INTEGRITY WARNING:
"DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected."

Requirements for completion:
1. Apply the code modifications carefully.
2. Run typescript checks (`npx tsc --noEmit`) and the sprint 3 E2E test suite (command in `TEST_READY.md`) to make sure they compile and pass.
3. Write your implementation report `changes.md` and your final `handoff.md` in your final working directory.
