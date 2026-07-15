import type { SimulationSystem, TickContext } from "../tick-pipeline";
import { createEventId } from "./utils";
import type { Character } from "../../models/character";
import { SOVEREIGN_TRAITS } from "../../models/character";
import { CultureId, generateCulturalName, generatePortraitSeed, getRandomGender } from "./culture-generator";

// Títulos para geração de herdeiros (mantemos os títulos de realeza)
const HEIR_TITLES = ["Príncipe", "Princesa", "Herdeiro", "Herdeira", "Sucessor", "Sucessora"];

// Gera um novo herdeiro baseado no monarca atual
function generateHeir(ruler: Character, kingdomId: string, currentTick: number): Character {
  const cultureId = (ruler.cultureId as CultureId) || 'latin';
  const gender = getRandomGender();
  const generatedName = generateCulturalName(cultureId, gender);
  
  // Limpando possível título gerado para manter apenas o nome base
  const baseName = generatedName.split(' ')[0];
  const title = gender === 'male' ? "Príncipe" : "Princesa";
  const fullName = `${baseName} ${ruler.name.split(' ').slice(1).join(' ') || 'da Casa Real'}`;

  const baseStats = {
    administration: Math.max(1, Math.min(20, ruler.stats.administration + Math.floor(Math.random() * 6) - 3)),
    martial: Math.max(1, Math.min(20, ruler.stats.martial + Math.floor(Math.random() * 6) - 3)),
    diplomacy: Math.max(1, Math.min(20, ruler.stats.diplomacy + Math.floor(Math.random() * 6) - 3)),
    intrigue: Math.max(1, Math.min(20, ruler.stats.intrigue + Math.floor(Math.random() * 6) - 3)),
    learning: Math.max(1, Math.min(20, ruler.stats.learning + Math.floor(Math.random() * 6) - 3)),
  };

  const trait = SOVEREIGN_TRAITS[Math.floor(Math.random() * SOVEREIGN_TRAITS.length)];
  const stats = { ...baseStats };
  if (trait.statModifiers) {
    for (const [stat, mod] of Object.entries(trait.statModifiers)) {
      const currentVal = stats[stat as keyof typeof stats] ?? 10;
      stats[stat as keyof typeof stats] = Math.max(1, Math.min(20, currentVal + mod));
    }
  }

  const traits = ["nobre", "herdeiro", trait.id];

  return {
    id: `heir_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: fullName,
    cultureId,
    portraitSeed: generatePortraitSeed(),
    gender,
    title: title,
    isLegendary: false,
    birthTick: currentTick,
    deathTick: null,
    stats,
    traits,
    status: "ruler", // Herdeiros são considerados governantes em potencial
    locationKingdomId: kingdomId,
    employerKingdomId: kingdomId,
    affinity: {
      institutionalLoyalty: 95 + Math.floor(Math.random() * 6), // Alta lealdade institucional
      personalAffinity: 80 + Math.floor(Math.random() * 21), // Alta afinidade com a família
    },
    personalWealth: 100 + Math.floor(Math.random() * 200),
    influence: 50 + Math.floor(Math.random() * 100),
    memory: [`Nascido como herdeiro do trono no ano ${Math.floor(currentTick / 12) + 1}.`],
    level: 1,
    experience: 0,
    unspentTalentPoints: 0
  };
}

// Processa a sucessão quando um monarca morre
function processSuccession(kingdom: any, deadRuler: Character, state: any, context: TickContext, eventSeq: number): void {
  // Verifica se o reino tem herdeiros
  if (!kingdom.heirs || kingdom.heirs.length === 0) {
    // Sem herdeiros - crise de sucessão!
    context.events.push({
      id: createEventId({ prefix: "evt_succession_crisis", tick: state.meta.tick, systemId: "character", sequence: eventSeq++ }),
      type: "succession.crisis",
      actorKingdomId: kingdom.id,
      payload: {
        deadRulerName: deadRuler.name,
        kingdomName: kingdom.name
      },
      occurredAt: context.now
    });

    // Instabilidade massiva por falta de sucessão
    kingdom.stability = Math.max(0, kingdom.stability - 50);
    kingdom.legitimacy = Math.max(0, kingdom.legitimacy - 30);

    return;
  }

  // Tem herdeiros - sucessão ordenada
  const newRulerId = kingdom.heirs[0];
  const newRuler = state.world.characters[newRulerId];

  if (newRuler) {
    // Atualiza o reino com o novo monarca
    kingdom.rulerId = newRulerId;
    newRuler.status = "ruler";
    newRuler.title = "Soberano";

    if (kingdom.npc) {
      const sovereignTraitId = newRuler.traits.find((t: string) => t !== "nobre" && t !== "herdeiro");
      const trait = SOVEREIGN_TRAITS.find(t => t.id === sovereignTraitId);
      
      const personality = kingdom.npc.personality;
      const keys: Array<keyof Omit<typeof personality, 'archetype'>> = ['ambition', 'caution', 'greed', 'zeal', 'honor', 'betrayalTendency'];
      for (const key of keys) {
        let val = personality[key] + (Math.random() * 0.24 - 0.12);
        if (trait?.npcModifiers) {
          const mod = (trait.npcModifiers as Record<string, number | undefined>)[key as string];
          if (mod !== undefined) {
            val += mod;
          }
        }
        personality[key] = Math.max(0.0, Math.min(1.0, val));
      }
    }

    // Remove o novo monarca da lista de herdeiros
    kingdom.heirs.shift();

    // Gera um novo herdeiro para manter a linha sucessória
    const newHeir = generateHeir(newRuler, kingdom.id, state.meta.tick);
    state.world.characters[newHeir.id] = newHeir;
    kingdom.heirs.push(newHeir.id);

    // Evento de sucessão bem-sucedida
    context.events.push({
      id: createEventId({ prefix: "evt_succession", tick: state.meta.tick, systemId: "character", sequence: eventSeq++ }),
      type: "succession.success",
      actorKingdomId: kingdom.id,
      payload: {
        oldRulerName: deadRuler.name,
        newRulerName: newRuler.name,
        newRulerTitle: newRuler.title,
        kingdomName: kingdom.name
      },
      occurredAt: context.now
    });

    // Pequena instabilidade pela mudança de governo
    kingdom.stability = Math.max(0, kingdom.stability - 10);
    kingdom.legitimacy = Math.max(0, kingdom.legitimacy - 5);

  } else {
    // Herdeiro não encontrado - crise
    context.events.push({
      id: createEventId({ prefix: "evt_succession_crisis", tick: state.meta.tick, systemId: "character", sequence: eventSeq++ }),
      type: "succession.crisis",
      actorKingdomId: kingdom.id,
      payload: {
        deadRulerName: deadRuler.name,
        kingdomName: kingdom.name,
        reason: "Herdeiro desaparecido"
      },
      occurredAt: context.now
    });
  }
}

export { generateHeir };

export function createCharacterSystem(): SimulationSystem {
  return {
    id: "character",
    run(context: TickContext): void {
      const state = context.nextState;

      // Roda a cada 12 ciclos (Exatamente 1 Ano de Simulação)
      const crossedYear = Math.floor(state.meta.tick / 12) !== Math.floor((state.meta.tick + (context.tickScale ?? 1)) / 12);
      if (state.meta.tick === 0 || !crossedYear) return;
      if (!state.world.characters) return;

      // Jogo Eterno (Imortalidade) Ativada: O tempo passa, mas a biologia congela.
      if (state.meta.immortalityEnabled) return;

      let eventSeq = 0;
      const currentYear = Math.floor(state.meta.tick / 12) + 1;

      for (const charId in state.world.characters) {
        const char = state.world.characters[charId];
        
        if (char.status === "dead") continue;

        const birthYear = Math.floor(char.birthTick / 12) + 1;
        const age = currentYear - birthYear;

        // Lendários (ex: O Panteão do Tributo) possuem uma biologia mais resistente.
        const deathThreshold = char.isLegendary ? 75 : 55;

        // Se o personagem ultrapassou a expectativa de vida da era
        if (age >= deathThreshold) {
          // +2% de chance de morte a cada ano extra vivido
          const deathChance = 0.02 + ((age - deathThreshold) * 0.02);
          
          if (Math.random() < deathChance) {
            const wasRuler = char.status === "ruler";
            char.deathTick = state.meta.tick;
            char.memory.push(`Faleceu de causas naturais aos ${age} anos de idade no ano ${currentYear}.`);

            // Emite o aviso fúnebre para o Feed Global
            context.events.push({
              id: createEventId({ prefix: "evt_char_death", tick: state.meta.tick, systemId: "character", sequence: eventSeq++ }),
              type: "character.death",
              actorKingdomId: char.employerKingdomId || char.locationKingdomId || undefined,
              payload: {
                characterId: char.id,
                characterName: char.name,
                title: char.title,
                age
              },
              occurredAt: context.now
            });

            // SISTEMA DE SUCESSÃO: Se o morto era um monarca, processa sucessão
            if (wasRuler && char.employerKingdomId) {
              const kingdom = state.kingdoms[char.employerKingdomId];
              if (kingdom && kingdom.rulerId === char.id) {
                processSuccession(kingdom, char, state, context, eventSeq);
              }
            }
            char.status = "dead";
          }
        }
      }
    }
  };
}