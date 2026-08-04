import type { GameState } from "../../models/game-state";

/**
 * Sistema cívico de Garbage Collection / Memory Clamp para simulações longas (15x/30x).
 * Preserva integralmente a história lendária, governantes, monarcas anteriores e herdeiros ativos,
 * mas previne vazamentos ilimitados no Heap (GC Starvation) podando massas irrelevantes e
 * limitando históricos textuais de forma generosa e imersiva.
 */
export function pruneWorldMemory(state: GameState): void {
  if (!state.world.characters) return;

  const nowTick = state.meta.tick;
  const RETENTION_DEAD_TICKS = 24; // 2 anos de simulação (24 meses/ticks) de luto e consulta histórica recente
  const MAX_ALIVE_MEMORY = 30; // 30 marcos por personagem vivo
  const MAX_DEAD_MEMORY = 10; // 10 marcos mais importantes para mortos lendários/soberanos
  const MAX_DIPLOMACY_CHAT = 50; // Últimas 50 mensagens diplomáticas
  const MAX_NPC_MEMORIES = 28; // Limite de 28 memórias por reino NPC

  // 1. Levantamento de IDs essenciais intocáveis na simulação (governantes e herdeiros ativos)
  const protectedIds = new Set<string>();
  for (const kid in state.kingdoms) {
    const kingdom = state.kingdoms[kid];
    if (!kingdom) continue;
    if (kingdom.rulerId) protectedIds.add(kingdom.rulerId);
    if (kingdom.heirs) {
      for (let i = 0; i < kingdom.heirs.length; i++) {
        protectedIds.add(kingdom.heirs[i]);
      }
    }
  }

  // 2. Poda inteligente do dicionário de Personagens e Clamp de logs narrativos (char.memory)
  const allCharIds = Object.keys(state.world.characters);
  for (let i = 0; i < allCharIds.length; i++) {
    const charId = allCharIds[i];
    const char = state.world.characters[charId];
    if (!char) continue;

    // A. Personagem VIVO
    if (char.status !== "dead") {
      if (char.memory && char.memory.length > MAX_ALIVE_MEMORY) {
        char.memory = char.memory.slice(-MAX_ALIVE_MEMORY);
      }
      continue;
    }

    // B. Personagem MORTO
    // Verifica se tem papel histórico relevante (monarca ou soberano anterior)
    const title = char.title || "";
    const wasMonarch =
      title === "Rei" ||
      title === "Rainha" ||
      title.includes("Chefe") ||
      title.includes("Cacique") ||
      title.includes("Imperad");
    const isProtected =
      protectedIds.has(char.id) ||
      char.isLegendary === true ||
      wasMonarch;

    const deathAgeTicks = char.deathTick != null ? (nowTick - char.deathTick) : (RETENTION_DEAD_TICKS + 1);

    // Se é protegido por relevância histórica (Monarca / Lendário / Herdeiro em luto):
    // Nunca é deletado do mundo, apenas aplicamos clamp suave na sua memória de longo prazo
    if (isProtected || deathAgeTicks <= RETENTION_DEAD_TICKS) {
      if (char.memory && char.memory.length > MAX_DEAD_MEMORY) {
        char.memory = char.memory.slice(-MAX_DEAD_MEMORY);
      }
      continue;
    }

    // Se é um cortesão, andarilho ou ministro sem cargo falecido há mais de 2 anos e sem laço soberano:
    // Expurgo da memória para evitar Out of Memory no V8/JSCore
    delete state.world.characters[charId];
  }

  // 3. Poda estrutural e Clamp de Arrays nos Reinos
  for (const kid in state.kingdoms) {
    const kingdom = state.kingdoms[kid];
    if (!kingdom) continue;

    // Diplomacia: Chat History nas relações bilaterais
    if (kingdom.diplomacy?.relations) {
      for (const otherId in kingdom.diplomacy.relations) {
        const rel = kingdom.diplomacy.relations[otherId];
        if (rel && rel.chatHistory && rel.chatHistory.length > MAX_DIPLOMACY_CHAT) {
          rel.chatHistory = rel.chatHistory.slice(-MAX_DIPLOMACY_CHAT);
        }
      }
    }

    // Automação/Conselho: Candidate Pool e Active Advice
    if (kingdom.administration) {
      if (kingdom.administration.candidatePool && kingdom.administration.candidatePool.length > 8) {
        kingdom.administration.candidatePool = kingdom.administration.candidatePool.slice(-8);
      }
      if (kingdom.administration.activeAdvice && kingdom.administration.activeAdvice.length > 15) {
        kingdom.administration.activeAdvice = kingdom.administration.activeAdvice.slice(0, 15);
      }
    }

    // Memórias de NPC (garantia extra em tempo de execução)
    if (kingdom.npc?.memories && kingdom.npc.memories.length > MAX_NPC_MEMORIES) {
      kingdom.npc.memories = kingdom.npc.memories.slice(0, MAX_NPC_MEMORIES);
    }
  }
}
