# Milestone 2: Interactive 2D Vector Map (m2_vector_map) — Explorer 2 Handoff Report

## 1. Observation

During the read-only investigation of `GameSession` state, ECS components, world map region data structures, military/recon locations, and Fog of War calculations, the following exact code structures and implementations were identified across `src/` and `mobile/src/`:

### A. Core State Models & ECS Infrastructure
- **`GameState` & `EcsState`** (`mobile/src/core/models/game-state.ts`):
  ```typescript
  export interface EcsState {
    gold: number[] | Float64Array;
    food: number[] | Float64Array;
    wood: number[] | Float64Array;
    iron: number[] | Float64Array;
    faith: number[] | Float64Array;
    legitimacy: number[] | Float64Array;
    populationTotal: number[] | Float64Array;
    populationGrowthRate: number[] | Float64Array;
    manpower: number[] | Float64Array;
  }

  export interface GameState {
    meta: GameMeta;
    campaign: CampaignConfig;
    world: WorldState;
    kingdoms: Record<KingdomId, KingdomState>;
    wars: Record<WarId, WarState>;
    events: EventLogEntry[];
    victory: VictoryState;
    randomSeed: number;
    ecs?: EcsState;
  }
  ```
- **Region Models** (`mobile/src/core/models/world.ts`):
  - `RegionDefinition` (Static definition: `id`, `name`, `zone`, `strategicValue`, `economyValue`, `militaryValue`, `isCoastal`, `isWater`, `biome`, `neighbors: RegionId[]`, `center: Point2D`).
  - `RegionState` (Dynamic simulation state: `regionId`, `ownerId`, `controllerId`, `autonomy`, `assimilation`, `unrest`, `devastation`, `dominantFaith`, `dominantShare`, `minorityFaith`, `minorityShare`, `faithUnrest`, `buildings`).
- **Military & Army Models** (`mobile/src/core/models/military.ts`):
  ```typescript
  export interface ArmyStack {
    id: string;
    stationedRegionId: RegionId;
    manpower: number;
    quality: number;
    morale: number;
    supply: number;
  }
  export interface MilitaryState {
    posture: ArmyPosture;
    recruitmentPriority: number;
    offensiveFocus: number;
    targetRegionIds: RegionId[];
    armies: ArmyStack[];
    reserveManpower: number;
    militaryTechLevel: number;
  }
  ```
- **O(1) Region Index Mapping** (`mobile/src/application/game-session.ts`, lines 76–78, 102–108):
  ```typescript
  const REGION_INDEX_MAP = new Map<string, number>();
  // Initialized during GameSession construction mapping sorted region IDs to ECS array buffer indices.
  ```

### B. Fog of War Calculation ("Fog of Truth")
- In `src/main.ts` (lines 2258–2317), visibility and metric precision are calculated during region inspection based on 3 distinct tiers:
  1. **Visible (Player Owned / God Mode)** (`isPlayer || isFogOfTruthDisabled`): Full exact metric disclosure (exact population, manpower, exact percentage unrest, autonomy, assimilation, devastation, faith shares, schism warnings).
  2. **Explored (Adjacent Regions)** (`isAdjacent = regionDef.neighbors.some(nid => state.world.regions[nid]?.ownerId === player.id)`): Qualitative estimates and rounded figures (e.g., `popText = `~${formatNumber(popEst)} (Estimativa de Fronteira)``, unrest/autonomy/assimilation mapped to "Alta" | "Média" | "Baixa", devastation mapped to "Severa" | "Moderada" | "Mínima", manpower "Desconhecido").
  3. **Shrouded (Unexplored / Non-Adjacent)** (Else branch): Complete shroud ("Desconhecida (Névoa)", "Desconhecido").
- **God Mode Toggle**: `isFogOfTruthDisabled` is controlled via console command `"toggle_fog"` triggered by `#btn-toggle-fog` in `mobile/src/application/god-mode.ts` (lines 113, 228).

### C. Map Rendering & UI Engine Binding Protocols
- **Existing Renderers**:
  - `MapScreen.tsx` (`mobile/src/ui/screens/MapScreen.tsx`): React Native component utilizing `<ScrollView>` rendering text cards per owned region.
  - `MapLibreWorldRenderer` (`mobile/src/infrastructure/rendering/maplibre-world-renderer.ts`): Vector map renderer utilizing MapLibre vector tiles (`SOURCE_ID = "world-countries"`). Uses a queued frame processor `startQueueProcessor()` (lines 212–229) processing 250 feature state changes per frame (~15,000/sec) to avoid event loop starvation. Employs state quantization (`qUnrest = Math.round(unrest * 50)`) to prevent unnecessary WebGL redraws.
  - `PixiMapRenderer` (`mobile/src/infrastructure/rendering/pixi-map-renderer.ts`): Retained 2D scene graph using Pixi.js `Graphics` and `Text` nodes.

---

## 2. Logic Chain

1. **State Accessibility & Granularity**:
   - `GameState` maintains centralized domain objects for kingdoms, regions, and armies alongside typed numerical array buffers (`EcsState`) for fast calculations.
   - `REGION_INDEX_MAP` maps region string keys to typed array indices, allowing fast lookups for regional population and manpower without string object allocations.

2. **Fog of War Mechanics ("Fog of Truth")**:
   - The current engine calculates visibility dynamically via region adjacency (`regionDef.neighbors.some(...)`).
   - For Milestone 2 (Interactive 2D SVG Vector Map), regions must be visually shaded according to these three states:
     - **Shrouded**: Dark grey/black overlay or semi-transparent mask hiding region details and enemy army positions.
     - **Explored**: Desaturated/sepia tint with border outlines showing territory ownership and broad region contours, but obfuscating exact manpower numbers.
     - **Visible**: Full vibrant kingdom colors (`ownerColor`), exact army markers (`ArmyStack.stationedRegionId`), and detailed statistics.

3. **SVG Map UI Thread & 1000ms Tick Performance**:
   - In React Native / Expo, triggering standard React state updates (`setState(gameState)`) on every 1000ms simulation tick re-evaluates the entire Virtual DOM tree. Rendering complex SVG paths (hundreds of vector regions) via standard React re-renders during 1000ms ticks will block the JS thread and cause frame drops.
   - **Binding Strategy for Milestone 2**:
     - **Selective Subscriptions (`useSyncExternalStore`)**: Components should subscribe only to specific region properties or use selector functions so that global ticks do not force unrelated UI components to re-render.
     - **Memoized Static Vectors**: Static region polygons (`RegionDefinition.center`, path vectors) must be wrapped in `React.memo` so geometry calculation happens once.
     - **Direct Native Property Updates / Shared Values**: Dynamic visual attributes (fill color for ownership/layer modes, opacity for Fog of War, border highlights for selection) should be updated imperatively or via React Native Reanimated shared values/native props, bypassing React's reconciliation phase.
     - **Feature Batching & Fingerprinting**: Adopt the pattern established in `MapLibreWorldRenderer`, where feature state updates are quantized and queued, updating visual layers in micro-batches (e.g. via requestAnimationFrame or InteractionManager).

---

## 3. Caveats

- **No Active Vector Tile Server in Native Mobile**: While `MapLibreWorldRenderer` references vector tiles (`assets/tiles/{z}/{x}/{y}.pbf`), pure React Native Expo builds target 2D SVG vector maps (`react-native-svg`). The SVG map components for M2 are yet to be built in `mobile/src/ui/components/map/`.
- **Army Movement Animations**: `ArmyStack` contains `stationedRegionId`, representing discrete region positions. Continuous tactical army movement between regions during ticks is not yet modeled in ECS; armies teleports/instantiate at target region IDs upon move commands.

---

## 4. Conclusion

The GameSession state and ECS components cleanly separate static map data (`RegionDefinition`) from dynamic simulation state (`RegionState`, `EcsState`, `ArmyStack`). Fog of War logic ("Fog of Truth") is already established via 3 visibility tiers (Visible, Explored/Adjacent, Shrouded/Névoa).

To implement the Milestone 2 Interactive 2D Vector Map efficiently without blocking the React Native UI thread during 1000ms ticks:
1. Wrap static SVG polygon paths in memoized components.
2. Use granular selector hooks (`useSyncExternalStore`) for engine state binding.
3. Update dynamic SVG props (colors, FoW opacity overlays) via direct native properties or Reanimated shared values.
4. Implement quantized state hashing to skip redundant re-renders when numerical fluctuations fall below visual significance thresholds.

---

## 5. Verification Method

To verify these findings and logic independently:
1. Inspect file `mobile/src/core/models/world.ts` to confirm `RegionDefinition` and `RegionState` interface schemas.
2. Inspect file `mobile/src/core/models/military.ts` to confirm `ArmyStack` and `stationedRegionId`.
3. Inspect file `src/main.ts` lines 2258–2317 to verify the three-tiered Fog of War calculation (`isPlayer`, `isAdjacent`, else branch).
4. Inspect file `mobile/src/infrastructure/rendering/maplibre-world-renderer.ts` lines 168–192 and 212–229 to verify state quantization and batch queue processing logic.
