import type { DomainEvent, EventLogEntry } from "../../models/events";
import type { GameState } from "../../models/game-state";
import type { SimulationSystem } from "../tick-pipeline";
import type { StaticWorldData } from "../../models/static-world-data";

interface EventDescriptor {
  title: string;
  details: string;
  severity: EventLogEntry["severity"];
  category?: EventLogEntry["category"];
  groupKey?: string;
  suggestedAction?: string;
  requiresAction?: boolean;
  actionPayload?: Record<string, any>;
}

const SEVERITY_RANK: Record<EventLogEntry["severity"], number> = {
  info: 0,
  success: 0,
  warning: 1,
  danger: 2,
  critical: 3
};

function kingdomName(state: GameState, kingdomId: string | undefined): string {
  if (!kingdomId) {
    return "Desconhecido";
  }

  return state.kingdoms[kingdomId]?.name ?? kingdomId;
}

function buildGroupKey(event: DomainEvent, customKey?: string): string {
  if (customKey) {
    return customKey;
  }

  const actor = event.actorKingdomId ?? "none";
  const target = event.targetKingdomId ?? "none";
  const regionId = typeof event.payload.regionId === "string" ? event.payload.regionId : "none";
  return `${event.type}|${actor}|${target}|${regionId}`;
}

function describeNpcDecision(event: DomainEvent, state: GameState): EventDescriptor {
  const actionType = String(event.payload.actionType ?? "acao");
  const actor = kingdomName(state, event.actorKingdomId);
  const target = kingdomName(state, event.targetKingdomId);
  const result = String(event.payload.result ?? "registrada");

  return {
    title: "Movimento diplomático estrangeiro",
    details: `${actor} executou ${actionType} contra ${target} (${result}).`,
    severity: actionType === "declarar_guerra" ? "warning" : "info",
    suggestedAction: actionType === "declarar_guerra" ? "Fortaleça guarnições e negocie alianças defensivas." : "Ajuste sua postura diplomática com este reino.",
    groupKey: `npc.decision|${event.actorKingdomId ?? "none"}|${event.targetKingdomId ?? "none"}|${actionType}`
  };
}

function describeEvent(event: DomainEvent, state: GameState, staticData: StaticWorldData): EventDescriptor {
  switch (event.type) {
    case "economy.food_shortage": {
      const actor = kingdomName(state, event.actorKingdomId);
      return {
        title: "Escassez de alimentos",
        details: `${actor} está abaixo do estoque alimentar recomendado.`,
        severity: "warning",
        suggestedAction: "Invista em agricultura nas regiões do seu reino.",
        groupKey: `economy.food_shortage|${event.actorKingdomId ?? "none"}`
      };
    }
    case "population.unrest_warning": {
      const actor = kingdomName(state, event.actorKingdomId);
      return {
        title: "Agitação social",
        details: `${actor} apresenta agitação elevada e risco político interno.`,
        severity: "warning",
        suggestedAction: "Use a ação Pacificar na região crítica e reduza pressão fiscal.",
        groupKey: `population.unrest_warning|${event.actorKingdomId ?? "none"}`
      };
    }
    case "population.extinction": {
      const regionName = String(event.payload.regionName ?? "região");
      return {
        title: "Colapso Demográfico",
        details: `A população de ${regionName} foi extinta pela fome. O território foi devolvido à natureza selvagem.`,
        severity: "critical",
        suggestedAction: "Aumente a produção de alimentos para evitar novas extinções."
      };
    }
    case "technology.completed": {
      const actor = kingdomName(state, event.actorKingdomId);
      const technologyName = String(event.payload.technologyName ?? event.payload.technologyId ?? "pesquisa");
      return {
        title: "Pesquisa concluída",
        details: `${actor} concluiu ${technologyName}.`,
        severity: "info",
        suggestedAction: "Mantenha foco de pesquisa coerente com sua estratégia atual."
      };
    }
    case "religion.tension": {
      const actor = kingdomName(state, event.actorKingdomId);
      return {
        title: "Tensão religiosa",
        details: `${actor} enfrenta tensão entre coesão religiosa e tolerância interna.`,
        severity: "warning",
        suggestedAction: "Aumente orçamento religioso ou ajuste política de tolerância."
      };
    }
    case "religion.mission_started": {
      const actor = kingdomName(state, event.actorKingdomId);
      const target = kingdomName(state, event.targetKingdomId);
      return {
        title: "Campanha missionária",
        details: `${actor} iniciou pressão missionária em ${target}.`,
        severity: "info",
        suggestedAction: "Use contramedidas religiosas ou eleve tolerância para reduzir impacto.",
        groupKey: `religion.mission_started|${event.actorKingdomId ?? "none"}|${event.targetKingdomId ?? "none"}`
      };
    }
    case "religion.conversion_progress": {
      const actor = kingdomName(state, event.actorKingdomId);
      const target = kingdomName(state, event.targetKingdomId);
      const regions = Number(event.payload.regionsWithProgress ?? 1);
      return {
        title: "Conversões em fronteira",
        details: `${actor} avançou influência religiosa sobre ${target} em ${regions} região(ões).`,
        severity: "warning",
        suggestedAction: "Reforce estabilidade local ou responda com missão própria.",
        groupKey: `religion.conversion_progress|${event.actorKingdomId ?? "none"}|${event.targetKingdomId ?? "none"}`
      };
    }
    case "religion.coup_risk": {
      const actor = kingdomName(state, event.actorKingdomId);
      const target = kingdomName(state, event.targetKingdomId);
      return {
        title: "Risco de golpe religioso",
        details: `${target} está vulnerável a desestabilização por influência de ${actor}.`,
        severity: "critical",
        suggestedAction: "Aumente estabilidade e neutralize influência externa imediatamente.",
        groupKey: `religion.coup_risk|${event.targetKingdomId ?? "none"}`
      };
    }
    case "administration.revolt_risk": {
      const actor = kingdomName(state, event.actorKingdomId);
      const regionId = String(event.payload.regionId ?? "região");
      return {
        title: "Risco de revolta",
        details: `${actor} detectou risco elevado de revolta em ${regionId}.`,
        severity: "warning",
        suggestedAction: "Aplique pacificação e reforce guarnição local.",
        groupKey: `administration.revolt_risk|${event.actorKingdomId ?? "none"}|${regionId}`
      };
    }
    case "war.started": {
      const actor = kingdomName(state, event.actorKingdomId);
      const target = kingdomName(state, event.targetKingdomId);
      const attackers = event.payload.attackers as string[];
      const defenders = event.payload.defenders as string[];
      let extra = "";
      if (attackers && defenders && (attackers.length > 1 || defenders.length > 1)) {
          extra = " Alianças e vassalos foram arrastados para o conflito!";
      }
      return {
        title: "Guerra declarada",
        details: `${actor} iniciou guerra contra ${target}.${extra}`,
        severity: "critical",
        suggestedAction: "Priorize orçamento militar e prepare defesa de fronteira."
      };
    }
    case "war.escalated": {
      const warId = String(event.payload.warId ?? "guerra");
      return {
        title: "Guerra escalando",
        details: `O conflito ${warId} atingiu intensidade alta no front.`,
        severity: "warning",
        suggestedAction: "Tente proposta de paz se sua exaustão estiver elevada.",
        groupKey: `war.escalated|${warId}`
      };
    }
    case "war.region_captured": {
      const regionId = String(event.payload.regionId ?? "região");
      const actor = kingdomName(state, event.actorKingdomId);
      return {
        title: "Território conquistado",
        details: `${actor} tomou controle de ${regionId}.`,
        severity: "critical",
        suggestedAction: "Invista e pacifique a região conquistada para evitar rebelião.",
        groupKey: `war.region_captured|${regionId}|${event.actorKingdomId ?? "none"}`
      };
    }
    case "war.peace": {
      const actor = kingdomName(state, event.actorKingdomId);
      const target = kingdomName(state, event.targetKingdomId);
      return {
        title: "Paz assinada",
        details: `${actor} e ${target} encerraram hostilidades.`,
        severity: "info",
        suggestedAction: "Reorganize economia e recupere estabilidade interna."
      };
    }
    case "npc.decision":
      return describeNpcDecision(event, state);
    case "victory.achieved":
      return {
        title: "Vitória alcançada",
        details: "Um caminho de vitória foi completado. O modo contínuo permanece ativo.",
        severity: "critical",
        suggestedAction: "Prepare-se para crises de superexpansão no pós-vitória."
      };
    case "world.activity_summary": {
      const warsStarted = Number(event.payload.warsStarted ?? 0);
      const peacesSigned = Number(event.payload.peacesSigned ?? 0);
      const captures = Number(event.payload.captures ?? 0);
      return {
        title: "Resumo geopolítico",
        details: `${warsStarted} guerras iniciadas, ${captures} conquistas e ${peacesSigned} acordos de paz no ciclo recente.`,
        severity: warsStarted + captures >= 3 ? "warning" : "info",
        suggestedAction: "Ajuste postura diplomática e monitore fronteiras críticas no mapa.",
        groupKey: "world.activity_summary"
      };
    }
    case "character.death": {
      const cName = String(event.payload.characterName ?? "Alguém");
      const cTitle = event.payload.title ? `, ${event.payload.title}` : "";
      const age = event.payload.age;
      return {
        title: "Falecimento Eminente",
        details: `${cName}${cTitle} faleceu de velhice aos ${age} anos.`,
        severity: "warning"
      };
    }
    case "succession.success": {
      const oldRulerName = String(event.payload.oldRulerName ?? "O antigo soberano");
      const newRulerName = String(event.payload.newRulerName ?? "o herdeiro");
      const actor = kingdomName(state, event.actorKingdomId);
      return {
        title: "Sucessao Estabilizada",
        details: `${oldRulerName} foi sucedido por ${newRulerName} em ${actor}.`,
        severity: "warning",
        suggestedAction: "Monitore a estabilidade do reino apos a transicao dinastica."
      };
    }
    case "succession.crisis": {
      const actor = kingdomName(state, event.actorKingdomId);
      return {
        title: "Crise de Sucessao",
        details: `${actor} entrou em crise sucessoria apos a morte do governante.`,
        severity: "critical",
        suggestedAction: "Prepare-se para instabilidade interna e oportunidades diplomaticas."
      };
    }
    case "minister.level_up":
      return {
        title: "Ministro Evoluiu",
        details: `${String(event.payload.ministerName ?? "Um ministro")} alcancou o nivel ${String(event.payload.newLevel ?? "?")}.`,
        severity: "info",
        suggestedAction: "Reavalie cargos e delegacao para aproveitar o ganho de eficiencia."
      };
    case "disaster.plague":
      return {
        title: "Praga Mortal",
        details: `Uma praga matou ${String(event.payload.amount ?? 0)} suditos.`,
        severity: "critical",
        suggestedAction: "Proteja a estabilidade e reforce a recuperacao demografica."
      };
    case "disaster.drought":
      return {
        title: "Seca Devastadora",
        details: `A seca consumiu ${String(event.payload.amount ?? 0)} unidades de comida.`,
        severity: "critical",
        suggestedAction: "Amplie reservas alimentares e reduza a pressao sobre a populacao."
      };
    case "disaster.flood":
      return {
        title: "Inundacao Catastrofica",
        details: "Uma inundacao danificou a infraestrutura administrativa do reino.",
        severity: "warning",
        suggestedAction: "Recupere capacidade administrativa antes de abrir novas frentes."
      };
    case "event.bountiful_harvest":
      return {
        title: "Colheita Abundante",
        details: `As reservas cresceram em ${String(event.payload.amount ?? 0)} unidades de comida.`,
        severity: "info"
      };
    case "event.population_migration":
      return {
        title: "Migracao Populacional",
        details: `${String(event.payload.amount ?? 0)} novos habitantes chegaram ao reino.`,
        severity: "info"
      };
    case "event.technological_breakthrough":
      return {
        title: "Avanco Cientifico",
        details: `A pesquisa recebeu ${String(event.payload.amount ?? 0)} pontos extras.`,
        severity: "info"
      };
    case "event.revolt":
      return {
        title: "Revolta Popular",
        details: "A estabilidade do reino caiu apos uma revolta local.",
        severity: "critical",
        suggestedAction: "Pacifique regioes criticas e alivie a pressao interna."
      };
    case "event.cultural_festival":
      return {
        title: "Festival Cultural",
        details: "Celebracoes publicas reduziram a tensao social temporariamente.",
        severity: "info"
      };
    case "event_chain.economic_crisis":
      return {
        title: "Crise Economica em Curso",
        details: `A cadeia economica avancou para o estagio ${String(event.payload.stage ?? "?")}.`,
        severity: "warning",
        suggestedAction: "Reforce caixa, comida e estabilidade antes do proximo estagio."
      };
    case "event_chain.economic_crisis_resolved":
      return {
        title: "Crise Economica Superada",
        details: "O reino conseguiu conter a cadeia de crise economica.",
        severity: "info"
      };
    case "event_chain.economic_crisis_collapse":
      return {
        title: "Colapso Economico",
        details: "A cadeia de crise terminou em colapso de legitimidade e estabilidade.",
        severity: "critical",
        suggestedAction: "Reestruture o reino imediatamente para evitar efeito cascata."
      };
    case "event_chain.holy_war":
      return {
        title: "Fervor Religioso",
        details: "O reino entrou numa espiral de fervor religioso com impacto militar e social.",
        severity: "warning",
        suggestedAction: "Acompanhe coesao, diplomacia e possiveis conflitos sectarios."
      };
    case "automation.build_structure": {
      const actor = kingdomName(state, event.actorKingdomId);
      const bType = String(event.payload.buildingType);
      const rName = staticData.definitions[String(event.payload.regionId)]?.name ?? "região";
      const bName = bType === "market" ? "Mercado" : bType === "barracks" ? "Quartel" : bType === "monastery" ? "Mosteiro" : bType === "university" ? "Universidade" : "Fortaleza";
      return {
        title: "Infraestrutura Automatizada",
        details: `${actor} concluiu a construção de um(a) ${bName} em ${rName}.`,
        severity: "info"
      };
    }
    case "council.advice_issued": {
      const ministerName = String(event.payload.ministerName ?? "Conselheiro");
      const urgency = String(event.payload.urgency ?? "low");
      return {
        title: "Relatório do Conselho",
        details: `${ministerName} apresentou um novo relatório para vossa análise.`,
        severity: urgency === "high" ? "warning" : "info",
        suggestedAction: "Abra a aba Governo e decida sobre as propostas pendentes.",
        groupKey: `council.advice_issued|${event.actorKingdomId ?? "none"}`
      };
    }
    case "diplomacy.proposal_received": {
      const senderName = kingdomName(state, String(event.payload.senderId));
      const tType = Number(event.payload.treatyType);
      
      let tName = "um Tratado";
      if (tType === 1) tName = "uma Aliança";
      else if (tType === 2) tName = "um Pacto de Defesa";
      else if (tType === 3) tName = "um Pacto de Não-Agressão";
      else if (tType === 4) tName = "um Acordo Comercial";
      else if (tType === 5) tName = "um Tratado de Paz";
      else if (tType === 6) tName = "Suserania";
      else if (tType === 7) tName = "Tributo";
      else if (tType === 8) tName = "um Embargo";

      return {
        title: "Proposta Diplomática",
        details: `${senderName} propõe ${tName}. Aguardando sua decisão.`,
        severity: "warning",
        category: "diplomacy",
        requiresAction: true,
        actionPayload: { proposalId: event.payload.proposalId },
        groupKey: `prop_${event.payload.proposalId}`
      };
    }
    case "diplomacy.war_declared": {
      const attackerName = kingdomName(state, String(event.payload.attackerId));
      const defenderName = kingdomName(state, String(event.payload.defenderId));
      
      const playerKingdom = Object.values(state.kingdoms).find(k => k.isPlayer);
      const isPlayerInvolved = playerKingdom && (event.payload.attackerId === playerKingdom.id || event.payload.defenderId === playerKingdom.id);

      return {
        title: "Guerra Declarada",
        details: `${attackerName} declarou guerra formalmente contra ${defenderName}. As hostilidades foram iniciadas.`,
        severity: isPlayerInvolved ? "danger" : "info",
        category: "war",
        groupKey: `war_${event.payload.warId}`
      };
    }
    case "diplomacy.treaty_signed": {
      const leftName = kingdomName(state, String(event.payload.leftId));
      const rightName = kingdomName(state, String(event.payload.rightId));
      const tTypeStr = String(event.payload.treatyType);
      
      const playerKingdom = Object.values(state.kingdoms).find(k => k.isPlayer);
      const isPlayerInvolved = playerKingdom && (event.payload.leftId === playerKingdom.id || event.payload.rightId === playerKingdom.id);
      const isPlayerTarget = playerKingdom && event.payload.terms?.targetKingdomId === playerKingdom.id;

      if (tTypeStr === "secret_coalition" && isPlayerTarget) {
         return {
            title: "🚨 CRISE DIPLOMÁTICA: COALIZÃO FORMADA",
            details: `Nossos espiões relatam que os enviados de ${leftName} convenceram ${rightName} a formarem uma coalizão secreta contra o nosso Império!`,
            severity: "danger",
            category: "diplomacy"
         };
      }

      let tName = "Tratado";
      if (tTypeStr === "alliance" || tTypeStr === "1") tName = "Aliança";
      else if (tTypeStr === "defensive_pact" || tTypeStr === "2") tName = "Pacto de Defesa";
      else if (tTypeStr === "non_aggression" || tTypeStr === "3") tName = "Pacto de Não-Agressão";
      else if (tTypeStr === "trade_agreement" || tTypeStr === "4") tName = "Acordo Comercial";
      else if (tTypeStr === "peace" || tTypeStr === "5") tName = "Tratado de Paz";
      else if (tTypeStr === "vassalage" || tTypeStr === "6") tName = "Suserania";
      else if (tTypeStr === "tribute" || tTypeStr === "7") tName = "Tributo";
      else if (tTypeStr === "embargo" || tTypeStr === "8") tName = "Embargo";

      return {
        title: "Acordo Diplomático",
        details: `${leftName} e ${rightName} assinaram um(a) ${tName}.`,
        severity: "success",
        category: "diplomacy"
      };
    }
    default:
      console.warn("[EventLogSystem] Unmapped domain event leaked to default case:", event);
      return {
        title: "Movimentação Obscura",
        details: "Rumores correm pelo continente sobre acontecimentos desconhecidos.",
        severity: "info"
      };
  }
}

function mergeSeverity(current: EventLogEntry["severity"], incoming: EventLogEntry["severity"]): EventLogEntry["severity"] {
  return SEVERITY_RANK[current] >= SEVERITY_RANK[incoming] ? current : incoming;
}

function stripCountSuffix(details: string): string {
  return details.replace(/\s\(x\d+\)$/u, "");
}

export function createEventLogSystem(maxEntries = 180, dedupeWindowMs = 45_000): SimulationSystem {
  return {
    id: "event_log",
    run(context): void {
      if (context.events.length === 0) {
        return;
      }

      const mergedLog = [...context.nextState.events];

      for (const event of context.events) {
        const descriptor = describeEvent(event, context.nextState, context.staticData);
        const groupKey = buildGroupKey(event, descriptor.groupKey);
        const regionId = typeof event.payload.regionId === "string" ? event.payload.regionId : undefined;

        const existingIndex = mergedLog.findIndex(
          (entry) => entry.groupKey === groupKey && context.now - entry.occurredAt <= dedupeWindowMs
        );

        if (existingIndex >= 0) {
          const previous = mergedLog[existingIndex];
          const nextCount = (previous.count ?? 1) + 1;
          const baseDetails = stripCountSuffix(previous.details);

          mergedLog.splice(existingIndex, 1);
          mergedLog.unshift({
            ...previous,
            severity: mergeSeverity(previous.severity, descriptor.severity),
            occurredAt: event.occurredAt,
            details: `${baseDetails} (x${nextCount})`,
            count: nextCount,
            suggestedAction: descriptor.suggestedAction ?? previous.suggestedAction,
            actorKingdomId: event.actorKingdomId,
            targetKingdomId: event.targetKingdomId,
            regionId: regionId ?? previous.regionId,
            category: descriptor.category ?? previous.category,
            requiresAction: descriptor.requiresAction ?? previous.requiresAction,
            actionPayload: descriptor.actionPayload ?? previous.actionPayload
          });

          continue;
        }

        mergedLog.unshift({
          id: event.id,
          title: descriptor.title,
          details: descriptor.details,
          severity: descriptor.severity,
          occurredAt: event.occurredAt,
          count: 1,
          groupKey,
          suggestedAction: descriptor.suggestedAction,
          actorKingdomId: event.actorKingdomId,
          targetKingdomId: event.targetKingdomId,
          regionId,
          category: descriptor.category,
          requiresAction: descriptor.requiresAction,
          actionPayload: descriptor.actionPayload
        });
      }

      context.nextState.events = mergedLog
        .sort((left, right) => right.occurredAt - left.occurredAt)
        .slice(0, maxEntries);
    }
  };
}

export function parseDomainEventToLogEntry(event: DomainEvent, state: GameState, staticData: StaticWorldData): EventLogEntry {
  const descriptor = describeEvent(event, state, staticData);
  const groupKey = buildGroupKey(event, descriptor.groupKey);
  const regionId = typeof event.payload.regionId === "string" ? event.payload.regionId : undefined;

  return {
    id: event.id,
    title: descriptor.title,
    details: descriptor.details,
    severity: descriptor.severity,
    occurredAt: event.occurredAt,
    count: 1,
    groupKey,
    suggestedAction: descriptor.suggestedAction,
    actorKingdomId: event.actorKingdomId,
    targetKingdomId: event.targetKingdomId,
    regionId,
    category: descriptor.category,
    requiresAction: descriptor.requiresAction,
    actionPayload: descriptor.actionPayload
  };
}
