# BRIEFING — 2026-07-09T19:18:10Z

## Mission
Explore the codebase to identify progression math/rules and simulation loop performance bottlenecks, and prepare progression document structure and optimization recommendations.

## 🔒 My Identity
- Archetype: explorer
- Roles: Teamwork explorer
- Working directory: c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/.agents/teamwork_preview_explorer_m1_2/
- Original parent: 2c32fe3f-0327-496e-b1f9-65c93610ccdc
- Milestone: Sprint 3 (Performance optimization R2 and Progression design document R5)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Analyze mathematical formulas and rules currently used for progression
- Identify performance bottlenecks in the simulation tick loop, especially for x30 speed
- Propose design/layout for `progression_design.md`

## Current Parent
- Conversation ID: 2c32fe3f-0327-496e-b1f9-65c93610ccdc
- Updated: 2026-07-09T19:18:10Z

## Investigation State
- **Explored paths**:
  - `src/core/simulation/tick-pipeline.ts`
  - `src/core/utils/clone-game-state.ts`
  - `src/application/game-session.ts`
  - `src/core/simulation/systems/` (economy, population, military, technology, administration, event-chain, disaster, victory)
  - `src/infrastructure/` (war, diplomacy, runtime, worker)
- **Key findings**:
  - Main simulation bottleneck is the synchronous deep copy `structuredClone` of all game entities on the main thread for every tick inside the frame-accumulation loop.
  - Territory caching in `getOwnedRegionIds` is invalidated every tick due to changing object references, and has a stale-cache bug within the same tick.
  - Progression math uses complex feedback loops (productivity, taxation efficiency, logistic population growth, war score pressure, etc.).
- **Unexplored areas**: None.

## Key Decisions Made
- Wrote `progression_design.md` at project root documenting math and rules.
- Documented findings in `analysis.md` and `handoff.md`.

## Artifact Index
- c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/.agents/teamwork_preview_explorer_m1_2/BRIEFING.md — Briefing file
- c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/.agents/teamwork_preview_explorer_m1_2/progress.md — Progress heartbeat
- c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/.agents/teamwork_preview_explorer_m1_2/analysis.md — Detailed analysis report
- c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile/.agents/teamwork_preview_explorer_m1_2/handoff.md — Handoff report
- c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/progression_design.md — Progression document at project root
