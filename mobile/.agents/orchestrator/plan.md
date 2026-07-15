# Project Plan - Epochs Idle Mobile Adjustments

## Architecture & Requirements Map
- **R1: TopHUD Restriction**
  - Limit `<TopHUD />` rendering to `"Map"` tab in `mobile/App.tsx`.
- **R2: Idle Mode Controls**
  - Extend `automation-system.ts` to support automated religion (sending missionaries under `religious_mission` directive).
  - Add session methods in `game-session.ts` for setting Economy, Defense, and updating Master automation.
  - Implement Automation control panel in `MenuScreen.tsx` with toggles for Economy, Religion, Defense, and a Master toggle.

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Mapping | Inspect codebase to locate HUD, navigation, and automation logic. | None | DONE |
| 2 | R1: TopHUD Restriction | Hide TopHUD on all tabs except the MapScreen in App.tsx. | M1 | PLANNED |
| 3 | R2: Engine & Session | Implement Religion automation system and session control methods. | M1 | PLANNED |
| 4 | R2: UI Controls | Build the Automation panel in MenuScreen.tsx. | M2, M3 | PLANNED |
| 5 | Verification | Verify type safety, unit tests, boot test, and code layout. | M4 | PLANNED |
