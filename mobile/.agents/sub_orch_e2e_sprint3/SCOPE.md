# Scope: Sprint 3 E2E Testing Track

## Architecture
- **E2E Testing Harness**: Headless test suite written in TypeScript (e.g. `test-sprint3-e2e.ts`) using the public APIs of `GameSession`, `GameState`, and simulation systems.
- **Data Flow**:
  - Test Runner initializes `GameSession` with memory repositories (`MemoryGameStateRepository`, `MemorySaveRepository`).
  - Inputs (e.g., initial state, speed settings, autosave triggers, dev mode flags, chat messages, and LLM-triggered actions) are passed directly through the public methods of `GameSession`.
  - Assertions are made on the output `GameState` or returned `PlayerActionResult`.
- **Target Components**:
  - `GameSession` (Play/Pause, speed configuration, autosave, DevMode triggers).
  - `src/core/simulation/systems/` (simulation ticks, region selection mapping).
  - `src/application/ai/gemini-service.ts` / chat panels (mock interfaces to simulate LLM chat conversations and tool calls).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Planning & Test Design | Define 82 E2E test cases across 4 tiers covering the 7 Sprint 3 features. Write SCOPE.md. | None | DONE |
| M2 | Test Infra & Harness Setup | Write test harness foundation, compile scripts, and create `TEST_INFRA.md` at project root. | M1 | DONE |
| M3 | Tier 1 (Feature Coverage) Implementation | Write the 35 feature coverage test cases (5 per feature). | M2 | DONE |
| M4 | Tier 2 (Boundary & Corner Cases) Implementation | Write the 35 edge/boundary test cases (5 per feature). | M3 | DONE |
| M5 | Tier 3 (Cross-Feature) & Tier 4 (Workloads) Implementation | Write 7 cross-feature and 5 real-world scenario test cases. | M4 | DONE |
| M6 | Test Execution & Verification | Run the E2E test suite, compile logs, resolve failures, and publish `TEST_READY.md`. | M5 | DONE |

## Interface Contracts
### E2E Test Suite ↔ GameSession
- Test Suite invokes public methods:
  - `new GameSession(...)`
  - `newSession.bootstrap(initialState)`
  - `newSession.setPaused(paused: boolean)`
  - `newSession.setSpeed(speed: number)` / `advanceTimeForTesting(ticks)`
  - `newSession.save()` / `saveToSlot(...)` / `loadFromSlot(...)`
  - `newSession.executeDevModeCommand(...)` or related dev mode state changes.
  - `newSession.sendDiplomaticChat(...)` or related chat state changes.
- Test Suite asserts on state:
  - `newSession.getState()`
  - Region owners, player region, speed, pause status, autosave slot existence, fog of war visibility.
