## 2026-06-29T16:36:22Z

You are the Worker for Milestone 1: Commercial Onboarding & Google Login (m1_onboarding).
Working directory: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\teamwork_preview_worker_m1_1
Project directory: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle
Scope document: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\orchestrator\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task Scope & Requirements:
Implement Milestone 1 (Commercial Onboarding & Google Login) cleanly according to the architecture designed by Explorer 1 and Explorer 3:
1. Google Authentication & App Lifecycle Flow:
   - Create mobile/src/application/auth/auth-types.ts, auth-service.ts, mock-auth-service.ts, google-auth-service.ts, and mobile/src/ui/context/AuthContext.tsx.
   - Create mobile/src/ui/screens/AuthScreen.tsx with medieval UI styling for Google Sign-In, Mock Login (dev mode), and Guest option.
   - Update mobile/App.tsx root navigation state machine (appState: 'splash' | 'auth' | 'main_menu' | 'character_creation' | 'in_game').
2. Main Menu Overhaul & Load Game Modal:
   - Create mobile/src/ui/screens/MainMenuScreen.tsx displaying user profile, "New Game" button, and "Load Game" button.
   - Create mobile/src/ui/components/LoadGameModal.tsx listing save slots from session.listSaveSlots() with Kingdom Name, Culture, Year, and saved date. Clicking a slot calls session.loadSlot(slotId) and starts simulation.
3. Character Creation Wizard & Offline Avatars:
   - Create mobile/src/ui/screens/character-creation/CharacterCreationScreen.tsx managing a 4-step wizard.
   - Create CultureSelectStep.tsx supporting all 9 historical cultures from culture-generator.ts (nordic, latin, eastern, desert, celtic, slavic, savanna, indigenous, vedic).
   - Create StatPointBuyStep.tsx with base stats 3 across ADM, MAR, DIP, INT, LRN and 15 point buy budget.
   - Create TerritorySelectStep.tsx to choose starting region playerStartRegionId.
   - Create AvatarAppearanceStep.tsx and AvatarRenderer.tsx handling DiceBear avatar customization with robust offline SVG/emoji fallbacks.
   - Inject chosen character parameters into initial game state boot.
4. Unit Tests & Verification:
   - Add unit tests in tests/auth.test.ts using InMemoryAuthRepository / mock auth services.
   - Run npm test and verify all tests pass without errors.
   - Verify mobile boot script via npx ts-node mobile/test-boot.ts or test runners.

Produce your handoff report in c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\teamwork_preview_worker_m1_1\handoff.md with build and test results. Communicate your final status via send_message.
