# Handoff Report: Map View Modes (R1) & Fog of War (R2)

This report details the objective review and adversarial stress-testing of the Map View Modes (R1) and Fog of War (R2) implementation.

## 1. Observation

### File & Implementation Details
- **`mobile/src/ui/components/map/map-helpers.ts`**:
  - Contains interpolation logic for colors (`interpolateColor` at lines 9-38), Fog of War CPU-level relative desaturation/darkening (`applyFogOfWar` at lines 44-104 with cache wrapper at line 3/45), visibility lookup (`isRegionVisible` at lines 109-111), and visibility set precomputation (`calculateVisibility` at lines 117-151).
- **`mobile/src/ui/components/WorldMapSkia.tsx`**:
  - Precomputes visible regions at the start of the `useMemo` pass (`calculateVisibility` at line 86).
  - Groups paths by resolved color to minimize draw calls and ensure smooth performance (lines 122-126, 238).
  - Applies Fog of War colors for non-visible regions on the CPU using `applyFogOfWar` during the geometry path generation loop (lines 233-236).
  - Implements 4 view modes (`owner`, `religion`, `economy`, `military`) with distinct color resolutions (lines 160-230).
- **`mobile/src/ui/screens/MapScreen.tsx`**:
  - Implements the vertical Floating Action Button (FAB) stack for selecting view modes (lines 58-90).
  - The FAB column is conditionally hidden if a region detail panel (`selectedRegionId`) or the region list (`showRegionList`) is active (line 59).
  - Passes the selected `viewMode` state down to `WorldMapSkia` (lines 54).

### Diagnostics & Compiler Check
- Command: `npx tsc --noEmit` executed in the `mobile` folder.
- Result: **Passed**. Zero output or errors, verifying complete TypeScript type safety.

### Test Execution
- Command: `npx vitest run` executed in the project root directory.
- Result: **Failed (6 failed, 74 passed out of 80 tests)**.
- Error Log:
```
 FAIL  tests/map-helpers-boundary.test.ts > Map Helpers Boundary Conditions > applyFogOfWar > correctly processes highly saturated red (#ff0000)
 FAIL  tests/map-helpers-boundary.test.ts > Map Helpers Boundary Conditions > applyFogOfWar > correctly processes highly saturated magenta (#ff00ff)
AssertionError: expected 33 to be less than or equal to 0
 ❯ tests/map-helpers-boundary.test.ts:107:29
    105|         // 2. Ensure output is never brighter than input (component-wi…
    106|         expect(outputRgb.r).toBeLessThanOrEqual(inputRgb.r);
    107|         expect(outputRgb.g).toBeLessThanOrEqual(inputRgb.g);
       |                             ^
    108|         expect(outputRgb.b).toBeLessThanOrEqual(inputRgb.b);
```
- The same failure occurs for `#00ff00`, `#0000ff`, `#00ffff`, and `#ffff00`.

---

## 2. Logic Chain

1. **Specification Conformance**: The implementation of `WorldMapSkia.tsx`, `MapScreen.tsx`, and `map-helpers.ts` strictly conforms to the requirements in `synthesis.md` and `plan.md` by supporting 4 map view modes and Fog of War visibility.
2. **Visual Layout and Non-Overlap**: In `MapScreen.tsx`, the FAB column is wrapped inside `{!showRegionList && !selectedRegionId && (...)}` (Observation Section). Since the details panel (`RegionDetailPanel`) is only shown when `selectedRegionId` is set, the FAB column is hidden during this state, guaranteeing that they can never overlap or conflict.
3. **Test Failure Origin**: 
   - `applyFogOfWar` performs relative desaturation (`s * 0.25`) in HSL.
   - For a highly saturated primary color like red (`#ff0000`, where RGB is `255, 0, 0`), desaturation requires raising the secondary/tertiary color channels (green and blue) above 0 to dilute the purity of the red channel.
   - Specifically, `#ff0000` has HSL saturation 1.0. Desaturated by 0.25 and darkened by 0.35, it resolves to RGB `[44, 33, 33]`. Here, the green and blue channels go from `0` to `33`.
   - The test `tests/map-helpers-boundary.test.ts` incorrectly asserts that every individual RGB channel of the output color must be less than or equal to the input color (`outputRgb.g <= inputRgb.g`). This assertion is mathematically incompatible with desaturating primary/highly saturated colors because desaturation moves the components closer to each other.
   - Therefore, the implementation code itself is correct and mathematically sound, but the test assertions in `tests/map-helpers-boundary.test.ts` contain a logic bug and must be modified.

---

## 3. Quality Review

**Verdict**: **REQUEST_CHANGES** (due to failing test suite assertions)

### Findings

#### [Major] Finding 1: Incorrect boundary test assertions for `applyFogOfWar`
- **What**: Vitest test failures on highly saturated primary colors.
- **Where**: `tests/map-helpers-boundary.test.ts` lines 105-108.
- **Why**: The assertion expects output color channels to be component-wise less than or equal to input channels. This is incorrect when desaturating colors: desaturating pure red (`#ff0000`) requires raising green and blue channels above zero.
- **Suggestion**: Update `tests/map-helpers-boundary.test.ts` to allow secondary channels to increase when the corresponding input channels are zero or very low during desaturation, or test lightness/luminance instead of raw component-wise values.

### Verified Claims
- **TypeScript Type Safety** → verified via `npx tsc --noEmit` → **PASS**
- **Fog of War Visibility Algorithm correctness** → verified via `vitest tests/map-view-modes-fow.test.ts` → **PASS**
- **Map Helpers Performance under load** → verified via `vitest tests/map-helpers-stress.test.ts` → **PASS**
- **UI Non-Overlapping Layout** → verified via source code analysis of `MapScreen.tsx` (the FAB column is explicitly omitted when details panel is visible) → **PASS**

### Coverage Gaps
- None. The test suite covers stress test workloads, boundary conditions, and correct Fog of War visibility.

### Unverified Items
- Actual visual rendering on physical mobile simulator (cannot be directly executed via CLI, but Skia paths are fully verified unit-wise).

---

## 4. Adversarial Review (Challenge Report)

**Overall risk assessment**: **MEDIUM**

### Challenges

#### [Medium] Challenge 1: Unbounded Cache Growth in `applyFogOfWar`
- **Assumption challenged**: The Fog of War color cache (`fogOfWarCache`) stays small and memory-safe.
- **Attack scenario**: In `'economy'` mode, the color is calculated using a continuous gradient: `interpolateColor('#2A3E5C', '#E5C05C', productivity)`. Since productivity can take arbitrary decimal values, a huge number of unique colors can be generated and passed to `applyFogOfWar` as the map state updates dynamically. Over long game sessions, the module-level `Map` will grow indefinitely without eviction.
- **Blast radius**: Gradual memory accumulation in the V8 heap, which could lead to Out-Of-Memory (OOM) crashes on low-resource mobile platforms.
- **Mitigation**: Implement an LRU limit or clear the cache if the size exceeds a safe threshold (e.g., 500 unique entries), or discretize/bin the economy gradient values to a fixed set of (e.g. 20-50) colors.

#### [Low] Challenge 2: Malformed Hex Strings handling in `interpolateColor`
- **Assumption challenged**: Hex colors passed to `interpolateColor` are always valid hex strings.
- **Attack scenario**: If a database entry or state definition contains an invalid hex color string, `parseInt(clean, 16)` returns `NaN`.
- **Blast radius**: The interpolation resolves to `#000000` (black) due to bitwise operations on `NaN` yielding 0. This fails silently without throwing, making rendering errors hard to debug.
- **Mitigation**: Add a fallback or validation wrapper that throws or falls back to a prominent debug color (e.g. `#FF00FF` magenta) when invalid color strings are parsed.

### Stress Test Results
- **Scale Stress Test (5,000 regions)** → visibility computed in < 16.6ms (average ~1.5ms) → **PASS** (remains within 1 frame budget)
- **10,000 Cache Injections** → execution runs in < 1ms with 100% cache hit rate → **PASS**

### Unchallenged Areas
- Touch gesture physics and Reanimated interaction performance during fast scrolling (out of scope for algorithmic testing).

---

## 5. Caveats

- We assumed that the enum value `DiplomaticRelation.Allied` and lowercase string `"allied"` match up in production. This is confirmed by checking `enums.ts` where the enum string literal value is indeed `"allied"`.
- We assumed that `map-helpers-boundary.test.ts` was written to catch color regressions, but its component-wise clamping test is mathematically too strict for desaturation logic.

---

## 6. Conclusion

The implementation of Map View Modes (R1) and Fog of War (R2) is clean, highly performant, type-safe, and conforms to specifications. The UI layout robustly handles overlapping elements by conditionally hiding the view toggles. However, because the test suite contains failing assertions in `tests/map-helpers-boundary.test.ts` due to incorrect assumptions on HSL-to-RGB conversion, the verdict is **REQUEST_CHANGES** to correct these test assertions and address the unbounded cache growth vulnerability.

---

## 7. Verification Method

- Run Vitest: `npx vitest run tests/map-helpers-boundary.test.ts` inside the project root directory.
- Verify TypeScript compilation: `npx tsc --noEmit` inside the `mobile` directory.
