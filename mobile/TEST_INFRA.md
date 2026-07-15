# Sprint 3 E2E Test Infrastructure & Verification

This document outlines the testing infrastructure, architecture, and verification methods for the Sprint 3 E2E test suite.

## 1. Test Philosophy
- **Opaque-Box Testing**: Testing against the public interface of the core `GameSession` and simulation systems, rather than internal details.
- **Headless & Fast**: Running tests programmatically in TypeScript/Node.js using memory-based repositories (`MemoryGameStateRepository`, `MemorySaveRepository`, `MemoryCommandLogRepository`, `MemorySnapshotRepository`) to avoid slow UI or storage operations.
- **Deterministic and Reliable**: Bypassing flaky calculations and random factors (e.g. using a deterministic `nextRandom` roll override) to ensure that the core state transition logic is strictly validated.
- **Multi-Tiered Coverage**: Verification organized across four progressive tiers, ranging from single-feature tests to complex, real-world application scenarios.

---

## 2. Feature Inventory
The E2E test suite validates the 7 key features of Sprint 3:
1. **Feature 1: Region Selection (Universal)**: Google/Guest login, starting region selection, capital placement, and region attributes validation.
2. **Feature 2: Performance x30 & Play/Pause Responsiveness**: Pausing ticking, speed multipliers up to x30, play/pause toggle responsiveness, and stability during transitions.
3. **Feature 3: Autosave Slot Visibility & Loading**: Slot creation, slot listing, persistence across reboots, loading state, overwrite behavior, and corruption handling.
4. **Feature 4: DevMode Fog of War Toggle**: Enabling DevMode, disabling FOW to reveal all boundaries, rendering state sync, and ensuring FOW restricts access when DevMode is inactive.
5. **Feature 5: Sovereign Profile Details**: Verification of active NPC sovereign demographics (photo URL/asset reference, culture, gender, stats in bounds [1, 20], profile uniqueness, and trait conflict resolution).
6. **Feature 6: LLM Chat Panel & Conversation**: Conversational history initialization, message posting, receiving NPC replies, chat history size limits, personality match prompts, and timeout handling.
7. **Feature 7: LLM Autonomous Engine Action Triggers**: Parsing LLM response actions, triggering `declareWar`, `proposePeace`, `makeCooperationAgreement`, handling invalid JSON/commands, and validating preconditions.

---

## 3. Test Architecture
The test runner is implemented in `test-sprint3-e2e.ts` and operates under a 4-tier structure:

### Tiers Definition
- **Tier 1: Feature Coverage (35 test cases)**: 5 tests per feature validating core functionality.
- **Tier 2: Boundary & Corner Cases (35 test cases)**: 5 tests per feature validating boundary values, invalid inputs, fallback logic, rate limits, and corrupted/malformed inputs.
- **Tier 3: Cross-Feature Combinations (7 test cases)**: Pairwise integration tests (e.g., speed controls combined with autosave, LLM actions during pause, DevMode profile stats).
- **Tier 4: Real-world Application Scenarios (5 test cases)**: Integrated, long-running game simulation sessions mapping actual player journeys.
- **Total Suite size**: 82 test cases.

### Execution Command
The test suite is compiled and run programmatically:
```bash
# Compilation:
npx tsc test-sprint3-e2e.ts --outDir dist-test --module commonjs --target es2022 --moduleResolution node --skipLibCheck --ignoreConfig --ignoreDeprecations 6.0 --resolveJsonModule

# Run suite:
node dist-test/test-sprint3-e2e.js
```

---

## 4. Tier 4 Scenarios
The suite validates 5 complex user journeys representing real-world workloads:
- **T4_1_FullGameStartupToSave**: Simulates game startup (Guest login, North region), play/pause toggles, x5 speed ticking, sending chat messages, triggering manual and autosave, and verifying save persistence.
- **T4_2_DiplomaticCrisisWarNPeace**: Simulates starting a game, chatting with a hostile sovereign, triggering a `declareWar` command from LLM response, simulating war progress at x30 speed, negotiating a peace treaty via chat, paying gold tribute, and restoring peace.
- **T4_3_DevModeInspectionTour**: Simulates enabling DevMode, disabling FOW, scanning 3 NPC sovereign profiles to verify demographics (gender, culture, stats), and re-enabling FOW to verify FOW is restored.
- **T4_4_AutosaveRecoveryScenario**: Simulates running the game at x30 speed for 5 years (60 ticks), triggering an autosave, simulating an app crash (destroying session state), rebuilding a recovered session, loading from the autosave slot, and verifying state (year/ticks) recovery.
- **T4_5_MultiKingdomAllianceSovereigns**: Simulates chatting with two separate sovereigns, forming cooperation agreements (alliances) with both, verifying multilateral treaties exist, and running the simulation at x30 speed to verify diplomatic stability.

---

## 5. Coverage Thresholds
- **Pass Rate**: 100% of the 82 test cases must compile and execute successfully with zero failures and zero crashes.
- **Execution Time**: The entire test suite must compile and execute in under 30 seconds.
- **Type Safety**: TypeScript compilation of `test-sprint3-e2e.ts` must pass cleanly without compile errors.
