## 2026-07-03T12:15:17Z
Implement the solutions designed in `C:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\orchestrator\synthesis.md` for Milestone 1 (R1 and R2).
Your tasks:
1. Wrap the profile banner in `mobile/src/ui/screens/MainMenuScreen.tsx` in a `TouchableOpacity`. Tap opens an alert dialog with options to log out/switch account ("Trocar de Conta"). Prevent target collision by changing the inner touchable button to a regular `View`.
2. Enhance `mobile/src/ui/context/AuthContext.tsx` logout logic to properly call provider-specific sign-out actions (mock-auth, google-auth, guest-auth) to clean the provider login session before saving `null`.
3. Design and implement a simple React-based i18n Context (`I18nProvider` / `useLanguage` / translation files) in the mobile app. The default language must be Brazilian Portuguese ('pt-BR'), and English ('en-US') must be supported.
4. Replace hardcoded English and Portuguese strings with translated keys on:
   - `MainMenuScreen.tsx`
   - `AuthScreen.tsx`
   - `SettingsScreen.tsx`
   - `LoadGameModal.tsx`
   - `TopHUD.tsx`
   - `App.tsx` (navigation tab labels)
   - `SplashScreen.tsx`
5. Implement a clean language toggle UI in `SettingsScreen.tsx`.
6. Make `GeminiService.ts` respect the selected locale from `AsyncStorage`. Dynamically select standard fallbacks and append language instruction to prompt commands.
7. Verify your work by compiling the codebase (`npx tsc --noEmit` inside `mobile/`) and run the test suite (if any exists in `mobile/`) to ensure all tests pass. If any tests failed, fix them.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please report your findings and implementation details in `handoff.md` inside your directory `C:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\teamwork_preview_worker_m1_1`.
