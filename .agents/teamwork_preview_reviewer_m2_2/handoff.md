# Handoff Report — Reviewer M2-2

## 1. Observation

- **MapScreen UI Rendering**:
  - In `mobile/src/ui/screens/MapScreen.tsx`, the FAB column is rendered conditionally:
    ```typescript
    59:       {!showRegionList && (
    60:         <View style={[styles.fabColumn, { top: insets.top + 140 }]}>
    ```
    And has styling:
    ```typescript
    358:   fabColumn: {
    359:     position: 'absolute',
    360:     right: 15,
    361:     flexDirection: 'column',
    362:     alignItems: 'center',
    363:     zIndex: 100,
    364:   },
    ```
  - The `RegionDetailPanel` wrapper has styling:
    ```typescript
    351:   detailPanelWrapper: {
    352:     position: 'absolute',
    353:     bottom: 15,
    354:     left: 15,
    355:     right: 15,
    356:     zIndex: 100,
    357:   },
    ```
  - In `mobile/src/ui/components/RegionDetailPanel.tsx`, the container has styling:
    ```typescript
    302:   container: {
    303:     backgroundColor: '#0F1420',
    304:     borderTopWidth: 1.5,
    305:     borderTopColor: '#D4AF37',
    306:     maxHeight: '55%',
    307:   },
    ```

- **Fog of War Calculations**:
  - Set-based visibility logic in `mobile/src/ui/components/WorldMapSkia.tsx` (lines 165-192):
    ```typescript
    165:     // 1. Fog of War Visibility Pre-calculation O(N)
    166:     const visibleRegions = new Set<string>();
    167: 
    168:     Object.keys(staticWorldData.definitions).forEach(regionId => {
    ...
    178:       if (isPlayer || isAlly) {
    179:         visibleRegions.add(regionId);
    180:       }
    181:     });
    182: 
    183:     // Add neighbors of visible regions
    184:     const initialVisible = Array.from(visibleRegions);
    185:     initialVisible.forEach(regionId => {
    186:       const regionDef = staticWorldData.definitions[regionId];
    187:       if (regionDef?.neighbors) {
    188:         regionDef.neighbors.forEach((neighborId: string) => {
    189:           visibleRegions.add(neighborId);
    190:         });
    191:       }
    192:     });
    ```

- **HSL Conversions**:
  - Forced target saturation and lightness in `mobile/src/ui/components/WorldMapSkia.tsx`:
    ```typescript
    115:   // Target HSL: Saturation 25%, Lightness 35%
    116:   const targetS = 0.25;
    117:   const targetL = 0.35;
    ```

- **Test Integrity**:
  - In `tests/map-view-modes-fow.test.ts`, the functions under test are duplicated inside the test file (lines 3-119) instead of being imported from the codebase:
    ```typescript
    2: // Replicated implementations of color manipulation helpers to run unit tests without importing React Native UI libraries
    3: function interpolateColor(color1: string, color2: string, factor: number): string { ... }
    4: function applyFogOfWar(hexColor: string): string { ... }
    5: function calculateVisibility(...) { ... }
    ```

- **Test Executions**:
  - Ran `npm run test` and all 25 test files passed, including `tests/map-view-modes-fow.test.ts` (6 tests).

---

## 2. Logic Chain

1. **Visual Overlap**: By examining the layout styles of `MapScreen.tsx` and `RegionDetailPanel.tsx`, the FAB column begins at `insets.top + 140` and has a height of ~232px, meaning it ends around `372px` from the top. The `RegionDetailPanel` occupies the bottom of the screen up to `55%` of total height (plus 15px bottom margin). On a standard mobile screen of height 667px, the panel height is 367px, which places the top of the panel at `285px` from the top of the screen. This mathematically creates a `372px - 285px = 87px` vertical overlap region on the right side of the screen, causing the FABs to render directly on top of the Region Details panel.
2. **HSL Shading Correctness**: The function `applyFogOfWar` overrides HSL properties using fixed constants: `targetS = 0.25` and `targetL = 0.35`. If a base color is darker than `35%` lightness (e.g. `L = 10%`), forcing the lightness to `35%` will increase its lightness, making it brighter. Under Fog of War, colors must become darker and desaturated. Therefore, the absolute override makes dark colors visually incorrect under Fog of War.
3. **Performance Bottleneck**: `applyFogOfWar` contains string splits, parsed integers, float math, and hexadecimal conversions. In the main render hook `useMemo`, `applyFogOfWar` is called inside a loop over all non-visible regions (up to 3,000 regions). Since the game state updates constantly, doing this loop on the CPU in the JavaScript thread will create a performance bottleneck, dropping frames.
4. **Test Integrity**: Because the test suite `tests/map-view-modes-fow.test.ts` duplicates the core functions rather than importing them from the source code, any regressions or changes made to the real production functions in `WorldMapSkia.tsx` will go completely unnoticed by the test suite, making it a facade test suite.

---

## 3. Caveats

- We did not measure the frame rate (FPS) on a physical mobile device because no hardware or simulator is connected to this terminal environment. The performance analysis is based on static code parsing and algorithmic complexity.
- We did not write code changes directly, as we are a review-only agent.

---

## 4. Conclusion

The Map Overhaul and Fog of War implementation by Worker M2-1 contains high-quality modular design, and the $O(N)$ visibility algorithm is logically correct and optimized. However, the verdict is **REQUEST_CHANGES** due to:
1. **Critical Integrity Violation**: Test suite duplicates production code rather than importing it.
2. **Logical Bug**: Shading math brightens dark colors instead of darkening them.
3. **Performance Risk**: Heavy CPU HSL conversions in loop on every state update.
4. **UI Overlap**: Collision between FAB column and the bottom Region Detail panel.

---

## 5. Verification Method

To verify the test suite:
- Run `npm run test` in the project root directory.

To verify the code duplicate issue:
- Open `tests/map-view-modes-fow.test.ts` and inspect lines 3-119 to confirm that the functions are defined locally rather than imported.

To verify the HSL correctness:
- Inspect `applyFogOfWar` in `mobile/src/ui/components/WorldMapSkia.tsx` and observe the constants `targetS = 0.25` and `targetL = 0.35`.
