# Epochs Idle: Map Overhaul Analysis (Religion, Economy, Military & UI Integration)

This report details the locations of region-specific religion, economy, and military data, and provides an implementation plan for adding view-mode Floating Action Buttons (FABs) to `MapScreen.tsx` and passing that state to `WorldMapSkia.tsx`.

---

## 1. Religion and Economy Data for Regions

### A. Data Definition
Region-specific religion and economy states are defined in **`mobile/src/core/models/world.ts`** under the **`RegionState`** interface:
* **Dominant Religion & Share** (Lines 40–41):
  ```typescript
  dominantFaith: ReligionId;
  dominantShare: number;
  ```
  And optional minority faiths (Lines 42–43):
  ```typescript
  minorityFaith?: ReligionId;
  minorityShare?: number;
  ```
* **Religious Friction** (Line 44):
  ```typescript
  faithUnrest: number;
  ```
* **Economic/Prosperity Factors** (Lines 36–39, 46):
  ```typescript
  autonomy: number; // Capped at 0-1; reduces economic value and production if high
  assimilation: number; // Cultural integration; boosts productivity
  unrest: number; // Civil unrest; reduces productivity
  devastation: number; // War devastation; heavily reduces productivity
  buildings?: BuildingType[]; // Local buildings (e.g., BuildingType.Market) that boost regional capacity or economy
  ```

Static values for regions (such as base economic potential) are defined under **`RegionDefinition`** (Lines 18–30):
```typescript
export interface RegionDefinition {
  id: RegionId;
  name: string;
  zone: RegionZone;
  strategicValue: number;
  economyValue: number; // Base economic potential of the region
  militaryValue: number;
  isCoastal: boolean;
  isWater: boolean;
  biome: BiomeType;
  neighbors: RegionId[];
  center: Point2D;
}
```

### B. Trade Routes
Trade routes are modeled in two ways:
1. **Physical Connective Routes (`StrategicRoute`)**:
   Defined in **`mobile/src/core/models/world.ts`** (Lines 49–55) and generated statically when the application boots in **`mobile/src/application/boot/static-world-data.ts`** (Lines 10–37). They link neighboring regions:
   ```typescript
   routes.push({
     id: `route_${regionId}_${neighborId}`,
     from: regionId,
     to: neighborId,
     routeType: definition.isCoastal && neighbor.isCoastal ? "sea" : "land",
     controlWeight: round(0.8 + ((definition.strategicValue + neighbor.strategicValue) / 20))
   });
   ```
2. **Diplomatic Trade Agreements**:
   Treaties of type `TradeAgreement` (defined in **`mobile/src/core/models/enums.ts`**) exist between kingdoms. They are updated and resolved in **`mobile/src/infrastructure/diplomacy/local-diplomacy-resolver.ts`** (Lines 249–260), providing boosts to population growth rate while decaying corruption and unrest.

### C. Update Systems
* **Religion Updates**:
  Processed by the `religion` system in **`mobile/src/core/simulation/systems/religion-system.ts`**.
  * **Internal Conversion**: Dominant/minority shares are adjusted via `applyFaithShare` (Lines 50–76) and normalized via `normalizeShares` (Lines 18–48).
  * **Border Osmosis**: Organic spread across bordering regions is calculated every 5 ticks (Lines 317–338).
  * **Missionaries**: Active external missionary budget and religious authority project pressure across borders (Lines 196–223).
  * **Religious Tension**: Differences between region and kingdom faith generate `faithUnrest` (Lines 295–313), which leaks into civil `unrest`.
* **Economy Updates**:
  * **ECS Layer (Micro-Economy)**: **`mobile/src/core/systems/EconomySystem.ts`** (Lines 6–39) calculates per-capita resource gains (gold, food, wood, iron) for each region (entity) based on its population and global technology modifiers, accumulating into the `EconomyComponent` typed arrays.
  * **Simulation Layer (Macro-Economy)**: **`mobile/src/core/simulation/systems/economy-system.ts`** calculates the total kingdom-level income and upkeep. It factors in region productivity (mitigated by unrest, devastation, autonomy, and boosted by assimilation) (Lines 28–32):
    ```typescript
    const productivity = clamp(
      1 - region.unrest * 0.48 - region.devastation * 0.62 - region.autonomy * 0.2 + region.assimilation * 0.16,
      0.28,
      1.35
    );
    ```

---

## 2. Military Data for Regions and Kingdoms

### A. Troop Counts & Distribution
Military manpower is divided between geographic region capacities and active campaign stacks:
1. **Regional Manpower (ECS Capacity)**:
   * Denoted in **`mobile/src/core/components/MilitaryComponent.ts`** as a `manpower` Float64Array.
   * Periodically updated in **`mobile/src/core/systems/MilitarySystem.ts`** (Lines 11–28) as a fraction of the region's total population (base 2.5% ratio):
     ```typescript
     military.manpower[entityId] = Math.floor(currentPop * BASE_MANPOWER_RATIO * (1 + techManpowerMult));
     ```
2. **Kingdom Armies (Active Duty)**:
   * Stored in the `KingdomState` inside the `military` property of type **`MilitaryState`** (defined in **`mobile/src/core/models/military.ts`**).
   * **`ArmyStack`** (Lines 4–11) tracks the actual mobilised troops:
     ```typescript
     export interface ArmyStack {
       id: string;
       stationedRegionId: RegionId; // Coordinates troop distribution
       manpower: number; // Active soldiers
       quality: number;
       morale: number;
       supply: number;
     }
     ```
   * **Reinforcement & Desertion**: Handled by **`mobile/src/core/simulation/systems/military-system.ts`** (Lines 4–56), which maps ECS regional manpower limits to kingdom armies, applying organic reinforcement drafts or desertion cuts depending on demographic limits.

### B. Active War Zones
Ongoing wars are represented globally in the `GameState.wars` dictionary:
* **War Registry**: Mapped by `WarId` to **`WarState`** in **`mobile/src/core/models/game-state.ts`** (Lines 54–62).
* **War Fronts (Conflict Zones)**:
  Each active war contains an array of **`WarFront`** objects (Lines 48–52):
  ```typescript
  export interface WarFront {
    regionId: string; // The specific contested region where battles occur
    pressureAttackers: number;
    pressureDefenders: number;
  }
  ```
* **Conflict Resolution**:
  The **`mobile/src/infrastructure/war/local-war-resolver.ts`** updates these active war fronts.
  * Every simulation tick, `resolveTick` (Lines 516–592) shifts the front pressures based on the ratio of participant power:
    ```typescript
    const pressureDelta = (attackerPower - defenderPower) / combinedPower;
    front.pressureAttackers = roundTo(clamp(front.pressureAttackers + pressureDelta * 8, 0, 100));
    front.pressureDefenders = roundTo(clamp(100 - front.pressureAttackers, 0, 100));
    ```
  * Attrition damage is applied to armies engaged in the war via `reduceArmyForWar` (Lines 273–292).
  * If a side gains enough ground (`warScore >= CONQUEST_THRESHOLD` of 34), a region is conquered (`applyConquest`, Lines 294–350), shifting ownership.

---

## 3. UI Implementation Plan: viewMode FABs and Renderer Passing

### A. State Addition in `MapScreen.tsx`
Add a view-mode state using the existing `MapLayerMode` type (defined in `mobile/src/infrastructure/rendering/map-renderer.ts`):
```tsx
// Import MapLayerMode at the top of MapScreen.tsx
import { MapLayerMode } from '../../infrastructure/rendering/map-renderer';

// Inside MapScreen() function, define state (defaulting to 'owner' for political view):
const [viewMode, setViewMode] = useState<MapLayerMode>('owner');
```

### B. Prop Integration for `WorldMapSkia.tsx`
Propagate `viewMode` down to the map renderer:
```tsx
// In MapScreen.tsx (Lines 50-53):
<WorldMapSkia
  onRegionPress={handleRegionPress}
  selectedRegionId={selectedRegionId}
  viewMode={viewMode} // Pass the view mode state
/>
```

Update `WorldMapSkia`'s interface in **`mobile/src/ui/components/WorldMapSkia.tsx`**:
```typescript
// Lines 18-21:
interface WorldMapSkiaProps {
  onRegionPress: (regionId: string) => void;
  selectedRegionId: string | null;
  viewMode: MapLayerMode; // Add viewMode prop
}
```

### C. Floating Action Buttons (FABs) UI in `MapScreen.tsx`
Add the FAB elements inside `MapScreen.tsx`'s return statement. To prevent overlapping with existing panels, align them in a vertical column on the right side of the screen, above the detail panel:

```tsx
{/* ── VIEW MODE FLOATING ACTION BUTTONS ── */}
<View style={styles.floatingFABContainer}>
  <TouchableOpacity
    style={[styles.fabBtn, viewMode === 'owner' && styles.fabBtnActive]}
    onPress={() => setViewMode('owner')}
    activeOpacity={0.7}
  >
    <Text style={styles.fabIcon}>👑</Text>
    <Text style={styles.fabLabel}>Político</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.fabBtn, viewMode === 'religion' && styles.fabBtnActive]}
    onPress={() => setViewMode('religion')}
    activeOpacity={0.7}
  >
    <Text style={styles.fabIcon}>⛪</Text>
    <Text style={styles.fabLabel}>Religião</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.fabBtn, viewMode === 'economy' && styles.fabBtnActive]}
    onPress={() => setViewMode('economy')}
    activeOpacity={0.7}
  >
    <Text style={styles.fabIcon}>💰</Text>
    <Text style={styles.fabLabel}>Economia</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.fabBtn, viewMode === 'war' && styles.fabBtnActive]}
    onPress={() => setViewMode('war')}
    activeOpacity={0.7}
  >
    <Text style={styles.fabIcon}>⚔️</Text>
    <Text style={styles.fabLabel}>Militar</Text>
  </TouchableOpacity>
</View>
```

Add the corresponding styles to `StyleSheet.create` (Lines 152+):
```typescript
  floatingFABContainer: {
    position: 'absolute',
    right: 16,
    bottom: 140, // Positioned above the detail panel
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 110,
  },
  fabBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(20, 25, 35, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  fabBtnActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#E5C05C',
    shadowColor: '#D4AF37',
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: 22,
  },
  fabLabel: {
    color: '#EAEAEA',
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 2,
    textTransform: 'uppercase',
  },
```

### D. Map Renderer Updates inside `WorldMapSkia.tsx`
Update the `useMemo` block that aggregates region colors in **`WorldMapSkia.tsx`** to dynamically calculate colors based on the selected `viewMode`:

1. **Include `viewMode` in the useMemo dependencies list**:
   ```typescript
   // Lines 145:
   }, [gameState, staticWorldData, playerKingdomId, selectedRegionId, screenW, screenH, viewMode]);
   ```
2. **Re-calculate colors in the loop depending on the `viewMode`**:
   ```typescript
   // Inside the Object.keys(staticWorldData.definitions).forEach loop:
   const hex = createHexPath(x, y, TERRITORY_RADIUS);

   if (regionId === selectedRegionId) {
     highlight = createHexPath(x, y, TERRITORY_RADIUS * 1.6);
   }

   if (regionDef.isWater) {
     water.addPath(hex);
     return;
   }

   let color = '#151924'; // Base neutral color

   switch (viewMode) {
     case 'religion': {
       const faithId = regionState?.dominantFaith;
       if (faithId) {
         const activeReligion = gameState.world.religions[faithId];
         color = activeReligion?.color || '#75624a';
       }
       break;
     }

     case 'economy': {
       if (regionState) {
         // Local economic productivity calculation
         const unrest = regionState.unrest || 0;
         const devastation = regionState.devastation || 0;
         const autonomy = regionState.autonomy || 0;
         const assimilation = regionState.assimilation || 0;
         const productivity = Math.max(0, 1 - unrest * 0.48 - devastation * 0.62 - autonomy * 0.2 + assimilation * 0.16);

         // Interpolation of productivity (0.0 to 1.35) into color gradient
         if (productivity < 0.3) {
           color = '#8d816e'; // Low/devastated
         } else if (productivity < 0.6) {
           color = '#a6955a'; // Normal
         } else if (productivity < 0.95) {
           color = '#cca43b'; // High
         } else {
           color = '#f2d067'; // Golden/Optimal
         }
       }
       break;
     }

     case 'war': {
       // Check if region is in an active war front
       let isContested = false;
       if (gameState.wars) {
         Object.values(gameState.wars).forEach((war) => {
           if (war.fronts.some((front) => front.regionId === regionId)) {
             isContested = true;
           }
         });
       }

       if (isContested) {
         color = '#a31f1f'; // Red highlight for active combat zones
       } else {
         // Fallback to standard owner colors
         const owner = gameState.kingdoms[ownerId];
         color = owner?.color || '#3A445C';
       }
       break;
     }

     case 'owner':
     default: {
       // Political mapping (current diplomatic relation view)
       if (isPlayer) {
         color = '#E5C05C'; // Ouro Vivo
       } else if (ownerId && ownerId !== 'unclaimed') {
         const relation = playerRelations[ownerId]?.status;
         switch (relation) {
           case DiplomaticRelation.Allied: color = '#2ECC71'; break;
           case DiplomaticRelation.Friendly: color = '#27AE60'; break;
           case DiplomaticRelation.Hostile: color = '#E74C3C'; break;
           case DiplomaticRelation.Truce: color = '#E67E22'; break;
           default: color = '#3A445C'; break;
         }
       }
       break;
     }
   }

   getGroupPath(color).addPath(hex);
   ```
