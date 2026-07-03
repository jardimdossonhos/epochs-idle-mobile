# Epochs Idle Map Overhaul Analysis Report - Milestone 1.1

This report provides detailed answers to the three core questions regarding regions, kingdoms, ownership/diplomacy, and adjacency representation and updates within the Epochs Idle codebase.

---

## 1. Definition, Seeding, and Updates of Regions and Kingdoms

### Definitions

1. **Static Region Data**:
   - **`RegionDefinition` & `RegionZone`**: Defined in `src/core/models/world.ts` (lines 6-30). Contains static parameters of a region, including its `id: RegionId`, `name: string`, `zone: RegionZone`, values (`strategicValue`, `economyValue`, `militaryValue`), geographical characteristics (`isCoastal`, `isWater`, `biome: BiomeType`), a neighbors list (`neighbors: RegionId[]`), and spatial coordinates (`center: Point2D`).
   
2. **Dynamic Region State**:
   - **`RegionState`**: Defined in `src/core/models/world.ts` (lines 32-47). Tracks mutable game-simulation attributes: `regionId`, geopolitical `ownerId`, military `controllerId`, `autonomy`, `assimilation`, `unrest`, `devastation`, religious details (`dominantFaith`, `minorityFaith`, `dominantShare`, `minorityShare`, `faithUnrest`), action cooldowns, and built buildings.
   - **`WorldState`**: Defined in `src/core/models/world.ts` (lines 72-79). Contains a dictionary of dynamic region states: `regions: Record<RegionId, RegionState>`.
   
3. **Kingdom States**:
   - **`KingdomState`**: Defined in `src/core/models/game-state.ts` (lines 26-46). Stores dynamic kingdom features: `id`, `name`, `adjective`, `isPlayer`, `capitalRegionId`, `rulerId`, successor details (`heirs`), and sub-states for economics, population, tech, religion, military, diplomacy, administration, stability, and legitimacy.
   - **`GameState`**: Defined in `src/core/models/game-state.ts` (lines 87-97). Root container containing `world: WorldState`, `kingdoms: Record<KingdomId, KingdomState>`, `wars: Record<WarId, WarState>`, `events`, and `ecs?: EcsState`.
   
4. **ECS Components**:
   - **`EcsState`**: Defined in `src/core/models/game-state.ts` (lines 14-24). Contains flat parallel arrays for resource values and populations (`gold`, `food`, `wood`, `iron`, `faith`, `legitimacy`, `populationTotal`, `populationGrowthRate`, `manpower`). Array indexes map to the region index position in the `orderedDefinitions` list.

### Seeding

Seeding of regions and kingdoms is orchestrated during the initialization of the game state:
1. **Source Data**: Map layout data is loaded from `src/application/boot/generated/world-definitions-v1.json` (wrapped in `src/application/boot/generated/world-definitions-v1.ts`), which contains a procedurally generated hex grid of regions.
2. **State Construction**:
   - **`createInitialState()`**: Orchestrated in `src/application/boot/create-initial-state.ts` (lines 594-691).
   - **Geopolitical Ownership Setup**: Done in `assignRegionOwners()` (lines 379-437). First, all regions are initialized to the wildcard `"k_nature"` (wilderness). The player's kingdom (`"k_player"`) is allocated a starting region and a starting "cluster" of 2-3 adjacent non-water regions. Four AI kingdoms (`"k_npc_1"` to `"k_npc_4"`) are similarly spawned in clusters centered in their target zones (`near_east`, `north_africa`, `south_asia`, `east_asia`).
   - **Kingdom Initialization**: Done in `createKingdoms()` (lines 569-592), which calls `createKingdom()` (lines 270-367) to establish traits like starting technology, military units, and NPC personality configurations.
   - **Dynamic Region Initialization**: `createWorldState()` (lines 495-534) iterates through the region definitions and establishes the `RegionState` records.
   - **ECS Array Initialization**: At lines 609-633, the `ecsState` arrays are filled with zeros for wilderness and base values (e.g. populationTotal of 20 nomads, food=250, wood=100) for starting regions.
   - **Diplomacy Setup**: `createSeedRelations()` (lines 536-567) seeds basic neutral relationships with default trust, fear, and rivalry parameters between all non-nature kingdoms.

### Update Loop

Simulation updates occur step-by-step within the `TickPipeline` run loop in `src/core/simulation/tick-pipeline.ts` (lines 32-117) by executing modular systems registered in `src/core/simulation/create-default-systems.ts`:
- **`migration-system`** (`src/core/simulation/systems/migration-system.ts`): Scans ECS population values to trigger colonizations (overflowing population annexes adjacent wilderness) or region extinctions (population < 15 reverts region back to nature).
- **`population-system`** (`src/core/simulation/systems/population-system.ts`): Modifies kingdom-wide population totals, food stresses, and civil unrest.
- **`economy-system`** (`src/core/simulation/systems/economy-system.ts`): Updates resources, taxation, and budgets.
- **`military-system`** (`src/core/simulation/systems/military-system.ts`): Manages manpower recovery and draft rates.
- **`diplomacy-system`** & **`war-system`**: Run the respective resolves (`LocalDiplomacyResolver` and `LocalWarResolver`) to handle treaties, relationship decay, and military combat/sieges.

---

## 2. Region Ownership and Diplomatic Relations (Including Alliances)

### Region Ownership Representation and Updates

- **Geopolitical Ownership**: Represented by `ownerId: KingdomId` and `controllerId: KingdomId` in `RegionState` (`src/core/models/world.ts` lines 34-35).
- **Updates to Geopolitical Ownership**:
  1. **Colonization (Expansion)**: Managed in `src/core/simulation/systems/migration-system.ts` (lines 103-121). If a region has population exceeding `MIGRATION_THRESHOLD` (150) and has neighbors belonging to `"k_nature"`, it randomly chooses an uninhabited neighbor, converts its `ownerId` and `controllerId` to the kingdom's ID, and moves `MIGRATION_AMOUNT` (50) population over in the ECS state.
  2. **Depopulation / Extinction**: Managed in `migration-system.ts` (lines 50-75). If a region's population falls below 15 (and it's not the capital), ownership and control revert to `"k_nature"`. All resources are cleared.
  3. **Warfare Conquest**: Managed in `LocalWarResolver.captureRegion()` in `src/infrastructure/war/local-war-resolver.ts` (lines 299-376). When a battle is won, the system identifies adjacent candidate regions belonging to the loser, selects the one with the highest `strategicValue`, and transfers its `ownerId` and `controllerId` to the winner.

### Diplomatic Relations and Alliances

- **Data Representation**:
  - Found under `KingdomState.diplomacy` (type `DiplomacyState` defined in `src/core/models/diplomacy.ts`):
    - **`relations`**: Maps each other `KingdomId` to a `BilateralRelation` record (lines 22-29). It contains:
      - `status`: `DiplomaticRelation` enum (`Hostile`, `Neutral`, `Friendly`, `Allied`, `Overlord`, `Vassal`, `Truce`).
      - `score`: `RelationScore` object tracking numeric metrics (`trust`, `fear`, `rivalry`, `religiousTension`, `borderTension`, `tradeValue`).
      - `grievance`: A value (0.0 to 1.0) indicating aggregated hostility.
    - **`treaties`**: An array of `Treaty` structures (lines 4-11). Each treaty tracks the `type: TreatyType` (e.g. `Alliance`, `NonAggression`, `Peace`, `Vassalage`, `DefensivePact`), signing/expiration times, parties involved, and custom terms.
- **Dynamic Updates**:
  - **`LocalDiplomacyResolver.resolveTick()`** (`src/infrastructure/diplomacy/local-diplomacy-resolver.ts` lines 148-332):
    - **Treaty Pruning**: Removes expired treaties.
    - **Relationship Score Drift**: Trust, rivalry, fear, trade value, and grievances are updated each tick based on current diplomatic status.
    - **Status Recalculation**: Compares scores to determine status. High grievance (`> 0.72`) or rivalry triggers `Hostile` status. High trust (`> 0.78`) and low rivalry triggers `Allied`. Moderately high trust triggers `Friendly`.
    - **Religious Schism**: A schism between the state religion and that of another kingdom decays trust (`-0.025`) and builds grievance (`+0.01`) and rivalry (`+0.015`).
    - **Balance of Power**: Dominant kingdoms attract rivalry/fear and lose trust. Lesser AI kingdoms build trust with each other to counterbalance hegemonies.
    - **Defensive Pact Escalation**: If an AI's ally under a defensive pact is attacked, the AI honors the pact and declares war against the attacker.
  - **`LocalDiplomacyResolver.applyDecision()`** (`src/infrastructure/diplomacy/local-diplomacy-resolver.ts` lines 334-523):
    - When NPCs make decisions (via the decision service), this method applies changes to relationships and signs treaties:
      - `oferta_alianca` (Alliance Offer): Signs an `Alliance` treaty and sets status to `Allied`.
      - `pacto_defensivo` (Defensive Pact): Signs a `DefensivePact` treaty and sets status to `Allied`.
      - `declarar_guerra` (War Declaration): Sets status to `Hostile`, increases grievances.
      - Other decisions (such as non-aggression pact, embargo, peace, vassalage, tribute, war funding) apply targeted status and score changes and record their respective treaties.

---

## 3. Region Adjacency Representation

Adjacency is represented purely at the static data level, rather than being stored as dynamic ECS state:

### Static Adjacency Representation

1. **Source Data**:
   - In `src/application/boot/generated/world-definitions-v1.json`, every region object has a `neighbors` array storing region IDs (e.g., `"neighbors": ["r_hex_100", "r_hex_102", "r_hex_409", "r_hex_410"]`).
   
2. **Geographical Data Model**:
   - `RegionDefinition` contains `neighbors: RegionId[]` (`src/core/models/world.ts` line 28).
   
3. **Static Index Helper**:
   - `createStaticWorldData()` in `src/application/boot/static-world-data.ts` builds a helper lookup index:
     `neighborsByRegionId: Record<string, string[]>` (lines 141-144). It maps each region ID to its sorted neighbor IDs for rapid lookup.
     
4. **Adjacency Routes**:
   - **`StrategicRoute`**: Represented in `StaticWorldData.routes` (built by `buildRoutes()` in `src/application/boot/static-world-data.ts`, lines 11-38). An entry connects neighbor nodes with:
     - `from`: first region ID.
     - `to`: second region ID.
     - `routeType`: `"sea"` if both regions are coastal, otherwise `"land"`.
     - `controlWeight`: based on strategic value of the regions.

### Adjacency in Dynamic Systems

Dynamic simulation systems do not duplicate adjacency data. Instead, they reference static definitions to analyze proximity:
- **Migration System**: Scans neighbors using `def.neighbors` to find bordering regions that belong to nature and can be colonized (`src/core/simulation/systems/migration-system.ts` lines 90-94).
- **Combat Capture**: The war resolver queries `definitions[winnerRegionId].neighbors` to find adjacent loser regions to seize (`src/infrastructure/war/local-war-resolver.ts` lines 321-326).
- **NPC Distance Constraints**: In `src/infrastructure/npc/utility-npc-decision-service.ts`, AI decisions calculate coordinate distance using a Euclidean distance formula between capital centers:
  $$\text{Distance} = \sqrt{(x_A - x_B)^2 + (y_A - y_B)^2}$$
  This is used to apply distance penalties to wars and trade bonuses to nearby kingdoms.
