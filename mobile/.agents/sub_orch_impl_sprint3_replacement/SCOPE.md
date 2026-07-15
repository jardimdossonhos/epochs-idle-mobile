# Scope: Sprint 3 Implementation (Replacement Track)

## Architecture
- **UI Screen & Views**:
  - `src/ui/screens/character-creation/CharacterCreationScreen.tsx`: Selection of starting territory.
  - `src/ui/screens/MapScreen.tsx`: Map rendering, FOW toggle, Play/Pause control panel.
  - `src/ui/screens/DiplomacyScreen.tsx`: LLM chat UI and Sovereign stats/profile.
  - `src/ui/components/LoadGameModal.tsx`: Lists available saves including autosave.
- **Application & Game Services**:
  - `src/application/game-session.ts`: Handles game saving, loading, ticks, play/pause state.
  - `src/application/ai/gemini-service.ts`: Integrates with LLM API (Gemini).
- **Core Models & Simulation**:
  - `src/core/simulation/`: Handles tick optimization for speed x30.
  - `src/core/models/npc.ts` & `src/core/models/diplomacy.ts`: AI traits, profiles, and state machine transitions.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Verify R1-R8 & Run M4 Verification | Verify R1-R8 implementation and run 2x Reviewers, 2x Challengers, and 1x Forensic Auditor for Milestone 4 & overall project. | None | IN_PROGRESS |
| M2 | E2E Test Integration | Run full E2E test suite (82 test cases in Tiers 1-4) on the verified codebase. | M1 | PLANNED |
| M3 | Adversarial Hardening | Phase 3: generate and run Tier 5 white-box testing/coverage hardening. | M2 | PLANNED |

## Interface Contracts
### GameSession ↔ Storage (Autosave)
- Autosave format key, file detection logic, loading from autosave slot.

### CharacterCreationScreen ↔ GameSession (Region Selection)
- Selected region is preserved across all login styles (Mock, Guest, Google).

### GeminiService ↔ Core Engine (Diplomacy triggers)
- LLM response contains engine action calls (`declareWar`, `makePeace`, `makeCooperationAgreement`) which are parsed and dispatched to the game engine.
