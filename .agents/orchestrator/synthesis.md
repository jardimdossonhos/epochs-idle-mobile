# Synthesis: Milestone 1: User Profile Switch (R1) & PT-BR i18n (R2)

## Consolidated Exploration Findings

### 1. User Profile Switch (R1)
- The profile banner is located at `mobile/src/ui/screens/MainMenuScreen.tsx` (lines 17–36).
- To make it clickable, wrap the profile content in `<TouchableOpacity style={styles.profileBanner} onPress={handleProfilePress}>`.
- The nested logout button (`TouchableOpacity` with style `styles.logoutButton`) should be converted to a simple visual indicator (like a `<View style={styles.logoutButton}>`) to avoid touch target nesting conflicts.
- On press, the app should open a confirmation alert `Alert.alert("Trocar de Conta", "Deseja realmente sair e trocar de conta?", [...])`.
- If the user confirms, we invoke a clean logout.
- Currently, `AuthContext.tsx` only calls `saveUser(null)` when logging out. This does not invoke the provider-specific sign-out. Specifically for Google Sign-In, we need to call `GoogleSignin.signOut()` so the browser session is properly cleared, allowing the user to select a different account next time.
- In `mobile/App.tsx`, changing `authStatus` to `'unauthenticated'` automatically switches the app navigation to `'auth'`, routing the user back to `AuthScreen.tsx`.

### 2. PT-BR Internationalization (R2)
- Text strings are hardcoded in English and Portuguese across multiple files: `MainMenuScreen.tsx`, `AuthScreen.tsx`, `SettingsScreen.tsx`, `LoadGameModal.tsx`, `TopHUD.tsx`, `App.tsx`, and `SplashScreen.tsx`.
- We will implement a custom lightweight translation system based on React Context (`LanguageContext` and `I18nProvider`) loaded at the top of `App.tsx` (or inside a separate helper file).
- The language provider will store the selected locale (PT-BR or EN-US) in `AsyncStorage` under the key `'epochs_user_locale'`.
- Define translation dictionaries for `pt-BR` and `en-US` containing all hardcoded UI strings.
- Add a custom hook `useLanguage()` returning the translation function `t()` and language management state.
- Update UI components to use `t('key')` instead of hardcoded labels.
- For bottom tab navigator labels in `App.tsx`, retrieve translations dynamically from the `useLanguage` context.
- Update `SettingsScreen.tsx` to include a language selector UI (PT-BR and EN-US buttons) that calls `changeLocale()`.
- Update `GeminiService.ts` to read `'epochs_user_locale'` from `AsyncStorage` and adjust:
  - System prompts (specifying output language).
  - Offline fallbacks (reloading/matching the target language fallback arrays).
