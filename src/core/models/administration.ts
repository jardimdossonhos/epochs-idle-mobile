import { AutomationLevel, BuildingType, MinisterPersonality, MinisterRole } from "./enums";
import type { RegionId } from "./types";
import type { CharacterStats } from "./character";

export interface AdministrativePolicy {
  regionalAutonomyTarget: number;
  directRuleBias: number;
  assimilationInvestment: number;
  antiCorruptionBudget: number;
}

export interface RegionalControl {
  regionId: RegionId;
  localAutonomy: number;
  taxationEfficiency: number;
  integration: number;
  revoltRisk: number;
}

export interface AutomationPolicy {
  economy: AutomationLevel;
  construction: AutomationLevel;
  defense: AutomationLevel;
  diplomacyReactive: AutomationLevel;
  expansion: AutomationLevel;
  technology: AutomationLevel;
  constructionProportions?: Partial<Record<BuildingType, number>>;
  globalToggleActive?: boolean;
  previousState?: Partial<AutomationPolicy>;
}

export interface Minister {
  id: string;
  name: string;
  role: MinisterRole;
  personality: MinisterPersonality;
  skillLevel: number; // 1 a 5 (Molda a eficiência administrativa e chance de sucesso de ações delegadas)
  experience: number; // Experiência atual acumulada
  experienceToNext: number; // Experiência necessária para o próximo nível
  lastLevelUpTick?: number; // Tick do último level up (para cooldown de treinamento)
  stats?: CharacterStats; // Os atributos de RPG reais (Admin, Martial, Diplo, Intriga, Saber)
  salary: number; // Salário atual do ministro em ouro por ciclo
  delegationLevel: AutomationLevel; // Manual (Apenas avisa), Assistido (Emite propostas), Automático (Executa e reporta)
  loyalty: number; // 0 a 100. Cai se o jogador tomar decisões contrárias à sua personalidade. < 15 causa renúncia.
  origin: string; // Background/Cultura para imersão (ex: "Nobreza do Sul", "Clero do Deserto")
}

export interface AdviceOption {
  id: string;
  label: string;
  tooltip?: string;
  actionType: "update_tax" | "update_budget" | "set_religious_policy" | "declare_war" | "ignore" | "change_salary" | "build_structure";
  payload?: any;
  loyaltyImpact: number;
}

export interface MinisterAdvice {
  id: string;
  ministerId: string;
  role: MinisterRole;
  title: string;
  narrativeText: string; // Explicabilidade humana do cálculo físico do ECS
  urgency: "low" | "medium" | "high";
  issuedAt: number;
  options?: AdviceOption[];
  resolved?: boolean;
  isRead?: boolean;
}

export interface AdministrationState {
  adminCapacity: number;
  usedCapacity: number;
  corruption: number;
  policy: AdministrativePolicy;
  regionalControl: RegionalControl[];
  automation: AutomationPolicy;
  council: Partial<Record<MinisterRole, Minister>>;
  candidatePool: Minister[]; // Mercado de talentos: Ministros disponíveis para contratação
  activeAdvice: MinisterAdvice[];
  directives?: Record<string, boolean>;
}
