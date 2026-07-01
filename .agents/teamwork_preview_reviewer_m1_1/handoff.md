# Milestone 1 (m1_onboarding) Authentication Review & Adversarial Report

## Review Summary

**Verdict**: REQUEST_CHANGES

---

## Findings

### [Critical] Finding 1: Tagged as INTEGRITY VIOLATION — Dummy / Facade Implementation for Google Authentication
- **What**: `GoogleAuthService` is a facade / dummy implementation that returns static hardcoded test user data and implements no real Google OAuth logic.
- **Where**: `mobile/src/application/auth/google-auth-service.ts`, lines 7-17.
- **Why**: Milestone 1 is titled "Commercial Onboarding & Google Login / m1_onboarding". The implementation file comments state `// Authenticate with Google OAuth provider credentials`, but `signIn()` simply returns a static hardcoded object:
  ```typescript
  this.currentUser = {
    id: 'google_user_1092837465',
    email: 'emperor.google@gmail.com',
    displayName: 'Emperor Aurelius (Google)',
    photoUrl: 'https://lh3.googleusercontent.com/a/default-avatar',
    provider: 'google',
  };
  ```
  No Google OAuth SDK (e.g. `@react-native-google-signin/google-signin` or `expo-auth-session`) is installed in `mobile/package.json` or imported in code. Per reviewer system instructions, dummy implementations that bypass required logic must receive a verdict of `REQUEST_CHANGES` with an `INTEGRITY VIOLATION` tag.
- **Suggestion**: Integrate real Google authentication using Expo AuthSession or `@react-native-google-signin/google-signin` with client IDs and proper token handling.

### [Major] Finding 2: Root Navigation Stale Closure and State Synchronization Bug
- **What**: Stale closure bug in `AppContent` in root navigation hook.
- **Where**: `mobile/App.tsx`, lines 144-155.
- **Why**: In `AppContent`:
  ```typescript
  useEffect(() => {
    if (isAuthLoading) {
      setAppState('splash');
      return;
    }

    if (authStatus === 'unauthenticated') {
      setAppState('auth');
    } else if (appState === 'splash' || appState === 'auth') {
      setAppState('main_menu');
    }
  }, [authStatus, isAuthLoading]);
  ```
  `appState` is referenced inside `useEffect` to condition state transitions (`appState === 'splash' || appState === 'auth'`), but `appState` is missing from the dependency array `[authStatus, isAuthLoading]`. This violates React hook rules and creates stale closure issues where state transitions may misfire when `authStatus` changes asynchronously.
- **Suggestion**: Include `appState` in the dependency array or refactor state transition logic using standard state machine handlers.

### [Major] Finding 3: Missing Test Coverage for Auth Context & UI Components
- **What**: `tests/auth.test.ts` only unit-tests in-memory mock objects and does not verify actual UI authentication integration or storage persistence.
- **Where**: `tests/auth.test.ts`.
- **Why**: The test suite does not render or test `AuthContext.tsx`, `AuthScreen.tsx`, `AsyncStorage` serialization/deserialization error cases, or navigation routing in `App.tsx`.
- **Suggestion**: Add comprehensive unit and integration tests for `AuthProvider`, `AuthScreen`, and storage persistence handling.

### [Minor] Finding 4: Memory Leak Risk on Async Auth Restoration
- **What**: Unhandled promise resolution updating state on unmounted components.
- **Where**: `mobile/src/ui/context/AuthContext.tsx`, lines 36-54.
- **Why**: `loadSavedUser` performs async calls (`AsyncStorage.getItem`). If `AuthProvider` unmounts prior to promise resolution, state setters (`setUser`, `setAuthStatus`, `setIsLoading`) will execute on an unmounted component.
- **Suggestion**: Add an `isMounted` flag cleanup inside `useEffect`.

### [Minor] Finding 5: Mobile TypeScript Compilation Errors
- **What**: `npx tsc --noEmit` in `mobile/` fails.
- **Where**: `mobile/src/ui/components/LoadGameModal.tsx` and `mobile/src/core/simulation/systems/character-system.ts`.
- **Why**: Running `npx tsc --noEmit` in `mobile` outputs property access errors (`Property 'state' does not exist on type 'GameState | SaveSnapshot'`).
- **Suggestion**: Fix type definitions in `LoadGameModal.tsx` and `character-system.ts`.

---

## 5-Component Handoff Report

### 1. Observation
- **Code Inspection**: Checked `mobile/src/application/auth/google-auth-service.ts` lines 7-17. `GoogleAuthService.signIn()` hardcodes static JSON user object without external library calls.
- **Dependency Audit**: Inspected `mobile/package.json`. No OAuth libraries (`expo-auth-session`, `@react-native-google-signin/google-signin`) are listed in dependencies.
- **Navigation Inspection**: Inspected `mobile/App.tsx` lines 144-155. `appState` is used in `useEffect` logic without being included in the dependency array `[authStatus, isAuthLoading]`.
- **Test Execution**: Ran `npm test`. Output: 23 test files passed (44 tests total).
- **TypeScript Verification**: Ran `npx tsc --noEmit` in `mobile`. Command failed with exit code 1 due to type errors in `LoadGameModal.tsx` and `character-system.ts`.

### 2. Logic Chain
1. Milestone 1 requires "Commercial Onboarding & Google Login".
2. Direct inspection of `GoogleAuthService.ts` proves that `signIn()` returns hardcoded static user data (`emperor.google@gmail.com`).
3. Package dependencies confirm no real Google OAuth libraries are present.
4. Per system instructions, a facade/dummy implementation attempting to pass off mock data as a feature implementation constitutes an INTEGRITY VIOLATION.
5. Therefore, the required verdict is `REQUEST_CHANGES`.

### 3. Caveats
- No native Android or iOS device testing was conducted as native builds are not part of the unit test suite.
- Root repository `npm test` passes, but `mobile/` local TypeScript checks fail.

### 4. Conclusion
The implementation of authentication in Milestone 1 cannot be approved in its current state due to a Critical Integrity Violation in `GoogleAuthService` (dummy facade implementation), alongside major navigation state hook bugs and lack of component test coverage.

### 5. Verification Method
- Run `npm test` in root directory (`c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle`).
- Run `npx tsc --noEmit` in `mobile` directory.
- Inspect `mobile/src/application/auth/google-auth-service.ts` to verify if real Google OAuth logic replaces hardcoded data.
