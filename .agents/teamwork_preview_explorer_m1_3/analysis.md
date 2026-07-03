# Analysis: Settings and Language Storage for R2

## 1. Executive Summary
This report analyzes how user preferences are currently saved and loaded in the Epochs Idle mobile app (R2) and proposes a design for a reactive localization system (PT-BR and EN-US) that dynamically updates all screens, tab navigators, and generative AI features (Gemini prompts/fallbacks) upon language selection.

---

## 2. Current State of Preference Storage
Currently, the mobile app uses **`AsyncStorage`** via a service wrapper (`GeminiService`) to persist user settings locally on the device.

### Observations from `mobile/src/ui/screens/SettingsScreen.tsx`
- **Settings Loaded on Screen Focus**: The screen uses `@react-navigation/native`'s `useFocusEffect` combined with `useCallback` to reload preferences whenever the screen becomes active:
  ```typescript
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadSettings = async () => {
        const savedKey = await geminiService.getApiKey();
        const enabled = await geminiService.isAiEnabled();
        if (active) {
          setApiKey(savedKey || '');
          setAiEnabled(enabled);
          setTestResult(null);
        }
      };
      loadSettings();
      return () => {
        active = false;
      };
    }, []),
  );
  ```
- **Settings Modified and Saved**: User preferences are updated directly via event handlers calling asynchronous functions in `geminiService`:
  - **API Key**: `await geminiService.setApiKey(apiKey.trim());`
  - **AI Mode Toggle**: `await geminiService.setAiEnabled(value);`

### Observations from `mobile/src/application/ai/gemini-service.ts`
- The `geminiService` interacts directly with `@react-native-async-storage/async-storage` using specific string keys:
  - `GEMINI_API_KEY_STORAGE = 'epochs_gemini_api_key'`
  - `GEMINI_AI_ENABLED_STORAGE = 'epochs_gemini_ai_enabled'`
- High-quality offline fallbacks are currently hardcoded in Portuguese (e.g., `DIPLOMATIC_FALLBACKS`, `EVENT_NARRATIVE_FALLBACKS`, `RULER_THOUGHT_FALLBACKS`).
- AI prompts are explicitly hardcoded to instruct Gemini to reply in Brazilian Portuguese.

---

## 3. Proposed Reactive Localization System Design

To support reactive multi-language translation without requiring app restarts or manual reloads, we design a React Context-based system integrated with `AsyncStorage`.

### A. Core Architecture: `LanguageContext.tsx`
We will create `mobile/src/ui/context/LanguageContext.tsx` which manages the current locale state and exports a translation helper hook.

#### Key Types & Dictionaries:
```typescript
export type Locale = 'pt-BR' | 'en-US';

export const translations = {
  'en-US': {
    // Navigation / General
    tabSaber: 'Saber',
    tabWorldUnlocked: 'The World',
    tabWorldLocked: 'Tribe & Region',
    tabGov: 'Government',
    tabDiplomacy: 'Diplomacy',
    tabCourt: 'Court',
    tabMenu: 'Menu',
    tabConfig: 'Config',
    
    // Settings Screen
    settingsTitle: 'Settings',
    settingsSubtitle: 'Epochs Idle',
    languageSection: 'Language / Idioma',
    languageDesc: 'Choose your preferred language for the interface and AI narratives.',
    aiSection: 'Gemini Artificial Intelligence',
    aiDesc: 'Use Google\'s AI to generate diplomatic messages, event narratives, and ruler thoughts in real-time.',
    aiToggle: 'Activate AI Mode',
    aiToggleDesc: 'When disabled, uses high-quality pre-written texts.',
    apiKeyLabel: 'Gemini API Key',
    apiKeyHint: 'The key is stored locally on the device and is never sent to third parties.',
    saveBtn: 'Save Key',
    testBtn: 'Test Connection',
    logoutBtn: 'Logout',
    // ... additional translations
  },
  'pt-BR': {
    // Navigation / General
    tabSaber: 'Saber',
    tabWorldUnlocked: 'O Mundo',
    tabWorldLocked: 'Tribo & Região',
    tabGov: 'Governo',
    tabDiplomacy: 'Diplomacia',
    tabCourt: 'Corte',
    tabMenu: 'Menu',
    tabConfig: 'Config',

    // Settings Screen
    settingsTitle: 'Configurações',
    settingsSubtitle: 'Epochs Idle',
    languageSection: 'Idioma / Language',
    languageDesc: 'Escolha seu idioma de preferência para a interface e narrativas de IA.',
    aiSection: 'Inteligência Artificial Gemini',
    aiDesc: 'Use a IA do Google para gerar mensagens diplomáticas, narrativas de eventos e pensamentos dos governantes em tempo real.',
    aiToggle: 'Ativar Modo IA',
    aiToggleDesc: 'Quando desativado, usa textos pré-escritos de alta qualidade.',
    apiKeyLabel: 'Chave de API do Gemini',
    apiKeyHint: 'A chave é armazenada localmente no dispositivo e nunca é enviada a terceiros.',
    saveBtn: 'Salvar Chave',
    testBtn: 'Testar Conexão',
    logoutBtn: 'Sair da Conta',
    // ... additional translations
  }
};
```

#### Provider Implementation:
```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCALE_STORAGE_KEY = 'epochs_user_locale';

interface LanguageContextProps {
  locale: Locale;
  t: (key: keyof typeof translations['en-US'], vars?: Record<string, string>) => string;
  changeLocale: (newLocale: Locale) => Promise<void>;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>('pt-BR');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLocale = async () => {
      try {
        const savedLocale = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
        if (savedLocale === 'en-US' || savedLocale === 'pt-BR') {
          setLocale(savedLocale);
        }
      } catch (e) {
        console.warn('Failed to load locale:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadLocale();
  }, []);

  const changeLocale = async (newLocale: Locale) => {
    try {
      setLocale(newLocale);
      await AsyncStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    } catch (e) {
      console.warn('Failed to save locale:', e);
    }
  };

  const t = (key: keyof typeof translations['en-US'], vars?: Record<string, string>): string => {
    const translationSet = translations[locale] || translations['pt-BR'];
    let text = translationSet[key] || translations['en-US'][key] || String(key);
    
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replaceAll(`{${k}}`, v);
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ locale, t, changeLocale, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
```

---

## 4. UI Implementation Plan for SettingsScreen

A new section dedicated to Language Selection will be added to `SettingsScreen.tsx`.

### UI Mockup Design
The design places Language Selection as the very first section in the settings view, aligning with best UX practices for accessibility.

```tsx
{/* ── Seção: Idioma / Language ────────────────────────────────────────────── */}
<View style={styles.section}>
  <View style={styles.sectionTitleRow}>
    <Text style={styles.sectionIcon}>🌐</Text>
    <Text style={styles.sectionTitle}>{t('languageSection')}</Text>
  </View>
  <Text style={styles.sectionDescription}>
    {t('languageDesc')}
  </Text>

  <View style={styles.buttonRow}>
    <TouchableOpacity
      style={[
        styles.langButton,
        locale === 'pt-BR' && styles.langButtonActive
      ]}
      onPress={() => changeLocale('pt-BR')}
      activeOpacity={0.8}
    >
      <Text style={[
        styles.langButtonText,
        locale === 'pt-BR' && styles.langButtonTextActive
      ]}>🇧🇷 Português</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[
        styles.langButton,
        locale === 'en-US' && styles.langButtonActive
      ]}
      onPress={() => changeLocale('en-US')}
      activeOpacity={0.8}
    >
      <Text style={[
        styles.langButtonText,
        locale === 'en-US' && styles.langButtonTextActive
      ]}>🇺🇸 English</Text>
    </TouchableOpacity>
  </View>
</View>
```

### Necessary Styling Definitions
```typescript
  langButton: {
    flex: 1,
    backgroundColor: '#222222',
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  langButtonActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  langButtonText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: 'bold',
  },
  langButtonTextActive: {
    color: '#121212',
  },
```

---

## 5. Reactive Hook Wiring Across Screens

### A. Wrapping the Main Application (`mobile/App.tsx`)
We must wrap the root component in `<LanguageProvider>` so the translation engine is globally accessible.

```tsx
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider style={{ flex: 1, backgroundColor: '#121212' }}>
        <LanguageProvider>
          <AuthProvider>
            <GameProvider>
              <NavigationContainer theme={EmpireTheme}>
                <AppContent />
              </NavigationContainer>
            </GameProvider>
          </AuthProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

### B. Dynamic Tab Labels
In `mobile/App.tsx`, we will invoke `useLanguage()` inside `MainTabs()` to change tab bar labels dynamically and reactively:
```tsx
function MainTabs() {
  const { gameState } = useGameState();
  const { t } = useLanguage();

  if (!gameState) return null;

  const isCivilizationUnocked = gameState.meta.tick > 10;

  return (
    <Tab.Navigator ...>
      <Tab.Screen 
        name="Tech" 
        component={TechScreen}
        options={{
          tabBarLabel: t('tabSaber'),
          // ...
        }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen} 
        options={{ 
          tabBarLabel: isCivilizationUnocked ? t('tabWorldUnlocked') : t('tabWorldLocked'),
          // ...
        }}
      />
      {/* And so on for all screens */}
    </Tab.Navigator>
  );
}
```

---

## 6. Generative AI and Fallback Localization Design

To ensure the Gemini service generates texts in the target language and uses the correct fallbacks when offline:

### A. Reading Locale in `GeminiService`
Since `GeminiService` is a typescript service class outside the React tree, we query the `epochs_user_locale` key directly from `AsyncStorage`:

```typescript
const LOCALE_STORAGE_KEY = 'epochs_user_locale';

// Dynamic helper inside GeminiService class
private async getLocale(): Promise<'pt-BR' | 'en-US'> {
  try {
    const locale = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    return (locale === 'en-US' || locale === 'pt-BR') ? locale : 'pt-BR';
  } catch {
    return 'pt-BR';
  }
}
```

### B. Localizing AI Prompts
Translate prompt instructions based on the active locale so that Gemini produces output in the correct language.

For example, in `generateDiplomaticMessage`:
```typescript
async generateDiplomaticMessage(
  actorName: string,
  targetName: string,
  action: string,
  context?: string,
): Promise<string> {
  const locale = await this.getLocale();
  const isEn = locale === 'en-US';
  
  const prompt = isEn
    ? `You are a medieval scribe for a strategy game called Epochs Idle.
Generate ONE short diplomatic message (max 3 sentences) in English, written in an epic medieval style.
Actor: ${actorName} | Target: ${targetName} | Action: ${action}${context ? ` | Context: ${context}` : ''}.
Reply only with the message text, without quotes or prefixes.`
    : `Você é um escriba medieval de um jogo de estratégia chamado Epochs Idle.
Gere UMA mensagem diplomática curta (máximo 3 frases) em português do Brasil, no estilo épico medieval.
Ator: ${actorName} | Alvo: ${targetName} | Ação: ${action}${context ? ` | Contexto: ${context}` : ''}.
Responda apenas com o texto da mensagem, sem aspas ou prefixos.`;

  const aiResult = await this.callGemini(prompt);
  if (aiResult) return aiResult;

  // Fallback selection
  const fallbacks = DIPLOMATIC_FALLBACKS[locale];
  return interpolate(pickRandom(fallbacks), {
    actor: actorName,
    target: targetName,
    action,
  });
}
```

### C. Bilingual Fallbacks Mapping
Structure fallbacks as locale dictionaries:
```typescript
const DIPLOMATIC_FALLBACKS: Record<'pt-BR' | 'en-US', string[]> = {
  'pt-BR': [
    'Nobre {target}, os ventos da história nos aproximam. Que nossa aliança seja tão sólida quanto as muralhas de nossas fortalezas.',
    // ...
  ],
  'en-US': [
    'Noble {target}, the winds of history bring us closer. May our alliance be as solid as the walls of our fortresses.',
    // ...
  ]
};

const EVENT_NARRATIVE_FALLBACKS: Record<'pt-BR' | 'en-US', string[]> = {
  'pt-BR': [
    'Os tambores ecoam pelos vales enquanto os estandartes se erguem. Uma nova era se inicia nos reinos de {kingdoms}.',
    // ...
  ],
  'en-US': [
    'Drums echo through the valleys as banners rise. A new era begins in the kingdoms of {kingdoms}.',
    // ...
  ]
};

const RULER_THOUGHT_FALLBACKS: Record<'pt-BR' | 'en-US', string[]> = {
  'pt-BR': [
    'O fardo do trono é pesado, mas {ruler} carrega-o com a dignidade de seus antepassados...',
    // ...
  ],
  'en-US': [
    'The burden of the throne is heavy, but {ruler} carries it with the dignity of their ancestors...',
    // ...
  ]
};
```

---

## 7. Conclusions & Next Steps
By implementing the proposed React Context system along with key-value checks in `GeminiService`, we ensure:
1. **Fully reactive translations** across all views and navigation tabs instantly.
2. **Persistent user preferences** saved locally in `AsyncStorage`.
3. **Bilingual AI generation** and high-quality local fallbacks tailored to the user's chosen language.
