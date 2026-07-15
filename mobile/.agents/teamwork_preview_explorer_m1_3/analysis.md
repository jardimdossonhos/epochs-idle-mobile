# Exploration & Design Analysis: AI Sovereigns and Chat Diplomacy (Sprint 3)

This report details the architectural exploration of the Epochs Idle mobile codebase to address requirements **R6** (Aleatoriedade e Personalidade das IAs) and **R8** (Perfil de Soberanos IA e Diplomacia via Chat).

---

## 1. Existing NPC & Diplomacy Data Models

### 1.1 Core State & Relations (`src/core/models/`)
The existing models are well-structured but require extensions to support chat history.

*   **`character.ts`** defines the `Character` model (ruler/heir status, culture, portrait seed, gender, and stats).
*   **`npc.ts`** defines the NPC personality archetype and memories:
    ```typescript
    export interface NpcPersonality {
      archetype: NpcArchetype;
      ambition: number;
      caution: number;
      greed: number;
      zeal: number;
      honor: number;
      betrayalTendency: number;
    }
    ```
*   **`diplomacy.ts`** defines `BilateralRelation` and relationship scores (trust, fear, rivalry, religious tension, border tension, and trade value):
    ```typescript
    export interface BilateralRelation {
      withKingdomId: KingdomId;
      status: DiplomaticRelation;
      score: RelationScore;
      grievance: number;
      allianceStrength: number;
      actionCooldowns: Record<string, TimestampMs>;
    }
    ```

### 1.2 Simulation Systems (`src/core/simulation/systems/`)
*   **`npc-decision-system.ts`** processes automated tick decisions for NPCs using `INpcDecisionService` and executes changes through `DiplomacyResolver` and `WarResolver`.
*   **`local-diplomacy-resolver.ts`** resolves bilateral relations every tick based on state changes (e.g. schisms, dominant power expansion) and personality attributes. It implements the mechanics of alliance, war declaration, peace, tribute, trade, and defensive pacts.

---

## 2. Implementing Randomized Sovereign Generation (R6)

To prevent sovereigns from feeling identical and to make the game world highly dynamic, we propose a randomized sovereign generation system.

### 2.1 Character Traits & Stat Modifiers
Rulers will be generated with 1 or 2 traits from a predefined pool. These traits affect base character stats and influence their NPC personality metrics.

Add this model to `src/core/models/character.ts` or a new data file:

```typescript
export interface SovereignTrait {
  id: string;
  name: string;
  description: string;
  statModifiers?: Partial<Character["stats"]>;
  npcModifiers?: {
    ambition?: number;
    caution?: number;
    greed?: number;
    zeal?: number;
    honor?: number;
    betrayalTendency?: number;
  };
}

export const SOVEREIGN_TRAITS: SovereignTrait[] = [
  { id: "militarist", name: "Militarista", description: "+2 Marciais, busca expansão militar", statModifiers: { martial: 2, diplomacy: -1 }, npcModifiers: { ambition: 0.15, caution: -0.1 } },
  { id: "pacifist", name: "Pacifista", description: "+2 Diplomacia, evita conflitos", statModifiers: { diplomacy: 2, martial: -1 }, npcModifiers: { ambition: -0.15, caution: 0.15, honor: 0.1 } },
  { id: "greedy", name: "Ganancioso", description: "+2 Administração, foca em ouro e comércio", statModifiers: { administration: 2, diplomacy: -1 }, npcModifiers: { greed: 0.2, honor: -0.1 } },
  { id: "zealous", name: "Zeloso", description: "+2 Aprendizado/Fé, intolerante com outras religiões", statModifiers: { learning: 2 }, npcModifiers: { zeal: 0.25, honor: 0.05 } },
  { id: "charismatic", name: "Carismático", description: "+2 Diplomacia, melhora relações", statModifiers: { diplomacy: 2 }, npcModifiers: { honor: 0.1 } },
  { id: "crafty", name: "Astuto", description: "+2 Intriga, propenso a traições", statModifiers: { intrigue: 2 }, npcModifiers: { betrayalTendency: 0.25, honor: -0.15 } },
  { id: "cautious", name: "Cauteloso", description: "+2 Administração, evita riscos", statModifiers: { administration: 2, martial: -1 }, npcModifiers: { caution: 0.2, ambition: -0.1 } },
  { id: "just", name: "Justo", description: "+1 Diplomacia, +1 Administração", statModifiers: { diplomacy: 1, administration: 1 }, npcModifiers: { honor: 0.2, betrayalTendency: -0.15 } }
];
```

### 2.2 Incorportating Random Personality Variance
In `src/application/boot/create-initial-state.ts`, when creating NPC behavior:
1. Add random variance (e.g. `±0.12` using a random seed/Math.random) to the base `NpcPersonality` values.
2. Adjust the personality values based on the ruler's `npcModifiers` from their traits.
3. Clamp all personality scores between `0.0` and `1.0`.

### 2.3 Photo & Avatar Generation (Culture / Gender / Phenotype)
The existing `AvatarRenderer` fetches a generic Dicebear URL with only a seed. To support culture, gender, and phenotype, we modify `getAvatarUrl` in `src/ui/components/AvatarRenderer.tsx`:

```typescript
export function getAvatarUrl(
  cultureId: string = 'latin',
  gender: 'male' | 'female' = 'male',
  seed: string = 'default'
): string {
  const safeSeed = seed || 'sovereign_1';
  let style = 'lorelei';
  let params = `seed=${safeSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc`;

  // Select style and customize options to reflect phenotype & culture
  switch (cultureId) {
    case 'nordic':
      style = 'adventurer';
      params += `&skinColor=f1c27d,ffdbb4&hairColor=e8c547,b5a642`; // Fair skin, blonde/light hair
      break;
    case 'eastern':
      style = 'avataaars';
      params += `&skinColor=ffd8b1,f1c27d&hairColor=2c150c,090909`; // East Asian skin & black hair
      break;
    case 'desert':
      style = 'micah';
      params += `&baseColor=d6a374,ae5b36,80461b&hairColor=2c150c,000000`; // Middle Eastern/North African skin tones
      break;
    case 'savanna':
      style = 'micah';
      params += `&baseColor=ae5b36,5c2f17,80461b&hairColor=000000`; // Darker skin tones
      break;
    case 'celtic':
      style = 'adventurer';
      params += `&skinColor=ffdbb4,f1c27d&hairColor=b95a20,e8c547,b5a642`; // Celtic red/blonde hair
      break;
    case 'slavic':
      style = 'lorelei';
      params += `&skinColor=ffdbb4,f1c27d&hairColor=e8c547,b5a642,a56b46`; // Eastern European
      break;
    case 'indigenous':
      style = 'avataaars';
      params += `&skinColor=d6a374,ae5b36,80461b&hairColor=090909`; // Mesoamerican/Indigenous
      break;
    case 'vedic':
      style = 'micah';
      params += `&baseColor=ae5b36,80461b,f1c27d&hairColor=2c150c,000000`; // South Asian
      break;
    default:
      style = 'lorelei';
      params += `&skinColor=ffdbb4,f1c27d`;
      break;
  }

  // Handle Gender: Disable facial hair for women and select gender-appropriate configurations
  if (gender === 'female') {
    params += `&facialHairProbability=0&facialHair[]`; // Removes facial hair
  } else {
    params += `&facialHairProbability=50`; // 50% chance of beard for men
  }

  return `https://api.dicebear.com/9.x/${style}/png?${params}`;
}
```

---

## 3. Designing Chat Diplomacy and Gemini LLM Integration (R8)

### 3.1 Chat Persistence Model
Extend `BilateralRelation` in `src/core/models/diplomacy.ts` to store conversation logs:

```typescript
export interface ChatMessage {
  id: string;
  senderId: string; // "player" or target NPC KingdomId
  senderName: string;
  text: string;
  timestamp: TimestampMs;
  systemAction?: string; // Optional: If this message triggered an engine action
}

// Add this property to BilateralRelation
export interface BilateralRelation {
  // ... existing fields
  chatHistory?: ChatMessage[];
}
```

### 3.2 Gemini API sovereign chat integration
Add the following method to `GeminiService` in `src/application/ai/gemini-service.ts` to handle in-character sovereign chatting.

```typescript
export interface ChatSovereignResult {
  dialogue: string;
  action: "DECLARE_WAR" | "MAKE_PEACE" | "COOPERATIVE_AGREEMENT" | "NO_ACTION";
  actionReason: string;
}

export class GeminiService {
  // ... existing methods

  async chatWithSovereign(
    ruler: { name: string; title: string; gender: string; stats: any; traits: string[]; cultureId: string },
    rulerKingdom: { name: string; regionsCount: number; militaryStrength: number },
    playerKingdom: { name: string; regionsCount: number; militaryStrength: number },
    relation: { status: string; trust: number; fear: number; rivalry: number; religiousTension: number },
    chatHistory: { senderName: string; text: string }[],
    playerMessage: string
  ): Promise<ChatSovereignResult> {
    const locale = await this.getLocale();
    const apiKey = await this.getApiKey();
    const enabled = await this.isAiEnabled();

    // Context summary formatted for prompt injection
    const context = `
Soberano Alvo: ${ruler.title} ${ruler.name} (${ruler.gender === 'male' ? 'Masculino' : 'Feminino'})
Traços do Soberano: ${ruler.traits.join(', ')}
Atributos do Soberano: Administração ${ruler.stats.administration}, Marcial ${ruler.stats.martial}, Diplomacia ${ruler.stats.diplomacy}, Intriga ${ruler.stats.intrigue}, Aprendizado ${ruler.stats.learning}
Cultura: ${ruler.cultureId}

Reino do Soberano (${rulerKingdom.name}): ${rulerKingdom.regionsCount} províncias, poder militar ${rulerKingdom.militaryStrength}
Reino do Jogador (${playerKingdom.name}): ${playerKingdom.regionsCount} províncias, poder militar ${playerKingdom.militaryStrength}

Relação com o Jogador:
- Status atual: ${relation.status}
- Confiança: ${(relation.trust * 100).toFixed(0)}% (0% ódio, 100% amizade profunda)
- Medo do jogador: ${(relation.fear * 100).toFixed(0)}%
- Rivalidade: ${(relation.rivalry * 100).toFixed(0)}%
- Tensão Religiosa: ${(relation.religiousTension * 100).toFixed(0)}%
`;

    const historyStr = chatHistory
      .slice(-6)
      .map(msg => `${msg.senderName}: ${msg.text}`)
      .join('\n');

    const prompt = `
Você é ${ruler.title} ${ruler.name}, governante do reino ${rulerKingdom.name} no jogo de estratégia Epochs Idle.
Responda ao jogador no chat diplomático. Adote o tom correspondente ao seu perfil (se for militarista seja ríspido e orgulhoso, se for diplomático/justo seja cordial e sábio).

--- CONTEXTO DO JOGO ---
${context}

--- HISTÓRICO DA CONVERSA ---
${historyStr}
Jogador: ${playerMessage}
----------------------------

Determine sua resposta em formato JSON contendo obrigatoriamente três campos:
1. "dialogue": Sua fala em português do Brasil (ou inglês se o locale for en-US) direcionada ao jogador, respeitando seus traços e a relação. Máximo 3 sentenças.
2. "action": Uma ação de estado de jogo que você decide tomar autonomamente:
   - "DECLARE_WAR": Declara guerra contra o jogador (válido se estiver com rivalidade alta/confiança baixa e não estiver em guerra/aliado).
   - "MAKE_PEACE": Aceita ou propõe paz (se estiver em guerra e com medo ou exausto).
   - "COOPERATIVE_AGREEMENT": Propõe/sela um acordo cooperativo (pacto não agressão, acordo comercial ou aliança se a confiança estiver alta).
   - "NO_ACTION": Apenas continua conversando sem mudança mecânica de estado.
3. "actionReason": Explicação curta do motivo pelo qual o governante tomou essa ação (ou decidiu não tomar nada).

Responda APENAS com um objeto JSON válido, por exemplo:
{
  "dialogue": "Suas palavras são atrevidas. Não toleraremos vizinhos tão ambiciosos. Nossas espadas falarão por nós!",
  "action": "DECLARE_WAR",
  "actionReason": "Rivalidade alta e confiança muito baixa diante da provocação."
}
`;

    if (!apiKey || !enabled) {
      // Robust Fallback offline
      return this.getOfflineChatFallback(ruler.name, relation.status, playerMessage);
    }

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 350,
            responseMimeType: "application/json"
          },
        }),
        signal: AbortSignal.timeout(9000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (text) {
        const parsed = JSON.parse(text.trim());
        return {
          dialogue: parsed.dialogue || "",
          action: parsed.action || "NO_ACTION",
          actionReason: parsed.actionReason || ""
        };
      }
    } catch (e) {
      console.warn("[GeminiService] Chat request failed, using offline fallback", e);
    }

    return this.getOfflineChatFallback(ruler.name, relation.status, playerMessage);
  }

  private getOfflineChatFallback(rulerName: string, status: string, message: string): ChatSovereignResult {
    let dialogue = `${rulerName} acena silenciosamente, considerando suas palavras.`;
    if (status === 'hostile') {
      dialogue = `${rulerName} olha para você com desdém. 'Não temos nada a discutir com inimigos do reino.'`;
    } else if (status === 'allied' || status === 'friendly') {
      dialogue = `${rulerName} sorri calorosamente. 'Suas palavras encontram eco em nossos salões, querido aliado.'`;
    }
    return {
      dialogue,
      action: "NO_ACTION",
      actionReason: "Offline fallback utilized"
    };
  }
}
```

### 3.3 Triggering Engine Actions from Conversation
To apply these autonomous actions generated by the LLM:
Add `executeNpcChatAction` in `src/application/game-session.ts`:

```typescript
executeNpcChatAction(npcKingdomId: string, actionType: "DECLARE_WAR" | "MAKE_PEACE" | "COOPERATIVE_AGREEMENT"): void {
  let state = this.requireState();
  const player = this.getPlayerKingdom(state);
  const npc = state.kingdoms[npcKingdomId];
  if (!npc) return;

  const now = this.deps.clock.now();

  if (actionType === "DECLARE_WAR") {
    if (this.deps.warResolver) {
      state = this.deps.warResolver.declareWar(state, npc.id, player.id);
      this.appendActionLog("Guerra Declarada", `${npc.name} declarou guerra contra o seu reino autonomamente!`, "critical");
    }
  } 
  else if (actionType === "MAKE_PEACE") {
    const activeWar = Object.values(state.wars).find(
      (war) =>
        (war.attackers.includes(npc.id) && war.defenders.includes(player.id)) ||
        (war.attackers.includes(player.id) && war.defenders.includes(npc.id))
    );
    if (activeWar && this.deps.warResolver) {
      state = this.deps.warResolver.enforcePeace(state, activeWar.id);
      this.appendActionLog("Paz Estabelecida", `O acordo de paz com ${npc.name} foi assinado.`, "info");
    }
  } 
  else if (actionType === "COOPERATIVE_AGREEMENT") {
    // Autonomously determine agreement type based on current relations
    const relation = npc.diplomacy.relations[player.id];
    let actionPt = "pacto_nao_agressao";
    let message = `${npc.name} propôs um Pacto de Não Agressão.`;

    if (relation.score.trust > 0.72) {
      actionPt = "pacto_defensivo";
      message = `${npc.name} propôs uma aliança militar defensiva.`;
    } else if (relation.score.tradeValue > 0.6) {
      actionPt = "acordo_comercial";
      message = `${npc.name} propôs um Tratado de Comércio.`;
    }

    if (this.deps.diplomacyResolver) {
      state = this.deps.diplomacyResolver.applyDecision(state, {
        actorKingdomId: npc.id,
        actionType: actionPt,
        priority: 1,
        targetKingdomId: player.id,
        payload: { source: "npc_chat" }
      });
      this.appendActionLog("Tratado Assinado", message, "info");
    }
  }

  this.persistCurrent();
  this.emitState();
}
```

### 3.4 Diplomacy Chat Panel UI (`src/ui/screens/DiplomacyScreen.tsx`)
Create a new chat panel when selecting a kingdom in the list:
*   Show sovereign stats (martial, diplomacy, admin, learning, intrigue) and traits.
*   Add a chat scroll view displaying the message log from `relation.chatHistory`.
*   Input area with a button to send messages to the LLM.
*   Display a typing indicator/loading spinner when waiting for Gemini.
*   A clear warning banner if the Gemini connection is disabled or API key is not configured, linking to `SettingsScreen` so that the player is prompted to configure it.
