# Scope: Sprint 3 Implementation

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
| M1 | Exploration & Progression Doc | Scan current code math/rules, write `progression_design.md` (R5). | None | DONE |
| M2 | UI & Core Bugfixes | Fix region selection (R1), autosave slot visibility (R3), play/pause instant responsiveness (R4), and Fog of War DevMode toggle (R7). | M1 | DONE |
| M3 | AI Personalities & Performance | NPC traits generation (R6) and Tick optimization for x30 speed (R2). | M1 | DONE |
| M4 | LLM Diplomacy | Sovereign photos + stats, Chat UI with LLM API, and autonomous engine action triggers (R8). | M2, M3 | DONE |


| M5 | E2E Test Suite Integration | Phase 2: Poll for `TEST_READY.md`. Decompose and pass E2E tests Tiers 1-4. | M4 | PLANNED |
| M6 | Adversarial Hardening | Phase 3: Run Tier 5 white-box testing and coverage hardening. | M5 | PLANNED |

## Interface Contracts
### GameSession ↔ Storage (Autosave)
- Autosave format key, file detection logic, loading from autosave slot.

### CharacterCreationScreen ↔ GameSession (Region Selection)
- Selected region is preserved across all login styles (Mock, Guest, Google).

### GeminiService ↔ Core Engine (Diplomacy triggers)
- LLM response contains engine action calls (`declareWar`, `makePeace`, `makeCooperationAgreement`) which are parsed and dispatched to the game engine.
