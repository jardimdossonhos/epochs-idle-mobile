# Handoff Report: Existing Test Harnesses & Milestone 1 Test Strategy

## Summary
Existing test infrastructure relies on Vitest (`v3.0.8`) with 22 test files (41 unit/integration tests) located in `tests/`. Test harnesses use in-memory ports (`InMemoryGameStateRepository`, `InMemorySaveRepository`, `ManualClock`, `InMemoryEventBus`). There are currently zero test suites covering authentication or Google Login. Save slots and GameSession boot are extensively covered by deterministic integration tests. Milestone 1 implementation can be verified safely without breaking existing suites by introducing decoupled authentication interfaces and matching test files under `tests/` or `src/`.

---

## 1. Observation

### 1.1 Test Configuration & Execution Baseline
- **Configuration File**: `vite.config.ts` lines 26-28:
  ```ts
  test: {
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"]
  }
  ```
- **Root Package Script**: `package.json` line 13:
  ```json
  "test": "vitest run"
  ```
- **Execution Output (`npm test`)**:
  ```
  Test Files  22 passed (22)
       Tests  41 passed (41)
    Start at  13:35:38
    Duration  4.89s
  ```
- **Mobile Environment**: `mobile/package.json` does not declare a `test` script. However, `mobile/test-boot.ts` exists as an standalone executable script testing `GameSession.bootstrap()` in mobile contexts.

### 1.2 Catalog of Existing Test Files
The 22 test files in `tests/` cover:
1. `tests/save-slots.test.ts` (1 test): Verifies `AUTOSAVE_SLOT_ID` ("auto-1") and `MANUAL_SLOT_ID` ("manual-1").
2. `tests/save-and-load-audit.test.ts` (3 tests): Verifies autosave on refresh, manual save slots, and priority between current state and autosave.
3. `tests/save-schema-migration.test.ts` (1 test): Verifies migration of legacy save formats to schema v2.
4. `tests/build-save-summary.test.ts` (1 test): Verifies generation of save metadata summaries.
5. `tests/game-session-advance-time.test.ts` (1 test): Verifies `advanceTimeForTesting()` behavior.
6. `tests/game-session-command-snapshot.test.ts` (1 test): Verifies command logs and periodic snapshots.
7. `tests/game-session-player-actions.test.ts` (3 tests): Verifies regional actions, diplomacy cooldowns, and research targets.
8. `tests/sync-coordinator.test.ts` (1 test): Verifies push/pull command synchronization.
9. Domain & system suites (12 files): `automation-system.test.ts`, `command-chain.test.ts`, `event-chain-system.test.ts`, `identifiers.test.ts`, `local-war-resolver.test.ts`, `religion-influence-system.test.ts`, `render-game-to-text.test.ts`, `rule-based-npc-decision-service.test.ts`, `stable-hash.test.ts`, `technology-effects-service.test.ts`, `tick-pipeline-batch.test.ts`, `world-activity-dynamics.test.ts`, `world-map-asset.test.ts`, `world-state-global.test.ts`.

### 1.3 Test Harness Architecture & Mocks
In `tests/save-and-load-audit.test.ts` (lines 22-182) and `tests/game-session-player-actions.test.ts` (lines 20-154), test harnesses define in-memory mocks implementing domain contracts:
- `InMemoryGameStateRepository`: implements `GameStateRepository` (`loadCurrent`, `saveCurrent`, `clearCurrent`, `loadCurrentSync`, `saveCurrentSync`, `clearCurrentSync`).
- `InMemorySaveRepository`: implements `SaveRepository` (`saveToSlot`, `loadFromSlot`, `listSlots`, `deleteSlot`, `clearAll`).
- `ManualClock` / `FakeClock`: implements `ClockService` (`now`, `start`, `stop`, `advance`).
- `InMemoryEventBus`: implements `EventBus` (`publish`, `subscribe`).
- **WebWorker / Handshake Mock**: Session bootstrap connects to `eventBus`:
  ```ts
  eventBus.subscribe("game.loaded", (event) => {
    session.updateEcsState(event?.payload?.ecs ?? ({} as any));
  });
  ```

### 1.4 Authentication Test Coverage
- A search across all `.ts`, `.tsx`, and `.js` files for `auth` and `Google` revealed **zero authentication unit tests or implementations** in `src/` or `tests/`.

---

## 2. Logic Chain

1. **Premise 1 (Test Scope)**: `vite.config.ts` includes `tests/**/*.test.ts` and `src/**/*.test.ts`. Any new `.test.ts` file placed in `tests/` or `src/` will automatically be detected and executed by `npm test`.
2. **Premise 2 (Harness Coupling)**: Existing tests depend heavily on clean contract abstractions (`GameStateRepository`, `SaveRepository`, `ClockService`, `EventBus`). The `GameSession` is instantiated with dependency injection via `GameSessionDeps`.
3. **Premise 3 (Auth Gap)**: Milestone 1 introduces Commercial Onboarding & Google Login (`m1_onboarding`). Since 0 authentication tests exist, M1 requires introducing new contracts (e.g., `AuthRepository` or `GoogleAuthProvider` interface) and matching unit tests (e.g., `tests/auth-service.test.ts`).
4. **Premise 4 (Save Slots & Boot Integrity)**: Save slots and session boot are already verified against regressions via `save-slots.test.ts`, `save-and-load-audit.test.ts`, and `game-session-advance-time.test.ts`. Extending save functionality for cloud account linking must preserve existing slot ID constants (`auto-1`, `manual-1`) or extend them cleanly without breaking `SaveSnapshot` schema.
5. **Conclusion**: Milestone 1 unit tests can be added seamlessly without breaking existing tests by strictly adhering to dependency injection contracts, providing mock implementations (`InMemoryAuthRepository`, `MockGoogleAuthProvider`) in test harnesses, and placing test files in `tests/` or `src/`.

---

## 3. Caveats

- **Playwright E2E Tests**: Playwright tests (`tests/e2e/`) were not executed during this run as they require a running web/desktop instance or local browser server. Unit tests (`vitest`) were fully executed and verified.
- **Mobile Test Runner Integration**: React Native / Expo components inside `mobile/src/` are not currently in `vite.config.ts`'s default `include` pattern (`tests/**/*.test.ts`, `src/**/*.test.ts`). If component tests for React Native screens (e.g. `LoginScreen`) are added in `mobile/`, either `vite.config.ts` must add `"mobile/src/**/*.test.ts"` or an Expo/Jest test setup must be configured.

---

## 4. Conclusion

Existing test harnesses in Epochs Idle are robust, modular, and green (22 files, 41 tests passing). Game session boot and local save slots are fully protected by unit and audit tests. To verify Milestone 1 implementation without breaking existing tests:
1. Define clean interfaces/ports for Google Authentication and User Profiles in `src/core/contracts/` or `src/application/ports/`.
2. Provide `InMemoryAuthRepository` and `MockGoogleAuthProvider` in test utilities for unit testing authentication flows.
3. Place new unit tests under `tests/auth.test.ts` or `src/application/auth/__tests__/auth-service.test.ts`.
4. Maintain backwards compatibility for `AUTOSAVE_SLOT_ID` and `MANUAL_SLOT_ID` when linking save slots to Google user accounts.

---

## 5. Verification Method

To independently verify the test suite baseline and check for regressions after implementing Milestone 1:

1. **Run Unit & Integration Suite**:
   ```powershell
   npm test
   ```
   *Expected Result*: All 22 test files (41 tests) pass within ~5 seconds.
2. **Run TypeScript & Build Validation**:
   ```powershell
   npm run build
   ```
   *Expected Result*: TypeScript compilation (`tsc -b`) and Vite bundling succeed without errors.
3. **Verify Mobile Boot Script**:
   ```powershell
   npx ts-node mobile/test-boot.ts
   ```
   *Expected Result*: Output ends with `SUCCESS`.
4. **Invalidation Conditions**:
   - Any test failure in `tests/save-slots.test.ts` or `tests/save-and-load-audit.test.ts`.
   - Modifying `GameSessionDeps` constructor without providing backward-compatible defaults or mock implementations in existing test suites.
