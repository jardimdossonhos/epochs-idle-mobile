# Project: Epochs Idle Quality Sprint

## Architecture
Epochs Idle is a grand strategy idle game built using React Native + Expo + TypeScript for the mobile app, and a TypeScript backend state engine. The core logic runs inside `GameSession.ts` with ECS state, tick pipeline, and state repository persistence.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: User Switch & i18n | Troca de Usuário (R1) on MainMenuScreen; Simple i18n system in PT-BR/EN-US (R2) on SettingsScreen and across screens. | none | DONE |
| 2 | M2: HUD Clock & Auto-Save | Fix clock months skipping (R3) in TopHUD; Fix auto-save storage and slot "auto-1" display/load (R4). | M1 | DONE |
| 3 | M3: Secret Developer Mode | Secret developer mode panel (R5) under title clicks with 9 dev tools (a-i) integrated with GameSession. | M1, M2 | DONE |
| 4 | M4: Audit & Performance | CPU debt warnings, un-awaited async calls, memory leaks, and typescript build validation (R6). | M1, M2, M3 | DONE |
| 5 | M5: E2E Verification & Acceptance | Integration verification against E2E test suite. | M1, M2, M3, M4 | DONE |

## Interface Contracts
### `AuthContext` ↔ `MainMenuScreen`
- Profile banner is clickable and initiates user switch action (triggers logout, clears session, navigates to `AuthScreen`).

### `i18n` System ↔ Application Screens
- Lightweight translation service supporting PT-BR (default) and EN-US.
- `SettingsScreen` allows toggle between languages. All labels update reactively.

### `GameSession` ↔ `DevMode` Panel
- DevMode panel modifies `GameSession` state properties or calls methods directly (e.g. `tickDurationMs`, resources, research completion, kingdoms data).

## Code Layout
- `mobile/src/ui/screens/MainMenuScreen.tsx` - Main menu screen with user profile & Easter Egg trigger
- `mobile/src/ui/screens/AuthScreen.tsx` - Login/Auth screen
- `mobile/src/ui/context/AuthContext.tsx` - Auth context/session
- `mobile/src/ui/screens/SettingsScreen.tsx` - Settings screen (languages toggle)
- `mobile/src/ui/components/TopHUD.tsx` - HUD showing resources and clock
- `mobile/src/application/game-session.ts` - Main game session state and simulation loop
- `mobile/src/ui/components/LoadGameModal.tsx` - Load game modal showing save slots including "auto-1"
