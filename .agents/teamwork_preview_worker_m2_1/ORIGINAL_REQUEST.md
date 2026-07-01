## 2026-06-29T16:47:47Z
You are the Worker for Milestone 2: Interactive 2D Vector Map (m2_vector_map).
Working directory: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\teamwork_preview_worker_m2_1
Project directory: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle
Scope document: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\orchestrator\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task Scope & Requirements:
Implement Milestone 2 (Interactive 2D Vector Map) cleanly according to the architecture designed by Explorers M2-1, M2-2, and M2-3:
1. Native Vector Map Components (mobile/src/ui/components/map/):
   - Create map-path-converter.ts: Utility converting GeoJSON features (world-countries-v1.geojson / world-definitions-v1.ts) into memoized SVG path objects (viewBox="0 0 1000 600" or matching coordinates).
   - Create WorldMapContainer.tsx and WorldSvgViewport.tsx: Interactive SVG map canvas with zoom/pan gesture handling, layer stacking, and filters.
   - Create rendering layers: LayerBackground.tsx, LayerRegions.tsx (with RegionPath.tsx), LayerBorders.tsx (political realm borders), LayerCapitals.tsx (crown markers at capital centroids), LayerArmies.tsx (army stacks with manpower & morale), and LayerFogOfWar.tsx (fog of war overlay representing explored/unexplored/visible regions).
2. Inspection Modals & Engine Bindings (mobile/src/ui/components/map/overlays/ or modals/):
   - Create RegionDetailModal.tsx / Bottom Sheet: Inspect region stats (autonomy, unrest, development, buildings) and trigger building construction / regional actions via session.executeBuildStructure / session.executeRegionAction.
   - Create KingdomInspectModal.tsx: View ruler details, kingdom culture, and diplomatic relation metrics via session.executeDiplomaticAction.
   - Create ArmyDetailModal.tsx: View army manpower, morale, and unit composition.
   - Update mobile/src/ui/screens/MapScreen.tsx to mount WorldMapContainer as the primary interface, backed by dynamic GameSession state.
3. Unit Testing & Verification:
   - Create tests/vector-map.test.ts to verify map data conversion, fog of war calculations, and region selection state.
   - Run npm test and verify all tests pass.

Produce your handoff report in c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\.agents\teamwork_preview_worker_m2_1\handoff.md. Communicate your final status via send_message.
