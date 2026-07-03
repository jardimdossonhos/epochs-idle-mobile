## 2026-07-02T19:10:22Z
You are the Worker agent (Worker M2-2) for the Epochs Idle map overhaul project.
Your working directory is `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\teamwork_preview_worker_m2_2`.

Your task is to fix the issues identified during the review of the Map View Modes & Fog of War overhaul.
Please address the following findings:

1. **Extract Map Helpers to a Pure Module (Facade Test Fix)**:
   - Create a new pure TypeScript file `mobile/src/utils/map-helpers.ts` (or `mobile/src/ui/components/map/map-helpers.ts`).
   - Move `interpolateColor`, `applyFogOfWar`, and the visibility/adjacency check logic (`isRegionVisible` / `calculateVisibility`) into this helper file.
   - Ensure it contains no React Native or Shopify Skia imports so it can compile in Vitest.
   - Import these helpers in `mobile/src/ui/components/WorldMapSkia.tsx` and in `tests/map-view-modes-fow.test.ts`.

2. **Correctness of HSL Shading**:
   - In `applyFogOfWar`, instead of forcing absolute Saturation (25%) and Lightness (35%), perform relative scaling (e.g. `targetS = s * 0.25` and `targetL = l * 0.35`) to ensure dark colors become darker and not brighter.

3. **Performance Optimization (Cache)**:
   - In `applyFogOfWar`, add a simple JavaScript `Map` cache at the module level to memoize hex input-to-output conversions, preventing expensive HSL conversion math for duplicate colors on every frame/tick.

4. **Clamping & NaN Validation**:
   - In `interpolateColor`, clamp the `factor` parameter to `[0, 1]`. If `isNaN(factor)`, return `color1`. Clamp output RGB components to `[0, 255]` to prevent canvas crashes from values like `"#NaNNaNNaN"`.

5. **Economy View for Unclaimed Regions**:
   - In `WorldMapSkia.tsx`, in the `'economy'` case, if the region state has no owner, is unclaimed, nature, or does not exist, color it using the default unclaimed color (`#151924`) instead of gold.

6. **UI Overlap Mitigation**:
   - In `MapScreen.tsx`, hide the Floating Action Buttons column if `selectedRegionId` is active to prevent overlapping with the region details panel.

7. **Fix TypeScript Compilation Errors in the mobile Workspace**:
   - Analyze and resolve the following errors:
     - `mobile/src/application/game-session.ts`: Duplicate function implementations and missing `directives` on `AdministrationState`.
     - `mobile/src/core/simulation/systems/council-system.ts` line 351: Cannot find name `getOwnedRegionIds` (change to `ownedRegionIds` or check correct variable).
     - `mobile/src/ui/components/WorldMapSvg.tsx` line 124: `regionState` implicitly has type `any`. Add proper type annotation.

8. Run the tests using `npm run test` and check that the typescript build compiles without error (`npx tsc --noEmit` inside `mobile/`).
9. Document your changes and verification logs in `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\teamwork_preview_worker_m2_2\handoff.md`.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
