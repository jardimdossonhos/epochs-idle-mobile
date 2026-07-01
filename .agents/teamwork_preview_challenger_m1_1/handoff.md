# Adversarial Challenge & Stress-Test Report: Milestone 1 (Commercial Onboarding & Google Login)

## 1. Observation

During empirical stress-testing and audit of Milestone 1 (`m1_onboarding`), the following facts, file locations, line numbers, and tool outputs were directly observed:

### A. Test Suite Status
Executing `npm test` via terminal output:
```
> vitest run
Test Files  23 passed (23)
     Tests  44 passed (44)
  Duration  5.69s
```
All existing 44 tests pass. However, unit tests covering character creation state validation, stat point buy limits, culture bonuses, or Google OAuth integration are absent.

### B. Character Creation Point Buy & Stat Bounds Validation
- In `mobile/src/ui/screens/character-creation/steps/StatPointBuyStep.tsx` (lines 17-46), point buy allocation is controlled purely in the UI component via local state (`TOTAL_BUDGET = 15`, `BASE_STAT = 3`).
- In `mobile/src/ui/screens/character-creation/CharacterCreationScreen.tsx` (lines 75-81):
```typescript
stats: {
  administration: stats.ADM,
  martial: stats.MAR,
  diplomacy: stats.DIP,
  intrigue: stats.INT,
  learning: stats.LRN,
}
```
- In `src/application/boot/create-initial-state.ts` and `mobile/src/application/boot/create-initial-state.ts`, no validation or sanitization is performed on ruler character stats when passed to `session.bootstrap()`.
- Empirical test script (`m1_verification.test.ts`) output when injecting `{ ADM: 999, MAR: -10, DIP: 50, INT: NaN, LRN: 100 }`:
```
[TEST 5] Stress testing stat allocation boundaries and point buy bypass...
Exploited Ruler Stats: { administration: 999, martial: -10, diplomacy: 50, intrigue: NaN, learning: 100 }
=> RESULT: No runtime validation exists on ruler character creation stats; exploited stats are accepted directly into state.
```

### C. Culture Attributes Discrepancy
- In `mobile/src/ui/screens/character-creation/steps/CultureSelectStep.tsx` (lines 10-20), cultures advertise specific mechanical trait bonuses in the UI:
  - `nordic`: `traitBonus: '+2 Martial, +1 Intrigue'`
  - `latin`: `traitBonus: '+2 Administration, +1 Diplomacy'`
  - `eastern`: `traitBonus: '+2 Learning, +1 Administration'`
- In `CharacterCreationScreen.tsx` (lines 66-86), when creating `rulerCharacter`, `stats` are copied directly from point buy without adding any cultural bonuses.
- Empirical test script output when selecting Nordic culture:
```
[TEST 4] Verifying whether Culture Trait Bonuses are applied to ruler character stats...
Chosen Culture: nordic
UI Promised Bonus: +2 Martial, +1 Intrigue
Actual Stats in Character State: { administration: 5, martial: 5, diplomacy: 5, intrigue: 3, learning: 3 }
=> RESULT: Culture trait bonuses shown in UI are fake/cosmetic text strings and NEVER applied to ruler stats.
```
- Furthermore, in `src/core/simulation/systems/character-system.ts` and `culture-generator.ts`, culture IDs have no mechanical simulation hooks attached in the core engine.

### D. Starting Region Selection & Malformed Input Exploit
- In `mobile/src/ui/screens/character-creation/steps/TerritorySelectStep.tsx` (lines 18-51), 4 starting regions are presented: `r_hex_10286` (Temperate Fertile Valley), `r_hex_10287` (Coastal Haven), `r_hex_10288` (Arid Mountain Frontier), `r_hex_10289` (Great Steppe Plains), promising yield bonuses like `+15% Food Production`, `+20% Tariff Income`, `+25% Iron Production`, and `+20% Cavalry Speed`.
- Inspecting `WORLD_DEFINITIONS_V1`: all 4 hexes have `biome: "temperate"`. The biomes ("Coastal", "Arid", "Steppe") and resource yield bonuses displayed in the UI are unbacked by engine definitions.
- In `create-initial-state.ts` (lines 393-396):
```typescript
function spawnCluster(kingdomId: string, centerId: string) {
  const center = defsById[centerId];
  if (!center || center.isWater) return;
```
- Empirical test script output when passing an invalid region ID (`r_hex_nonexistent_99999`):
```
[TEST 3] Testing exploitation of invalid/water region ID in createInitialState...
Player Capital Region ID: 
Player Owned Regions Count: 0
=> RESULT: Passing an invalid region breaks player capital assignment (capitalRegionId is empty/undefined, player has 0 regions).
```

### E. Google Authentication Implementation
- In `mobile/src/application/auth/google-auth-service.ts` (lines 7-17):
```typescript
async signIn(): Promise<AuthUser> {
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
- empirical test script output:
```
[TEST 1] Testing GoogleAuthService implementation...
User signed in: { id: 'google_user_1092837465', email: 'emperor.google@gmail.com', ... }
=> RESULT: GoogleAuthService is completely hardcoded/mocked. No OAuth or SDK calls occur.
```


## 2. Logic Chain

1. **Premise 1**: Security and state integrity in local-first/idle games require runtime engine validation of user-submitted initial parameters, because client UI components can be bypassed or manipulated.
2. **Step 1 (Point Buy Validation)**: From Observation B, `StatPointBuyStep` limits points in React UI state, but `CharacterCreationScreen` passes raw values directly to `createInitialState` and `GameSession.bootstrap()`. As proven by Test 5, negative, oversized, or NaN stat values are accepted into game state without throwing errors or clamping values, leading to potential exploits in calculation systems.
3. **Step 2 (Culture Discrepancy)**: From Observation C, `CultureSelectStep` promises stat additions (e.g. +2 Martial for Nordic). However, `CharacterCreationScreen` does not apply these additions, leaving the character with only baseline point buy stats (Test 4). This constitutes a misleading UI promise and game balance discrepancy.
4. **Step 3 (Territory Selection Fragility)**: From Observation D, `TerritorySelectStep` presents biomes and bonuses not backed by `WORLD_DEFINITIONS_V1`. Furthermore, `spawnCluster` in `create-initial-state.ts` silently fails when given an invalid or water region ID, leaving `capitalRegionId` empty and assigning 0 regions to the player (Test 3).
5. **Step 4 (Commercial Onboarding Status)**: From Observation E, `GoogleAuthService.signIn()` returns hardcoded mock data without any OAuth protocol or Capacitor Native Plugin integration. Thus, real commercial Google Authentication is incomplete.


## 3. Caveats

- **Scope of UI interaction**: Tests were conducted via empirical TypeScript test harnesses interacting directly with the domain services, `createInitialState`, and React data models, rather than clicking through an active React Native app instance on device/emulator.
- **Save file manipulation**: Save game loading validation of hacked characters was not exhaustively tested against all simulation tick systems beyond initial bootstrap.


## 4. Conclusion

Milestone 1 code is functionally functional in standard happy-path UI usage, with all 44 test suite tests passing. However, adversarial analysis identified four key failure modes and integration gaps:
1. **Unvalidated Character Stat Allocation**: Lack of engine-level contract validation on character stats allows client bypass and arbitrary stat injection (CRITICAL exploit potential).
2. **Phantom Culture Bonuses**: Advertised culture trait bonuses (+2 ADM, +2 MAR, etc.) are purely cosmetic text strings and never modify ruler stats (MEDIUM UX/balance defect).
3. **Fragile Region Assignment & Misleading Biomes**: Region selection biomes/bonuses in UI do not match engine definitions, and invalid region inputs silently corrupt player capital initialization (HIGH stability risk).
4. **Mocked Google Login**: Commercial Google Auth is hardcoded mock data, requiring real OAuth/Capacitor implementation for production release (HIGH feature gap).


## 5. Verification Method

To independently verify all findings:
1. Run standard unit tests:
   `npm test`
2. Run the empirical verification harness provided in the challenger workspace:
   `npx tsx .agents/teamwork_preview_challenger_m1_1/m1_verification.test.ts`
3. Inspect code references:
   - `mobile/src/ui/screens/character-creation/CharacterCreationScreen.tsx`: lines 75-81 & 127-158
   - `mobile/src/ui/screens/character-creation/steps/CultureSelectStep.tsx`: lines 10-20
   - `mobile/src/application/boot/create-initial-state.ts`: lines 393-396
   - `mobile/src/application/auth/google-auth-service.ts`: lines 7-17
