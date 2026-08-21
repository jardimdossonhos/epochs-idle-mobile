import { BuildingType, ResourceType } from "./enums";

export interface BuildingConfig {
  label: string;
  effectStr: string;
  cost: Partial<Record<ResourceType, number>>;
  requiresAscension: boolean;
}

export const BUILDING_CONFIGS: Record<BuildingType, BuildingConfig> = {
  [BuildingType.Market]: {
    label: "Mercado",
    effectStr: "+25% Ouro local",
    cost: { [ResourceType.Gold]: 300, [ResourceType.Wood]: 150 },
    requiresAscension: true
  },
  [BuildingType.Barracks]: {
    label: "Quartel",
    effectStr: "+25% Recrutas (Manpower)",
    cost: { [ResourceType.Gold]: 200, [ResourceType.Iron]: 100, [ResourceType.Wood]: 100 },
    requiresAscension: false
  },
  [BuildingType.Monastery]: {
    label: "Mosteiro",
    effectStr: "+Fé passiva e Proteção contra Cismas",
    cost: { [ResourceType.Gold]: 250, [ResourceType.Wood]: 200, [ResourceType.Faith]: 50 },
    requiresAscension: false
  },
  [BuildingType.University]: {
    label: "Universidade",
    effectStr: "Acelera Pesquisa Nacional",
    cost: { [ResourceType.Gold]: 400, [ResourceType.Wood]: 200 },
    requiresAscension: false
  },
  [BuildingType.Fortress]: {
    label: "Fortaleza",
    effectStr: "Mitiga Devastação e Instabilidade",
    cost: { [ResourceType.Gold]: 500, [ResourceType.Wood]: 300, [ResourceType.Iron]: 200 },
    requiresAscension: false
  }
};

export function getBuildingConfig(building: BuildingType): BuildingConfig {
  return BUILDING_CONFIGS[building];
}
