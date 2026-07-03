## 2026-07-02T18:59:27Z
You are the Worker agent (Worker M2-1) for the Epochs Idle map overhaul project.
Your working directory is `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\teamwork_preview_worker_m2_1`.

Your task is to implement the Map View Modes and the Fog of War system in the game's Skia map.
Please perform the following steps:
1. Read the synthesis architecture and design document at `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\orchestrator\synthesis.md`.
2. Modify `mobile/src/ui/screens/MapScreen.tsx` to:
   - Add a `viewMode` state (using the values `'owner'`, `'religion'`, `'economy'`, `'war'` / `'military'`).
   - Add visual Floating Action Buttons (FABs) in a column on the right side of the screen to toggle between these modes.
   - Pass the `viewMode` state down to `WorldMapSkia`.
3. Modify `mobile/src/ui/components/WorldMapSkia.tsx` to:
   - Accept the new `viewMode` prop.
   - Update the batched path coloring calculation in the `useMemo` block to dynamically color the regions based on the selected mode:
     - Political (`'owner'`): Color regions by owner's banner color or diplomatic relations status relative to the player.
     - Religion (`'religion'`): Color regions by their dominant faith's color (`dominantFaith` mapped to `gameState.world.religions`).
     - Economy (`'economy'`): Color regions using a productivity gradient based on unrest, devastation, autonomy, and assimilation.
     - Military (`'war'`): Color regions by highlighting contested war fronts in crimson, or showing troop concentrations (looking up stationed army manpower).
   - Implement the Fog of War visibility pre-calculation using an efficient $O(N)$ Set in the `useMemo` block. A region is visible if it belongs to the player, belongs to an ally, or is adjacent to a region owned/controlled by the player or an ally.
   - Implement HSL desaturation (reduce Saturation to 25%) and darkening (reduce Lightness to 35%) for non-visible regions on the CPU when generating the Skia paths to ensure zero rendering overhead during interactions.
4. Ensure the React Native build succeeds and there are no syntax/type check errors.
5. Run the existing tests using `npm run test` to verify no regressions were introduced.
6. Write a summary of your changes, the modified files, and the output of your build and test runs to `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\teamwork_preview_worker_m2_1\handoff.md`.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
