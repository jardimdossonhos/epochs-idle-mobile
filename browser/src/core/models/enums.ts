export enum ResourceType {
  Gold = "gold",
  Food = "food",
  Wood = "wood",
  Iron = "iron",
  Faith = "faith",
  Legitimacy = "legitimacy"
}

export enum PopulationClass {
  Peasants = "peasants",
  Nobles = "nobles",
  Clergy = "clergy",
  Soldiers = "soldiers",
  Merchants = "merchants"
}

export enum TechnologyDomain {
  Economy = "economy",
  Administration = "administration",
  Military = "military",
  Religion = "religion",
  Logistics = "logistics",
  Engineering = "engineering"
}

export enum DiplomaticRelation {
  Hostile = "hostile",
  Neutral = "neutral",
  Friendly = "friendly",
  Allied = "allied",
  Overlord = "overlord",
  Vassal = "vassal",
  Truce = "truce"
}

export enum TreatyType {
  Alliance = "alliance",
  NonAggression = "non_aggression",
  Peace = "peace",
  Marriage = "marriage",
  Vassalage = "vassalage",
  JointWar = "joint_war",
  Tribute = "tribute",
  Embargo = "embargo",
  TradeAgreement = "trade_agreement",
  DefensivePact = "defensive_pact"
}

export enum ArmyPosture {
  Defensive = "defensive",
  Balanced = "balanced",
  Aggressive = "aggressive"
}

export enum AutomationLevel {
  Manual = "manual",
  Assisted = "assisted",
  NearlyAutomatic = "nearly_automatic"
}

export enum ReligiousPolicy {
  Tolerant = "tolerant",
  Orthodoxy = "orthodoxy",
  Zealous = "zealous"
}

export enum NpcArchetype {
  Expansionist = "expansionist",
  Defensive = "defensive",
  Mercantile = "mercantile",
  ReligiousFanatic = "religious_fanatic",
  Opportunist = "opportunist",
  Treacherous = "treacherous",
  Diplomatic = "diplomatic",
  Revanchist = "revanchist"
}

export enum VictoryPath {
  TerritorialDomination = "territorial_domination",
  DiplomaticHegemony = "diplomatic_hegemony",
  EconomicSupremacy = "economic_supremacy",
  ReligiousSupremacy = "religious_supremacy",
  DynasticLegacy = "dynastic_legacy"
}

export enum BuildingType {
  Market = "market",         // Foco em Ouro (+25% Renda na província)
  Barracks = "barracks",     // Foco em Recrutas (+25% Manpower base)
  Monastery = "monastery",   // Foco em Fé (+Fé passiva e -Tensão Religiosa)
  University = "university", // Foco em Tecnologia (+Pesquisa passiva)
  Fortress = "fortress"      // Foco em Defesa (-Instabilidade e +Resistência a Cercos)
}

export enum BiomeType {
  Ocean = "ocean",
  Desert = "desert",
  Tundra = "tundra",
  Temperate = "temperate",
  Tropical = "tropical"
}

export enum MinisterRole {
  Steward = "steward",       // Controla Economia e Construções
  Marshal = "marshal",       // Controla Exército e Defesa
  Chancellor = "chancellor", // Controla Expansão e Diplomacia
  Chaplain = "chaplain",     // Controla Religião e Apaziguamento
  Scholar = "scholar",       // Controla Foco Tecnológico
  PrimeMinister = "prime_minister", // A Mão do Rei / Grão-Vizir (Multiplicador de Eficiência)
  Wildcard = "wildcard"      // Lendários: Podem assumir qualquer cargo
}

export enum MinisterPersonality {
  Militarist = "militarist",   // Foca em guerra e alta prontidão
  Pacifist = "pacifist",       // Evita conflito, busca alianças
  Greedy = "greedy",           // Foca em impostos altos e mercados
  Zealous = "zealous",         // Foca em conversão e repressão a heresias
  Progressive = "progressive", // Foca em inovação e universidades
  Cautious = "cautious"        // Foca em reservas altas (comida/ouro) e fortificações
}
