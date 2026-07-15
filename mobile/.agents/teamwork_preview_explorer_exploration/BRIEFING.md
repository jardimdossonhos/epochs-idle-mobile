# BRIEFING — 2026-07-06T18:18:14Z

## Mission
Investigate the Epochs Idle mobile codebase to identify HUD components, navigation/routing details, the Menu tab, state management (Idle Mode settings), and test execution instructions.

## 🔒 My Identity
- Archetype: explorer
- Roles: Teamwork explorer
- Working directory: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\.agents\teamwork_preview_explorer_exploration
- Original parent: 7e80f69d-0654-4b1c-9741-2fa222ed257d
- Milestone: codebase-investigation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Mobile codebase focus

## Current Parent
- Conversation ID: 7e80f69d-0654-4b1c-9741-2fa222ed257d
- Updated: yes

## Investigation State
- **Explored paths**:
  - `mobile/App.tsx`
  - `mobile/src/ui/components/TopHUD.tsx`
  - `mobile/src/ui/screens/MapScreen.tsx`
  - `mobile/src/ui/screens/MenuScreen.tsx`
  - `mobile/src/ui/screens/GovScreen.tsx`
  - `mobile/src/ui/GameProvider.tsx`
  - `mobile/src/application/game-session.ts`
  - `mobile/src/core/simulation/systems/automation-system.ts`
  - `mobile/src/core/models/administration.ts`
  - `mobile/test-boot.ts`
  - `package.json` (root and mobile)
  - `tests/` (root tests folder)
- **Key findings**:
  - TopHUD is rendered in `AppContent` inside `App.tsx` and defined in `src/ui/components/TopHUD.tsx`.
  - Navigation uses React Navigation bottom tabs. The active tab can be checked via `useNavigationState` or `useIsFocused` or a container ref.
  - The Menu screen is defined in `src/ui/screens/MenuScreen.tsx`.
  - State management uses `GameProvider` exposing `GameSession` and `GameState`. Automation uses `AutomationLevel` on `administration.automation`.
  - Tests are built/run via Vitest `npm run test` in the root project, and `npx tsx test-boot.ts` in the mobile project.
- **Unexplored areas**: none (all user questions answered).

## Key Decisions Made
- Completed read-only investigation and compiled findings.

## Artifact Index
- c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\.agents\teamwork_preview_explorer_exploration\handoff.md — Main findings and analysis report
