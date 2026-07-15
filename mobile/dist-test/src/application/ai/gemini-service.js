"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiService = exports.GeminiService = void 0;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
// ─── Chave de armazenamento ───────────────────────────────────────────────────
const GEMINI_API_KEY_STORAGE = 'epochs_gemini_api_key';
const GEMINI_AI_ENABLED_STORAGE = 'epochs_gemini_ai_enabled';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
// ─── Textos de fallback offline (pt-BR, alta qualidade) ──────────────────────
const DIPLOMATIC_FALLBACKS = [
    'Nobre {target}, os ventos da história nos aproximam. Que nossa aliança seja tão sólida quanto as muralhas de nossas fortalezas.',
    'Soberano de {target}, {actor} estende a mão em sinal de paz. As guerras consomem ouro e sangue — a diplomacia constrói impérios.',
    'Em nome da glória de {actor}, presenteamos {target} com nossa mais sincera proposta. Que a razão guie os grandes homens.',
    'Os anais da história lembrarão este momento: {actor} e {target}, unidos pela sabedoria, capazes de superar qualquer adversidade.',
    'Excelência, as estrelas se alinham para um novo capítulo. {actor} propõe que escrevamos juntos esse legado — ou que o destino decida em campo de batalha.',
    'O pergaminho de nossa proposta aguarda o selo de {target}. {actor} é generoso com amigos e implacável com inimigos.',
    'Grande soberano de {target}, os tempos exigem homens de visão. {actor} escolheu a sabedoria sobre a espada neste dia.',
];
const EVENT_NARRATIVE_FALLBACKS = [
    'Os tambores ecoam pelos vales enquanto os estandartes se erguem. Uma nova era se inicia nos reinos de {kingdoms}.',
    'Os escribas registram nos pergaminhos: acontecimentos sem precedentes agitam o mundo conhecido. Os povos de {kingdoms} aguardam com expectativa.',
    'Mensageiros galopam em todas as direções enquanto o evento se desdobra. A história de {kingdoms} nunca mais será a mesma.',
    'Das brumas da incerteza emerge um momento decisivo. Os governantes de {kingdoms} serão testados como nunca antes.',
    'Os astrólogos previram esta hora. O destino de {kingdoms} pende na balança, e apenas a sabedoria dos soberanos poderá inclinar a balança.',
    'Como uma tempestade no horizonte, os acontecimentos em {kingdoms} prometem remodelar fronteiras e alianças por gerações.',
    'Os arquivos imperiais registrarão este {eventType} como um dos momentos mais significativos de nossa era. O mundo observa {kingdoms}.',
];
const RULER_THOUGHT_FALLBACKS = [
    'O fardo do trono é pesado, mas {ruler} carrega-o com a dignidade de seus antepassados. Cada decisão molda o destino de milhares.',
    '{ruler} contempla o horizonte além das muralhas do castelo. Os desafios são muitos, mas o espírito de um verdadeiro soberano jamais vacila.',
    'Em silêncio, {ruler} pondera os caminhos que se abrem diante do reino. A sabedoria vem daqueles que ouvem antes de agir.',
    'A situação exige reflexão. {ruler} percorre os salões do poder, lembrando das palavras dos conselheiros mais sábios de seu reino.',
    'Noites como esta testam os grandes governantes. {ruler} sabe que cada crise carrega em seu interior a semente de uma oportunidade.',
    'Os mapas espalhados sobre a mesa revelam um mundo em constante mudança. {ruler} estuda cada detalhe, calculando o próximo passo com precisão.',
    'Há momentos em que a coroa pesa mais que o ferro. Mas {ruler} conhece seu dever — e o cumprirá até o último fôlego.',
];
// ─── Textos de fallback offline (en-US, alta qualidade) ──────────────────────
const DIPLOMATIC_FALLBACKS_EN = [
    'Noble {target}, the winds of history bring us closer. May our alliance be as solid as the walls of our fortresses.',
    'Sovereign of {target}, {actor} extends a hand in peace. Wars consume gold and blood — diplomacy builds empires.',
    'In the name of the glory of {actor}, we present {target} with our most sincere proposal. May reason guide great men.',
    'The annals of history will remember this moment: {actor} and {target}, united by wisdom, capable of overcoming any adversity.',
    'Your Excellency, the stars align for a new chapter. {actor} proposes we write this legacy together — or let destiny decide on the battlefield.',
    'The parchment of our proposal awaits the seal of {target}. {actor} is generous to friends and relentless to enemies.',
    'Great sovereign of {target}, the times demand men of vision. {actor} chose wisdom over the sword on this day.',
];
const EVENT_NARRATIVE_FALLBACKS_EN = [
    'Drums echo through the valleys as banners rise. A new era begins in the realms of {kingdoms}.',
    'The scribes record in the parchments: unprecedented events shake the known world. The peoples of {kingdoms} wait with anticipation.',
    'Messengers gallop in all directions as the event unfolds. The history of {kingdoms} will never be the same again.',
    'From the mists of uncertainty emerges a decisive moment. The rulers of {kingdoms} will be tested like never before.',
    'The astrologers foresaw this hour. The fate of {kingdoms} hangs in the balance, and only the wisdom of the sovereigns can tip the scales.',
    'Like a storm on the horizon, events in {kingdoms} promise to reshape borders and alliances for generations.',
    'The imperial archives will record this {eventType} as one of the most significant moments of our era. The world watches {kingdoms}.',
];
const RULER_THOUGHT_FALLBACKS_EN = [
    'The burden of the throne is heavy, but {ruler} carries it with the dignity of their ancestors. Each decision shapes the destiny of thousands.',
    '{ruler} contemplates the horizon beyond the castle walls. The challenges are many, but the spirit of a true sovereign never wavers.',
    'In silence, {ruler} ponders the paths that open before the kingdom. Wisdom comes from those who listen before acting.',
    'The situation demands reflection. {ruler} walks the halls of power, remembering the words of the wisest advisors in their kingdom.',
    'Nights like this test great rulers. {ruler} knows that each crisis carries within it the seed of an opportunity.',
    'The maps spread across the table reveal a world in constant change. {ruler} studies every detail, calculating the next step with precision.',
    'There are times when the crown weighs more than iron. But {ruler} knows their duty — and will fulfill it until the last breath.',
];
const OFFLINE_CHAT_FALLBACKS = {
    Hostile: [
        "Eu não tenho nada a dizer a um inimigo declarado. Nossos exércitos decidirão o destino das nossas nações no campo de batalha.",
        "Palavras são inúteis entre nós. Que suas muralhas sejam fortes, pois a guerra está próxima.",
        "Você ousa falar comigo depois de nossas disputas? Retire-se da minha presença antes que eu ordene sua execução."
    ],
    Allied: [
        "Saudações, meu estimado aliado. Nossos povos prosperarão sob a luz de nossa união inquebrável.",
        "É sempre uma honra receber mensagens de um parceiro tão valoroso. Como posso ajudar nosso pacto hoje?",
        "Nossas forças unidas são invencíveis. Que nossa cooperação traga glória e riqueza a ambos os reinos."
    ],
    Friendly: [
        "Bem-vindo, nobre vizinho. As relações amigáveis entre nossos reinos são a chave para a paz na região.",
        "Sua mensagem é muito bem-vinda. Que possamos continuar trilhando o caminho da harmonia comercial e diplomática.",
        "Fico feliz em ouvi-lo. Propostas que fortaleçam nossos laços de amizade sempre serão consideradas com atenção."
    ],
    Truce: [
        "Um tratado de paz nos une temporariamente. Que este tempo de trégua serve para acalmar os ânimos exaltados.",
        "Nossas espadas estão guardadas por hora, mas os olhos dos meus generais continuam atentos. O que deseja?",
        "A trégua deve ser respeitada. Evitemos provocações desnecessárias enquanto o sangue das feridas passadas seca."
    ],
    Neutral: [
        "Saudações. Os negócios de estado exigem moderação. O que propõe o governante do reino vizinho?",
        "Ouço suas palavras com atenção neutra. Diga-me claramente quais são suas intenções comerciais ou políticas.",
        "Em tempos incertos, a cautela é a melhor conselheira. O que traz sua mensagem à minha corte?"
    ]
};
const OFFLINE_CHAT_FALLBACKS_EN = {
    Hostile: [
        "I have nothing to say to a declared enemy. Our armies will decide the fate of our nations on the battlefield.",
        "Words are useless between us. May your walls be strong, for war is near.",
        "You dare speak to me after our disputes? Leave my presence before I order your execution."
    ],
    Allied: [
        "Greetings, my esteemed ally. Our peoples will prosper under the light of our unbreakable union.",
        "It is always an honor to receive messages from such a valued partner. How can I assist our pact today?",
        "Our united forces are invincible. May our cooperation bring glory and wealth to both kingdoms."
    ],
    Friendly: [
        "Welcome, noble neighbor. Friendly relations between our kingdoms are the key to peace in the region.",
        "Your message is most welcome. May we continue to walk the path of commercial and diplomatic harmony.",
        "I am glad to hear from you. Proposals that strengthen our bonds of friendship will always be carefully considered."
    ],
    Truce: [
        "A peace treaty binds us temporarily. May this time of truce serve to calm heated spirits.",
        "Our swords are sheathed for now, but my generals' eyes remain watchful. What is it you desire?",
        "The truce must be respected. Let us avoid unnecessary provocations while the blood of past wounds dries."
    ],
    Neutral: [
        "Greetings. Affairs of state demand moderation. What does the ruler of the neighboring kingdom propose?",
        "I listen to your words with neutral attention. Tell me clearly what your commercial or political intentions are.",
        "In uncertain times, caution is the best advisor. What brings your message to my court?"
    ]
};
// ─── Helpers ─────────────────────────────────────────────────────────────────
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function interpolate(template, vars) {
    return Object.entries(vars).reduce((str, [key, value]) => str.replaceAll(`{${key}}`, value), template);
}
// ─── Serviço Principal ────────────────────────────────────────────────────────
class GeminiService {
    // ── API Key ────────────────────────────────────────────────────────────────
    async getApiKey() {
        try {
            return await async_storage_1.default.getItem(GEMINI_API_KEY_STORAGE);
        }
        catch {
            return null;
        }
    }
    async setApiKey(key) {
        await async_storage_1.default.setItem(GEMINI_API_KEY_STORAGE, key.trim());
    }
    async isAiEnabled() {
        try {
            const val = await async_storage_1.default.getItem(GEMINI_AI_ENABLED_STORAGE);
            return val === 'true';
        }
        catch {
            return false;
        }
    }
    async setAiEnabled(enabled) {
        await async_storage_1.default.setItem(GEMINI_AI_ENABLED_STORAGE, String(enabled));
    }
    // ── Locale ────────────────────────────────────────────────────────────────
    async getLocale() {
        try {
            const locale = await async_storage_1.default.getItem('epochs_user_locale');
            if (locale === 'pt-BR' || locale === 'en-US') {
                return locale;
            }
        }
        catch { }
        return 'pt-BR';
    }
    // ── Chamada REST ao Gemini ─────────────────────────────────────────────────
    async callGemini(prompt) {
        const apiKey = await this.getApiKey();
        if (!apiKey)
            return null;
        const enabled = await this.isAiEnabled();
        if (!enabled)
            return null;
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
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            return text?.trim() || null;
        }
        catch (error) {
            console.warn('[GeminiService] Request failed, using fallback:', error);
            return null;
        }
    }
    // ── Teste de conexão ───────────────────────────────────────────────────────
    async testConnection() {
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
            }
            else {
                const body = await response.json().catch(() => ({}));
                const errMsg = body?.error?.message || `Erro HTTP ${response.status}`;
                return {
                    ok: false,
                    message: locale === 'en-US' ? `Failure: ${errMsg}` : `Falha: ${errMsg}`
                };
            }
        }
        catch (error) {
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
    async generateDiplomaticMessage(actorName, targetName, action, context) {
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
        if (aiResult)
            return aiResult;
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
    async generateEventNarrative(eventType, kingdoms, context) {
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
        if (aiResult)
            return aiResult;
        const fallbacks = locale === 'en-US' ? EVENT_NARRATIVE_FALLBACKS_EN : EVENT_NARRATIVE_FALLBACKS;
        return interpolate(pickRandom(fallbacks), {
            eventType,
            kingdoms: kingdomsStr,
        });
    }
    /**
     * Gera um pensamento interno do governante.
     */
    async generateRulerThought(rulerName, situation) {
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
        if (aiResult)
            return aiResult;
        const fallbacks = locale === 'en-US' ? RULER_THOUGHT_FALLBACKS_EN : RULER_THOUGHT_FALLBACKS;
        return interpolate(pickRandom(fallbacks), {
            ruler: rulerName,
            situation,
        });
    }
    async chatWithSovereign(rulerName, rulerTitle, cultureId, traits, stats, personality, relation, message, chatHistory) {
        const locale = await this.getLocale();
        const apiKey = await this.getApiKey();
        const enabled = await this.isAiEnabled();
        if (apiKey && enabled) {
            try {
                const historyText = chatHistory
                    .map((m) => `[${m.sender.toUpperCase()}]: ${m.text}`)
                    .join('\n');
                const prompt = `You are a medieval sovereign in a strategy game called Epochs Idle.
Act as this sovereign and output a reply in the appropriate medieval tone, matching your personality, traits, and diplomatic relations.

YOUR PROFILE:
- Name: ${rulerName}
- Title: ${rulerTitle}
- Culture ID: ${cultureId}
- Traits: ${traits.join(', ')}
- Personality:
  * Greed: ${personality?.greed ?? 0.5} (higher means values gold/trade)
  * Honor: ${personality?.honor ?? 0.5} (higher means respects treaties and loyalty)
  * Caution: ${personality?.caution ?? 0.5} (higher means avoids risky wars)
  * Zeal: ${personality?.zeal ?? 0.5} (higher means religious fanaticism)
  * Ambition: ${personality?.ambition ?? 0.5} (higher means desires empire expansion)
  * Betrayal Tendency: ${personality?.betrayalTendency ?? 0.2} (higher means likely to break alliances)
- Stats:
  * Administration: ${stats?.administration ?? 10}
  * Martial: ${stats?.martial ?? 10}
  * Diplomacy: ${stats?.diplomacy ?? 10}
  * Intrigue: ${stats?.intrigue ?? 10}
  * Learning: ${stats?.learning ?? 10}

DIPLOMATIC RELATION WITH PLAYER:
- Status: ${relation?.status ?? 'Neutral'}
- Trust: ${relation?.score?.trust ?? 0.4}
- Fear: ${relation?.score?.fear ?? 0.2}
- Rivalry: ${relation?.score?.rivalry ?? 0.2}

CONVERSATION HISTORY:
${historyText || 'No prior conversation.'}

NEW PLAYER MESSAGE:
"${message}"

Based on the message and the state, write your dialogue response as this sovereign (in the medieval tone matching your personality/profile, and matching the user's language/locale: ${locale}).
Also, decide on an immediate diplomatic action. You can only choose one of the following:
- "DECLARE_WAR": If you are highly hostile, feel rivaled, or betrayed, and want to initiate war immediately (only if not already at war/hostile).
- "MAKE_PEACE": If you are currently in a war (Hostile status) and the player's message or situation convinces you to make peace/truce.
- "MAKE_COOPERATION_AGREEMENT": If you trust the player and wish to form a trade agreement, defensive pact, or alliance.
- "NO_ACTION": If the conversation continues normally without a major status change.

Output ONLY a JSON object with this exact structure:
{
  "dialogue": "your response here",
  "action": "DECLARE_WAR" | "MAKE_PEACE" | "MAKE_COOPERATION_AGREEMENT" | "NO_ACTION"
}`;
                const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.8,
                            maxOutputTokens: 500,
                            responseMimeType: 'application/json',
                        },
                    }),
                    signal: AbortSignal.timeout(8000),
                });
                if (response.ok) {
                    const data = await response.json();
                    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        let cleanText = text.trim();
                        if (cleanText.startsWith('```json')) {
                            cleanText = cleanText.substring(7);
                        }
                        else if (cleanText.startsWith('```')) {
                            cleanText = cleanText.substring(3);
                        }
                        if (cleanText.endsWith('```')) {
                            cleanText = cleanText.substring(0, cleanText.length - 3);
                        }
                        cleanText = cleanText.trim();
                        const parsed = JSON.parse(cleanText);
                        const dialogue = parsed.dialogue;
                        const action = parsed.action;
                        if (dialogue &&
                            ['DECLARE_WAR', 'MAKE_PEACE', 'MAKE_COOPERATION_AGREEMENT', 'NO_ACTION'].includes(action)) {
                            return { dialogue, action };
                        }
                    }
                }
            }
            catch (error) {
                console.warn('[GeminiService] chatWithSovereign request failed, using fallback:', error);
            }
        }
        // Offline fallback
        const status = relation?.status || 'Neutral';
        const fallbacks = locale === 'en-US'
            ? (OFFLINE_CHAT_FALLBACKS_EN[status] || OFFLINE_CHAT_FALLBACKS_EN['Neutral'])
            : (OFFLINE_CHAT_FALLBACKS[status] || OFFLINE_CHAT_FALLBACKS['Neutral']);
        let selectedDialogue = pickRandom(fallbacks);
        selectedDialogue = selectedDialogue.replace('{rulerName}', rulerName).replace('{rulerTitle}', rulerTitle);
        return {
            dialogue: selectedDialogue,
            action: 'NO_ACTION',
        };
    }
}
exports.GeminiService = GeminiService;
// Singleton exportado para uso em toda a aplicação
exports.geminiService = new GeminiService();
