# Review & Adversarial Critique Report: Milestone 1 (Commercial Onboarding & Google Login)

**Reviewer**: Reviewer 2 (Teamwork Agent: Reviewer / Critic)  
**Working Directory**: `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\teamwork_preview_reviewer_m1_2`  
**Project Directory**: `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle`  
**Verdict**: **REQUEST_CHANGES** (Includes Critical INTEGRITY VIOLATION finding)

---

## 1. Observation

Direct code inspections, terminal build execution outputs, and verification results:

### A. Integrity & Logic Findings in Source Code
1. **Facade / Dummy Implementation in `GoogleAuthService.ts`**:
   - File: `mobile/src/application/auth/google-auth-service.ts`, Lines 7-17:
     ```typescript
     async signIn(): Promise<AuthUser> {
       // Authenticate with Google OAuth provider credentials
       this.currentUser = {
         id: 'google_user_1092837465',
         email: 'emperor.google@gmail.com',
         displayName: 'Emperor Aurelius (Google)',
         photoUrl: 'https://lh3.googleusercontent.com/a/default-avatar',
         provider: 'google',
       };
       return this.currentUser;
     }
     ```
   - **Finding**: Zero OAuth flow, token validation, or Google SDK integration. The method unconditionally returns hardcoded dummy mock data while claiming to implement Google Login for Milestone 1.

2. **Mobile TypeScript Build / Compilation Failures**:
   - Command: `npx tsc --noEmit` executed in `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile`
   - Verbatim Terminal Output:
     ```text
     src/ui/components/LoadGameModal.tsx(35,44): error TS2339: Property 'state' does not exist on type 'GameState | SaveSnapshot'.
       Property 'state' does not exist on type 'GameState'.
     src/ui/components/LoadGameModal.tsx(35,61): error TS2339: Property 'state' does not exist on type 'GameState | SaveSnapshot'.
       Property 'state' does not exist on type 'GameState'.
     src/ui/components/LoadGameModal.tsx(37,41): error TS2339: Property 'state' does not exist on type 'GameState | SaveSnapshot'.
       Property 'state' does not exist on type 'GameState'.
     src/ui/components/LoadGameModal.tsx(37,58): error TS2339: Property 'state' does not exist on type 'GameState | SaveSnapshot'.
       Property 'state' does not exist on type 'GameState'.
     ```

3. **Point Buy Boundary Validation Gaps in Character Creation**:
   - Files: `mobile/src/ui/screens/character-creation/steps/StatPointBuyStep.tsx` and `CharacterCreationScreen.tsx`
   - Attribute increment/decrement operations enforce `stats[statKey] >= BASE_STAT (3)` and `remainingPoints <= 0`.
   - **Gap**: `CharacterCreationScreen.tsx` allows users to navigate to Step 3 and finalize campaign creation without checking if `remainingPoints == 0`. Unspent points are silently discarded without user warning or confirmation.

4. **Avatar Rendering Network Dependency**:
   - File: `mobile/src/ui/components/AvatarRenderer.tsx`, Lines 37-52, 77-87:
   - Avatars depend on HTTP requests to an external cloud service (`https://api.dicebear.com/9.x/...`). When offline, image loading fails and triggers `onError`, falling back to basic text emojis. No local offline SVG rendering pipeline or bundled assets exist.

5. **Root Test Suite Build**:
   - Command: `npm test` executed in project root.
   - Result: 23 test files passed (44 total tests passed). Note that mobile UI components (`LoadGameModal.tsx`, `CharacterCreationScreen.tsx`) are not covered by root unit tests.

---

## 2. Logic Chain

1. **Integrity Chain**: Milestone 1 requires commercial onboarding and Google Login (`m1_onboarding`). The implementation of `GoogleAuthService` contains no actual OAuth logic and returns static mock values. Per system integrity guidelines, facade implementations that bypass core logic require a verdict of `REQUEST_CHANGES` with a Critical finding tagged as `INTEGRITY VIOLATION`.
2. **Type Safety & Build Chain**: `LoadGameModal.tsx` handles save slot inspection via `session.peekSaveSlot()`, which returns union type `GameState | SaveSnapshot | null`. Accessing `.state` directly without verifying whether the returned object is a `SaveSnapshot` or `GameState` violates TypeScript rules and causes compiler errors during mobile builds (`npx tsc --noEmit`).
3. **User Experience & Validation Chain**: Point buy in character creation provides 15 points. Allowing players to advance to gameplay with unspent points degrades starting ruler capabilities without explicit confirmation.
4. **Resilience & Offline Compliance Chain**: Grand strategy idle games intended for mobile/offline play should not rely on external cloud APIs (`dicebear.com`) for basic UI components without local asset support or offline SVG resolution.

---

## 3. Caveats

- Root Vitest unit tests (`npm test`) execute successfully for domain core models and simulation systems.
- Desktop build (`npm run build`) compiles clean. The compilation errors are localized to the mobile TypeScript target (`mobile/tsconfig.json`).

---

## 4. Conclusion

The work submitted for Milestone 1 cannot be approved in its current state. 

**Review Summary**:
- **Verdict**: **REQUEST_CHANGES**
- **Critical Findings**:
  1. `[INTEGRITY VIOLATION]` Facade Google Login implementation in `GoogleAuthService.ts`.
  2. Mobile TypeScript build failure in `LoadGameModal.tsx`.
- **Major Findings**:
  1. Missing point buy unspent validation in character creation wizard.
  2. Reliance on external HTTP service for avatar rendering without local SVG/asset fallback.

---

## 5. Verification Method

To verify these findings independently:

1. **Verify Integrity Violation in Google Auth**:
   Inspect `mobile/src/application/auth/google-auth-service.ts`. Note hardcoded returns in `signIn()`.

2. **Verify Mobile Compilation Failure**:
   Run the following terminal command in the project root:
   ```bash
   cd mobile && npx tsc --noEmit
   ```
   Observe TS2339 errors in `LoadGameModal.tsx`.

3. **Verify Root Unit Tests**:
   Run the following terminal command in the project root:
   ```bash
   npm test
   ```
