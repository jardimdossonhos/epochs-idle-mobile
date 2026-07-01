import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Chave de armazenamento ───────────────────────────────────────────────────
const GEMINI_API_KEY_STORAGE = 'epochs_gemini_api_key';
const GEMINI_AI_ENABLED_STORAGE = 'epochs_gemini_ai_enabled';
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ─── Textos de fallback offline (pt-BR, alta qualidade) ──────────────────────

const DIPLOMATIC_FALLBACKS: string[] = [
  'Nobre {target}, os ventos da história nos aproximam. Que nossa aliança seja tão sólida quanto as muralhas de nossas fortalezas.',
  'Soberano de {target}, {actor} estende a mão em sinal de paz. As guerras consomem ouro e sangue — a diplomacia constrói impérios.',
  'Em nome da glória de {actor}, presenteamos {target} com nossa mais sincera proposta. Que a razão guie os grandes homens.',
  'Os anais da história lembrarão este momento: {actor} e {target}, unidos pela sabedoria, capazes de superar qualquer adversidade.',
  'Excelência, as estrelas se alinham para um novo capítulo. {actor} propõe que escrevamos juntos esse legado — ou que o destino decida em campo de batalha.',
  'O pergaminho de nossa proposta aguarda o selo de {target}. {actor} é generoso com amigos e implacável com inimigos.',
  'Grande soberano de {target}, os tempos exigem homens de visão. {actor} escolheu a sabedoria sobre a espada neste dia.',
];

const EVENT_NARRATIVE_FALLBACKS: string[] = [
  'Os tambores ecoam pelos vales enquanto os estandartes se erguem. Uma nova era se inicia nos reinos de {kingdoms}.',
  'Os escribas registram nos pergaminhos: acontecimentos sem precedentes agitam o mundo conhecido. Os povos de {kingdoms} aguardam com expectativa.',
  'Mensageiros galopam em todas as direções enquanto o evento se desdobra. A história de {kingdoms} nunca mais será a mesma.',
  'Das brumas da incerteza emerge um momento decisivo. Os governantes de {kingdoms} serão testados como nunca antes.',
  'Os astrólogos previram esta hora. O destino de {kingdoms} pende na balança, e apenas a sabedoria dos soberanos poderá inclinar a balança.',
  'Como uma tempestade no horizonte, os acontecimentos em {kingdoms} prometem remodelar fronteiras e alianças por gerações.',
  'Os arquivos imperiais registrarão este {eventType} como um dos momentos mais significativos de nossa era. O mundo observa {kingdoms}.',
];

const RULER_THOUGHT_FALLBACKS: string[] = [
  'O fardo do trono é pesado, mas {ruler} carrega-o com a dignidade de seus antepassados. Cada decisão molda o destino de milhares.',
  '{ruler} contempla o horizonte além das muralhas do castelo. Os desafios são muitos, mas o espírito de um verdadeiro soberano jamais vacila.',
  'Em silêncio, {ruler} pondera os caminhos que se abrem diante do reino. A sabedoria vem daqueles que ouvem antes de agir.',
  'A situação exige reflexão. {ruler} percorre os salões do poder, lembrando das palavras dos conselheiros mais sábios de seu reino.',
  'Noites como esta testam os grandes governantes. {ruler} sabe que cada crise carrega em seu interior a semente de uma oportunidade.',
  'Os mapas espalhados sobre a mesa revelam um mundo em constante mudança. {ruler} estuda cada detalhe, calculando o próximo passo com precisão.',
  'Há momentos em que a coroa pesa mais que o ferro. Mas {ruler} conhece seu dever — e o cumprirá até o último fôlego.',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function interpolate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (str, [key, value]) => str.replaceAll(`{${key}}`, value),
    template,
  );
}

// ─── Serviço Principal ────────────────────────────────────────────────────────

export class GeminiService {
  // ── API Key ────────────────────────────────────────────────────────────────

  async getApiKey(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(GEMINI_API_KEY_STORAGE);
    } catch {
      return null;
    }
  }

  async setApiKey(key: string): Promise<void> {
    await AsyncStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim());
  }

  async isAiEnabled(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(GEMINI_AI_ENABLED_STORAGE);
      return val === 'true';
    } catch {
      return false;
    }
  }

  async setAiEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(GEMINI_AI_ENABLED_STORAGE, String(enabled));
  }

  // ── Chamada REST ao Gemini ─────────────────────────────────────────────────

  private async callGemini(prompt: string): Promise<string | null> {
    const apiKey = await this.getApiKey();
    if (!apiKey) return null;

    const enabled = await this.isAiEnabled();
    if (!enabled) return null;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 300,
          },
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        console.warn(`[GeminiService] API error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const text: string | undefined =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return text?.trim() || null;
    } catch (error) {
      console.warn('[GeminiService] Request failed, using fallback:', error);
      return null;
    }
  }

  // ── Teste de conexão ───────────────────────────────────────────────────────

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      return { ok: false, message: 'Nenhuma chave de API configurada.' };
    }

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Diga apenas: OK' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        return { ok: true, message: 'Conexão com Gemini estabelecida com sucesso! ✅' };
      } else {
        const body = await response.json().catch(() => ({}));
        const errMsg = body?.error?.message || `Erro HTTP ${response.status}`;
        return { ok: false, message: `Falha: ${errMsg}` };
      }
    } catch (error: any) {
      return {
        ok: false,
        message: `Sem conexão: ${error?.message || 'Timeout ou sem internet.'}`,
      };
    }
  }

  // ── Métodos Públicos ───────────────────────────────────────────────────────

  /**
   * Gera uma mensagem diplomática entre dois atores.
   */
  async generateDiplomaticMessage(
    actorName: string,
    targetName: string,
    action: string,
    context?: string,
  ): Promise<string> {
    const prompt = `Você é um escriba medieval de um jogo de estratégia chamado Epochs Idle.
Gere UMA mensagem diplomática curta (máximo 3 frases) em português do Brasil, no estilo épico medieval.
Ator: ${actorName} | Alvo: ${targetName} | Ação: ${action}${context ? ` | Contexto: ${context}` : ''}.
Responda apenas com o texto da mensagem, sem aspas ou prefixos.`;

    const aiResult = await this.callGemini(prompt);
    if (aiResult) return aiResult;

    return interpolate(pickRandom(DIPLOMATIC_FALLBACKS), {
      actor: actorName,
      target: targetName,
      action,
    });
  }

  /**
   * Gera uma narrativa para um evento do mundo.
   */
  async generateEventNarrative(
    eventType: string,
    kingdoms: string[],
    context?: string,
  ): Promise<string> {
    const kingdomsStr = kingdoms.join(', ');
    const prompt = `Você é um cronista medieval de Epochs Idle.
Escreva UMA narrativa épica curta (2-3 frases) em português do Brasil para o evento: "${eventType}".
Reinos envolvidos: ${kingdomsStr}${context ? `. Contexto: ${context}` : ''}.
Responda apenas com o texto, sem aspas ou prefixos.`;

    const aiResult = await this.callGemini(prompt);
    if (aiResult) return aiResult;

    return interpolate(pickRandom(EVENT_NARRATIVE_FALLBACKS), {
      eventType,
      kingdoms: kingdomsStr,
    });
  }

  /**
   * Gera um pensamento interno do governante.
   */
  async generateRulerThought(
    rulerName: string,
    situation: string,
  ): Promise<string> {
    const prompt = `Você é o narrador interno de Epochs Idle, jogo de estratégia medieval.
Escreva UM pensamento curto e reflexivo (1-2 frases) em português do Brasil do governante "${rulerName}".
Situação atual: ${situation}.
O tom deve ser sombrio, épico e introspectivo. Responda apenas com o pensamento.`;

    const aiResult = await this.callGemini(prompt);
    if (aiResult) return aiResult;

    return interpolate(pickRandom(RULER_THOUGHT_FALLBACKS), {
      ruler: rulerName,
      situation,
    });
  }
}

// Singleton exportado para uso em toda a aplicação
export const geminiService = new GeminiService();
