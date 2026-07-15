## 2026-07-07T12:36:20Z

You are a worker agent. Your task is to implement Milestone 2 (Building Construction & Progress Feedback) for Epochs Idle mobile.

Please perform the following tasks:
1. Define the type for region construction in the model:
   - In `src/core/models/world.ts`, update `RegionState` interface to include:
     `construction?: { buildingType: BuildingType; progress: number; targetTicks: number };`
2. Update the build structures logic to use a progress queue:
   - In `src/application/game-session.ts`, in `executeBuildStructure`, instead of instantly adding the building to `region.buildings`, set the `region.construction` field with:
     - `buildingType`
     - `progress: 0`
     - `targetTicks`: 20 ticks for Fortress, 10 ticks for Market, and other values for barracks (12), monastery (15), university (25) or similar.
     - Apply cost immediately (`this.applyCost(config.cost)`).
     - Add a check at the top: if `region.construction` is already defined, return `{ ok: false, message: "Já existe uma construção em andamento nesta região." }`.
3. Advance construction progress on game tick:
   - In `src/core/simulation/systems/administration-system.ts`, inside the loop of owned regions, check if `region.construction` is defined.
   - If defined, advance its progress by `context.tickScale` (e.g. `region.construction.progress += context.tickScale ?? 1`).
   - If progress reaches or exceeds `targetTicks`:
     - Push `region.construction.buildingType` to `region.buildings`.
     - Emit the event `region.building_completed` to context events (mimicking what was in `executeBuildStructure`).
     - Delete `region.construction` from the region.
4. Display a progress bar in the Region Panel:
   - In `src/ui/components/RegionDetailPanel.tsx`, add a section under "📊 Estatísticas" to display a progress bar when `regionState.construction` exists. Show the name of the structure, the progress percentage (using the existing `StatBar` styling or similar), and disable building buttons if any construction is in progress for that region.
5. Render building icons on the map:
   - In `src/ui/components/WorldMapSkia.tsx`, import `Circle` and `Rect` from `@shopify/react-native-skia`.
   - Update `renderMapContent` to iterate over all regions with active buildings. Draw a small geometric representation (icon shape) for each completed building in a region (e.g., a small gold circle for Market, a small grey square for Fortress, etc.) at the center of the hexagon `(x, y)`. Apply slight offsets if a region has multiple buildings so they do not overlap.

Verification:
Compile the codebase to make sure there are no TypeScript or Skia compilation errors:
`npx tsc test-boot.ts --outDir dist-test --module commonjs --target es2022 --moduleResolution node --skipLibCheck --ignoreConfig --ignoreDeprecations 6.0 --resolveJsonModule`
And run `node dist-test/test-boot.js`. It should output SUCCESS.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your changes and build results to handoff.md in your working directory: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\.agents\teamwork_preview_worker_ui_sprint2
