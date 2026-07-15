# Project: Epochs Idle Mobile Adjustments - Sprint 2

## Architecture
- **Clock & Session**: src/application/game-session.ts manages the tick pipeline and runs the simulation loop.
- **Simulation Engine**: src/core/simulation/systems/ manages systems like population, council, character, migration, and automation.
- **Map Component**: src/ui/components/WorldMapSkia.tsx renders hexes using React Native Skia.
- **UI Panels & Screens**: src/ui/screens/ and src/ui/components/ handle user interactions, Settings, Menu, and Region Detail Panel.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Core Engine & Clock | Fix clock freeze, diplomatic mirroring, AI expansion, and candidate generation. | None | DONE |
| 2 | Building Construction UI | Add building progress queues, progress bar in Region panel, and building icons on map. | M1 | DONE |
| 3 | Map Interactivity & Zoom | Make map territories clickable and enable zoom gestures. | M1 | DONE |
| 4 | Territorial Merger | Add merged polygon rendering, merged view toggle, attributes aggregation, and auto-construction allocation. | M3 | DONE |
| 5 | DevMode Relocation | Relocate DevMode trigger to the Settings screen footer. | M1 | DONE |
| 6 | 2000-Year Headless Test | Implement and verify the 2000-year headless simulation script. | M1 | DONE |
| 7 | Verification & Audit | Perform final review, challengers check, and run the Forensic Auditor. | M2, M4, M5, M6 | DONE |

## Interface Contracts
### GameSession ↔ UI Screens
- `bootstrap(initialState: GameState)`: starts clock ticks automatically.
- `state.ecs.populationTotal`: updated by population-system to enable AI expansion.
- `RegionState.constructionQueue`: list/object of structures in progress.
- `WorldMapSkia`: exposes interactive tap gestures mapping coordinates to region hexes.
- `DevMode`: activated via settings footer.
