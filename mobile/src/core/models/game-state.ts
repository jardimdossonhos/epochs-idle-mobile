import type { AdministrationState } from "./administration";
import type { DiplomacyState } from "./diplomacy";
import type { EconomyState } from "./economy";
import type { DomainEvent, EventLogEntry } from "./events";
import type { MilitaryState } from "./military";
import type { NpcBehaviorState } from "./npc";
import type { PopulationState } from "./population";
import type { ReligionState } from "./religion";
import type { TechnologyState } from "./technology";
import type { VictoryState, VictoryTarget } from "./victory";
import type { CampaignId, KingdomId, TickId, TimestampMs, WarId } from "./types";
import type { WorldState } from "./world";

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
  factionCasualties: Int32Array | number[];
  regionOwner: Int32Array | number[];
  regionCaptureProgress: Float32Array | number[];
  regionSupplyCapacity: Float32Array | number[];
  regionCurrentSupply: Float32Array | number[];
  regionManpowerYield: Float32Array | number[];
  regionManpowerCap: Float32Array | number[];
  factionManpowerCap: Float32Array | number[];
  regionGoldYield: Float32Array | number[];
  factionGoldBalance: Float32Array | number[];
  factionManpowerReserve: Float32Array | number[];
  accumulatedSimulatedTime: number;
  conquestEpoch: number;
  cmdHead: number;
  cmdTail: number;
  cmdType: Int32Array | number[];
  cmdFaction: Int32Array | number[];
  cmdArg0: Int32Array | number[];
  cmdArg1: Int32Array | number[];
  factionResources: Float32Array | number[];
  hexStructures: Int32Array | number[];

  combatEventHead: number;
  combatEventTail: number;
  combatEventX: Float32Array | number[];
  combatEventY: Float32Array | number[];
  combatEventTs: Float32Array | number[];

  visibilityMask: Uint8Array | number[];
}

export interface KingdomCapabilities {
  canTraverseWater: boolean;
  canBuildFleets: boolean;
  canTradeOverseas: boolean;
  canColonizeIslands: boolean;
  hasWrittenLaw: boolean;
  hasCurrency: boolean;
}

export interface KingdomState {
  id: KingdomId;
  name: string;
  adjective: string;
  isPlayer: boolean;
  capitalRegionId: string;
  rulerId?: string; // NOVO: O ID do Personagem que governa o impÃ©rio
  heirs: string[]; // IDs dos herdeiros em ordem de sucessÃ£o
  ownedRegionIds?: string[]; // Cached list of owned region IDs
  capabilities: KingdomCapabilities;
  economy: EconomyState;
  population: PopulationState;
  technology: TechnologyState;
  religion: ReligionState;
  military: MilitaryState;
  diplomacy: DiplomacyState;
  administration: AdministrationState;
  victoryProgress: Record<string, number>;
  legitimacy: number;
  stability: number;
  color?: string; // Cor oficial do estandarte do reino
  npc?: NpcBehaviorState;
  governmentSystemId?: string; // ID do sistema de governo ativo no Registro de Governos
  unlockedGovernmentIds?: string[]; // Histórico: governos que já foram o regime ativo em algum momento (marco permanente)
  availableGovernmentIds?: string[]; // Desbloqueados mas nunca adotados (pré-requisitos atendidos; aguardando adoção)
  hasAscended?: boolean; // Era Estatal: se true, o jogador formalizou o Estado na Cerimônia de Ascensão — ONE-WAY STREET
  ascensionPostponed?: boolean; // Se true, o jogador optou por preservar as tradições tribais e adiar ascensão
}

export interface WarFront {
  regionId: string;
  pressureAttackers: number;
  pressureDefenders: number;
}

export interface WarState {
  id: WarId;
  attackers: KingdomId[];
  defenders: KingdomId[];
  warScore: number;
  startedAt: TimestampMs;
  fronts: WarFront[];
  casualties: Record<KingdomId, number>;
}

export interface CampaignConfig {
  id: CampaignId;
  name: string;
  mapId: string;
  startDateIso: string;
  victoryTargets: VictoryTarget[];
}

export interface GameMeta {
  schemaVersion: number;
  sessionId: string;
  tick: TickId;
  tickDurationMs: number;
  speedMultiplier: number;
  paused: boolean;
  disastersEnabled: boolean;
  offlineProgression?: boolean;
  immortalityEnabled?: boolean;
  createdAt: TimestampMs;
  lastUpdatedAt: TimestampMs;
  lastClosedAt: TimestampMs | null;
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
  domainEventQueue?: DomainEvent[];
}

