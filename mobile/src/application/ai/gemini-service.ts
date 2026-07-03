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

// ─── Textos de fallback offline (en-US, alta qualidade) ──────────────────────

const DIPLOMATIC_FALLBACKS_EN: string[] = [
  'Noble {target}, the winds of history bring us closer. May our alliance be as solid as the walls of our fortresses.',
  'Sovereign of {target}, {actor} extends a hand in peace. Wars consume gold and blood — diplomacy builds empires.',
  'In the name of the glory of {actor}, we present {target} with our most sincere proposal. May reason guide great men.',
  'The annals of history will remember this moment: {actor} and {target}, united by wisdom, capable of overcoming any adversity.',
  'Your Excellency, the stars align for a new chapter. {actor} proposes we write this legacy together — or let destiny decide on the battlefield.',
  'The parchment of our proposal awaits the seal of {target}. {actor} is generous to friends and relentless to enemies.',
  'Great sovereign of {target}, the times demand men of vision. {actor} chose wisdom over the sword on this day.',
];

const EVENT_NARRATIVE_FALLBACKS_EN: string[] = [
  'Drums echo through the valleys as banners rise. A new era begins in the realms of {kingdoms}.',
  'The scribes record in the parchments: unprecedented events shake the known world. The peoples of {kingdoms} wait with anticipation.',
  'Messengers gallop in all directions as the event unfolds. The history of {kingdoms} will never be the same again.',
  'From the mists of uncertainty emerges a decisive moment. The rulers of {kingdoms} will be tested like never before.',
  'The astrologers foresaw this hour. The fate of {kingdoms} hangs in the balance, and only the wisdom of the sovereigns can tip the scales.',
  'Like a storm on the horizon, events in {kingdoms} promise to reshape borders and alliances for generations.',
  'The imperial archives will record this {eventType} as one of the most significant moments of our era. The world watches {kingdoms}.',
];

const RULER_THOUGHT_FALLBACKS_EN: string[] = [
  'The burden of the throne is heavy, but {ruler} carries it with the dignity of their ancestors. Each decision shapes the destiny of thousands.',
  '{ruler} contemplates the horizon beyond the castle walls. The challenges are many, but the spirit of a true sovereign never wavers.',
  'In silence, {ruler} ponders the paths that open before the kingdom. Wisdom comes from those who listen before acting.',
  'The situation demands reflection. {ruler} walks the halls of power, remembering the words of the wisest advisors in their kingdom.',
  'Nights like this test great rulers. {ruler} knows that each crisis carries within it the seed of an opportunity.',
  'The maps spread across the table reveal a world in constant change. {ruler} studies every detail, calculating the next step with precision.',
  'There are times when the crown weighs more than iron. But {ruler} knows their duty — and will fulfill it until the last breath.',
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

  // ── Locale ────────────────────────────────────────────────────────────────

  async getLocale(): Promise<'pt-BR' | 'en-US'> {
    try {
      const locale = await AsyncStorage.getItem('epochs_user_locale');
      if (locale === 'pt-BR' || locale === 'en-US') {
        return locale as 'pt-BR' | 'en-US';
      }
    } catch {}
    return 'pt-BR';
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
    const locale = await this.getLocale();
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      return { 
        ok: false, 
        message: locale === 'en-US' ? 'No API key configured.' : 'Nenhuma chave de API configurada.' 
      };
    }

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: locale === 'en-US' ? 'Say only: OK' : 'Diga apenas: OK' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        return { 
          ok: true, 
          message: locale === 'en-US' 
            ? 'Connection with Gemini successfully established! ✅' 
            : 'Conexão com Gemini estabelecida com sucesso! ✅' 
        };
      } else {
        const body = await response.json().catch(() => ({}));
        const errMsg = body?.error?.message || `Erro HTTP ${response.status}`;
        return { 
          ok: false, 
          message: locale === 'en-US' ? `Failure: ${errMsg}` : `Falha: ${errMsg}` 
        };
      }
    } catch (error: any) {
      return {
        ok: false,
        message: locale === 'en-US' 
          ? `No connection: ${error?.message || 'Timeout or no internet.'}` 
          : `Sem conexão: ${error?.message || 'Timeout ou sem internet.'}`,
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
    const locale = await this.getLocale();
    const prompt = locale === 'en-US'
      ? `You are a medieval scribe for a strategy game called Epochs Idle.
Generate ONE short diplomatic message (maximum 3 sentences) in English, in an epic medieval style.
Actor: ${actorName} | Target: ${targetName} | Action: ${action}${context ? ` | Context: ${context}` : ''}.
Respond only with the message text, without quotes or prefixes.`
      : `Você é um escriba medieval de um jogo de estratégia chamado Epochs Idle.
Gere UMA mensagem diplomática curta (máximo 3 frases) em português do Brasil, no estilo épico medieval.
Ator: ${actorName} | Alvo: ${targetName} | Ação: ${action}${context ? ` | Contexto: ${context}` : ''}.
Responda apenas com o texto da mensagem, sem aspas ou prefixos.`;

    const aiResult = await this.callGemini(prompt);
    if (aiResult) return aiResult;

    const fallbacks = locale === 'en-US' ? DIPLOMATIC_FALLBACKS_EN : DIPLOMATIC_FALLBACKS;
    return interpolate(pickRandom(fallbacks), {
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
    const locale = await this.getLocale();
    const prompt = locale === 'en-US'
      ? `You are a medieval chronicler for Epochs Idle.
Write ONE short epic narrative (2-3 sentences) in English for the event: "${eventType}".
Kingdoms involved: ${kingdomsStr}${context ? `. Context: ${context}` : ''}.
Respond only with the text, without quotes or prefixes.`
      : `Você é um cronista medieval de Epochs Idle.
Escreva UMA narrativa épica curta (2-3 frases) em português do Brasil para o evento: "${eventType}".
Reinos envolvidos: ${kingdomsStr}${context ? `. Contexto: ${context}` : ''}.
Responda apenas com o texto, sem aspas ou prefixos.`;

    const aiResult = await this.callGemini(prompt);
    if (aiResult) return aiResult;

    const fallbacks = locale === 'en-US' ? EVENT_NARRATIVE_FALLBACKS_EN : EVENT_NARRATIVE_FALLBACKS;
    return interpolate(pickRandom(fallbacks), {
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
    const locale = await this.getLocale();
    const prompt = locale === 'en-US'
      ? `You are the internal narrator of Epochs Idle, a medieval strategy game.
Write ONE short and reflective thought (1-2 sentences) in English of the ruler "${rulerName}".
Current situation: ${situation}.
The tone should be dark, epic, and introspective. Respond only with the thought.`
      : `Você é o narrador interno de Epochs Idle, jogo de estratégia medieval.
Escreva UM pensamento curto e reflexivo (1-2 frases) em português do Brasil do governante "${rulerName}".
Situação atual: ${situation}.
O tom deve ser sombrio, épico e introspectivo. Responda apenas com o pensamento.`;

    const aiResult = await this.callGemini(prompt);
    if (aiResult) return aiResult;

    const fallbacks = locale === 'en-US' ? RULER_THOUGHT_FALLBACKS_EN : RULER_THOUGHT_FALLBACKS;
    return interpolate(pickRandom(fallbacks), {
      ruler: rulerName,
      situation,
    });
  }
}

// Singleton exportado para uso em toda a aplicação
export const geminiService = new GeminiService();
