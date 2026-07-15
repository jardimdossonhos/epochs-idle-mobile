# Project: Epochs Idle Mobile Adjustments

## Architecture
- **Navigation/HUD**: App.tsx holds the top-level tab navigator (`MainTabs`) and rendering of `<TopHUD />` and `<EventPopup />`.
- **Automation/Simulation**: core/simulation/systems/automation-system.ts processes automation ticks for Economy, Defense, Construction, Expansion, Technology, and Diplomacy.
- **Session API**: application/game-session.ts manages the game session, exposes state/methods, and coordinates saves.
- **UI screens**: src/ui/screens/ has MapScreen, GovScreen, and MenuScreen.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Mapping | Inspect codebase and locate relevant components and automation logic. | None | DONE |
| 2 | R1: TopHUD Restriction | Restrict TopHUD exclusively to MapScreen in App.tsx. | M1 | DONE |
| 3 | R2: Engine & Session | Implement chaplain/religion automation and add session setters for toggles. | M1 | DONE |
| 4 | R2: UI Controls | Create the Automation panel in MenuScreen.tsx. | M2, M3 | DONE |
| 5 | Verification | Verify type safety, unit tests, boot test, and layout. | M4 | DONE |

## Interface Contracts
- **GameSession API**:
  - `setEconomyAutomation(level: AutomationLevel): void`
  - `setDefenseAutomation(level: AutomationLevel): void`
  - `updateAutomationDirective(key: string, enabled: boolean): void`
  - `toggleGlobalAutomation(active: boolean): void`
