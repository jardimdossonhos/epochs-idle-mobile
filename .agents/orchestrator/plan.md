# Development Plan: Epochs Idle Quality Sprint

This plan details the milestones to deliver the Quality Sprint, fixing bugs and implementing features R1 through R6 in ORIGINAL_REQUEST.md.

## Milestones

### Milestone 1: User Profile Switch & PT-BR i18n (R1, R2)
- **Goal**: Implement profile banner user switch on `MainMenuScreen.tsx` and i18n translation system (PT-BR default / EN-US) across screens with settings toggle.
- **Key Deliverables**:
  - Profile banner button click handler and dialog to log out/redirect to `AuthScreen`.
  - Simple, robust i18n system with translation files/dictionaries.
  - Multi-language support on all screens.
  - Language selector in `SettingsScreen.tsx`.

### Milestone 2: Clock Month Render & Auto-Save slot "auto-1" (R3, R4)
- **Goal**: Fix HUD clock skips and resolve the empty `auto-1` auto-save slot issue.
- **Key Deliverables**:
  - Month/year state change reactive propagation to HUD to ensure every single month tick renders without skips.
  - Integration of `await` inside `doCommitAutosave()` in `GameSession.ts` to guarantee disk write completion.
  - Verify `LoadGameModal.tsx` reads from the same repository and visualizes slot "auto-1" correctly as "Auto Save".

### Milestone 3: Secret Developer Mode Panel (R5)
- **Goal**: Create a hidden developer menu screen/modal activated by clicking 5 times on the "EPOCHS" title of `MainMenuScreen.tsx`.
- **Key Deliverables**:
  - Click listener on the "EPOCHS" title in `MainMenuScreen.tsx` with a tap counter and reset timer.
  - Dark mode panel (`#0D1117`) implementing all 9 tools (a to i) dynamically connected to the `GameSession` state.
  - UI indication ("MODO DESENVOLVEDOR ATIVO") and closing/re-opening mechanisms.

### Milestone 4: Code Audit, Performance & Validation (R6)
- **Goal**: Search for un-awaited async calls, adjust CPU debt parameters, fix memory leaks, clean leftover English texts, and ensure full TypeScript compilation.
- **Key Deliverables**:
  - Detailed Audit Report documenting bug findings and corrections.
  - Resolved `[SYS-PERF]` debt warning by adjusting simulation queue clamping.
  - Checked clean build (`npx tsc --noEmit` compiles successfully).
