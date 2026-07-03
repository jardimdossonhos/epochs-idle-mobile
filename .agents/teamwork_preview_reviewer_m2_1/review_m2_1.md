# Review Report - Map View Modes & Fog of War

## Review Summary

**Verdict**: REQUEST_CHANGES

The implementation of the Skia-based World Map is highly performant and uses native gestures for smooth navigation. The unit tests are passing successfully. However, there are significant correctness, robustness, and compilation issues in the `mobile` project that need to be addressed before approval.

---

## Findings

### [Major] Finding 1: Correctness - Economy View Mode for Unclaimed/Unsimulated Regions
- **What**: Unclaimed or unsimulated regions are incorrectly rendered as fully productive (colored in gold/yellow `#E5C05C`).
- **Where**: `mobile/src/ui/components/WorldMapSkia.tsx` (lines 287-295)
- **Why**: In `economy` view mode, the code calculates productivity for all regions using `autonomy`, `unrest`, `devastation`, and `assimilation`. If `regionState` is missing/undefined, these values default to `0` (or `1` for assimilation), resulting in a calculated `productivity` of `1.0` (100%). This colors unclaimed/unsimulated regions gold, giving a false economic representation.
- **Suggestion**: Ensure that unclaimed or unsimulated regions (where `regionState` is missing or `ownerId === 'unclaimed'` or empty) default to the default unclaimed background color (`#151924`) or the base unproductive color (`#2A3E5C`).

### [Major] Finding 2: Robustness - Unclamped Color Interpolation & NaN Vulnerability
- **What**: `interpolateColor` does not validate or clamp the `factor` parameter, leading to potential crashes or invalid hex colors.
- **Where**: `mobile/src/ui/components/WorldMapSkia.tsx` (lines 60-84)
- **Why**: If regional state values contain `NaN` or result in `NaN` (such as division by zero or missing stats), `factor` becomes `NaN`, and `interpolateColor` returns `"#NaNNaNNaN"`, which will crash the Skia rendering canvas. Additionally, factors outside `[0, 1]` (e.g. from negative stats or assimilation > 1) will produce out-of-bounds RGB values resulting in malformed hex strings.
- **Suggestion**: Validate `factor` to ensure it is a finite number, clamp it to the `[0, 1]` range, and clamp output RGB values to `[0, 255]`.

### [Major] Finding 3: Test Integrity - Replicated Helpers in Unit Tests
- **What**: Unit tests in `tests/map-view-modes-fow.test.ts` replicate code from the production component.
- **Where**: `tests/map-view-modes-fow.test.ts` (lines 3-119)
- **Why**: The unit tests verify local copies of `interpolateColor`, `applyFogOfWar`, and `calculateVisibility` instead of importing them from `WorldMapSkia.tsx`. This means any regression in the production file will go undetected by the test suite.
- **Suggestion**: Extract these pure functions into a standalone utility file (e.g. `mobile/src/ui/utils/mapHelpers.ts`) and import them in both `WorldMapSkia.tsx` and the test file.

### [Critical] Finding 4: TypeScript Verification - Compilation Failures in Mobile Workspace
- **What**: Running TypeScript type checking in the `mobile` workspace fails with 5 compiler errors.
- **Where**: `mobile/src/application/game-session.ts`, `mobile/src/core/simulation/systems/council-system.ts`, and `mobile/src/ui/components/WorldMapSvg.tsx`.
- **Why**: The typescript errors are:
  1. `src/application/game-session.ts(711,3): error TS2393: Duplicate function implementation.`
  2. `src/application/game-session.ts(1567,10): error TS2393: Duplicate function implementation.`
  3. `src/application/game-session.ts(1574,32): error TS2339: Property 'directives' does not exist on type 'AdministrationState'.`
  4. `src/core/simulation/systems/council-system.ts(351,30): error TS2552: Cannot find name 'getOwnedRegionIds'. Did you mean 'ownedRegionIds'?`
  5. `src/ui/components/WorldMapSvg.tsx(124,13): error TS7022: 'regionState' implicitly has type 'any' because it does not have a type annotation and is referenced directly or indirectly in its own initializer.`
- **Suggestion**: Correct duplicate implementation and property issues to restore clean compilation of the mobile target.

---

## Verified Claims

- **All tests pass** → Verified via `npm run test` on the root workspace → **PASS** (58 tests passed, including `map-view-modes-fow.test.ts`).
- **Smooth Gestures & Wrap-around** → Checked `WorldMapSkia.tsx` logic → **PASS** (uses Skia `Canvas` and Gesture handlers with seamless modulo wrapping on the X-axis).
- **Fog of War Visibility Calculation** → Verified logic → **PASS** (incorporates player-controlled regions, allied regions, and their neighbors, correctly applying Fog of War shading to unseen tiles).

---

## Coverage Gaps

- **Direct Component Rendering Verification** — risk level: Low — recommendation: Set up visual regression or integration tests using React Native Testing Library.
- **Mobile TypeScript Verification** — risk level: Medium — recommendation: Resolve active compilation issues in `mobile` workspace.

---

## Unverified Items

- **Actual UI interaction smoothness** — reason not verified: Physical/emulator testing was not possible in this review environment.

---

## Challenge Report (Adversarial Review)

**Overall risk assessment**: MEDIUM

### [Medium] Challenge 1: Invalid Color Rendering Crash
- **Assumption challenged**: The input `factor` passed to `interpolateColor` is always a valid number in `[0, 1]`.
- **Attack scenario**: A simulation bug resulting in `NaN` or negative values for regional stats (e.g., negative unrest or assimilation > 1) propagates to the UI. The helper `interpolateColor` produces malformed hex color codes like `"#NaNNaNNaN"`, crashing Skia canvas rendering.
- **Blast radius**: Total screen blank/freeze in Map View.
- **Mitigation**: Strict clamping and validation inside `interpolateColor`.

### [Medium] Challenge 2: Test Discrepancy
- **Assumption challenged**: Unit tests in `tests/map-view-modes-fow.test.ts` guarantee correct application styling.
- **Attack scenario**: The actual implementation in `WorldMapSkia.tsx` is edited incorrectly (e.g. wrong color value or typo), but because the unit tests use duplicated helper functions, the tests continue to pass.
- **Blast radius**: Undetected visual bugs in production code.
- **Mitigation**: Move helper functions to a pure TypeScript file and import them in the tests.
