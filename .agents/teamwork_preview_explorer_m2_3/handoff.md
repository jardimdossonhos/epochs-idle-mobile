# Milestone 2: Interactive 2D Vector Map Selection Mechanics & Action Bindings Report

## 1. Observation
- **Vector Map & Data Foundation**:
  - `docs/map-data.md:3-14`: The primary map dataset is `public/assets/maps/world-countries-v1.geojson`, generated procedurally into Hexagonal Vector Tiles (MVT/`vt-pbf`) based on Natural Earth 1:10m (`ne_10m_land.geojson`). Features contain stable `regionId` attributes (e.g., `r_iberia_north`).
  - `docs/adr-001-map-generation.md:16-18`: MapLibre uses `promoteId: "regionId"` to bind vector feature IDs directly in GPU memory (VRAM) for 60FPS interaction across ~20,000 land cells.
  - `mobile/src/core/models/world.ts:18-47`: `RegionDefinition` defines static geometry (`id`, `name`, `zone`, `biome`, `isCoastal`, `neighbors`, `center`), while `RegionState` holds dynamic runtime state (`ownerId`, `autonomy`, `assimilation`, `unrest`, `devastation`, `dominantFaith`, `buildings`, `actionCooldowns`).
- **Current UI Component State**:
  - `mobile/src/ui/screens/MapScreen.tsx:30-67`: Currently renders a simple `ScrollView` listing `controlledRegions` for the player with inline buttons to build `Market` or `Fortress` via `session.executeBuildStructure(regionId, buildingType)`. It lacks interactive 2D map touch selection or modal/drawer inspect panels.
  - `mobile/src/ui/screens/DiplomacyScreen.tsx:70-138`: Demonstrates accordion-style inspection panels with `selectedKingdom` state, showing relational scores (`trust`, `fear`, `rivalry`) and action buttons triggering `session.executeDiplomaticAction(targetId, action)`.
- **GameSession Player Action Engine**:
  - `mobile/src/application/game-session.ts:965-988`: `executeBuildStructure(regionId, buildingType)` checks ownership, slot limit (max 2), structure uniqueness, and resource affordability (`canAfford`), modifying ECS gold/wood/iron stocks and publishing `region.building_completed`.
  - `mobile/src/application/game-session.ts:990-1130`: `executeRegionAction(regionId, actionType)` handles 7 distinct regional development actions (`invest_agriculture`, `invest_infrastructure`, `garrison`, `pacify`, `change_capital`, `colonize`, `exodus`). Validates adjacency for colonization/exodus, updates regional unrest/devastation/autonomy, and enforces action cooldowns (`region.actionCooldowns[actionType]`).
  - `mobile/src/application/game-session.ts:833-948`: `executeDiplomaticAction(targetKingdomId, actionType)` handles 7 diplomatic pacts/actions (`alliance`, `non_aggression`, `peace`, `tribute`, `embargo`, `war`, `demand_vassalage`). Calculates success chance based on relational metrics, applies resource costs, and delegates to `diplomacyResolver` or `warResolver`.
  - `mobile/src/core/models/military.ts:4-21`: Defines `ArmyStack` (`id`, `stationedRegionId`, `manpower`, `quality`, `morale`, `supply`) and `MilitaryState`.

## 2. Logic Chain
1. **From Vector Tile Click to Game State Entity Lookup**:
   - *Premise*: When a player taps/clicks a region on the 2D vector map, MapLibre or React Native SVG tap events yield a `feature` object containing `feature.properties.regionId` (Observation 1).
   - *Reasoning*: By querying `gameState.world.regions[regionId]` and `staticWorldData.definitions[regionId]`, the UI instantly retrieves both dynamic domain state (owner, unrest, buildings) and static geographic data (biome, neighbors, center coordinate).
2. **From Inspection State to Contextual UI Modal/Drawer**:
   - *Premise*: The existing `MapScreen.tsx` is a text-based placeholder, whereas `DiplomacyScreen.tsx` provides an expandable inspection pattern (Observation 2).
   - *Reasoning*: A dedicated selection state (`selectedRegionId`, `selectedKingdomId`, `selectedArmyId`) should control the visibility of modular inspect drawers. Depending on whether `region.ownerId` equals `playerKingdomId`, `k_nature`, or a foreign kingdom ID, the inspect drawer dynamically switches available action buttons (e.g., Build/Pacify for owned, Colonize for wild, Inspect Kingdom/Declare War for foreign).
3. **From UI Action Selection to Engine Command Execution**:
   - *Premise*: `GameSession` provides strictly typed action methods (`executeBuildStructure`, `executeRegionAction`, `executeDiplomaticAction`) returning standard `PlayerActionResult` objects (`{ ok: boolean, message: string, cooldownUntil?: number }`) (Observation 3).
   - *Reasoning*: Clickable map elements can directly trigger these `GameSession` methods. If `result.ok` is true, the state automatically persists, events publish to `eventBus`, and UI re-renders via `useGameState()`. If `result.ok` is false, an `ActionModal` or Toast alert displays `result.message` (e.g., "Recursos insuficientes" or "Ação em cooldown").

## 3. Caveats
- **Army Movement Execution**: While `ArmyStack` models exist in `military.ts` with `stationedRegionId`, direct standalone player methods like `executeArmyMove(armyId, targetRegionId)` in `GameSession` are scheduled for full implementation during Milestone 2 military updates. Currently, army targets are set via `player.military.targetRegionIds` or war front resolution.
- **WebGL / React Native Canvas Native Bindings**: Vector tile tap handlers on mobile depend on whether MapLibre Native RN (`@maplibre/maplibre-react-native`) or an interactive SVG wrapper is used. However, the logical payload (`regionId`) passed to `GameSession` remains strictly identical.

## 4. Conclusion
To implement interactive selection mechanics for Milestone 2 (m2_vector_map), the architecture must introduce four core UI inspect components that bind 2D map selection events directly to `GameSession` methods:

1. **`RegionDetailModal` / Bottom Drawer**:
   - **Trigger**: Tap on any region on the vector map (`regionId`).
   - **Data Displayed**: Region name, owner kingdom crest/color, autonomy, unrest, devastation, dominant faith, existing buildings (2 slots max), stationed armies.
   - **Action Bindings**: Calls `session.executeBuildStructure(regionId, buildingType)` and `session.executeRegionAction(regionId, actionType)`.
2. **`KingdomInspectModal` / Drawer**:
   - **Trigger**: Inspecting foreign regions or clicking kingdom banners in diplomacy views (`targetKingdomId`).
   - **Data Displayed**: Ruler info, state faith, total controlled territories, trust/fear/rivalry scores, active treaties.
   - **Action Bindings**: Calls `session.executeDiplomaticAction(targetKingdomId, actionType)` (`alliance`, `non_aggression`, `tribute`, `embargo`, `war`, `peace`).
3. **`ArmyDetailModal` / Card**:
   - **Trigger**: Tap on army stack icons anchored to region centers (`stationedRegionId`).
   - **Data Displayed**: Manpower, morale, quality, supply level.
   - **Action Bindings**: Interacts with military posture and regional target assignments (`player.military.targetRegionIds`).
4. **`ActionModal` / Confirmation Dialog**:
   - **Trigger**: Pre-execution confirmation for high-stakes actions (War declaration, Capital change, Exodus).
   - **Data Displayed**: Resource cost breakdown (`canAfford`), success chances, and risk warnings.

## 5. Verification Method
- **Static Verification**:
  - Inspect `mobile/src/application/game-session.ts` lines 833–1130 to confirm method signatures and `PlayerActionResult` structures.
  - Inspect `tests/game-session-player-actions.test.ts` to see how unit tests simulate player actions (`executeRegionAction`, `executeDiplomaticAction`, `setResearchTarget`).
- **Test Command**:
  - Run `npm test tests/game-session-player-actions.test.ts` (or equivalent test runner in the project root) to verify player action logic execution.
- **Invalidation Conditions**:
  - If `GameSession` player action methods alter their parameter signatures or no longer return `PlayerActionResult`, the recommended modal bindings must be updated accordingly.
