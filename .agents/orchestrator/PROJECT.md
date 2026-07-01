# Project: Epochs Idle v1.0 Master Roadmap

## Architecture
Epochs Idle is a historical medieval incremental grand strategy game built with React Native / Expo and a core typescript ECS / state engine (`GameSession`).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Milestone 1 (m1_onboarding) | Epic 1: Google Login, Main Menu, Character Creation (9 cultures, Point Buy, Territory, DiceBear fallback) | none | DONE |
| 2 | Milestone 2 (m2_vector_map) | Epic 2: Interactive 2D SVG Vector Map, Fog of War, Clickable regions/armies, Engine bindings | M1 | PLANNED |
| 3 | Milestone 3 (m3_idle_mode) | Epic 3: Supreme Idle Mode, Government Guidelines Panel, Automated kingdom focus & allocation | M1, M2 | PLANNED |
| 4 | Milestone 4 (m4_cloud_ai) | Epic 4: Gemini Cloud AI integration, Dynamic event text, AI dialogue, offline fallback | M1 | PLANNED |
| 5 | Milestone 5 (m5_integration) | E2E Integration, Android Build verification, zero console errors, performance audit | M1-M4 | PLANNED |

## Code Layout
- `src/domain/` & `src/core/`: Core entities, ECS systems, game state models
- `src/application/`: GameSession, services, managers, boot routines
- `mobile/src/`: React Native screens, UI components, hooks, assets
