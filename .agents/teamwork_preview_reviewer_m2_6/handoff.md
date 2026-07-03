# Review & Handoff Report — Map View Modes & Fog of War

This report contains the review findings and adversarial stress-testing for the Map View Modes (R1) and Fog of War (R2) implementations, prepared by **Reviewer M2-6**.

---

## 1. Quality Review Report

### Review Summary
- **Verdict**: **REQUEST_CHANGES**
- **Rationale**: 
  1. The Vitest test suite fails (6 tests fail in `tests/map-helpers-boundary.test.ts`) due to a conflict between color theory (desaturation naturally increases the minor color components of pure colors) and the unit tests' naive component-wise assertions.
  2. The caching mechanism `fogOfWarCache` in `mobile/src/ui/components/map/map-helpers.ts` is unbounded and lacks an eviction policy, creating a memory leak risk when rendering dynamic colors (such as manpower ratios).

### Findings

#### [Critical] Finding 1: Unit Test Failures in Saturated Color Desaturation
- **What**: 6 unit tests in `tests/map-helpers-boundary.test.ts` fail during vitest execution.
- **Where**: `tests/map-helpers-boundary.test.ts` lines 106-108:
  ```typescript
  expect(outputRgb.r).toBeLessThanOrEqual(inputRgb.r);
  expect(outputRgb.g).toBeLessThanOrEqual(inputRgb.g);
  expect(outputRgb.b).toBeLessThanOrEqual(inputRgb.b);
  ```
- **Why**: Desaturating a color (multiplying HSL saturation by `0.25`) moves it closer to the gray axis where $R=G=B$. For highly saturated primary colors (e.g., pure red `#ff0000` where green and blue are 0), desaturating *must* increase the minor components (green and blue) to reduce saturation. Consequently, the output's green and blue components increase from 0 to 33, violating the test's assertion that output components must always be less than or equal to input components.
- **Suggestion**: Update `tests/map-helpers-boundary.test.ts` to relax or remove the component-wise comparison for the non-dominant channels of primary/secondary colors. Lightness reduction is already tested on line 119, which is sufficient.

#### [Major] Finding 2: Unbounded Memory Leak Risk in `fogOfWarCache`
- **What**: The module-level variable `fogOfWarCache` is a simple `Map` that grows indefinitely.
- **Where**: `mobile/src/ui/components/map/map-helpers.ts` lines 3 and 102:
  ```typescript
  const fogOfWarCache = new Map<string, string>();
  ...
  fogOfWarCache.set(hexColor, result);
  ```
- **Why**: In `mobile/src/ui/components/WorldMapSkia.tsx`, `applyFogOfWar` is called in the render path for non-visible regions on `finalColor`. Because `finalColor` is interpolated based on dynamic float ratios (`regionManpower / maxManpower`) which change on every game tick, `applyFogOfWar` will receive a continuous stream of new, unique color hex strings. Since `fogOfWarCache` has no size limits, eviction policy, or clearing mechanism, it will leak memory and grow indefinitely over a long game session.
- **Suggestion**: 
  - Wrap the interpolation factor in `WorldMapSkia.tsx` using discrete steps (e.g., round to the nearest `0.05` or `0.1`) to limit the total number of possible dynamic colors.
  - Implement a bounded cache (e.g., maximum 500-1000 items) or use an LRU eviction strategy for `fogOfWarCache`.
  - Alternatively, since the uncached HSL transformation takes less than `0.25 ms` for a standard map of 1,000 regions, evaluate if the cache is necessary at all.

### Verified Claims
- **TypeScript compiles without errors**: Verified via `npx tsc --noEmit` -> **PASS**
- **Visibility adjacency rules**: Verified via `tests/map-view-modes-fow.test.ts` that visibility correctly propagates to 1-hop neighbors of player-owned/controlled and allied regions -> **PASS**
- **Performance budget under scale**: Verified via `tests/map-helpers-stress.test.ts` that visibility calculation for 5,000 regions takes `< 16.6ms` (one frame budget) -> **PASS**

### Coverage Gaps
- None. The test suite covers boundary conditions, scale benchmarks, and correctness of visibility rules.

### Unverified Items
- None.

---

## 2. Adversarial Review Report

### Challenge Summary
- **Overall risk assessment**: **MEDIUM** (due to memory leak potential in the mobile UI during long-running sessions, and broken test builds blocking CI/CD pipelines).

### Challenges

#### [High] Challenge 1: Out of Memory / Cache Growth under Long Sessions
- **Assumption challenged**: That the set of hex colors passed to `applyFogOfWar` is small and static.
- **Attack scenario**: An idle game running for hours with continuously changing manpower values on the map. This generates hundreds of thousands of unique float-interpolated hex colors.
- **Blast radius**: Continuous heap memory accumulation in the Javascript engine, leading to degradation of mobile app performance, lag during panning/zooming, and eventual app crashes.
- **Mitigation**: Discretize the interpolation ratio before converting to hex, or apply a bounded LRU eviction strategy on `fogOfWarCache`.

#### [Medium] Challenge 2: Saturated Primary Colors Fail Validation Assertions
- **Assumption challenged**: That HSL desaturation can be performed while strictly keeping all RGB components below or equal to their input counterparts.
- **Attack scenario**: Standard unit testing of primary faction colors (e.g. bright red `#ff0000` or bright green `#00ff00`) under Fog of War.
- **Blast radius**: The build pipeline is broken as unit tests fail on these standard boundary inputs.
- **Mitigation**: Correct the naive test assertions in `tests/map-helpers-boundary.test.ts`.

### Stress Test Results
- **Dynamic Color Generation (100,000 unique entries)**: Ran in `24.08 ms`, but resulted in the permanent storage of 100,000 strings in `fogOfWarCache` Map, demonstrating the lack of bounds -> **FAIL (Memory Safety)**
- **Visibility Performance (5,000 regions)**: Ran in `~4.5 ms` (well under the 16.6 ms frame budget) -> **PASS**

---

## 3. Handoff Protocol (5-Component Handoff Report)

### 1. Observation
- **Exact File Paths**:
  - `mobile/src/ui/components/map/map-helpers.ts` (Fog of War & Visibility logic)
  - `tests/map-helpers-boundary.test.ts` (Failing boundary tests)
  - `mobile/src/ui/components/WorldMapSkia.tsx` (Usage of `applyFogOfWar`)
- **Failing Command & Result**:
  - Ran `npx vitest run`. Output:
    ```
    FAIL  tests/map-helpers-boundary.test.ts > Map Helpers Boundary Conditions > applyFogOfWar > correctly processes highly saturated red (#ff0000)
    FAIL  tests/map-helpers-boundary.test.ts > Map Helpers Boundary Conditions > applyFogOfWar > correctly processes highly saturated green (#00ff00)
    FAIL  tests/map-helpers-boundary.test.ts > Map Helpers Boundary Conditions > applyFogOfWar > correctly processes highly saturated blue (#0000ff)
    AssertionError: expected 33 to be less than or equal to 0
    ```
- **Code constructs**:
  - `fogOfWarCache` definition in `map-helpers.ts:3`: `const fogOfWarCache = new Map<string, string>();`
  - Relative HSL scaling: `map-helpers.ts:76-78`:
    ```typescript
    const targetS = s * 0.25;
    const targetL = l * 0.35;
    ```

### 2. Logic Chain
1. `applyFogOfWar` scales saturation relatively (`targetS = s * 0.25`).
2. Saturated primary colors (e.g., `#ff0000`) have minor channels equal to 0 ($G=0, B=0$).
3. To desaturate a primary color, its minor channels must increase towards the gray axis ($R=G=B$).
4. The resulting hex has non-zero values for minor channels (e.g., $G=33, B=33$), which is correct color behavior.
5. The unit tests in `tests/map-helpers-boundary.test.ts` assert that output RGB values must be less than or equal to input RGB values component-wise.
6. This assertion fails because $33 > 0$, causing the test suite to fail.
7. Furthermore, `finalColor` in `WorldMapSkia.tsx` depends on the float value of a region's manpower ratio. This generates a continuous stream of distinct colors that are cached permanently in `fogOfWarCache`.
8. The lack of eviction in `fogOfWarCache` means the heap will accumulate these values indefinitely.

### 3. Caveats
- Since this is a review-only task, no changes were made to the implementation or test files.
- We assume that the developer's intent was to perform a real HSL desaturation. If they only wanted a simple opacity overlay or linear color blend (which wouldn't require HSL conversion and wouldn't suffer from this caching/cardinality issue), that would be an alternative design.

### 4. Conclusion
The implementation of the relative HSL transformation and visibility rules is correct, but:
1. The unit tests in `tests/map-helpers-boundary.test.ts` contain invalid color-theory assertions, causing 6 test failures.
2. The caching mechanism in `map-helpers.ts` introduces memory leak risks during long-running sessions due to dynamic color inputs.
The code compiles cleanly, but changes must be made to the test suite assertions and the caching strategy before approval.

### 5. Verification Method
To verify:
1. Run `npx tsc --noEmit` to confirm compilation.
2. Run `npx vitest run` to observe the 6 failures in `map-helpers-boundary.test.ts` and confirm all other 74 tests pass.
