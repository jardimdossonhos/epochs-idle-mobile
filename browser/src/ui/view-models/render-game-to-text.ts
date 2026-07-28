import type { GameState, KingdomState } from "../../core/models/game-state";
import type { RegionDefinition } from "../../core/models/world";
import type { MapLayerMode } from "../../infrastructure/rendering/map-renderer";

export interface RenderGameTextSimulationState {
  goldData: ArrayLike<number>;
  foodData: ArrayLike<number>;
  woodData: ArrayLike<number>;
  ironData: ArrayLike<number>;
  faithData: ArrayLike<number>;
  legitimacyData: ArrayLike<number>;
  populationTotalData: ArrayLike<number>;
  manpowerData: ArrayLike<number>;
}

export interface BuildRenderGameTextStateParams {
  state: GameState;
  player: KingdomState;
  definitions: RegionDefinition[];
  simulation: RenderGameTextSimulationState;
  activeLayer: MapLayerMode;
  selectedRegionId: string | null;
  selectedMapLabel?: string | null;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function sumResource(indices: number[], data: ArrayLike<number>): number {
  let total = 0;
  for (const index of indices) {
    total += data[index] ?? 0;
  }
  return round(total, 2);
}

function getOwnedRegionIndices(state: GameState, player: KingdomState, definitions: RegionDefinition[]): number[] {
  const indices: number[] = [];
  for (let index = 0; index < definitions.length; index += 1) {
    const definition = definitions[index];
    if (definition.isWater) {
      continue;
    }

    if (state.world.regions[definition.id]?.ownerId === player.id) {
      indices.push(index);
    }
  }

  return indices;
}

function getSelectedRegionSummary(params: BuildRenderGameTextStateParams) {
  const { state, definitions, selectedRegionId, selectedMapLabel } = params;
  if (!selectedRegionId) {
    return null;
  }

  const region = state.world.regions[selectedRegionId];
  const definition = definitions.find((entry) => entry.id === selectedRegionId);
  if (!region || !definition) {
    return {
      regionId: selectedRegionId,
      label: selectedMapLabel ?? selectedRegionId,
      found: false
    };
  }

  const owner = state.kingdoms[region.ownerId];
  const controller = state.kingdoms[region.controllerId];

  return {
    regionId: selectedRegionId,
    label: selectedMapLabel ?? definition.name,
    found: true,
    ownerId: region.ownerId,
    ownerName: owner?.name ?? region.ownerId,
    controllerId: region.controllerId,
    controllerName: controller?.name ?? region.controllerId,
    biome: definition.biome,
    zone: definition.zone,
    center: definition.center,
    unrest: round(region.unrest, 3),
    devastation: round(region.devastation, 3),
    dominantFaith: region.dominantFaith,
    faithUnrest: round(region.faithUnrest, 3)
  };
}

function describeChainType(chainType: string): string {
  switch (chainType) {
    case "economic_crisis":
      return "economic crisis";
    case "holy_war":
      return "holy war";
    default:
      return chainType;
  }
}

export function buildRenderGameTextState(params: BuildRenderGameTextStateParams): string {
  const { state, player, definitions, simulation, activeLayer } = params;
  const ownedRegionIndices = getOwnedRegionIndices(state, player, definitions);
  const activeWars = Object.values(state.wars).filter(
    (war) => war.attackers.includes(player.id) || war.defenders.includes(player.id)
  );
  const eventChains = Object.values(state.world.eventChains ?? {})
    .sort((left, right) => right.startedAt - left.startedAt)
    .slice(0, 5)
    .map((chain) => ({
      id: chain.id,
      kingdomId: chain.kingdomId,
      kingdomName: state.kingdoms[chain.kingdomId]?.name ?? chain.kingdomId,
      chainType: chain.chainType,
      label: describeChainType(chain.chainType),
      stage: chain.stage,
      maxStages: chain.maxStages,
      ageTicks: Math.max(0, state.meta.tick - chain.startedAt),
      lastTriggeredAtTick: chain.lastTriggered
    }));

  const payload = {
    coordinateSystem: "Hex world map keyed by region id; screen x grows east and screen y grows south.",
    mode: state.meta.paused ? "paused" : "running",
    tick: state.meta.tick,
    speed: state.meta.speedMultiplier,
    layer: activeLayer,
    player: {
      kingdomId: player.id,
      kingdomName: player.name,
      capitalRegionId: player.capitalRegionId,
      territoryCount: ownedRegionIndices.length,
      activeWars: activeWars.length,
      stability: round(player.stability, 2),
      legitimacy: round(player.legitimacy, 2),
      researchFocus: player.technology.researchFocus,
      researchGoalId: player.technology.researchGoalId,
      activeResearchId: player.technology.activeResearchId,
      resources: {
        gold: sumResource(ownedRegionIndices, simulation.goldData),
        food: sumResource(ownedRegionIndices, simulation.foodData),
        wood: sumResource(ownedRegionIndices, simulation.woodData),
        iron: sumResource(ownedRegionIndices, simulation.ironData),
        faith: sumResource(ownedRegionIndices, simulation.faithData),
        legitimacy: sumResource(ownedRegionIndices, simulation.legitimacyData),
        population: sumResource(ownedRegionIndices, simulation.populationTotalData),
        manpower: sumResource(ownedRegionIndices, simulation.manpowerData)
      }
    },
    selectedRegion: getSelectedRegionSummary(params),
    activeEventChains: eventChains,
    recentEvents: state.events.slice(0, 5).map((event) => ({
      title: event.title,
      severity: event.severity,
      details: event.details
    }))
  };

  return JSON.stringify(payload);
}
