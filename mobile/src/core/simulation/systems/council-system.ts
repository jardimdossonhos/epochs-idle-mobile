import { buildEvent } from "../../ecs/event-pool";
import { BuildingType, MinisterPersonality, MinisterRole, ReligiousPolicy, ResourceType } from "../../models/enums";
import type { AdviceOption, Minister, MinisterAdvice } from "../../models/administration";
import type { SimulationSystem, TickContext } from "../tick-pipeline";
import { clamp, createEventId, getPlayerKingdom, roundTo } from "./utils";
import type { StaticWorldData } from "../../models/static-world-data";
import type { GameState } from "../../models/game-state";
import { getRandomCulture, generateCulturalName, generatePortraitSeed, getRandomGender } from "./culture-generator";
import { recalculateAdminModifiers } from "./modifier-cache";

const ORIGINS = ["Nobreza da Capital", "Clero Ortodoxo", "Mercadores do Leste", "Veterano de Fronteira", "Aristocracia Decadente", "Academia Real", "Plebeu Ascendido", "Ordem dos Inquisidores"];

function generateCandidate(idSeq: number): Minister {
  const roles = Object.values(MinisterRole);
  const personalities = Object.values(MinisterPersonality);
  
  const cultureId = getRandomCulture();
  const gender = getRandomGender();
  const name = generateCulturalName(cultureId, gender);
  const portraitSeed = generatePortraitSeed();

  const role = roles[Math.floor(Math.random() * roles.length)];
  const personality = personalities[Math.floor(Math.random() * personalities.length)];
  const origin = ORIGINS[Math.floor(Math.random() * ORIGINS.length)];
  
  // Pesos para habilidades (1-5), sendo 4 e 5 muito raros
  const roll = Math.random();
  let skill = 1;
  if (roll > 0.5) skill = 2;
  if (roll > 0.8) skill = 3;
  if (roll > 0.95) skill = 4;
  if (roll > 0.99) skill = 5;

  // Gera Atributos de RPG baseados no NÃ­vel de Skill (1 a 5)
  const baseStat = skill * 2;
  const stats = {
    administration: baseStat + Math.floor(Math.random() * 4),
    martial: baseStat + Math.floor(Math.random() * 4),
    diplomacy: baseStat + Math.floor(Math.random() * 4),
    intrigue: baseStat + Math.floor(Math.random() * 4),
    learning: baseStat + Math.floor(Math.random() * 4),
  };

  // DÃ¡ um BÃ´nus focado na vocaÃ§Ã£o da personalidade
  if (personality === MinisterPersonality.Greedy) stats.administration += 3;
  if (personality === MinisterPersonality.Militarist) stats.martial += 3;
  if (personality === MinisterPersonality.Pacifist) stats.diplomacy += 3;
  if (personality === MinisterPersonality.Progressive) stats.learning += 3;

  const baseSalary = skill * 4 + (personality === MinisterPersonality.Greedy ? 8 : 0);

  return {
    id: `min_${Date.now()}_${idSeq}`,
    name,
    cultureId,
    portraitSeed,
    gender,
    role,
    personality,
    origin,
    skillLevel: skill,
    experience: 0, // ComeÃ§a com 0 experiÃªncia
    experienceToNext: skill * 100, // ExperiÃªncia necessÃ¡ria cresce com o nÃ­vel
    stats,
    salary: baseSalary,
    delegationLevel: "manual" as any,
    loyalty: Math.floor(Math.random() * 30) + 50 // Inicia entre 50 e 80
  };
}

// Nova FunÃ§Ã£o: Sistema de ExperiÃªncia e Level Up para Ministros
export function updateMinisterExperience(minister: Minister, state: GameState, kingdomId: string, context: TickContext): void {
  const kingdom = state.kingdoms[kingdomId];
  if (!kingdom) return;

  // Cooldown de 10 ticks entre level ups para evitar spam
  if (minister.lastLevelUpTick && (state.meta.tick - minister.lastLevelUpTick) < 10) {
    return;
  }

  let experienceGain = 0;

  // Ganho base por tick ativo (ministro empregado)
  experienceGain += 1;

  // BÃ´nus baseado na performance do reino (mÃ©tricas positivas)
  if (kingdom.population.growthRatePerTick > 0.0002) experienceGain += 2; // Economia/populaÃ§Ã£o crescendo
  if (kingdom.population.unrest < 0.3) experienceGain += 1; // Povo feliz
  const averageMorale = kingdom.military.armies.length > 0
    ? kingdom.military.armies.reduce((sum, army) => sum + army.morale, 0) / kingdom.military.armies.length
    : 0;
  if (averageMorale > 0.8) experienceGain += 1; // ExÃ©rcito motivado
  if (kingdom.religion.cohesion > 0.8) experienceGain += 1; // ReligiÃ£o unida
  if (kingdom.economy.corruption < 0.1) experienceGain += 1; // Baixa corrupÃ§Ã£o

  // BÃ´nus baseado no papel especÃ­fico do ministro
  switch (minister.role) {
    case MinisterRole.Steward:
      if (kingdom.economy.stock[ResourceType.Gold] > 500) experienceGain += 2; // Tesouro saudÃ¡vel
      if (kingdom.population.growthRatePerTick > 0.0005) experienceGain += 3; // Crescimento excepcional
      break;
    case MinisterRole.Marshal:
      if (!Object.values(state.wars).some(w => w.attackers.includes(kingdomId) || w.defenders.includes(kingdomId))) {
        experienceGain += 2; // ManutenÃ§Ã£o da paz
      }
      if (kingdom.military.reserveManpower > 200) experienceGain += 1; // ForÃ§as bem treinadas
      break;
    case MinisterRole.Chancellor:
      // Diplomacia Ã© mais complexa - ganha experiÃªncia por alianÃ§as ativas
      const activeAlliances = kingdom.diplomacy.treaties.filter(t =>
        t.parties.includes(kingdomId) && t.type === 'alliance'
      ).length;
      experienceGain += activeAlliances * 2;
      break;
    case MinisterRole.Chaplain:
      if (kingdom.religion.cohesion > 0.9) experienceGain += 3; // FÃ© muito forte
      if (kingdom.population.unrest < 0.2) experienceGain += 1; // Ordem social
      break;
  }

  // Multiplicador baseado no nÃ­vel de skill (ministros mais experientes ganham mais devagar)
  const skillMultiplier = Math.max(0.5, 1 - (minister.skillLevel - 1) * 0.1);
  experienceGain = Math.floor(experienceGain * skillMultiplier);

  // Aplica ganho de experiÃªncia
  minister.experience += experienceGain;

  // Verifica se atingiu o nÃ­vel necessÃ¡rio para upar
  if (minister.experience >= minister.experienceToNext) {
    // Level Up!
    minister.skillLevel += 1;
    minister.experience = 0; // Reset experiÃªncia
    minister.experienceToNext = minister.skillLevel * 100; // Novo requisito
    minister.lastLevelUpTick = state.meta.tick;

    // Melhora atributos baseada na personalidade
    if (minister.stats) {
      const bonus = 2; // +2 em atributos por level up
      switch (minister.personality) {
        case MinisterPersonality.Greedy:
          minister.stats.administration += bonus;
          break;
        case MinisterPersonality.Militarist:
          minister.stats.martial += bonus;
          break;
        case MinisterPersonality.Pacifist:
          minister.stats.diplomacy += bonus;
          break;
        case MinisterPersonality.Progressive:
          minister.stats.learning += bonus;
          break;
        case MinisterPersonality.Zealous:
          minister.stats.intrigue += bonus; // Zelosos sÃ£o mais manipuladores
          break;
        case MinisterPersonality.Cautious:
          minister.stats.administration += Math.floor(bonus / 2);
          minister.stats.diplomacy += Math.floor(bonus / 2);
          break;
      }
    }

    // Aumenta salÃ¡rio levemente
    minister.salary += 2;

    // Dispara evento de level up
    const evt = buildEvent("minister.level_up", context.now, {
        ministerId: minister.id,
        ministerName: minister.name,
        newLevel: minister.skillLevel,
        role: minister.role
      }, kingdomId, undefined);
          if (evt) {
            evt.id = createEventId({ prefix: "evt_minister_levelup", tick: context.nextState.meta.tick, systemId: "council", actorId: minister.id, sequence: context.events.length });
            context.events.push(evt);
          }
  }
}

function evaluateMinisterLoyalty(minister: Minister, state: GameState, kingdomId: string): void {
  const kingdom = state.kingdoms[kingdomId];
  if (!kingdom) return;

  // Fallback para saves antigos sem salÃ¡rio
  if (minister.salary === undefined) {
    minister.salary = minister.skillLevel * 4 + (minister.personality === MinisterPersonality.Greedy ? 8 : 0);
  }

  const expectedSalary = minister.skillLevel * 5 + (minister.personality === MinisterPersonality.Greedy ? 12 : 0);

  const isAtWar = Object.values(state.wars).some(w => w.attackers.includes(kingdomId) || w.defenders.includes(kingdomId));
  const taxRate = kingdom.economy.taxPolicy.baseRate;
  const tolerance = kingdom.religion.tolerance;

  let loyaltyDelta = 0;

  // A personalidade dita como eles reagem ao estado do reino
  switch (minister.personality) {
    case MinisterPersonality.Militarist:
      loyaltyDelta = isAtWar ? 0.5 : -0.2;
      if (kingdom.economy.budgetPriority.military > 30) loyaltyDelta += 0.2;
      break;
    case MinisterPersonality.Pacifist:
      loyaltyDelta = isAtWar ? -0.8 : 0.3;
      break;
    case MinisterPersonality.Greedy:
      loyaltyDelta = taxRate >= 0.25 ? 0.4 : -0.5;
      if (kingdom.economy.corruption > 0.2) loyaltyDelta += 0.2; // O ganancioso ama um reino corrupto
      break;
    case MinisterPersonality.Zealous:
      loyaltyDelta = tolerance < 0.2 ? 0.4 : -0.6;
      break;
    case MinisterPersonality.Progressive:
      loyaltyDelta = kingdom.economy.budgetPriority.technology > 25 ? 0.4 : -0.3;
      break;
    case MinisterPersonality.Cautious:
      loyaltyDelta = kingdom.stability > 70 ? 0.3 : -0.5;
      break;
  }

  // Impacto base de instabilidade: NinguÃ©m gosta de governar um paÃ­s em chamas
  if (kingdom.stability < 30) loyaltyDelta -= 0.3;

  // Impacto Salarial ContÃ­nuo
  if (minister.salary < expectedSalary) {
    loyaltyDelta -= 0.5; // Fica insatisfeito aos poucos se ganha abaixo da sua expectativa
  } else if (minister.salary > expectedSalary + 10) {
    loyaltyDelta += 0.2; // BÃ´nus contÃ­nuo se for muito bem pago
  }

  minister.loyalty = roundTo(clamp(minister.loyalty + loyaltyDelta, 0, 100));
}

function generateAdvice(minister: Minister, state: GameState, kingdomId: string, staticData: StaticWorldData, activeAdvice: MinisterAdvice[]): MinisterAdvice | null {
  const kingdom = state.kingdoms[kingdomId];
  const isAtWar = Object.values(state.wars).some(w => w.attackers.includes(kingdomId) || w.defenders.includes(kingdomId));
  
  let text = "";
  let urgency: "low" | "medium" | "high" = "low";
  let title = "RelatÃ³rio de Rotina";
  let options: AdviceOption[] = [];

  // HeurÃ­stica Narrativa baseada no Cargo e Personalidade
  if (minister.role === MinisterRole.Steward) {
    const food = kingdom.economy.stock[ResourceType.Food];
    const pop = kingdom.population.total;
    const currentTax = kingdom.economy.taxPolicy.baseRate;

    if (food < pop / 8000 && kingdom.economy.budgetPriority.economy < 35) {
        urgency = "high";
        title = "Crise de Fome Iminente";
        if (minister.personality === MinisterPersonality.Greedy) text = "Os plebeus morrem de fome, Majestade. Isso Ã© pÃ©ssimo, pois cadÃ¡veres nÃ£o pagam impostos! Libere verbas agrÃ­colas imediatamente.";
        else text = "Senhor, nossos celeiros estÃ£o vazios. A desnutriÃ§Ã£o nas provÃ­ncias pode causar o colapso do reino. Precisamos de investimentos.";
        options = [
          { id: "opt_1", label: "Aprovar: Direcionar 35% do OrÃ§amento para Economia", actionType: "update_budget", payload: { economy: 35 }, loyaltyImpact: 10 },
          { id: "opt_2", label: "Rejeitar: A coroa tem outras prioridades", actionType: "ignore", loyaltyImpact: -15 }
        ];
    } else if (kingdom.population.unrest > 0.5 && currentTax > 0.35) {
        urgency = "high";
        title = "Revolta Fiscal Opressiva";
        text = "Majestade, a cobranÃ§a implacÃ¡vel de impostos estÃ¡ estrangulando os plebeus. Se nÃ£o reduzirmos a Taxa Base, o sangue correrÃ¡ nas ruas.";
        options = [
          { id: "opt_1", label: "Aprovar: Reduzir Taxa Base em -10%", actionType: "update_tax", payload: { baseRate: Math.max(0.05, currentTax - 0.1) }, loyaltyImpact: minister.personality === MinisterPersonality.Greedy ? -20 : 15 },
          { id: "opt_2", label: "Rejeitar: O povo deve pagar", actionType: "ignore", loyaltyImpact: minister.personality === MinisterPersonality.Greedy ? 10 : -15 }
        ];
    } else if (kingdom.economy.stock[ResourceType.Gold] < 100) {
      if (currentTax >= 0.5) {
         text = "O tesouro seca, mas os impostos jÃ¡ estÃ£o no limite suportÃ¡vel. Cobrar mais causarÃ¡ uma rebeliÃ£o sangrenta!";
      } else if (currentTax < 0.5) {
        urgency = "medium";
        title = "Cofres Vazios";
        text = "O tesouro real estÃ¡ secando. Sugiro aumentarmos a Taxa Base ou cortarmos gastos estatais drÃ¡sticos.";
        options = [
          { id: "opt_1", label: "Aprovar: Aumentar Taxa Base em +10%", actionType: "update_tax", payload: { baseRate: Math.min(0.6, currentTax + 0.1) }, loyaltyImpact: 15 },
          { id: "opt_2", label: "Contraproposta: Aumentar apenas +5%", actionType: "update_tax", payload: { baseRate: Math.min(0.6, currentTax + 0.05) }, loyaltyImpact: 0 },
          { id: "opt_3", label: "Rejeitar: NÃ£o haverÃ¡ aumento de impostos", actionType: "ignore", loyaltyImpact: -20 }
        ];
      }
    }
  } 
  else if (minister.role === MinisterRole.Marshal) {
    if (isAtWar) {
      const manpower = kingdom.military.reserveManpower;
      if (manpower < 100) {
        urgency = "high";
        title = "Reservas Humanas Esgotadas";
        text = "As linhas de frente estÃ£o dizimadas e nÃ£o temos mais camponeses para recrutar. Sugiro buscarmos a paz ou erguermos QuartÃ©is urgentemente.";
        options = [
          { id: "opt_1", label: "Aprovar: Focar OrÃ§amento Militar (35%)", actionType: "update_budget", payload: { military: 35 }, loyaltyImpact: 10 },
          { id: "opt_2", label: "Ignorar Alerta", actionType: "ignore", loyaltyImpact: -10 }
        ];
      } else if (kingdom.economy.budgetPriority.military < 35) {
        urgency = "high";
        title = "EsforÃ§o de Guerra";
        if (minister.personality === MinisterPersonality.Pacifist) text = "Nossos filhos morrem nas fronteiras, meu Senhor. Imploro que busque um tratado de paz antes que nÃ£o reste ninguÃ©m para lutar.";
        else text = "As espadas estÃ£o desembainhadas! Aumente o orÃ§amento militar e massacraremos essa escÃ³ria antes do inverno.";
        options = [
          { id: "opt_1", label: "Aprovar Decreto de Guerra: +35% OrÃ§amento Militar", actionType: "update_budget", payload: { military: 35 }, loyaltyImpact: minister.personality === MinisterPersonality.Pacifist ? -20 : 15 },
          { id: "opt_2", label: "Ignorar Conselho", actionType: "ignore", loyaltyImpact: -5 }
        ];
      }
    } else if (kingdom.population.unrest > 0.6) {
      urgency = "medium";
      title = "Risco de InsurreiÃ§Ã£o";
      if (minister.personality === MinisterPersonality.Militarist) text = "Os camponeses no sul estÃ£o ousados demais. DÃª-me a ordem e minhas guarniÃ§Ãµes pintarÃ£o as ruas de vermelho.";
      else text = "HÃ¡ tensÃ£o nas provÃ­ncias. Devemos reforÃ§ar as patrulhas para manter a ordem.";
    }
  }
  else if (minister.role === MinisterRole.Chaplain) {
    if (kingdom.religion.cohesion < 0.4) {
      if (kingdom.religion.policy !== ReligiousPolicy.Zealous) {
        urgency = "high";
        title = "Heresia Descontrolada";
        if (minister.personality === MinisterPersonality.Zealous) text = "A blasfÃªmia apodrece o nosso impÃ©rio por dentro! Se nÃ£o ativarmos a InquisiÃ§Ã£o agora, o castigo divino recairÃ¡ sobre nÃ³s.";
        else text = "A verdadeira fÃ© estÃ¡ enfraquecendo. Precisamos enviar mais missionÃ¡rios ou aumentar a isenÃ§Ã£o do clero.";
        options = [
          { id: "opt_1", label: "Aprovar InquisiÃ§Ã£o (PolÃ­tica FanÃ¡tica)", actionType: "set_religious_policy", payload: { policy: ReligiousPolicy.Zealous }, loyaltyImpact: minister.personality === MinisterPersonality.Zealous ? 25 : -10 },
          { id: "opt_2", label: "Contraproposta: Isentar Clero de impostos (20%)", actionType: "update_tax", payload: { clergyExemption: 0.2 }, loyaltyImpact: 10 },
          { id: "opt_3", label: "Rejeitar Apelo (Manter TolerÃ¢ncia)", actionType: "ignore", loyaltyImpact: minister.personality === MinisterPersonality.Zealous ? -25 : -5 }
        ];
      }
    } else if (kingdom.religion.policy === ReligiousPolicy.Zealous && kingdom.religion.cohesion > 0.85) {
        urgency = "low";
        title = "PurificaÃ§Ã£o AlcanÃ§ada";
        text = "A verdadeira fÃ© domina nossas terras. O derramamento de sangue inquisitorial jÃ¡ nÃ£o Ã© necessÃ¡rio. Sugiro retornarmos Ã  Ortodoxia.";
        options = [
          { id: "opt_1", label: "Aprovar: Retornar Ã  Ortodoxia", actionType: "set_religious_policy", payload: { policy: ReligiousPolicy.Orthodoxy }, loyaltyImpact: minister.personality === MinisterPersonality.Zealous ? -15 : 15 },
          { id: "opt_2", label: "Rejeitar: Manter a InquisiÃ§Ã£o", actionType: "ignore", loyaltyImpact: minister.personality === MinisterPersonality.Zealous ? 15 : -10 }
        ];
    }
  }
  else if (minister.role === MinisterRole.Chancellor) {
    let highestRivalry = 0;
    let worstRivalId: string | null = null;
    for (const relId in kingdom.diplomacy.relations) {
      if (kingdom.diplomacy.relations[relId].score.rivalry > highestRivalry) {
        highestRivalry = kingdom.diplomacy.relations[relId].score.rivalry;
        worstRivalId = relId;
      }
    }

    const isAtWarWithThem = worstRivalId ? Object.values(state.wars).some(w => 
      (w.attackers.includes(kingdomId) && w.defenders.includes(worstRivalId)) || 
      (w.attackers.includes(worstRivalId) && w.defenders.includes(kingdomId))
    ) : false;

    if (highestRivalry > 0.75 && worstRivalId && !isAtWarWithThem) {
      const rival = state.kingdoms[worstRivalId];
      
      // AnÃ¡lise TÃ¡tica de Fronteira FÃ­sica
      let vulnerableRegionId: string | null = null;
      const ownedRegionIds = Object.keys(state.world.regions).filter(rId => state.world.regions[rId]?.ownerId === kingdomId);
      for (let i = 0; i < ownedRegionIds.length; i++) {
        const rId = ownedRegionIds[i];
        const touchesRival = staticData.definitions[rId]?.neighbors.some(nId => state.world.regions[nId]?.ownerId === worstRivalId);
        if (touchesRival) {
          vulnerableRegionId = rId;
          break; // Achou o ponto de invasÃ£o mais prÃ³ximo
        }
      }

      if (vulnerableRegionId) {
        const vulnRegionName = staticData.definitions[vulnerableRegionId]?.name ?? "nossa fronteira";
        const vulnRegion = state.world.regions[vulnerableRegionId];
        const hasFortress = vulnRegion?.buildings?.includes(BuildingType.Fortress);
        const hasBarracks = vulnRegion?.buildings?.includes(BuildingType.Barracks);

        urgency = "high";
        title = `AmeaÃ§a de InvasÃ£o: ${rival.name}`;
        
        if (!hasFortress && kingdom.economy.stock[ResourceType.Gold] >= 500) {
          text = `Nossos espiÃµes confirmam: ${rival.name} amassa tropas na fronteira de ${vulnRegionName}! Precisamos erguer uma Fortaleza lÃ¡ para segurar o avanÃ§o.`;
          options = [
            { id: "opt_fort", label: `Aprovar: Erigir Fortaleza em ${vulnRegionName} (-500 Ouro)`, actionType: "build_structure", payload: { regionId: vulnerableRegionId, buildingType: BuildingType.Fortress }, loyaltyImpact: 15 },
            { id: "opt_ign", label: "Ignorar AmeaÃ§a", actionType: "ignore", loyaltyImpact: -10 }
          ];
        } else if (!hasBarracks && kingdom.economy.stock[ResourceType.Gold] >= 200) {
          text = `${rival.name} marcha perto de ${vulnRegionName}. Sem ouro para fortaleza, precisamos de um Quartel para armar os moradores locais!`;
          options = [
            { id: "opt_bar", label: `Aprovar: Construir Quartel em ${vulnRegionName} (-200 Ouro)`, actionType: "build_structure", payload: { regionId: vulnerableRegionId, buildingType: BuildingType.Barracks }, loyaltyImpact: 10 },
            { id: "opt_ign", label: "Ignorar Conselho", actionType: "ignore", loyaltyImpact: -5 }
          ];
        } else if (kingdom.economy.budgetPriority.military < 35) {
          text = `A fronteira de ${vulnRegionName} tem defesas, mas falta pagamento aos soldados. Eleve o orÃ§amento militar para 35% imediatamente!`;
          options = [
            { id: "opt_bud", label: "Aprovar: Focar OrÃ§amento em Defesa (35%)", actionType: "update_budget", payload: { military: 35 }, loyaltyImpact: 10 },
            { id: "opt_ign", label: "Ignorar Alerta", actionType: "ignore", loyaltyImpact: -5 }
          ];
        } else {
           text = `A fronteira com ${rival.name} em ${vulnRegionName} estÃ¡ fortificada e financiada. Estamos prontos para o choque.`;
        }

        if (minister.personality === MinisterPersonality.Militarist && options.length > 0) {
          options.push({
            id: "opt_war", label: `Ataque Preemptivo: Declarar Guerra a ${rival.name}`, actionType: "declare_war", payload: { targetId: worstRivalId }, loyaltyImpact: 25 
          });
        }
      } else {
         urgency = "medium";
         title = `Rivalidade Distante: ${rival.name}`;
         text = `${rival.name} nos odeia abertamente, mas a distÃ¢ncia nos protege. Eles nÃ£o possuem logÃ­stica para marchar atÃ© nossos domÃ­nios... ainda.`;
      }
    }
  }
  else if (minister.role === MinisterRole.Scholar) {
    const hasUniversity = state.world.regions[kingdom.capitalRegionId]?.buildings?.includes(BuildingType.University);
    if (!hasUniversity && kingdom.economy.stock[ResourceType.Gold] >= 600) {
      urgency = "medium";
      title = "PatrocÃ­nio AcadÃªmico";
      text = "Nossos sÃ¡bios nÃ£o tÃªm onde se reunir. Com o ouro sobrando nos cofres, peÃ§o permissÃ£o para fundar uma Universidade na Capital e acelerar nossa pesquisa.";
      options = [
        { id: "opt_1", label: "Aprovar: Construir Universidade (-400 Ouro)", actionType: "build_structure", payload: { regionId: kingdom.capitalRegionId, buildingType: BuildingType.University }, loyaltyImpact: 20 },
        { id: "opt_2", label: "Ignorar Conselho", actionType: "ignore", loyaltyImpact: -15 }
      ];
    } else if (Object.keys(kingdom.technology.unlocked).length < 3 && !kingdom.technology.researchGoalId) {
      urgency = "medium";
      title = "EstagnaÃ§Ã£o CientÃ­fica";
      text = "Nosso povo vive na ignorÃ¢ncia enquanto o mundo avanÃ§a. Defina uma Meta TecnolÃ³gica para orientar os mentes do impÃ©rio.";
    }
  }

  // FILTRO ANTI-SPAM (IDEMPOTÃŠNCIA DE MENSAGEM)
  // Se uma mensagem com este exato tÃ­tulo jÃ¡ existe e ainda nÃ£o foi resolvida (arquivada), a IA aborta o envio silenciosamente.
  if (text !== "") {
    const isSpam = activeAdvice.some(a => !a.resolved && a.title === title);
    if (isSpam) {
      return null;
    }
  }

  // InterceptaÃ§Ã£o de Demanda Salarial
  const expectedSalary = minister.skillLevel * 5 + (minister.personality === MinisterPersonality.Greedy ? 12 : 0);
  if (text === "" && minister.salary < expectedSalary && minister.loyalty < 65 && Math.random() > 0.6) {
    return {
      id: `adv_sal_${Date.now()}_${minister.id}`,
      ministerId: minister.id,
      role: minister.role,
      title: "ExigÃªncia Salarial",
      narrativeText: "Majestade, meus talentos estÃ£o sendo desperdiÃ§ados por trocados. Exijo um reajuste salarial Ã  altura do meu intelecto.",
      urgency: minister.personality === MinisterPersonality.Greedy ? "high" : "medium",
      issuedAt: state.meta.lastUpdatedAt,
      options: [
        { id: "opt_sal_1", label: "Conceder Aumento (+5 Ouro/ciclo)", actionType: "change_salary", payload: { amount: 5 }, loyaltyImpact: minister.personality === MinisterPersonality.Greedy ? 20 : 10 },
        { id: "opt_sal_2", label: "Recusar", actionType: "ignore", loyaltyImpact: minister.personality === MinisterPersonality.Greedy ? -30 : -15 }
      ],
      resolved: false,
      isRead: false
    };
  }

  if (text === "") {
    return null; // O Motor automÃ¡tico agora SÃ“ avisa sobre crises e emergÃªncias!
  }

  return {
    id: `adv_${Date.now()}_${minister.id}`,
    ministerId: minister.id,
    role: minister.role,
    title,
    narrativeText: text,
    urgency,
    issuedAt: state.meta.lastUpdatedAt,
    options: options.length > 0 ? options : undefined,
    resolved: false,
    isRead: false
  };
}

// Nova FunÃ§Ã£o: Chamada manualmente quando o jogador "Clica" para dialogar/pedir conselho
export function generateRoutineAdvice(minister: Minister, state: GameState, kingdomId: string): MinisterAdvice | null {
  const kingdom = state.kingdoms[kingdomId];
  let text = "";
  let title = "AudiÃªncia Real";
  let options: AdviceOption[] = [];

  if (minister.role === MinisterRole.Steward) {
    text = "Nossa economia respira, Majestade. Se desejais a minha orientaÃ§Ã£o, eis o que podemos fazer com o excedente.";
    options = [
      { id: "opt_rout_1", label: "Focar OrÃ§amento na Economia (35%)", actionType: "update_budget", payload: { economy: 35 }, loyaltyImpact: 10 },
      { id: "opt_rout_2", label: "Aliviar Impostos (Agradar o povo)", actionType: "update_tax", payload: { baseRate: Math.max(0.05, kingdom.economy.taxPolicy.baseRate - 0.05) }, loyaltyImpact: 5 }
    ];
  } else if (minister.role === MinisterRole.Marshal) {
    text = "Em tempos de paz, os soldados engordam e as lÃ¢minas enferrujam. Permita-me organizar exercÃ­cios de prontidÃ£o.";
    options = [
      { id: "opt_rout_1", label: "Aumentar OrÃ§amento Militar (35%)", actionType: "update_budget", payload: { military: 35 }, loyaltyImpact: 10 }
    ];
  } else if (minister.role === MinisterRole.Chancellor) {
    text = "Nossas fronteiras estÃ£o seguras, mas um impÃ©rio nÃ£o cresce apenas com paz. Devemos buscar novos vassalos ou forjar alianÃ§as fortes.";
    options = [
      { id: "opt_rout_1", label: "Focar na Diplomacia (+25% OrÃ§amento)", actionType: "update_budget", payload: { administration: 25 }, loyaltyImpact: 10 },
      { id: "opt_rout_2", label: "Ignorar", actionType: "ignore", loyaltyImpact: -5 }
    ];
  } else if (minister.role === MinisterRole.Chaplain) {
    text = "O rebanho estÃ¡ dÃ³cil. Podemos aproveitar o momento para consolidar a fÃ© ou demonstrar benevolÃªncia.";
    options = [
      { id: "opt_rout_1", label: "Decretar TolerÃ¢ncia Religiosa", actionType: "set_religious_policy", payload: { policy: ReligiousPolicy.Tolerant }, loyaltyImpact: minister.personality === MinisterPersonality.Zealous ? -15 : 15 },
      { id: "opt_rout_2", label: "Manter a Ortodoxia Estrita", actionType: "set_religious_policy", payload: { policy: ReligiousPolicy.Orthodoxy }, loyaltyImpact: 0 }
    ];
  } else {
    return null;
  }

  return {
    id: `adv_rout_${Date.now()}_${minister.id}`, ministerId: minister.id, role: minister.role,
    title, narrativeText: text, urgency: "low", issuedAt: state.meta.lastUpdatedAt,
    options, resolved: false, isRead: false
  };
}

export function createCouncilSystem(): SimulationSystem {
  return {
    id: "council",
    run(context: TickContext): void {
      const state = context.nextState;
      const player = getPlayerKingdom(state);
      
      if (!player || !player.administration) return;
      
      player.administration.candidatePool = player.administration.candidatePool || [];
      player.administration.activeAdvice = player.administration.activeAdvice || [];
      player.administration.council = player.administration.council || {};

      // 1. ManutenÃ§Ã£o do Mercado de Trabalho (A cada ~1 MÃªs de jogo)
      const crossedYear = Math.floor(state.meta.tick / 12) !== Math.floor((state.meta.tick + (context.tickScale ?? 1)) / 12);
      if (state.meta.tick === 0 || crossedYear) {
        // Demite candidatos velhos aleatoriamente
        if (player.administration.candidatePool.length > 6) {
          player.administration.candidatePool.shift(); 
        }
        // Gera novos talentos para o jogador
        if (player.administration.candidatePool.length < 8) {
          player.administration.candidatePool.push(generateCandidate(state.meta.tick));
        }
      }

      let eventSeq = 0;
      const currentCouncil = player.administration.council;
      let councilChanged = false;

      for (const role of Object.keys(currentCouncil) as MinisterRole[]) {
        const minister = currentCouncil[role];
        if (!minister) continue;

        // JITTERING (Descompasso temporal): 
        // Cada ministro avalia o reino em seu prÃ³prio ritmo, quebrando a previsibilidade robÃ³tica
        // e impedindo que todas as mensagens cheguem no exato mesmo segundo.
        const ministerOffset = minister.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 7;
        if ((state.meta.tick + ministerOffset) % 7 !== 0) continue;

        // 2. CÃ¡lculo da Psicologia e Lealdade
        evaluateMinisterLoyalty(minister, state, player.id);

        // 2.5. Sistema de ExperiÃªncia e Level Up
        updateMinisterExperience(minister, state, player.id, context);

        // Se a lealdade zerar, o Ministro se demite e joga a pasta no chÃ£o
        if (minister.loyalty < 15) {
          const evt = buildEvent("council.resignation", context.now, {
              ministerName: minister.name,
              role: minister.role,
              reason: "Ideais irreconciliÃ¡veis com a coroa"
            }, player.id, undefined);
          if (evt) {
            evt.id = createEventId({ prefix: "evt_council_resign", tick: context.nextState.meta.tick, systemId: "council", actorId: player.id, sequence: context.events.length });
            context.events.push(evt);
          }
          
          delete currentCouncil[role];
          councilChanged = true;
          continue; // Pula para o prÃ³ximo, pois este jÃ¡ foi embora
        }

        // 3. GeraÃ§Ã£o de RelatÃ³rios Narrativos
        // Um ministro sÃ³ abre a boca se nÃ£o tiver falado recentemente
        // Tempo de espera elevado para 35s, garantindo que o relatÃ³rio seja atualizado organicamente
        const hasRecentAdvice = player.administration.activeAdvice.some(a => a.ministerId === minister.id && (context.now - a.issuedAt) < 35000);
        
        if (!hasRecentAdvice) {
          const advice = generateAdvice(minister, state, player.id, context.staticData, player.administration.activeAdvice);
          if (advice) {
            player.administration.activeAdvice.unshift(advice);
            
            // MantÃ©m a caixa de entrada limpa (mÃ¡x 15 relatÃ³rios)
            if (player.administration.activeAdvice.length > 15) {
              player.administration.activeAdvice.pop();
            }

            // Dispara um evento para notificar a UI de que hÃ¡ novas mensagens do Conselho
            const evt = buildEvent("council.advice_issued", context.now, {
                ministerName: minister.name,
                role: minister.role,
                urgency: advice.urgency
              }, player.id, undefined);
          if (evt) {
            evt.id = createEventId({ prefix: "evt_council_advice", tick: context.nextState.meta.tick, systemId: "council", actorId: player.id, sequence: context.events.length });
            context.events.push(evt);
          }
          }
        }
      }
      
      if (councilChanged) {
        recalculateAdminModifiers(player.administration);
      }
    }
  };
}
