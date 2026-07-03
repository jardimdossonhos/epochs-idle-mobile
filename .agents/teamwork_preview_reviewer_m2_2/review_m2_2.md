# Map Overhaul & Fog of War Review Report

**Reviewer**: Reviewer M2-2 (Reviewer & Adversarial Critic)
**Date**: 2026-07-02
**Target Deliverables**: Map view modes, Fog of War calculations, FAB layout, and associated test suite.

---

# PART 1: QUALITY REVIEW

## Review Summary

**Verdict**: **REQUEST_CHANGES**

*Rationale*: Multiple issues were identified, including a critical test integrity violation (the test suite tests duplicated code rather than the production codebase), a logical correctness bug in the HSL shading logic (which brightens/saturates already dark colors), a layout overlap conflict on the UI, and a performance bottleneck due to excessive CPU-based HSL conversions on every frame tick.

---

## Findings

### 🔴 Critical Finding 1: INTEGRITY VIOLATION — Facade Unit Testing (Test Duplication)
- **What**: The unit test suite `tests/map-view-modes-fow.test.ts` duplicates and re-implements the core functions (`interpolateColor`, `applyFogOfWar`, `calculateVisibility`) directly within the test file (lines 3–119) instead of importing them from `mobile/src/ui/components/WorldMapSkia.tsx`.
- **Where**: `tests/map-view-modes-fow.test.ts`, lines 3–119.
- **Why**: Replicating production code inside a test file bypasses the verification of the actual codebase. If a developer breaks the implementation in `WorldMapSkia.tsx`, the unit tests will still pass because they are running against the copies in the test file. This is a facade test that fails to assure the integrity of the real production code.
- **Suggestion**: Extract the pure helper and math functions (`interpolateColor`, `applyFogOfWar`, and `calculateVisibility`) from `WorldMapSkia.tsx` into a standalone TypeScript utility file (e.g. `mobile/src/utils/map-helpers.ts`) that contains no React Native or Shopify Skia dependencies. Then, import these utility functions in both `WorldMapSkia.tsx` and `tests/map-view-modes-fow.test.ts`. This resolves the import issues in Vitest while ensuring tests verify actual production code.

### 🟡 Major Finding 2: Correctness Bug in HSL Shading Math
- **What**: The function `applyFogOfWar` forces absolute target values for Saturation (25%) and Lightness (35%) rather than scaling or subtracting from the original color's values.
- **Where**: `mobile/src/ui/components/WorldMapSkia.tsx`, lines 116–117.
- **Why**: If a color is already very dark or desaturated (e.g. `S = 0.10`, `L = 0.15`), applying Fog of War will *increase* its saturation to 25% and *increase* its lightness to 35%, making it look brighter and more saturated than it originally was. Under Fog of War, regions should consistently appear darker and less saturated.
- **Suggestion**: Implement relative scaling or safe subtraction. For example:
  ```typescript
  const targetS = Math.max(0, s * 0.75); // 25% desaturation
  const targetL = Math.max(0, l * 0.65); // 35% darkening
  ```
  This guarantees that all fogged colors are visually dimmed and desaturated.

### 🟡 Major Finding 3: Performance Bottleneck (CPU-bound HSL Operations in Loop)
- **What**: `applyFogOfWar` is called in the render/useMemo loop for all non-visible regions on every tick (which can be 2,000+ regions ticking multiple times a second).
- **Where**: `mobile/src/ui/components/WorldMapSkia.tsx`, lines 330–333.
- **Why**: The function performs expensive string manipulation (`replace`, hex conversion), parses integers, divides floats, runs color space conversions, and converts back to hex strings. Doing this for thousands of regions on the JavaScript thread on every state update will cause noticeable UI stutter and frame drops, especially on mobile devices.
- **Suggestion**: 
  1. *JavaScript Memoization*: Implement a simple cache `const fowCache = new Map<string, string>();` at the top of `applyFogOfWar` to return pre-calculated results for previously processed colors instantly.
  2. *GPU Color Filter*: Group the visible and non-visible paths separately in Skia, and apply a Skia `<ColorMatrix>` filter to the non-visible group to offload the desaturation and darkening to the GPU, reducing CPU overhead to zero.

### 🟡 Major Finding 4: UI Layout Overlap (FABs and Region Details Panel)
- **What**: Visual overlap between the view mode FAB column and the `RegionDetailPanel` on the right side of the screen.
- **Where**: `mobile/src/ui/screens/MapScreen.tsx`, lines 59–90 and 174–181.
- **Why**: The view mode FABs column is positioned at `top: insets.top + 140`, extending downwards by about 232px. The `RegionDetailPanel` slides up from the bottom and can take up to 55% of the screen height. When a region is selected, both are rendered. On average and smaller mobile screens, the FABs will overlap with the actions/details inside the panel, hindering readability and interaction.
- **Suggestion**: Hide the FAB column when a region is selected. Modify the render condition:
  ```typescript
  {!showRegionList && !selectedRegionId && (
    <View style={[styles.fabColumn, { top: insets.top + 140 }]}>
      ...
    </View>
  )}
  ```

---

## Verified Claims

- **$O(N)$ Set-based visibility logic** → Verified via code inspection and tracing → **PASS**
  - *Verification Method*: Traced lines 165–192 in `WorldMapSkia.tsx`. The first loop iterates over definitions once ($O(N)$). The neighbor loop operates only on the copied set of initially visible regions and inserts neighbors via Set's $O(1)$ add operation. The total time complexity is strictly linear $O(N)$ and space complexity is $O(N)$.
- **Unit tests pass** → Verified via running `npm run test` → **PASS**
  - *Verification Method*: Ran `npm run test` using `run_command` in root directory. Output confirmed 25 test files passed, including `tests/map-view-modes-fow.test.ts` (6 tests).

---

## Coverage Gaps

- **Helper Math in Production Files** — Risk Level: **HIGH** — Recommendation: **Investigate/Extract**. Currently, the production implementation of `applyFogOfWar` is never directly tested; only a duplicated version inside the test file is run.
- **Color viewMode calculations** — Risk Level: **MEDIUM** — Recommendation: **Add unit tests**. The test suite does not cover how colors are selected for the four modes (owner, religion, economy, military).
- **Interpolation Edge Cases** — Risk Level: **LOW** — Recommendation: **Add tests**. Factor out-of-bounds (`< 0` or `> 1`) is not tested.

---

## Unverified Items

- **Visual layout on real mobile devices** — Reason not verified: No physical device or emulator is connected in this headless CI environment. Verified logically via position metrics and stylesheet parameters.

---
---

# PART 2: ADVERSARIAL REVIEW

## Challenge Summary

**Overall risk assessment**: **MEDIUM**

While the underlying path generation and Skia canvas wrapping are highly robust, the implementation relies on a few fragile assumptions regarding device screen dimensions, CPU throughput, and test isolation.

---

## Challenges

### 🔴 Challenge 1: Facade Test Assumption
- **Assumption challenged**: The test suite validates the behavior of the map colors and visibility code.
- **Attack scenario**: A developer updates the color logic in `WorldMapSkia.tsx` (e.g. changing the default color or updating how relationships map to colors) but forgets to update the copy in the test suite. The tests continue to pass with green checkmarks, giving a false sense of security, while the actual application exhibits broken UI behavior or crashes at runtime.
- **Blast radius**: High. Undetected regressions in map rendering and visibility.
- **Mitigation**: Extract logic into a pure module and import it directly into the tests.

### 🟡 Challenge 2: Absolute Color Override Assumption
- **Assumption challenged**: Absolute target HSL values (`S=25%`, `L=35%`) produce a correct darkening and desaturating effect for all map colors.
- **Attack scenario**: A kingdom or religion uses a dark navy color (e.g., `#0A1128`, where `S=60%`, `L=10%`). Under Fog of War, this color will be converted to HSL, its lightness forced to 35%, and saturation to 25%. The resulting color is `#434F70`, which is significantly *brighter* than the original. The player will see unexplored/fogged areas of this kingdom glowing brighter than the visible areas, breaking immersion and tactical clarity.
- **Blast radius**: Medium. Visual bugs on dark or desaturated custom map colors.
- **Mitigation**: Switch to relative multiplicative scaling (e.g., `L * 0.65`, `S * 0.75`).

### 🟡 Challenge 3: CPU Throughput / Framing Budget
- **Assumption challenged**: CPU calculations in JavaScript can scale to thousands of map cells without impacting frame rate.
- **Attack scenario**: In a large campaign map with 5,000+ hexagons, when the player pans or zooms the map, or when the game ticks and forces a state refresh, the CPU will run 5,000 string parses and HSL conversions in a single frame. This blocks the JavaScript thread, dropping the rendering frame rate from 60fps to less than 15fps, causing stuttering and UI unresponsive alerts (ANRs).
- **Blast radius**: Medium. Severe performance degradation on large maps, particularly on low-end Android/iOS devices.
- **Mitigation**: Use JavaScript-level Map caching or offload the Fog of War effect to Skia's GPU shaders/ColorFilters.

### 🟢 Challenge 4: Small Screen Layout Overlap
- **Assumption challenged**: The screen always has enough height to display both the FAB column and the Region Details panel.
- **Attack scenario**: On a compact mobile device (e.g. iPhone SE, screen height ~667px) with safe area insets at the top:
  - Top insets + header = ~120px.
  - FAB column starts at `top: 140` and extends 232px -> ends at 372px.
  - `RegionDetailPanel` takes 55% of height -> ~367px, plus `bottom: 15` -> starts at 285px.
  - The overlap is `372px - 285px = 87px`. The bottom two FAB buttons (Economy and Military) will be rendered directly on top of the region detail panel, blocking clicks on the panel close button or top stats.
- **Blast radius**: Medium. Broken user experience on smaller mobile devices.
- **Mitigation**: Condition the FAB rendering on `!selectedRegionId`.

---

## Stress Test Results

- **Dark base color test** (`#050811` / S=55%, L=4.3%) → Passed through `applyFogOfWar` → Returns `#434D70` (S=25%, L=35%) → **FAIL** (Base color got brighter and more saturated under FOW)
- **High cell count tick simulation** (3,000 un-cached HSL calls in a single thread tick) → Predicted execution time > 8ms on standard mobile CPU → **FAIL** (Exceeds frame budget for smooth 60fps rendering when combined with other React UI rendering)
- **Compact screen height simulation** (667px height, 55% panel, 232px FABs) → Bottom FABs overlap with panel top area → **FAIL** (Interactive blocking)
