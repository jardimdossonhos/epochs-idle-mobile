# Project: Epochs Idle Mobile - Sprint 3

## Architecture
- **Navigation/Screens**:
  - `src/ui/screens/character-creation/CharacterCreationScreen.tsx`: Select region and login flow.
  - `src/ui/screens/MapScreen.tsx`: Map visualization, Fog of War, play/pause controls, zoom, region panel.
  - `src/ui/screens/DiplomacyScreen.tsx`: Sovereign profiles, interactive chat UI.
  - `src/ui/screens/SettingsScreen.tsx`: DevMode configurations.
  - `src/ui/components/LoadGameModal.tsx`: Lists available saves (including autosave).
- **Core Engine & Simulation**:
  - `src/core/simulation/`: Handles tick logic, speed controls (x30), game state updates.
  - `src/application/game-session.ts`: Orchestrates save/load and high-level commands.
  - `src/application/ai/gemini-service.ts`: Integration with Gemini API for LLM diplomacy.
  - `src/core/models/npc.ts` & `src/core/models/diplomacy.ts`: NPC sovereign traits and system calls.

## Code Layout
- `src/core/`: Game state models, components, systems.
- `src/application/`: Game session manager, save manager, auth service, LLM service.
- `src/ui/`: UI components, screens, contexts, provider.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | E2E Testing Track | Create the full E2E test suite (Tiers 1-4) covering all Sprint 3 requirements. | None | PLANNED |
| M2 | Exploration & Documentation | Explore code for Sprint 3, write `progression_design.md` (R5). | None | PLANNED |
| M3 | Core & UI Fixes (R1, R3, R4, R7) | Fix Region Selection, Autosave slot visibility, Play/Pause delay, and DevMode FOW. | M2 | PLANNED |
| M4 | Performance & AI Logic (R2, R6) | Optimize engine for x30 speed, implement IA traits, personality and randomness. | M2 | PLANNED |
| M5 | LLM Diplomacy (R8) | Implement Sovereign profiles, chat UI, and LLM autonomous engine system calls. | M3, M4 | PLANNED |
| M6 | Final Verification | Run E2E test suite (Tiers 1-4) and adversarial testing (Tier 5) on implemented changes. | M1, M5 | PLANNED |

## Interface Contracts
- **LLM Diplomacy Integration**:
  - Chat request inputs and engine action triggers (e.g., function calling schema for `declareWar`, `proposePeace`, `makeCooperationAgreement`).
  - GameSession hooks for LLM action dispatching.
- **Autosave Reading & Management**:
  - Consistent naming and indexing of auto-saves in local storage / session APIs.
- **Region Setup Hook**:
  - Ensure start state generator respects initial region input.
