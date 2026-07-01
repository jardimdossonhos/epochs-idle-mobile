﻿import { TechnologyDomain } from "../models/enums";
import type { TechnologyNode, TechnologyState } from "../models/technology";

const NODES: TechnologyNode[] = [
  {
    id: "fire_mastery",
    domain: TechnologyDomain.Economy,
    name: "Domínio do Fogo",
    description: "O controle das chamas permite cozinhar alimentos e afastar predadores nas noites escuras, garantindo a sobrevivência inicial da tribo.",
    required: [],
    cost: 40,
    effects: [
      { target: "economy.food_production_multiplier", value: 0.10, type: "multiplier" },
      { target: "population.growth_rate_multiplier", value: 0.05, type: "multiplier" }
    ]
  },
  {
    id: "bone_tools",
    domain: TechnologyDomain.Engineering,
    name: "Ferramentas de Osso",
    description: "Utensílios rústicos extraídos de carcaças melhoram a eficiência e o rendimento da coleta de recursos naturais pelo bando.",
    required: [],
    cost: 60,
    effects: [
      { target: "economy.tax_income_multiplier", value: 0.05, type: "multiplier" }
    ]
  },
  {
    id: "animism",
    domain: TechnologyDomain.Religion,
    name: "Animismo (Xamanismo)",
    description: "A crença primeva de que espíritos habitam os rios, as feras e as montanhas, unindo a tribo sob um propósito espiritual comum.",
    required: [],
    cost: 70,
    effects: [
      { target: "religion.cohesion", value: 0.10, type: "additive" },
      { target: "legitimacy", value: 5, type: "additive" }
    ]
  },
  {
    id: "hunting_parties",
    domain: TechnologyDomain.Military,
    name: "Grupos de Caça",
    description: "A organização tática dos coletores em patrulhas de caça serve como a primeira linha militar de defesa contra ameaças rivais.",
    required: ["fire_mastery"],
    cost: 85,
    effects: [
      { target: "military.reserveManpower", value: 50, type: "additive" }
    ]
  },
  {
    id: "oral_tradition",
    domain: TechnologyDomain.Administration,
    name: "Tradição Oral",
    description: "A passagem de mitos e táticas pelo boca a boca através das gerações cria os primeiros laços sociais capazes de conter mais habitantes.",
    required: ["animism"],
    cost: 100,
    effects: [
      { target: "administration.capacity", value: 10, type: "additive" }
    ]
  },
  {
    id: "sedentism",
    domain: TechnologyDomain.Engineering,
    name: "Sedentarismo (Quebra de Paradigma)",
    description: "O abandono definitivo da vida estritamente nômade. Permite a construção de assentamentos, multiplicando o teto populacional da terra.",
    required: ["fire_mastery", "bone_tools"],
    cost: 250,
    effects: [
      { target: "population.carrying_capacity_multiplier", value: 2.0, type: "multiplier" }
    ]
  },
  {
    id: "basic_agriculture",
    domain: TechnologyDomain.Economy,
    name: "Agricultura Primitiva",
    description: "O cultivo intencional de sementes nos vales fluviais garante uma explosão de safras em relação à mera coleta.",
    required: ["sedentism"],
    cost: 380,
    effects: [
      { target: "economy.food_production_multiplier", value: 0.40, type: "multiplier" }
    ]
  }
];

const NODE_MAP = new Map(NODES.map((item) => [item.id, item]));

function byDomainAndCost(a: TechnologyNode, b: TechnologyNode): number {
  if (a.domain !== b.domain) {
    return a.domain.localeCompare(b.domain);
  }

  if (a.cost !== b.cost) {
    return a.cost - b.cost;
  }

  return a.id.localeCompare(b.id);
}

export function getTechnologyNode(id: string): TechnologyNode | undefined {
  return NODE_MAP.get(id);
}

export function listTechnologyNodes(): TechnologyNode[] {
  return [...NODES].sort(byDomainAndCost);
}

export function isTechnologyUnlocked(state: TechnologyState, nodeId: string): boolean {
  return state.unlocked.includes(nodeId);
}

export function isTechnologyAvailable(state: TechnologyState, nodeId: string): boolean {
  const node = NODE_MAP.get(nodeId);
  if (!node) {
    return false;
  }

  if (isTechnologyUnlocked(state, nodeId)) {
    return false;
  }

  return node.required.every((requiredId) => isTechnologyUnlocked(state, requiredId));
}

export function listAvailableTechnologyNodes(state: TechnologyState, domain?: TechnologyDomain): TechnologyNode[] {
  return listTechnologyNodes().filter((node) => {
    if (domain && node.domain !== domain) {
      return false;
    }

    return isTechnologyAvailable(state, node.id);
  });
}

export function selectDefaultResearchNode(state: TechnologyState, focus: TechnologyDomain): TechnologyNode | null {
  const preferred = listAvailableTechnologyNodes(state, focus);
  if (preferred.length > 0) {
    return preferred[0];
  }

  const fallback = listAvailableTechnologyNodes(state);
  return fallback[0] ?? null;
}

function selectPendingPrerequisite(state: TechnologyState, nodeId: string, visited: Set<string>): TechnologyNode | null {
  if (visited.has(nodeId)) {
    return null;
  }

  visited.add(nodeId);

  if (isTechnologyUnlocked(state, nodeId)) {
    return null;
  }

  const node = getTechnologyNode(nodeId);
  if (!node) {
    return null;
  }

  for (const requiredId of [...node.required].sort()) {
    const pending = selectPendingPrerequisite(state, requiredId, visited);
    if (pending) {
      return pending;
    }
  }

  if (isTechnologyAvailable(state, nodeId)) {
    return node;
  }

  return null;
}

export function selectResearchNodeTowardsTarget(state: TechnologyState, targetId: string): TechnologyNode | null {
  if (isTechnologyUnlocked(state, targetId)) {
    return null;
  }

  return selectPendingPrerequisite(state, targetId, new Set<string>());
}
