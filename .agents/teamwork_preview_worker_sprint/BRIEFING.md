# BRIEFING — 2026-07-03T19:26:30Z

## Mission
Implement requirements R3, R4, R5, and R6 for the Epochs Idle game.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\teamwork_preview_worker_sprint\
- Original parent: 64ba23d1-8721-4da6-a847-0e30f08685fd
- Milestone: Sprint Implementation

## 🔒 Key Constraints
- CODE_ONLY network mode: No external network/websites/HTTP requests.
- No dummy/facade implementations. Every implementation must maintain real state and produce real behavior.
- Follow minimal change principle. Do not perform unrelated refactorings.

## Current Parent
- Conversation ID: 64ba23d1-8721-4da6-a847-0e30f08685fd
- Updated: not yet

## Task Summary
- **What to build**:
  - R3: HUD Clock Month Skips (visual tick interpolator in `TopHUD.tsx`).
  - R4: Autosave slot `auto-1` in `game-session.ts`, `GameProvider.tsx`, and `LoadGameModal.tsx`.
  - R5: Secret Developer Mode Panel toggled by 5 taps on "EPOCHS" in `MainMenuScreen.tsx`, including 9 specific tools linked to the `GameSession`.
  - R6: Performance Audit & Cleanup (await autosave in AppState, fix CPU debt resume warning in `game-session.ts`, translate English UI texts, fix memory leak in `GameProvider.tsx`, verify typescript compile & tests).
- **Success criteria**: Verification of all changes, tests pass, no compiler errors.
- **Interface contracts**: ECS game engine and UI components.
- **Code layout**: Source in `mobile/src/`.

## Key Decisions Made
- [TBD]

## Change Tracker
- **Files modified**: None yet.
- **Build status**: Unknown.
- **Pending issues**: None.

## Quality Status
- **Build/test result**: Unknown.
- **Lint status**: Unknown.
- **Tests added/modified**: None.

## Loaded Skills
- None.

## Artifact Index
- None.
