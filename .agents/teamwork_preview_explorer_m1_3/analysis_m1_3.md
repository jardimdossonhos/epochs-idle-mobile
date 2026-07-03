# Epochs Idle Map Overhaul Analysis

This report presents a deep-dive analysis of the map rendering codebase in `mobile/src/ui/components/WorldMapSkia.tsx` and proposes dynamic coloring modes, a performant Fog of War (FoW) implementation, and allied-border visibility checks.

---

## 1. Deep-Dive: Rendering, Panning, Zooming, and Infinite Wrapping

### 1.1. Rendering Architecture
The rendering pipeline in `WorldMapSkia.tsx` is built on top of `@shopify/react-native-skia` for high-performance canvas-based drawing. It optimizes rendering using **path-merging (batching)** rather than drawing individual react components for each region.

1. **Geographic Projection (Lines 23-39)**:
   The world coordinates from the JSON are projected from the geographic Longitude ($-180^\circ$ to $180^\circ$) and Latitude ($-65^\circ$ to $85^\circ$) coordinate systems onto a flat coordinate space of `MAP_WIDTH = 3000` and `MAP_HEIGHT = 1500`:
   ```typescript
   const MAP_WIDTH = 3000;
   const MAP_HEIGHT = 1500;
   const LON_MIN = -180;
   const LON_MAX = 180;
   const LAT_MAX = 85;
   const LAT_MIN = -65;

   const SCALE_X = MAP_WIDTH / (LON_MAX - LON_MIN); // 8.333 pixels per degree Lon
   const SCALE_Y = MAP_HEIGHT / (LAT_MAX - LAT_MIN); // 10 pixels per degree Lat

   function project(lon: number, lat: number) {
     const x = (lon - LON_MIN) * SCALE_X;
     const y = (LAT_MAX - lat) * SCALE_Y; // Invert Y so Lat 85 is at top 0
     return { x, y };
   }
   ```
2. **Hexagonal Shape Generation (Lines 45-56)**:
   Each region is represented by a hexagon generated centered at its projected coordinates:
   ```typescript
   function createHexPath(cx: number, cy: number, size: number) {
     const path = Skia.Path.Make();
     for (let i = 0; i < 6; i++) {
       const angle = (Math.PI / 180) * (60 * i - 30);
       const px = cx + size * Math.cos(angle);
       const py = cy + size * Math.sin(angle);
       if (i === 0) path.moveTo(px, py);
       else path.lineTo(px, py);
     }
     path.close();
     return path;
   }
   ```
3. **Path Batching (Lines 73-145)**:
   Rendering thousands of individual `<Path />` components is slow in React Native. To solve this, `WorldMapSkia.tsx` groups paths by color using `useMemo`:
   - It iterates through all regions in `staticWorldData.definitions`.
   - It generates the hexagonal path for each region.
   - If the region is water, it appends it to a single `waterPaths` object: `water.addPath(hex)`.
   - If the region is land, it resolves its diplomatic relation color and appends it to a combined path in `pathsGroupedByColor[color]`.
   - As a result, the GPU only has to execute one draw call per unique color, which allows rendering thousands of territories with minimal CPU/GPU overhead.

### 1.2. Panning and Zooming
Panning and zooming are handled using `react-native-gesture-handler` and `react-native-reanimated` shared values, ensuring that all movements are computed on the UI thread at a smooth 60/120 FPS.

- **Shared Values (Lines 63-68)**:
  - `scale`: Represents the current zoom level of the map.
  - `translateX`, `translateY`: Represent the current pan offsets in pixels.
  - `startScale`, `startX`, `startY`: Store the values at the beginning of a gesture so changes can be calculated incrementally.
- **Gesture Construction (Lines 164-183)**:
  - `panGesture` calculates horizontal and vertical movement and updates `translateX` and `translateY`.
  - `pinchGesture` calculates the zoom multiplier and clamps the scale between `0.3` and `5.0`.
  - Both gestures run simultaneously using `Gesture.Simultaneous(panGesture, pinchGesture)`.

### 1.3. Infinite Horizontal Wrapping
To make the map wrap horizontally (allowing players to scroll left/right infinitely), the component performs two steps:

1. **Modulo Offset Wrap-Around (Lines 185-201)**:
   In `skiaTransform`, it computes the wrap-around offset using the modulo operator:
   ```typescript
   const skiaTransform = useDerivedValue(() => {
     const originX = screenW / 2;
     const originY = screenH / 2;

     const scaledWidth = MAP_WIDTH * scale.value;
     // Apply modulo to translation
     let tx = translateX.value % scaledWidth;
     if (tx > 0) tx -= scaledWidth; // Keep tx negative to align seamlessly

     return [
       { translateX: tx + originX },
       { translateY: translateY.value + originY },
       { scale: scale.value },
       { translateX: -originX },
       { translateY: -originY },
     ];
   });
   ```
2. **Three-Copy Side-by-Side Drawing (Lines 239-245)**:
   Because `tx` is bound between `-scaledWidth` and `0`, rendering just one copy of the map would reveal empty space on the left or right borders during panning. To create a seamless wrap-around, the map is rendered three times side-by-side:
   ```typescript
   <Canvas style={StyleSheet.absoluteFill}>
     <Group transform={skiaTransform}>
       {/* Left Copy */}
       <Group transform={[{ translateX: -MAP_WIDTH }]}>{renderMapContent()}</Group>
       {/* Center Copy */}
       <Group>{renderMapContent()}</Group>
       {/* Right Copy */}
       <Group transform={[{ translateX: MAP_WIDTH }]}>{renderMapContent()}</Group>
     </Group>
   </Canvas>
   ```
   When the player scrolls past the map width, `tx` instantly wraps around. Because the left and right copies match the center copy perfectly, the transition is invisible to the user.

---

## 2. Dynamic Visualization Modes (Political, Religion, Economy, Military)

To support multiple map views dynamically, we propose the following changes:

### 2.1. Define the Map Visualization Enum
First, define the visualization modes:
```typescript
export enum MapVisualizationMode {
  Political = 'political',
  Religion = 'religion',
  Economy = 'economy',
  Military = 'military'
}
```

Add a `mode` prop to `WorldMapSkiaProps`:
```typescript
interface WorldMapSkiaProps {
  onRegionPress: (regionId: string) => void;
  selectedRegionId: string | null;
  mode: MapVisualizationMode; // New prop
}
```

### 2.2. Gradient Interpolation for Heat Maps
For **Economy** and **Military** modes, we can represent values using a continuous color gradient. Here are performant interpolation helpers:

```typescript
// Interpolate between steel-blue (#1B3636, low economy) and golden-yellow (#FFD700, high economy)
function getEconomyHeatmapColor(value: number): string {
  const val = Math.max(1, Math.min(value, 10)); // assume scale 1-10
  const ratio = (val - 1) / 9;
  
  const r = Math.round(27 + ratio * (255 - 27));
  const g = Math.round(54 + ratio * (215 - 54));
  const b = Math.round(54 + ratio * (0 - 54));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Interpolate between dark iron (#2C2C35, low military) and bright crimson (#FF1A1A, high military)
function getMilitaryHeatmapColor(value: number): string {
  const val = Math.max(1, Math.min(value, 10)); // assume scale 1-10
  const ratio = (val - 1) / 9;
  
  const r = Math.round(44 + ratio * (255 - 44));
  const g = Math.round(44 + ratio * (26 - 44));
  const b = Math.round(53 + ratio * (26 - 53));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
```

### 2.3. Dynamic Path Building in `useMemo`
We modify the `useMemo` block in `WorldMapSkia.tsx` (lines 73-145) to build the paths based on the selected mode:

```typescript
const { pathsGroupedByColor, waterPaths, highlightPath } = useMemo(() => {
  if (!gameState || !staticWorldData) {
    return { pathsGroupedByColor: {}, waterPaths: Skia.Path.Make(), highlightPath: null };
  }

  const groups: Record<string, ReturnType<typeof Skia.Path.Make>> = {};
  const getGroupPath = (color: string) => {
    if (!groups[color]) groups[color] = Skia.Path.Make();
    return groups[color];
  };

  const water = Skia.Path.Make();
  let highlight = null;

  Object.keys(staticWorldData.definitions).forEach(regionId => {
    const regionDef = staticWorldData.definitions[regionId];
    if (!regionDef || !regionDef.center) return;

    const { x, y } = project(regionDef.center.x, regionDef.center.y);
    const regionState = gameState.world.regions[regionId];
    const ownerId = regionState?.ownerId ?? '';
    const hex = createHexPath(x, y, TERRITORY_RADIUS);

    if (regionId === selectedRegionId) {
      highlight = createHexPath(x, y, TERRITORY_RADIUS * 1.6);
    }

    if (regionDef.isWater) {
      water.addPath(hex);
      return;
    }

    // Determine region color based on active mode
    let color = '#151924'; // default neutral gray
    
    switch (mode) {
      case MapVisualizationMode.Political: {
        if (ownerId && ownerId !== 'unclaimed') {
          const kingdom = gameState.kingdoms[ownerId];
          color = kingdom?.color ?? '#3A445C'; // Banner color or neutral fallback
        }
        break;
      }
      case MapVisualizationMode.Religion: {
        const dominantFaith = regionState?.dominantFaith;
        if (dominantFaith) {
          const religion = gameState.world.religions[dominantFaith];
          color = religion?.color ?? '#3A445C';
        }
        break;
      }
      case MapVisualizationMode.Economy: {
        color = getEconomyHeatmapColor(regionDef.economyValue || 1);
        break;
      }
      case MapVisualizationMode.Military: {
        color = getMilitaryHeatmapColor(regionDef.militaryValue || 1);
        break;
      }
    }

    getGroupPath(color).addPath(hex);
  });

  return { pathsGroupedByColor: groups, waterPaths: water, highlightPath: highlight };
}, [gameState, staticWorldData, playerKingdomId, selectedRegionId, mode]);
```

---

## 3. Performant Fog of War (FoW) Shading & Desaturation

We present two alternative implementations for Fog of War. Both keep the rendering performance optimized by batching paths, but differ in where the color filter is applied (CPU/JS vs GPU).

### 3.1. Option 1: CPU-based Color Darkening & Desaturation (Recommended)
This approach modifies the region colors in JavaScript before they are compiled into Skia paths.

*   **Mechanism**: A JS utility function takes the mode-based hex color and outputs a desaturated and darkened hex color (by reducing HSL Saturation by $75\%$ and Lightness by $65\%$).
*   **Pros**:
    *   **Zero GPU Overhead**: Since the color transformation is performed in JS during the initial state-change memoization pass, there is no pixel shader calculations on every frame when panning and zooming.
    *   **High Portability**: Highly compatible with all mobile devices and versions of React Native Skia.
*   **Cons**:
    *   Slightly more JS CPU time during mode changes, but at $\approx 1000$ regions, this takes $<2$ milliseconds, which is imperceptible.

#### Code Implementation:
```typescript
// Helper to desaturate and darken hex color
function desaturateAndDarken(hex: string): string {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // RGB to HSL conversion
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rN) h = (gN - bN) / d + (gN < bN ? 6 : 0);
    else if (max === gN) h = (bN - rN) / d + 2;
    else h = (rN - gN) / d + 4;
    h /= 6;
  }

  // Reduce saturation (FoW desaturation) and lightness (FoW darkening)
  s = s * 0.25; 
  l = l * 0.35; 

  // HSL to RGB conversion
  let rF, gF, bF;
  if (s === 0) {
    rF = gF = bF = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    rF = hue2rgb(p, q, h + 1/3);
    gF = hue2rgb(p, q, h);
    bF = hue2rgb(p, q, h - 1/3);
  }

  const rHex = Math.round(rF * 255).toString(16).padStart(2, '0');
  const gHex = Math.round(gF * 255).toString(16).padStart(2, '0');
  const bHex = Math.round(bF * 255).toString(16).padStart(2, '0');
  return `#${rHex}${gHex}${bHex}`;
}
```

In the `useMemo` block, group land paths based on their visibility:
```typescript
    const isVisible = isRegionVisible(regionId, gameState, staticWorldData, playerKingdomId);
    if (!isVisible) {
      color = desaturateAndDarken(color);
    }
    getGroupPath(color).addPath(hex);
```
Since FOW borders should also be less prominent, we can separate FOW and visible paths:
```typescript
interface RenderingPathGroups {
  visible: Record<string, ReturnType<typeof Skia.Path.Make>>;
  fow: Record<string, ReturnType<typeof Skia.Path.Make>>;
}
```
And render them with different stroke opacities:
```typescript
      {/* 1. Draw Visible Regions */}
      {Object.entries(paths.visible).map(([color, path]) => (
        <Group key={`vis_${color}`}>
          <Path path={path} color={color} style="fill" />
          <Path path={path} color="rgba(0,0,0,0.4)" style="stroke" strokeWidth={1} />
        </Group>
      ))}

      {/* 2. Draw FOW Regions (lower border opacity) */}
      {Object.entries(paths.fow).map(([color, path]) => (
        <Group key={`fow_${color}`}>
          <Path path={path} color={color} style="fill" />
          <Path path={path} color="rgba(0,0,0,0.15)" style="stroke" strokeWidth={1} />
        </Group>
      ))}
```

---

### 3.2. Option 2: GPU-based Grayscale Color Matrix (Alternative)
This approach draws all non-visible regions inside a Skia `<Group>` that applies a pixel-level desaturation matrix.

*   **Mechanism**: Skia's `<ColorMatrix>` intercepts the drawing commands and converts all child element pixels to grayscale and darkens them dynamically using a $5 \times 4$ color matrix.
*   **Pros**:
    *   Allows dynamic adjustments to Fog of War (e.g. animating fog opacity or changing desaturation levels) dynamically via a shared value.
    *   Cleaner separation of JS and visual concerns.
*   **Cons**:
    *   Marginal GPU fragment shader overhead.

#### Skia Implementation:
```typescript
import { ColorMatrix } from '@shopify/react-native-skia';

// Grayscale + 60% darken matrix
const FOW_COLOR_MATRIX = [
  0.2126 * 0.4, 0.7152 * 0.4, 0.0722 * 0.4, 0, 0, // Red Channel
  0.2126 * 0.4, 0.7152 * 0.4, 0.0722 * 0.4, 0, 0, // Green Channel
  0.2126 * 0.4, 0.7152 * 0.4, 0.0722 * 0.4, 0, 0, // Blue Channel
  0,            0,            0,            1, 0  // Alpha Channel
];

const renderMapContent = () => (
  <Group>
    {/* Ocean */}
    <Path path={waterPaths} color="#060B14" />

    {/* Visible Lands */}
    {Object.entries(pathsGroupedByColor.visible).map(([color, path]) => (
      <Group key={`vis_${color}`}>
        <Path path={path} color={color} style="fill" />
        <Path path={path} color="rgba(0,0,0,0.4)" style="stroke" strokeWidth={1} />
      </Group>
    ))}

    {/* Non-Visible Lands under Fog of War */}
    <Group>
      <ColorMatrix matrix={FOW_COLOR_MATRIX} />
      {Object.entries(pathsGroupedByColor.fow).map(([color, path]) => (
        <Group key={`fow_${color}`}>
          <Path path={path} color={color} style="fill" />
          <Path path={path} color="rgba(0,0,0,0.2)" style="stroke" strokeWidth={1} />
        </Group>
      ))}
    </Group>
  </Group>
);
```

---

## 4. Visibility Checks based on Player & Allied Borders

A region is defined as "visible" (i.e. not covered by Fog of War) if:
1. It is directly owned or controlled by the player's kingdom.
2. It is directly owned or controlled by any of the player's allies.
3. It borders (is adjacent to) a region owned or controlled by the player or an ally.

### 4.1. Implementation Code
Here is the concrete implementation of the check:

```typescript
import { GameState } from '../../core/models/game-state';
import { StaticWorldData } from '../../core/models/static-world-data';
import { DiplomaticRelation } from '../../core/models/enums';

/**
 * Computes whether a region is visible based on player/allied borders and adjacency.
 */
export function isRegionVisible(
  regionId: string,
  gameState: GameState,
  staticWorldData: StaticWorldData,
  playerKingdomId: string
): boolean {
  const regionState = gameState.world.regions[regionId];
  if (!regionState) return false;

  // 1. Check direct ownership or control by the player
  if (regionState.ownerId === playerKingdomId || regionState.controllerId === playerKingdomId) {
    return true;
  }

  const playerKingdom = gameState.kingdoms[playerKingdomId];
  const relations = playerKingdom?.diplomacy?.relations ?? {};

  // Helper to determine if a kingdom is allied
  const isAlly = (kingdomId: string): boolean => {
    if (!kingdomId || kingdomId === 'unclaimed') return false;
    return relations[kingdomId]?.status === DiplomaticRelation.Allied;
  };

  // 2. Check direct ownership or control by an ally
  if (isAlly(regionState.ownerId) || isAlly(regionState.controllerId)) {
    return true;
  }

  // 3. Adjacency check: Does it border a player-owned or ally-owned region?
  const regionDef = staticWorldData.definitions[regionId];
  if (regionDef?.neighbors) {
    for (const neighborId of regionDef.neighbors) {
      const neighborState = gameState.world.regions[neighborId];
      if (neighborState) {
        const owner = neighborState.ownerId;
        const controller = neighborState.controllerId;
        if (owner === playerKingdomId || controller === playerKingdomId || isAlly(owner) || isAlly(controller)) {
          return true;
        }
      }
    }
  }

  return false;
}
```

### 4.2. Adjacency Optimization (Pre-calculation)
Rather than executing relational dictionary lookups during the adjacency loop, we can compile a set of all **player and allied controlled regions** once at the start of the `useMemo` pass:

```typescript
const { pathsGroupedByColor, waterPaths } = useMemo(() => {
  // Pre-calculate set of visible region IDs for O(1) checks
  const playerKingdom = gameState.kingdoms[playerKingdomId];
  const relations = playerKingdom?.diplomacy?.relations ?? {};

  const isAlly = (kId: string) => kId && kId !== 'unclaimed' && relations[kId]?.status === DiplomaticRelation.Allied;

  // 1. Gather all sovereign/allied territories
  const controlledByAlliance = new Set<string>();
  Object.keys(gameState.world.regions).forEach(rId => {
    const rState = gameState.world.regions[rId];
    if (rState.ownerId === playerKingdomId || rState.controllerId === playerKingdomId || isAlly(rState.ownerId) || isAlly(rState.controllerId)) {
      controlledByAlliance.add(rId);
    }
  });

  // 2. Compile visible regions (controlled + adjacent to controlled)
  const visibleRegions = new Set<string>();
  controlledByAlliance.forEach(rId => {
    visibleRegions.add(rId);
    const rDef = staticWorldData.definitions[rId];
    if (rDef?.neighbors) {
      rDef.neighbors.forEach(nId => visibleRegions.add(nId));
    }
  });

  // 3. In the main loop:
  Object.keys(staticWorldData.definitions).forEach(regionId => {
    const isVisible = visibleRegions.has(regionId);
    // ...
  });
}, [gameState, staticWorldData, playerKingdomId]);
```
This pre-calculation optimizes the lookup complexity to $O(N)$ for the entire map loop, instead of $O(N \times \text{number of neighbors})$ dictionary/relation checks, ensuring smooth execution even on larger map definitions.
