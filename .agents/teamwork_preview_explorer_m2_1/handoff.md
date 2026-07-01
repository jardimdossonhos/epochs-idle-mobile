# Milestone 2 Handoff Report: Interactive 2D Vector Map Architecture

## 1. Observation
- **Current Map UI Implementation**: `mobile/src/ui/screens/MapScreen.tsx` (lines 1-144) is currently a text-only list view. It renders a `ScrollView` containing cards (`regionCard`) for regions controlled by the player kingdom (`session.getKingdomControlledRegions(playerKingdomId)`), displaying autonomy/unrest text percentages and action buttons (`BuildingType.Market`, `BuildingType.Fortress`). There is zero vector or graphical map rendering implemented in the mobile codebase.
- **Dependencies**: In `mobile/package.json` (lines 5-16), dependencies are currently limited to basic packages (`expo`, `@react-navigation/bottom-tabs`, `@react-navigation/native`, `react`, `react-native`, `react-native-safe-area-context`, `react-native-screens`). Crucially, `react-native-svg`, `react-native-reanimated`, and `react-native-gesture-handler` are **not** yet installed in the `mobile` app.
- **Map Data & Assets**:
  - `public/assets/maps/world-countries-v1.geojson` and `public/assets/maps/world-definitions-v1.json` are generated via `scripts/generate-world-geojson.mjs`.
  - GeoJSON features consist of a procedural hex grid polygon mesh (over 200+ land features with numeric IDs and properties `regionId`, `name`, `zone`, `isWater`, `biome`).
  - Land region definitions are stored in `mobile/src/application/boot/generated/world-definitions-v1.ts` (and `.json`), conforming to `RegionDefinition` in `mobile/src/core/models/world.ts` (lines 18-30). Key attributes per region include `id` (e.g., `"r_hex_101"`), `name`, `zone`, `isCoastal`, `isWater`, `biome`, `neighbors`, and centroid coordinates `center: { x: number, y: number }`.
- **Game Engine & State Bindings**:
  - `KingdomState` (`mobile/src/core/models/game-state.ts`, lines 26-46) tracks `capitalRegionId`, kingdom `color` (e.g., `#8A2BE2`), and military assets.
  - `RegionState` (`mobile/src/core/models/world.ts`, lines 32-47) tracks `ownerId`, `controllerId`, `autonomy`, `unrest`, `devastation`, `dominantFaith`, and `buildings`.
  - `MilitaryState` (`mobile/src/core/models/military.ts`, lines 13-21) tracks `armies: ArmyStack[]`, where each `ArmyStack` has `id`, `stationedRegionId`, `manpower`, `morale`, `supply`.

---

## 2. Logic Chain
1. **Gap Analysis**: The existing `MapScreen.tsx` provides functional access to region building actions, but lacks visual spatial context, political border representation, capital identification, or unit movement visualization required for an grand strategy game styled like Crusader Kings / Hearts of Iron.
2. **Geographical Coordinate Mapping**: The world asset dataset (`world-countries-v1.geojson` and `world-definitions-v1.ts`) provides full 2D geometric polygons for hex sectors and centroid `center` points for label/icon placement. Converting these Mercator / lat-lon coordinates into a normalized SVG coordinate space (e.g., `viewBox="0 0 1000 600"`) allows SVG paths to be rendered natively on mobile.
3. **Performance & Native Touch Performance**: Rendering complex vector maps with 200+ dynamic region polygons, borders, banners, and overlays requires continuous 60/120 FPS panning and zooming. Doing this on the JavaScript thread via standard React state would cause severe stuttering. Therefore, using native UI-thread animation (`react-native-reanimated`) and gesture handling (`react-native-gesture-handler`) on top of hardware-accelerated vector rendering (`react-native-svg`) is required.
4. **Modularity & Scalability**: Separating visual layers (Ocean/Background, Region Polygons, Realm Borders, Capitals/Cities, Armies/Units, Fog of War, and Gesture Overlay) into distinct React components ensures high maintainability and prevents unnecessary re-renders when engine state ticks (e.g., updating an army's manpower only triggers `LayerArmies` re-render).

---

## 3. Caveats
- **Dependency Installation**: `react-native-svg`, `react-native-reanimated`, and `react-native-gesture-handler` must be installed in `mobile/package.json` before implementing the native vector map components.
- **Coordinate Pre-projection**: Converting GeoJSON polygon coordinates to SVG path strings (`d="M..."`) dynamically at runtime on low-end mobile devices could introduce boot latency. It is recommended to create a build-step utility or memoized loader module (`map-path-loader.ts`) that transforms GeoJSON features into pre-calculated SVG paths.
- **Zoom Level Dynamic Details (LOD)**: At low zoom levels (zoomed out to full world view), rendering individual army numbers or small text tags will cause visual clutter. Semantic zoom rules must toggle visibility based on scale shared values.

---

## 4. Conclusion & Architectural Strategy

### Recommended Tech Stack
- **Rendering**: `react-native-svg` (`Svg`, `G`, `Path`, `Circle`, `Text`, `Defs`, `LinearGradient`, `Use`).
- **Gesture Control**: `react-native-gesture-handler` (`GestureDetector`, `Gesture.Simultaneous(Gesture.Pinch(), Gesture.Pan(), Gesture.Tap())`).
- **Animations**: `react-native-reanimated` (`useSharedValue`, `useAnimatedStyle`, `withSpring`, `withTiming`).

### Component Modularity Architecture
Create the following directory structure inside `mobile/src/ui/components/map/`:
```
mobile/src/ui/components/map/
├── WorldMapContainer.tsx       # Root container managing gesture detector & HUD overlays
├── WorldSvgViewport.tsx        # Svg canvas with viewBox and Reanimated transform bindings
├── loaders/
│   └── map-path-converter.ts   # Converts GeoJSON features into SVG path objects
├── layers/
│   ├── LayerBackground.tsx     # Deep ocean styling and background grid
│   ├── LayerRegions.tsx        # Renders RegionPath components with kingdom colors
│   ├── RegionPath.tsx          # Memoized individual region polygon (<Path>)
│   ├── LayerBorders.tsx        # Stylized international/province border lines
│   ├── LayerCapitals.tsx       # Citadel/Crown badges at region centers
│   ├── LayerArmies.tsx         # Army banners (manpower, morale, shield icons)
│   └── LayerFogOfWar.tsx       # Atmospheric shroud for unrevealed territories
└── overlays/
    ├── MapControlButtons.tsx   # Floating zoom in/out, reset view, map filters (Political/Diplomatic/Religious)
    └── RegionDetailsPanel.tsx  # Slide-up bottom sheet replacing current text cards
```

### Exact Rendering Strategy by Element
1. **Regions**:
   - Each land region is rendered as an SVG `<Path>` using its calculated polygon path.
   - `fill` color is dynamically resolved: `kingdom.color` if owned, with fill opacity reflecting biome/terrain or control state.
   - Selection state highlights the active region path with a glowing golden stroke (`stroke="#D4AF37" strokeWidth={2}`).
2. **Borders**:
   - Inner region boundaries use light subtle strokes (`stroke="rgba(0,0,0,0.2)"`).
   - International borders (where adjacent regions belong to different kingdoms) render with bold dark/gold medieval borders (`stroke="#1A1A1A" strokeWidth={1.5}`).
3. **Capitals**:
   - Look up `kingdom.capitalRegionId`. Retrieve `regionDef.center`.
   - Render a medieval crown or fortress SVG group (`<G>`) centered at `{center.x, center.y}` with a subtle pulsing animation for the player's own capital.
4. **Armies**:
   - Iterate through `kingdom.military.armies`. Map `stationedRegionId` to `regionDef.center`.
   - Render shield badge SVG components (`<G>`) showing manpower (formatted as `1.2k` or `500`) and a miniature morale indicator bar. Offset position slightly if multiple armies share a region center.
5. **Viewport & Gestures**:
   - `pan` shared values (`translateX`, `translateY`) and `scale` shared value (`scale`).
   - Outer animated `<G transform={...}>` responds to pinch and pan instantly on the UI thread.
   - Scale clamped between `0.7x` (global overview) and `4.0x` (tactical region zoom).

---

## 5. Verification Method

### Step 1: Dependency Verification
Run dependency audit in `mobile`:
```bash
cd mobile
npx expo install react-native-svg react-native-reanimated react-native-gesture-handler
```

### Step 2: Asset Integrity Inspection
Run the existing map test suite to verify world definitions and GeoJSON alignment:
```bash
npm run test tests/world-map-asset.test.ts
```

### Step 3: Component Visual Verification
Upon implementing `WorldMapContainer.tsx`, launch Expo emulator / device:
```bash
cd mobile
npm run android # or npm run ios / npm run web
```
Verify:
1. Panning across the world map responds smoothly without frame drops.
2. Pinching to zoom scales centered around gesture focal point.
3. Tapping a region selects it and opens `RegionDetailsPanel`.
4. Capitals display crown markers on their respective kingdom capital centers.
5. Armies display unit stacks on their stationed region centers.
