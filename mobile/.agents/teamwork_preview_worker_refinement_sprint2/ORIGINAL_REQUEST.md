## 2026-07-07T12:39:54Z
You are a worker agent. Your task is to implement Milestones 3, 4, and 5 (Map Zoom/Click, Territorial Merger, and DevMode Relocation) for Epochs Idle mobile.

Please perform the following tasks:

1. Map Interactivity & click (Milestone 3):
   - In `src/ui/components/WorldMapSkia.tsx`, implement a Tap Gesture handler (`Gesture.Tap()`) that captures screen coordinates, converts them back to projected map space (accounting for translateX, translateY, and scale), and finds the closest region center.
   - Project coordinates back formula:
     `const x_map = (x_tap - screenW/2 - tx) / scale + screenW/2;`
     `const y_map = (y_tap - screenH/2 - translateY) / scale + screenH/2;`
     Wrap x_map: `const x_map_wrapped = (x_map + 2 * MAP_WIDTH) % MAP_WIDTH;`
   - Filter by max tap distance threshold (e.g. 12-15) and trigger `onRegionPress(closestRegionId)`.
   - Simultaneous composed gesture should include the Tap gesture too: `Gesture.Simultaneous(panGesture, pinchGesture, tapGesture)`.
   - Also, add Zoom In (+) and Zoom Out (-) floating UI buttons (using React Native components) over the map canvas to control the scale value.

2. Territorial Merger / Mega-Polygons (Milestone 4):
   - Add an `isMergedView` boolean prop to `WorldMapSkia`.
   - When `isMergedView` is true, draw boundaries (strokes) ONLY between hexagons that belong to DIFFERENT owners/colors (and outer bounds/water).
   - Implement this by drawing individual hexagon edges selectively instead of calling `addPath(hex)` for stroke. Calculate direction angle between hex center and its neighbors to map neighbors to edge indices (0 to 5) using `deg = (angle_rad * 180 / Math.PI + 360) % 360`, edgeIdx = `Math.round(deg / 60) % 6`. Omit drawing the edge if the neighbor at that direction has the same owner color.
   - Add the `isMergedView` state in `src/ui/screens/MapScreen.tsx` and pass it to `WorldMapSkia` and `RegionDetailPanel`. Render a floating Toggle FAB on MapScreen (e.g. 🧩 / ⬡) to let the player toggle between merged and classic view.
   - Contiguous Region Stats: In `src/ui/components/RegionDetailPanel.tsx`, if `isMergedView` is true and a region is clicked, run a BFS/DFS to find all contiguous regions owned by the same kingdom. Sum their Gold (from ecs.gold), Population (from ecs.populationTotal), and Defense (sum of stationed armies manpower) and display these aggregated totals under a "Atributos Consolidados" section. In classic view, display the values for the single clicked hexagon.
   - Strategic Construction Allocation: In `RegionDetailPanel.tsx`, in `handleBuild`, if `isMergedView` is active, find the best region in the contiguous mass of land to build the structure. The best region is the one with the fewest existing structures (buildings + active construction). If there's a tie, sort by:
     - Market: highest definition.economyValue.
     - Fortress/Barracks: highest definition.militaryValue.
     - Others: highest definition.strategicValue.
     Call `session.executeBuildStructure` with the selected target region.

3. DevMode Relocation (Milestone 5):
   - In `src/ui/screens/MainMenuScreen.tsx`, remove the dev mode tap count and click handler from the title.
   - In `src/ui/screens/SettingsScreen.tsx`, import `useGameState` to get the session. Add a clickable text "Epochs Idle" directly below the Title ("Configurações").
   - When tapped 5 times within 1 second, toggle `session.devModeActive`, call `session.emitState()`, and display an Alert indicating whether DevMode is active.

Verification:
Compile the codebase to make sure there are no TypeScript or Skia compilation errors:
`npx tsc test-boot.ts --outDir dist-test --module commonjs --target es2022 --moduleResolution node --skipLibCheck --ignoreConfig --ignoreDeprecations 6.0 --resolveJsonModule`
And run `node dist-test/test-boot.js`. It should output SUCCESS.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your changes and build results to handoff.md in your working directory: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile\.agents\teamwork_preview_worker_refinement_sprint2
