import { TechnologyDomain, TechnologyEra } from "../models/enums";
import type { TechnologyNode, TechnologyState } from "../models/technology";

export interface EraDefinition {
  id: TechnologyEra;
  name: string;
  description: string;
  gatewayTechId: string;
}

export const ERA_DEFINITIONS: EraDefinition[] = [
  { id: TechnologyEra.StoneAge, name: "Idade da Pedra", description: "O alvorecer da humanidade.", gatewayTechId: "basic_agriculture" },
  { id: TechnologyEra.BronzeAge, name: "Idade do Bronze", description: "Metais, comércio e exércitos.", gatewayTechId: "bronze_smelting" },
  { id: TechnologyEra.IronAge, name: "Idade do Ferro", description: "Impérios e grandes guerras.", gatewayTechId: "iron_forging" }
];

export const ERA_ORDER = [TechnologyEra.StoneAge, TechnologyEra.BronzeAge, TechnologyEra.IronAge];

const NODES: TechnologyNode[] = [
  {
    "id": "fire_mastery",
    "domain": TechnologyDomain.Economy,
    "era": TechnologyEra.StoneAge,
    "name": "Domínio do Fogo",
    "description": "Cozinha alimentos e afasta predadores.",
    "required": [],
    "cost": 40,
    "effects": [
      {
        "target": "economy.food_production_multiplier",
        "value": 0.1,
        "type": "multiplier"
      },
      {
        "target": "population.growth_rate_multiplier",
        "value": 0.05,
        "type": "multiplier"
      }
    ]
  },
  {
    "id": "foraging_tools",
    "domain": TechnologyDomain.Economy,
    "era": TechnologyEra.StoneAge,
    "name": "Ferramentas de Coleta",
    "description": "Melhora a eficiência de encontrar alimentos silvestres.",
    "required": [
      "fire_mastery"
    ],
    "cost": 60,
    "effects": [
      {
        "target": "economy.food_production_multiplier",
        "value": 0.15,
        "type": "multiplier"
      }
    ]
  },
  {
    "id": "animal_tracking",
    "domain": TechnologyDomain.Economy,
    "era": TechnologyEra.StoneAge,
    "name": "Rastreio Animal",
    "description": "Conhecimento das rotas de migração de animais.",
    "required": [
      "foraging_tools"
    ],
    "cost": 90,
    "effects": [
      {
        "target": "economy.food_production_multiplier",
        "value": 0.1,
        "type": "multiplier"
      }
    ]
  },
  {
    "id": "bone_tools",
    "domain": TechnologyDomain.Engineering,
    "era": TechnologyEra.StoneAge,
    "name": "Ferramentas de Osso",
    "description": "Utensílios rústicos extraídos de carcaças.",
    "required": [],
    "cost": 60,
    "effects": [
      {
        "target": "economy.tax_income_multiplier",
        "value": 0.05,
        "type": "multiplier"
      }
    ]
  },
  {
    "id": "stone_working",
    "domain": TechnologyDomain.Engineering,
    "era": TechnologyEra.StoneAge,
    "name": "Trabalho em Pedra",
    "description": "Lâminas e machados primitivos de sílex.",
    "required": [
      "bone_tools"
    ],
    "cost": 110,
    "effects": [
      {
        "target": "economy.tax_income_multiplier",
        "value": 0.1,
        "type": "multiplier"
      }
    ]
  },
  {
    "id": "sedentism",
    "domain": TechnologyDomain.Engineering,
    "era": TechnologyEra.StoneAge,
    "name": "Sedentarismo",
    "description": "Abandono da vida nômade.",
    "required": [
      "stone_working",
      "fire_mastery"
    ],
    "cost": 250,
    "effects": [
      {
        "target": "population.carrying_capacity_multiplier",
        "value": 2,
        "type": "multiplier"
      }
    ]
  },
  {
    "id": "hunting_parties",
    "domain": TechnologyDomain.Military,
    "era": TechnologyEra.StoneAge,
    "name": "Grupos de Caça",
    "description": "Organização tática dos coletores em patrulhas.",
    "required": [
      "fire_mastery"
    ],
    "cost": 85,
    "effects": [
      {
        "target": "military.reserveManpower",
        "value": 50,
        "type": "additive"
      }
    ]
  },
  {
    "id": "spears",
    "domain": TechnologyDomain.Military,
    "era": TechnologyEra.StoneAge,
    "name": "Lanças Primitivas",
    "description": "Melhora o combate corpo a corpo básico.",
    "required": [
      "hunting_parties",
      "bone_tools"
    ],
    "cost": 140,
    "effects": [
      {
        "target": "military.reserveManpower",
        "value": 100,
        "type": "additive"
      }
    ]
  },
  {
    "id": "animism",
    "domain": TechnologyDomain.Religion,
    "era": TechnologyEra.StoneAge,
    "name": "Animismo",
    "description": "Crença de que espíritos habitam a natureza.",
    "required": [],
    "cost": 70,
    "effects": [
      {
        "target": "religion.cohesion",
        "value": 0.1,
        "type": "additive"
      },
      {
        "target": "legitimacy",
        "value": 5,
        "type": "additive"
      }
    ]
  },
  {
    "id": "burial_rites",
    "domain": TechnologyDomain.Religion,
    "era": TechnologyEra.StoneAge,
    "name": "Ritos Funerários",
    "description": "Respeito aos mortos aumenta a coesão social.",
    "required": [
      "animism"
    ],
    "cost": 120,
    "effects": [
      {
        "target": "religion.authority",
        "value": 0.05,
        "type": "additive"
      }
    ]
  },
  {
    "id": "oral_tradition",
    "domain": TechnologyDomain.Administration,
    "era": TechnologyEra.StoneAge,
    "name": "Tradição Oral",
    "description": "Passagem de mitos e táticas pelo boca a boca.",
    "required": [
      "animism"
    ],
    "cost": 100,
    "effects": [
      {
        "target": "administration.capacity",
        "value": 10,
        "type": "additive"
      }
    ]
  },
  {
    "id": "tribal_councils",
    "domain": TechnologyDomain.Administration,
    "era": TechnologyEra.StoneAge,
    "name": "Conselhos Tribais",
    "description": "Líderes se reúnem para decidir o futuro.",
    "required": [
      "oral_tradition"
    ],
    "cost": 160,
    "effects": [
      {
        "target": "administration.corruption",
        "value": -0.05,
        "type": "additive"
      }
    ]
  },
  {
    "id": "basic_agriculture",
    "domain": TechnologyDomain.Economy,
    "era": TechnologyEra.StoneAge,
    "name": "Agricultura Primitiva",
    "description": "Cultivo intencional de sementes nos vales fluviais. O Berço da Civilização.",
    "required": [
      "sedentism",
      "tribal_councils"
    ],
    "cost": 380,
    "effects": [
      {
        "target": "economy.food_production_multiplier",
        "value": 0.4,
        "type": "multiplier"
      }
    ],
    "isGateway": true
  },
  {
    "id": "cap_stone_eco",
    "domain": TechnologyDomain.Economy,
    "era": TechnologyEra.StoneAge,
    "name": "Coleta Avançada",
    "description": "Refinamento das técnicas de subsistência.",
    "required": [
      "animal_tracking"
    ],
    "cost": 120,
    "effects": [
      {
        "target": "economy.food_production_multiplier",
        "value": 0.02,
        "type": "multiplier"
      }
    ],
    "repeatable": true,
    "costScaling": 1.45
  },
  {
    "id": "cap_stone_eng",
    "domain": TechnologyDomain.Engineering,
    "era": TechnologyEra.StoneAge,
    "name": "Polimento de Pedras",
    "description": "Aprimoramento infinito das ferramentas líticas.",
    "required": [
      "stone_working"
    ],
    "cost": 150,
    "effects": [
      {
        "target": "economy.tax_income_multiplier",
        "value": 0.02,
        "type": "multiplier"
      }
    ],
    "repeatable": true,
    "costScaling": 1.45
  },
  {
    "id": "cap_stone_mil",
    "domain": TechnologyDomain.Military,
    "era": TechnologyEra.StoneAge,
    "name": "Táticas de Emboscada",
    "description": "Treinamento contínuo das patrulhas.",
    "required": [
      "spears"
    ],
    "cost": 180,
    "effects": [
      {
        "target": "military.reserveManpower",
        "value": 10,
        "type": "additive"
      }
    ],
    "repeatable": true,
    "costScaling": 1.45
  },
  {
    "id": "cap_stone_rel",
    "domain": TechnologyDomain.Religion,
    "era": TechnologyEra.StoneAge,
    "name": "Mitos Antigos",
    "description": "Aprofundamento na espiritualidade tribal.",
    "required": [
      "burial_rites"
    ],
    "cost": 150,
    "effects": [
      {
        "target": "religion.cohesion",
        "value": 0.01,
        "type": "additive"
      }
    ],
    "repeatable": true,
    "costScaling": 1.45
  },
  {
    "id": "cap_stone_adm",
    "domain": TechnologyDomain.Administration,
    "era": TechnologyEra.StoneAge,
    "name": "Costumes Rígidos",
    "description": "Fortalecimento das tradições orais.",
    "required": [
      "tribal_councils"
    ],
    "cost": 180,
    "effects": [
      {
        "target": "legitimacy",
        "value": 1,
        "type": "additive"
      }
    ],
    "repeatable": true,
    "costScaling": 1.45
  },
  {
    "id": "pottery",
    "domain": TechnologyDomain.Economy,
    "era": TechnologyEra.BronzeAge,
    "name": "Olaria",
    "description": "Criação de vasos de barro para armazenar alimentos.",
    "required": [
      "basic_agriculture"
    ],
    "cost": 450,
    "effects": [
      {
        "target": "economy.foodStock",
        "value": 500,
        "type": "additive"
      }
    ]
  },
  {
    "id": "irrigation",
    "domain": TechnologyDomain.Economy,
    "era": TechnologyEra.BronzeAge,
    "name": "Irrigação",
    "description": "Canais para levar água aos campos.",
    "required": [
      "basic_agriculture"
    ],
    "cost": 550,
    "effects": [
      {
        "target": "economy.food_production_multiplier",
        "value": 0.25,
        "type": "multiplier"
      }
    ]
  },
  {
    "id": "animal_husbandry",
    "domain": TechnologyDomain.Economy,
    "era": TechnologyEra.BronzeAge,
    "name": "Pecuária",
    "description": "Domesticação de animais de tração e corte.",
    "required": [
      "basic_agriculture"
    ],
    "cost": 600,
    "effects": [
      {
        "target": "economy.food_production_multiplier",
        "value": 0.2,
        "type": "multiplier"
      }
    ]
  },
  {
    "id": "coastal_fishing",
    "domain": TechnologyDomain.Economy,
    "era": TechnologyEra.BronzeAge,
    "name": "Pesca Costeira",
    "description": "Exploração dos recursos marinhos rasos.",
    "required": [
      "pottery"
    ],
    "cost": 500,
    "effects": [
      {
        "target": "economy.food_production_multiplier",
        "value": 0.15,
        "type": "multiplier"
      }
    ]
  },
  {
    "id": "wheel",
    "domain": TechnologyDomain.Economy,
    "era": TechnologyEra.BronzeAge,
    "name": "A Roda",
    "description": "Veículos rudimentares para transporte.",
    "required": [
      "animal_husbandry"
    ],
    "cost": 800,
    "effects": [
      {
        "target": "economy.tax_income_multiplier",
        "value": 0.2,
        "type": "multiplier"
      }
    ]
  },
  {
    "id": "trade_routes",
    "domain": TechnologyDomain.Economy,
    "era": TechnologyEra.BronzeAge,
    "name": "Rotas de Comércio",
    "description": "Trocas sistêmicas com outras tribos.",
    "required": [
      "wheel"
    ],
    "cost": 1000,
    "effects": [
      {
        "target": "economy.goldStock",
        "value": 200,
        "type": "additive"
      }
    ]
  },
  {
    "id": "copper_working",
    "domain": TechnologyDomain.Engineering,
    "era": TechnologyEra.BronzeAge,
    "name": "Trabalho em Cobre",
    "description": "Metalurgia inicial para ferramentas macias.",
    "required": [
      "basic_agriculture"
    ],
    "cost": 500,
    "effects": [
      {
        "target": "economy.tax_income_multiplier",
        "value": 0.15,
        "type": "multiplier"
      }
    ]
  },
  {
    "id": "masonry",
    "domain": TechnologyDomain.Engineering,
    "era": TechnologyEra.BronzeAge,
    "name": "Alvenaria",
    "description": "Tijolos de barro e pedras cortadas.",
    "required": [
      "copper_working"
    ],
    "cost": 700,
    "effects": [
      {
        "target": "population.carrying_capacity_multiplier",
        "value": 1.5,
        "type": "multiplier"
      }
    ]
  },
  {
    "id": "shipbuilding",
    "domain": TechnologyDomain.Engineering,
    "era": TechnologyEra.BronzeAge,
    "name": "Construção Naval",
    "description": "Barcos capazes de navegar pelo mar.",
    "required": [
      "copper_working",
      "coastal_fishing"
    ],
    "cost": 850,
    "effects": [
      {
        "target": "economy.woodStock",
        "value": 200,
        "type": "additive"
      }
    ],
    "unlockCapabilities": [
      "canTraverseWater"
    ]
  },
  {
    "id": "bronze_working",
    "domain": TechnologyDomain.Engineering,
    "era": TechnologyEra.BronzeAge,
    "name": "Trabalho em Bronze",
    "description": "Liga de cobre e estanho para metais duradouros.",
    "required": [
      "copper_working"
    ],
    "cost": 900,
    "effects": [
      {
        "target": "economy.tax_income_multiplier",
        "value": 0.2,
        "type": "multiplier"
      }
    ]
  },
  {
    "id": "monumental_architecture",
    "domain": TechnologyDomain.Engineering,
    "era": TechnologyEra.BronzeAge,
    "name": "Arquitetura Monumental",
    "description": "Construção de grandes templos e palácios.",
    "required": [
      "masonry"
    ],
    "cost": 1100,
    "effects": [
      {
        "target": "legitimacy",
        "value": 10,
        "type": "additive"
      }
    ]
  },
  {
    "id": "archery",
    "domain": TechnologyDomain.Military,
    "era": TechnologyEra.BronzeAge,
    "name": "Arquearia",
    "description": "Arco e flecha para caça e combate.",
    "required": [
      "basic_agriculture"
    ],
    "cost": 550,
    "effects": [
      {
        "target": "military.techLevel",
        "value": 0.5,
        "type": "additive"
      }
    ]
  },
  {
    "id": "bronze_weapons",
    "domain": TechnologyDomain.Military,
    "era": TechnologyEra.BronzeAge,
    "name": "Armas de Bronze",
    "description": "Espadas e machados duráveis.",
    "required": [
      "bronze_working"
    ],
    "cost": 950,
    "effects": [
      {
        "target": "military.techLevel",
        "value": 1,
        "type": "additive"
      }
    ]
  },
  {
    "id": "chariots",
    "domain": TechnologyDomain.Military,
    "era": TechnologyEra.BronzeAge,
    "name": "Carruagens",
    "description": "Unidades rápidas e mortíferas nos campos abertos.",
    "required": [
      "wheel",
      "bronze_weapons"
    ],
    "cost": 1200,
    "effects": [
      {
        "target": "military.techLevel",
        "value": 0.5,
        "type": "additive"
      }
    ]
  },
  {
    "id": "palisades",
    "domain": TechnologyDomain.Military,
    "era": TechnologyEra.BronzeAge,
    "name": "Paliçadas",
    "description": "Defesas de madeira para assentamentos.",
    "required": [
      "masonry",
      "archery"
    ],
    "cost": 800,
    "effects": [
      {
        "target": "stability",
        "value": 5,
        "type": "additive"
      }
    ]
  },
  {
    "id": "standing_army",
    "domain": TechnologyDomain.Military,
    "era": TechnologyEra.BronzeAge,
    "name": "Exército Regular",
    "description": "Primeiras tropas mantidas pelo Estado.",
    "required": [
      "bronze_weapons"
    ],
    "cost": 1400,
    "effects": [
      {
        "target": "military.reserveManpower",
        "value": 250,
        "type": "additive"
      }
    ]
  },
  {
    "id": "polytheism",
    "domain": TechnologyDomain.Religion,
    "era": TechnologyEra.BronzeAge,
    "name": "Politeísmo",
    "description": "Panteões complexos de deuses personificados.",
    "required": [
      "basic_agriculture"
    ],
    "cost": 600,
    "effects": [
      {
        "target": "religion.authority",
        "value": 0.1,
        "type": "additive"
      }
    ]
  },
  {
    "id": "priesthood",
    "domain": TechnologyDomain.Religion,
    "era": TechnologyEra.BronzeAge,
    "name": "Sacerdócio",
    "description": "Classe dedicada a rituais e organização religiosa.",
    "required": [
      "polytheism"
    ],
    "cost": 850,
    "effects": [
      {
        "target": "religion.cohesion",
        "value": 0.15,
        "type": "additive"
      }
    ]
  },
  {
    "id": "divine_right",
    "domain": TechnologyDomain.Religion,
    "era": TechnologyEra.BronzeAge,
    "name": "Direito Divino",
    "description": "Líderes justificam seu poder através dos deuses.",
    "required": [
      "priesthood",
      "monumental_architecture"
    ],
    "cost": 1300,
    "effects": [
      {
        "target": "legitimacy",
        "value": 15,
        "type": "additive"
      }
    ]
  },
  {
    "id": "writing",
    "domain": TechnologyDomain.Administration,
    "era": TechnologyEra.BronzeAge,
    "name": "Escrita",
    "description": "Registros primitivos para contabilidade.",
    "required": [
      "basic_agriculture"
    ],
    "cost": 750,
    "effects": [
      {
        "target": "administration.capacity",
        "value": 20,
        "type": "additive"
      }
    ]
  },
  {
    "id": "currency",
    "domain": TechnologyDomain.Administration,
    "era": TechnologyEra.BronzeAge,
    "name": "Cunhagem Rudimentar",
    "description": "Padronização de trocas.",
    "required": [
      "writing",
      "trade_routes"
    ],
    "cost": 1100,
    "effects": [
      {
        "target": "economy.tax_income_multiplier",
        "value": 0.25,
        "type": "multiplier"
      }
    ],
    "unlockCapabilities": [
      "hasCurrency"
    ]
  },
  {
    "id": "bureaucracy",
    "domain": TechnologyDomain.Administration,
    "era": TechnologyEra.BronzeAge,
    "name": "Burocracia",
    "description": "Organização do Estado e coleta de impostos.",
    "required": [
      "writing"
    ],
    "cost": 1000,
    "effects": [
      {
        "target": "administration.corruption",
        "value": -0.1,
        "type": "additive"
      }
    ]
  },
  {
    "id": "written_law",
    "domain": TechnologyDomain.Administration,
    "era": TechnologyEra.BronzeAge,
    "name": "Código Legal",
    "description": "Leis escritas para governar a sociedade.",
    "required": [
      "bureaucracy"
    ],
    "cost": 1200,
    "effects": [
      {
        "target": "stability",
        "value": 10,
        "type": "additive"
      }
    ],
    "unlockCapabilities": [
      "hasWrittenLaw"
    ]
  },
  {
    "id": "bronze_smelting",
    "domain": TechnologyDomain.Engineering,
    "era": TechnologyEra.BronzeAge,
    "name": "Metalurgia Avançada do Bronze",
    "description": "A fundição sistemática e dominação técnica do Bronze. O fim de uma Era.",
    "required": [
      "bronze_working",
      "written_law",
      "standing_army"
    ],
    "cost": 2000,
    "effects": [
      {
        "target": "economy.tax_income_multiplier",
        "value": 0.3,
        "type": "multiplier"
      }
    ],
    "isGateway": true
  },
  {
    "id": "cap_bronze_eco",
    "domain": TechnologyDomain.Economy,
    "era": TechnologyEra.BronzeAge,
    "name": "Manejo de Safra",
    "description": "Otimização eterna da colheita.",
    "required": [
      "irrigation"
    ],
    "cost": 400,
    "effects": [
      {
        "target": "economy.food_production_multiplier",
        "value": 0.02,
        "type": "multiplier"
      }
    ],
    "repeatable": true,
    "costScaling": 1.45
  },
  {
    "id": "cap_bronze_eng",
    "domain": TechnologyDomain.Engineering,
    "era": TechnologyEra.BronzeAge,
    "name": "Maestria em Metalurgia",
    "description": "Perfeição do Bronze.",
    "required": [
      "bronze_smelting"
    ],
    "cost": 450,
    "effects": [
      {
        "target": "economy.tax_income_multiplier",
        "value": 0.02,
        "type": "multiplier"
      }
    ],
    "repeatable": true,
    "costScaling": 1.45
  },
  {
    "id": "cap_bronze_mil",
    "domain": TechnologyDomain.Military,
    "era": TechnologyEra.BronzeAge,
    "name": "Táticas de Falange",
    "description": "Treinamento incessante das tropas.",
    "required": [
      "standing_army"
    ],
    "cost": 500,
    "effects": [
      {
        "target": "military.reserveManpower",
        "value": 20,
        "type": "additive"
      }
    ],
    "repeatable": true,
    "costScaling": 1.45
  },
  {
    "id": "cap_bronze_rel",
    "domain": TechnologyDomain.Religion,
    "era": TechnologyEra.BronzeAge,
    "name": "Devoção Suprema",
    "description": "Fé inabalável nos deuses.",
    "required": [
      "divine_right"
    ],
    "cost": 450,
    "effects": [
      {
        "target": "religion.authority",
        "value": 0.01,
        "type": "additive"
      }
    ],
    "repeatable": true,
    "costScaling": 1.45
  },
  {
    "id": "cap_bronze_adm",
    "domain": TechnologyDomain.Administration,
    "era": TechnologyEra.BronzeAge,
    "name": "Censo Populacional",
    "description": "Registro rigoroso da população.",
    "required": [
      "bureaucracy"
    ],
    "cost": 400,
    "effects": [
      {
        "target": "administration.capacity",
        "value": 1,
        "type": "additive"
      }
    ],
    "repeatable": true,
    "costScaling": 1.45
  },
  {
    "id": "iron_plow",
    "domain": TechnologyDomain.Economy,
    "era": TechnologyEra.IronAge,
    "name": "Arado de Ferro",
    "description": "Revolução agrícola.",
    "required": [
      "bronze_smelting"
    ],
    "cost": 2200,
    "effects": [
      {
        "target": "economy.food_production_multiplier",
        "value": 0.4,
        "type": "multiplier"
      }
    ]
  },
  {
    "id": "crop_rotation",
    "domain": TechnologyDomain.Economy,
    "era": TechnologyEra.IronAge,
    "name": "Rotação de Culturas",
    "description": "Uso eficiente do solo.",
    "required": [
      "iron_plow"
    ],
    "cost": 2800,
    "effects": [
      {
        "target": "economy.food_production_multiplier",
        "value": 0.3,
        "type": "multiplier"
      }
    ]
  },
  {
    "id": "standardized_weights",
    "domain": TechnologyDomain.Economy,
    "era": TechnologyEra.IronAge,
    "name": "Pesos e Medidas",
    "description": "Facilita o comércio de grande escala.",
    "required": [
      "currency"
    ],
    "cost": 2500,
    "effects": [
      {
        "target": "economy.tax_income_multiplier",
        "value": 0.2,
        "type": "multiplier"
      }
    ]
  },
  {
    "id": "market_places",
    "domain": TechnologyDomain.Economy,
    "era": TechnologyEra.IronAge,
    "name": "Mercados Centrais",
    "description": "Concentração do comércio nas cidades.",
    "required": [
      "standardized_weights"
    ],
    "cost": 3200,
    "effects": [
      {
        "target": "economy.goldStock",
        "value": 1000,
        "type": "additive"
      }
    ]
  },
  {
    "id": "mining_networks",
    "domain": TechnologyDomain.Economy,
    "era": TechnologyEra.IronAge,
    "name": "Redes de Mineração",
    "description": "Extração massiva de minérios.",
    "required": [
      "iron_plow"
    ],
    "cost": 3000,
    "effects": [
      {
        "target": "economy.ironStock",
        "value": 500,
        "type": "additive"
      }
    ]
  },
  {
    "id": "overseas_colonies",
    "domain": TechnologyDomain.Economy,
    "era": TechnologyEra.IronAge,
    "name": "Colônias Ultramarinas",
    "description": "Expansão além dos mares.",
    "required": [
      "shipbuilding",
      "market_places"
    ],
    "cost": 4000,
    "effects": [
      {
        "target": "population.carrying_capacity_multiplier",
        "value": 1.5,
        "type": "multiplier"
      }
    ],
    "unlockCapabilities": [
      "canColonizeIslands"
    ]
  },
  {
    "id": "guilds",
    "domain": TechnologyDomain.Economy,
    "era": TechnologyEra.IronAge,
    "name": "Corporações de Ofício",
    "description": "Organização dos artesãos.",
    "required": [
      "market_places"
    ],
    "cost": 4500,
    "effects": [
      {
        "target": "economy.tax_income_multiplier",
        "value": 0.25,
        "type": "multiplier"
      }
    ]
  },
  {
    "id": "iron_working",
    "domain": TechnologyDomain.Engineering,
    "era": TechnologyEra.IronAge,
    "name": "Trabalho em Ferro",
    "description": "Metais mais fortes e baratos.",
    "required": [
      "bronze_smelting"
    ],
    "cost": 2400,
    "effects": [
      {
        "target": "economy.tax_income_multiplier",
        "value": 0.25,
        "type": "multiplier"
      }
    ]
  },
  {
    "id": "stone_fortifications",
    "domain": TechnologyDomain.Engineering,
    "era": TechnologyEra.IronAge,
    "name": "Fortificações de Pedra",
    "description": "Muralhas impenetráveis.",
    "required": [
      "masonry",
      "iron_working"
    ],
    "cost": 3500,
    "effects": [
      {
        "target": "stability",
        "value": 15,
        "type": "additive"
      }
    ]
  },
  {
    "id": "aqueducts",
    "domain": TechnologyDomain.Engineering,
    "era": TechnologyEra.IronAge,
    "name": "Aquedutos",
    "description": "Água limpa para as massas.",
    "required": [
      "stone_fortifications"
    ],
    "cost": 4200,
    "effects": [
      {
        "target": "population.growthRate",
        "value": 0.0001,
        "type": "additive"
      }
    ]
  },
  {
    "id": "trade_port",
    "domain": TechnologyDomain.Engineering,
    "era": TechnologyEra.IronAge,
    "name": "Porto Comercial",
    "description": "Infraestrutura naval pesada.",
    "required": [
      "shipbuilding",
      "iron_working"
    ],
    "cost": 3800,
    "effects": [
      {
        "target": "economy.tax_income_multiplier",
        "value": 0.2,
        "type": "multiplier"
      }
    ],
    "unlockCapabilities": [
      "canTradeOverseas"
    ]
  },
  {
    "id": "siege_engines",
    "domain": TechnologyDomain.Engineering,
    "era": TechnologyEra.IronAge,
    "name": "Máquinas de Cerco",
    "description": "Catapultas e aríetes.",
    "required": [
      "iron_working"
    ],
    "cost": 4600,
    "effects": [
      {
        "target": "military.techLevel",
        "value": 0.5,
        "type": "additive"
      }
    ]
  },
  {
    "id": "road_networks",
    "domain": TechnologyDomain.Engineering,
    "era": TechnologyEra.IronAge,
    "name": "Redes de Estradas",
    "description": "Logística impecável pelo império.",
    "required": [
      "aqueducts"
    ],
    "cost": 5000,
    "effects": [
      {
        "target": "administration.capacity",
        "value": 30,
        "type": "additive"
      }
    ]
  },
  {
    "id": "iron_weapons",
    "domain": TechnologyDomain.Military,
    "era": TechnologyEra.IronAge,
    "name": "Armas de Ferro",
    "description": "Equipamento superior para as legiões.",
    "required": [
      "iron_working"
    ],
    "cost": 2800,
    "effects": [
      {
        "target": "military.techLevel",
        "value": 1.5,
        "type": "additive"
      }
    ]
  },
  {
    "id": "cavalry",
    "domain": TechnologyDomain.Military,
    "era": TechnologyEra.IronAge,
    "name": "Cavalaria",
    "description": "Mobilidade e poder de choque.",
    "required": [
      "animal_husbandry",
      "iron_weapons"
    ],
    "cost": 3400,
    "effects": [
      {
        "target": "military.techLevel",
        "value": 1,
        "type": "additive"
      }
    ]
  },
  {
    "id": "war_fleet",
    "domain": TechnologyDomain.Military,
    "era": TechnologyEra.IronAge,
    "name": "Frota de Guerra",
    "description": "Domínio total dos mares.",
    "required": [
      "trade_port",
      "iron_weapons"
    ],
    "cost": 4000,
    "effects": [
      {
        "target": "military.reserveManpower",
        "value": 200,
        "type": "additive"
      }
    ],
    "unlockCapabilities": [
      "canBuildFleets"
    ]
  },
  {
    "id": "military_logistics",
    "domain": TechnologyDomain.Military,
    "era": TechnologyEra.IronAge,
    "name": "Logística Militar",
    "description": "Suprimentos constantes nas campanhas.",
    "required": [
      "road_networks",
      "iron_weapons"
    ],
    "cost": 4800,
    "effects": [
      {
        "target": "military.techLevel",
        "value": 0.5,
        "type": "additive"
      }
    ]
  },
  {
    "id": "conscription",
    "domain": TechnologyDomain.Military,
    "era": TechnologyEra.IronAge,
    "name": "Alistamento Obrigatório",
    "description": "As massas em armas.",
    "required": [
      "bureaucracy",
      "iron_weapons"
    ],
    "cost": 5200,
    "effects": [
      {
        "target": "military.reserveManpower",
        "value": 1000,
        "type": "additive"
      }
    ]
  },
  {
    "id": "professional_officers",
    "domain": TechnologyDomain.Military,
    "era": TechnologyEra.IronAge,
    "name": "Oficiais Profissionais",
    "description": "Estratégia e disciplina.",
    "required": [
      "military_logistics",
      "conscription"
    ],
    "cost": 6000,
    "effects": [
      {
        "target": "military.techLevel",
        "value": 1,
        "type": "additive"
      }
    ]
  },
  {
    "id": "monotheism",
    "domain": TechnologyDomain.Religion,
    "era": TechnologyEra.IronAge,
    "name": "Tendências Monoteístas",
    "description": "O foco no Deus Supremo.",
    "required": [
      "priesthood"
    ],
    "cost": 2800,
    "effects": [
      {
        "target": "religion.cohesion",
        "value": 0.2,
        "type": "additive"
      }
    ]
  },
  {
    "id": "scriptures",
    "domain": TechnologyDomain.Religion,
    "era": TechnologyEra.IronAge,
    "name": "Escrituras Sagradas",
    "description": "A palavra divina canonizada.",
    "required": [
      "writing",
      "monotheism"
    ],
    "cost": 3600,
    "effects": [
      {
        "target": "religion.authority",
        "value": 0.15,
        "type": "additive"
      }
    ]
  },
  {
    "id": "state_religion",
    "domain": TechnologyDomain.Religion,
    "era": TechnologyEra.IronAge,
    "name": "Religião de Estado",
    "description": "Igreja e Coroa unidos.",
    "required": [
      "scriptures",
      "bureaucracy"
    ],
    "cost": 4500,
    "effects": [
      {
        "target": "legitimacy",
        "value": 20,
        "type": "additive"
      }
    ]
  },
  {
    "id": "religious_schools",
    "domain": TechnologyDomain.Religion,
    "era": TechnologyEra.IronAge,
    "name": "Escolas Religiosas",
    "description": "Propagação sistemática da fé.",
    "required": [
      "scriptures"
    ],
    "cost": 5000,
    "effects": [
      {
        "target": "religion.tolerance",
        "value": -0.1,
        "type": "additive"
      }
    ]
  },
  {
    "id": "imperial_administration",
    "domain": TechnologyDomain.Administration,
    "era": TechnologyEra.IronAge,
    "name": "Administração Imperial",
    "description": "Governo centralizado e eficiente.",
    "required": [
      "bureaucracy"
    ],
    "cost": 3000,
    "effects": [
      {
        "target": "administration.capacity",
        "value": 40,
        "type": "additive"
      }
    ]
  },
  {
    "id": "vassalage_system",
    "domain": TechnologyDomain.Administration,
    "era": TechnologyEra.IronAge,
    "name": "Sistema de Vassalagem",
    "description": "Controle de territórios subordinados.",
    "required": [
      "imperial_administration"
    ],
    "cost": 3800,
    "effects": [
      {
        "target": "economy.tax_income_multiplier",
        "value": 0.15,
        "type": "multiplier"
      }
    ]
  },
  {
    "id": "census",
    "domain": TechnologyDomain.Administration,
    "era": TechnologyEra.IronAge,
    "name": "O Grande Censo",
    "description": "Conhecer a população para taxá-la.",
    "required": [
      "imperial_administration",
      "written_law"
    ],
    "cost": 4200,
    "effects": [
      {
        "target": "economy.tax_income_multiplier",
        "value": 0.2,
        "type": "multiplier"
      }
    ]
  },
  {
    "id": "diplomatic_corps",
    "domain": TechnologyDomain.Administration,
    "era": TechnologyEra.IronAge,
    "name": "Corpo Diplomático",
    "description": "Embaixadores e espiões.",
    "required": [
      "imperial_administration"
    ],
    "cost": 4800,
    "effects": [
      {
        "target": "stability",
        "value": 10,
        "type": "additive"
      }
    ]
  },
  {
    "id": "philosophy",
    "domain": TechnologyDomain.Administration,
    "era": TechnologyEra.IronAge,
    "name": "Filosofia",
    "description": "O amor pela sabedoria e pensamento crítico.",
    "required": [
      "writing"
    ],
    "cost": 5500,
    "effects": [
      {
        "target": "legitimacy",
        "value": 10,
        "type": "additive"
      }
    ]
  },
  {
    "id": "iron_forging",
    "domain": TechnologyDomain.Engineering,
    "era": TechnologyEra.IronAge,
    "name": "A Forja do Império",
    "description": "O domínio absoluto do Ferro pavimenta o caminho para a Era Clássica.",
    "required": [
      "professional_officers",
      "philosophy",
      "road_networks"
    ],
    "cost": 8000,
    "effects": [
      {
        "target": "military.techLevel",
        "value": 2,
        "type": "additive"
      }
    ],
    "isGateway": true
  },
  {
    "id": "cap_iron_eco",
    "domain": TechnologyDomain.Economy,
    "era": TechnologyEra.IronAge,
    "name": "Monopólios",
    "description": "Domínio dos mercados.",
    "required": [
      "guilds"
    ],
    "cost": 1500,
    "effects": [
      {
        "target": "economy.tax_income_multiplier",
        "value": 0.03,
        "type": "multiplier"
      }
    ],
    "repeatable": true,
    "costScaling": 1.45
  },
  {
    "id": "cap_iron_eng",
    "domain": TechnologyDomain.Engineering,
    "era": TechnologyEra.IronAge,
    "name": "Engenharia de Cerco",
    "description": "Máquinas cada vez maiores.",
    "required": [
      "siege_engines"
    ],
    "cost": 1800,
    "effects": [
      {
        "target": "military.techLevel",
        "value": 0.1,
        "type": "additive"
      }
    ],
    "repeatable": true,
    "costScaling": 1.45
  },
  {
    "id": "cap_iron_mil",
    "domain": TechnologyDomain.Military,
    "era": TechnologyEra.IronAge,
    "name": "Formação de Legião",
    "description": "Marcha incansável.",
    "required": [
      "professional_officers"
    ],
    "cost": 2000,
    "effects": [
      {
        "target": "military.reserveManpower",
        "value": 100,
        "type": "additive"
      }
    ],
    "repeatable": true,
    "costScaling": 1.45
  },
  {
    "id": "cap_iron_rel",
    "domain": TechnologyDomain.Religion,
    "era": TechnologyEra.IronAge,
    "name": "Ortodoxia",
    "description": "Erradicação da heresia.",
    "required": [
      "religious_schools"
    ],
    "cost": 1600,
    "effects": [
      {
        "target": "religion.cohesion",
        "value": 0.01,
        "type": "additive"
      }
    ],
    "repeatable": true,
    "costScaling": 1.45
  },
  {
    "id": "cap_iron_adm",
    "domain": TechnologyDomain.Administration,
    "era": TechnologyEra.IronAge,
    "name": "Mecanismos de Estado",
    "description": "Controle estatal perfeito.",
    "required": [
      "census"
    ],
    "cost": 1700,
    "effects": [
      {
        "target": "administration.capacity",
        "value": 2,
        "type": "additive"
      }
    ],
    "repeatable": true,
    "costScaling": 1.45
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
  return !!state.unlocked[nodeId];
}

export function isTechnologyAvailable(state: TechnologyState, nodeId: string): boolean {
  const node = NODE_MAP.get(nodeId);
  if (!node) {
    return false;
  }

  if (isTechnologyUnlocked(state, nodeId)) {
    return false;
  }

  // Verifica se a tecnologia pertence a uma Era já descoberta
  if (node.era && !state.unlockedEras.includes(node.era)) {
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
