# R2: Internationalization (i18n) to PT-BR Analysis Report

## Executive Summary
This report analyzes the requirements for internationalization (i18n) of the Epochs Idle mobile application, with a default locale of Portuguese (PT-BR) and the capability to switch to English (EN). We scanned the main screens and components (`MainMenuScreen.tsx`, `AuthScreen.tsx`, `SettingsScreen.tsx`, `LoadGameModal.tsx`, `TopHUD.tsx`, `MenuScreen.tsx`, `App.tsx`, and `SplashScreen.tsx`) for hardcoded text in both English and Portuguese. 

We recommend a zero-dependency, lightweight, custom React Context-based translation system (`I18nProvider` + `useI18n`) leveraging `@react-native-async-storage/async-storage` for locale persistence. This system avoids adding heavy external packages and operates smoothly in a React Native/Expo environment.

---

## 1. Requirements Analysis
The goal of R2 is to make the entire mobile game client localizable to Portuguese (PT-BR) and English (EN):
- **Default Locale**: PT-BR (`pt`).
- **Language Switching**: User should be able to toggle the language from the Settings screen.
- **Persistence**: Selected language must persist across sessions using AsyncStorage.
- **Interpolation**: The translation system must support passing variables (e.g., Year, Month, Tick, Name).
- **Scope**: Screen elements, navigation tabs, modal popups, and user-facing notifications.

---

## 2. Hardcoded Text Scan Results

Below is a detailed inventory of the hardcoded strings found in the main UI files.

### 2.1 `MainMenuScreen.tsx`
- **Line 27**: `'Sovereign'` (Fallback user name)
- **Line 28**: `'Guest Player'` (Fallback user email)
- **Line 41**: `'Main Menu'` (Header subtitle)
- **Line 49**: `'New Game'` (Primary action button text)
- **Line 54**: `'Load Game'` (Secondary action button text)

### 2.2 `AuthScreen.tsx`
- **Line 73**: `'Sovereigns of History'` (Tagline)
- **Line 78**: `'Enter the Realms'` (Card header)
- **Line 79-81**: `'Identify yourself, Sovereign, to forge your dynasty across eras.'` (Card description)
- **Line 96**: `'Conectando...'` / `'Sign in with Google'` (Button texts - mixed Portuguese/English)
- **Line 111**: `'Entrando...'` / `'Mock Login (Dev)'` (Button texts - mixed Portuguese/English)
- **Line 126**: `'Entrando...'` / `'Continue as Guest'` (Button texts - mixed Portuguese/English)
- **Line 131**: `'Version 1.0.0 • Offline Capable'` (Footer text)
- **Line 27**: `'Erro desconhecido ao fazer login com Google.'` (Alert description)
- **Line 28-30**: `'Seu ambiente local (debug.keystore) mudou e a assinatura SHA-1 atual não confere com o Google Cloud Console. Use o Mock Login ou registre sua nova assinatura (SHA-1) no GCP.'` (Alert description)
- **Line 31**: `'Falha no Login'` (Alert title)
- **Line 43, 55**: `'Erro'` (Alert title)
- **Line 43**: `'Falha no login de desenvolvimento.'` (Alert description)
- **Line 55**: `'Falha ao entrar como visitante.'` (Alert description)

### 2.3 `SettingsScreen.tsx`
- **Line 29**: `'Sair da Conta'`, `'Tem certeza que deseja sair?'` (Alert texts)
- **Line 30**: `'Cancelar'`, `'Sair'` (Alert actions)
- **Line 57**: `'Atenção'`, `'Por favor, insira uma chave de API válida.'` (Alert texts)
- **Line 63**: `'Salvo!'`, `'Chave de API do Gemini salva com sucesso.'` (Alert texts)
- **Line 66**: `'Erro'`, `'Não foi possível salvar a chave.'` (Alert texts)
- **Line 74**: `'Atenção'`, `'Salve uma chave de API antes de testar.'` (Alert texts)
- **Line 85**: `'Erro inesperado ao testar conexão.'` (Alert text)
- **Line 105**: `'Configurações'` (Header title)
- **Line 106**: `'Epochs Idle'` (Header subtitle)
- **Line 113**: `'Inteligência Artificial Gemini'` (Section title)
- **Line 115-119**: `'Use a IA do Google para gerar mensagens diplomáticas, narrativas de eventos e pensamentos dos governantes em tempo real. Obtenha sua chave gratuita em aistudio.google.com.'` (Section description)
- **Line 124**: `'Ativar Modo IA'` (Toggle label)
- **Line 125-127**: `'Quando desativado, usa textos pré-escritos de alta qualidade.'` (Toggle description)
- **Line 138**: `'Chave de API do Gemini'` (Input label)
- **Line 150-152**: `'A chave é armazenada localmente no dispositivo e nunca é enviada a terceiros.'` (Input hint)
- **Line 165**: `'💾 Salvar Chave'` (Button text)
- **Line 178**: `'🔌 Testar Conexão'` (Button text)
- **Line 200**: `'Como Funciona'` (Section title)
- **Line 206-207**: `'Mensagens Diplomáticas'`, `'Cada proposta de aliança ou declaração de guerra ganha uma mensagem única e épica.'` (Feature details)
- **Line 211-212**: `'Narrativas de Eventos'`, `'Eventos do mundo são narrados com riqueza histórica e dramatismo medieval.'` (Feature details)
- **Line 215-217**: `'Pensamentos do Governante'`, `'Seu soberano reflete sobre situações críticas com profundidade e caráter.'` (Feature details)
- **Line 220-222**: `'Fallback Offline'`, `'Sem internet ou sem chave? O jogo usa textos pré-escritos de alta qualidade.'` (Feature details)
- **Line 240**: `'Conta'` (Section title)
- **Line 242-243**: `'Você está logado como: '` (Text label)
- **Line 243**: `'Convidado'` (Fallback name)
- **Line 246**: `'Sair da Conta'` (Button text)
- **Line 254**: `'Sobre o Jogo'` (Section title)
- **Line 258**: `'Versão'` (Info label)
- **Line 262**: `'Motor'` (Info label)
- **Line 266**: `'IA'` (Info label)
- **Line 270**: `'Modo Offline'` (Info label)
- **Line 271**: `'✅ Disponível'` (Info value)
- **Line 276-278**: `'Epochs Idle © 2025 • Todos os direitos reservados'` (Footer text)

### 2.4 `LoadGameModal.tsx`
- **Line 68**: `'Erro ao Carregar'`, `'Não foi possível carregar a partida salva selecionada.'` (Alert texts)
- **Line 80**: `'Kingdom of Old'` (Fallback kingdom name)
- **Line 85**: `'👑 Culture: '` (Text label)
- **Line 86**: `'⏳ Year: '`, `' (Tick '` (Text label)
- **Line 87**: `'📅 Saved: '` (Text label)
- **Line 91**: `'⚔️ Resume Campaign'` (Button text)
- **Line 102**: `'📜 Saved Chronicles'` (Modal title)
- **Line 111**: `'Reading archives...'` (Loading text)
- **Line 115**: `'No saved campaigns found.'` (Empty state text)

### 2.5 `TopHUD.tsx`
- **Line 13**: `'Forjando o Mundo...'` (Loading text)
- **Line 33**: `'Ano '`, `' (Mês '` (Text labels)
- **Line 36**: `'▶️ PLAY'`, `'⏸️ PAUSE'` (Toggle button texts)
- **Line 42**: `' Domínios'` (Metric suffix)

### 2.6 `MenuScreen.tsx`
- **Line 11**: `"Autosave"` (Slot label)
- **Line 12-14**: `"Slot 1"`, `"Slot 2"`, `"Slot 3"` (Slot labels)
- **Line 35**: `"Sucesso"`, `"Império salvo com sucesso!"` (Alert texts)
- **Line 38**: `"Erro"`, `"Falha ao salvar jogo."` (Alert texts)
- **Line 46**: `"Sucesso"`, `"Império carregado. (Pode demorar 1s para refletir na UI)"` (Alert texts)
- **Line 48**: `"Erro"`, `"Falha ao carregar."` (Alert texts)
- **Line 55**: `"God Mode"`, `"Snapshot da memória enviado para a IA!"` (Alert texts)
- **Line 61**: `"Menu do Sistema"` (Header title)
- **Line 64**: `"Velocidade do Tempo"` (Section title)
- **Line 88**: `"Jogos Salvos"` (Section title)
- **Line 101**: `"Vazio"` (Empty slot state)
- **Line 107**: `"Salvar"` (Button text)
- **Line 112**: `"Carregar"` (Button text)
- **Line 121**: `"👁️ Enviar Estado para IA (God Mode)"` (Button text)
- **Line 125-127**: `"Novo Jogo"`, `"Tem certeza? Isso apagará seu progresso atual (não afeta os jogos salvos manualmente)."` (Alert texts)
- **Line 129**: `"Cancelar"` (Button text)
- **Line 131**: `"Sim, Novo Jogo"` (Button text)
- **Line 137**: `"Sucesso"`, `"Um novo império acaba de nascer!"` (Alert texts)
- **Line 144**: `"⚠️ Iniciar Novo Jogo"` (Button text)

### 2.7 `App.tsx` (Tab navigation)
- **Line 76**: `'Saber'` (Tab label)
- **Line 83**: `'O Mundo'`, `'Tribo & Região'` (Tab labels)
- **Line 95**: `'Governo'` (Tab label)
- **Line 108**: `'Diplomacia'` (Tab label)
- **Line 121**: `'Corte'` (Tab label)
- **Line 133**: `'Menu'` (Tab label)
- **Line 143**: `'Config'` (Tab label)

### 2.8 `SplashScreen.tsx`
- **Line 57**: `'Forjando a Aurora da Humanidade...'` (Loading text)

---

## 3. Recommended i18n Translation System

We recommend building a lightweight, zero-dependency translation provider. This avoids the bloat of third-party i18n libraries and is fully customizable for React Native.

### 3.1 Translation Dictionary (`mobile/src/ui/context/translations.ts`)
A single file defining the dictionary keys and values for `pt` and `en`.

```typescript
export const translations = {
  pt: {
    // Common actions
    cancel: "Cancelar",
    back: "Voltar",
    next: "Avançar",
    error: "Erro",
    success: "Sucesso",
    save: "Salvar",
    load: "Carregar",
    ok: "OK",
    warning: "Atenção",

    // Main Menu
    newGame: "Novo Jogo",
    loadGame: "Carregar Jogo",
    mainMenu: "Menu Principal",
    sovereign: "Soberano",
    guestPlayer: "Convidado",
    logout: "Sair",
    
    // Auth Screen
    enterRealms: "Entrar nos Reinos",
    authDescription: "Identifique-se, Soberano, para forjar sua dinastia através das eras.",
    signInGoogle: "Entrar com o Google",
    mockLogin: "Login de Desenvolvimento (Mock)",
    continueGuest: "Continuar como Convidado",
    connecting: "Conectando...",
    entering: "Entrando...",
    versionOffline: "Versão 1.0.0 • Suporte Offline",
    loginFailed: "Falha no Login",
    devLoginFailed: "Falha no login de desenvolvimento.",
    guestLoginFailed: "Falha ao entrar como visitante.",
    googleLoginErrorDesc: "Erro desconhecido ao fazer login com Google.",
    googleShaErrorDesc: "Seu ambiente local (debug.keystore) mudou e a assinatura SHA-1 atual não confere com o Google Cloud Console. Use o Mock Login ou registre sua nova assinatura (SHA-1) no GCP.",

    // Settings Screen
    settings: "Configurações",
    epochsIdle: "Epochs Idle",
    geminiAi: "Inteligência Artificial Gemini",
    geminiDescription: "Use a IA do Google para gerar mensagens diplomáticas, narrativas de eventos e pensamentos dos governantes em tempo real. Obtenha sua chave gratuita em aistudio.google.com.",
    activateAi: "Ativar Modo IA",
    activateAiDesc: "Quando desativado, usa textos pré-escritos de alta qualidade.",
    apiKeyLabel: "Chave de API do Gemini",
    apiKeyHint: "A chave é armazenada localmente no dispositivo e nunca é enviada a terceiros.",
    saveKey: "💾 Salvar Chave",
    testConnection: "🔌 Testar Conexão",
    saving: "Salvando...",
    testing: "Testando...",
    connectionTestSuccess: "Conexão estabelecida com sucesso!",
    connectionTestFailed: "Falha ao testar conexão.",
    apiKeyRequired: "Por favor, insira uma chave de API válida.",
    apiKeySaveSuccess: "Chave de API do Gemini salva com sucesso.",
    apiKeySaveError: "Não foi possível salvar a chave.",
    testConnectionError: "Erro inesperado ao testar conexão.",
    howItWorks: "Como Funciona",
    diplomaticMessagesTitle: "Mensagens Diplomáticas",
    diplomaticMessagesDesc: "Cada proposta de aliança ou declaração de guerra ganha uma mensagem única e épica.",
    eventNarrativesTitle: "Narrativas de Eventos",
    eventNarrativesDesc: "Eventos do mundo são narrados com riqueza histórica e dramatismo medieval.",
    rulerThoughtsTitle: "Pensamentos do Governante",
    rulerThoughtsDesc: "Seu soberano reflete sobre situações críticas com profundidade e caráter.",
    offlineFallbackTitle: "Fallback Offline",
    offlineFallbackDesc: "Sem internet ou sem chave? O jogo usa textos pré-escritos de alta qualidade.",
    accountSection: "Conta",
    loggedInAs: "Você está logado como: ",
    guest: "Convidado",
    logoutConfirmTitle: "Sair da Conta",
    logoutConfirmDesc: "Tem certeza que deseja sair?",
    aboutGame: "Sobre o Jogo",
    versionLabel: "Versão",
    engineLabel: "Motor",
    aiLabel: "IA",
    offlineModeLabel: "Modo Offline",
    offlineModeAvailable: "✅ Disponível",
    allRightsReserved: "Epochs Idle © 2025 • Todos os direitos reservados",
    selectLanguage: "Idioma / Language",

    // Load Game Modal
    savedChronicles: "📜 Crônicas Salvas",
    readingArchives: "Lendo arquivos...",
    noSavedCampaigns: "Nenhuma campanha salva encontrada.",
    kingdomOfOld: "Reino Antigo",
    cultureLabel: "Cultura",
    yearLabel: "Ano",
    tickLabel: "Tick",
    savedLabel: "Salvo",
    resumeCampaign: "⚔️ Retomar Campanha",
    loadSlotErrorTitle: "Erro ao Carregar",
    loadSlotErrorDesc: "Não foi possível carregar a partida salva selecionada.",

    // Top HUD
    forgingWorld: "Forjando o Mundo...",
    yearFormat: "Ano {year}",
    monthFormat: "Mês {month}",
    play: "▶️ JOGAR",
    pause: "⏸️ PAUSAR",
    domainsFormat: "{count} Domínios",
    domainsCount: "territórios soberanos",

    // Menu Screen
    autosave: "Autosave",
    menuTitle: "Menu do Sistema",
    speedTitle: "Velocidade do Tempo",
    savedGames: "Jogos Salvos",
    emptySlot: "Vazio",
    saveSuccess: "Império salvo com sucesso!",
    saveError: "Falha ao salvar jogo.",
    loadSuccess: "Império carregado. (Pode demorar 1s para refletir na UI)",
    loadError: "Falha ao carregar.",
    godModeTitle: "God Mode",
    godModeSuccess: "Snapshot da memória enviado para a IA!",
    sendStateToAi: "👁️ Enviar Estado para IA (God Mode)",
    newGameTitle: "Novo Jogo",
    newGameWarning: "Tem certeza? Isso apagará seu progresso atual (não afeta os jogos salvos manualmente).",
    newGameConfirmBtn: "Sim, Novo Jogo",
    newGameBorn: "Um novo império acaba de nascer!",
    startNewGame: "⚠️ Iniciar Novo Jogo",

    // App Navigation Tabs
    tabSaber: "Saber",
    tabWorld: "O Mundo",
    tabTribeRegion: "Tribo & Região",
    tabGovernment: "Governo",
    tabDiplomacy: "Diplomacia",
    tabCourt: "Corte",
    tabMenu: "Menu",
    tabConfig: "Config",

    // Splash Screen
    forgingAurora: "Forjando a Aurora da Humanidade..."
  },
  en: {
    // Common actions
    cancel: "Cancel",
    back: "Back",
    next: "Next",
    error: "Error",
    success: "Success",
    save: "Save",
    load: "Load",
    ok: "OK",
    warning: "Warning",

    // Main Menu
    newGame: "New Game",
    loadGame: "Load Game",
    mainMenu: "Main Menu",
    sovereign: "Sovereign",
    guestPlayer: "Guest Player",
    logout: "Log Out",
    
    // Auth Screen
    enterRealms: "Enter the Realms",
    authDescription: "Identify yourself, Sovereign, to forge your dynasty across eras.",
    signInGoogle: "Sign in with Google",
    mockLogin: "Mock Login (Dev)",
    continueGuest: "Continue as Guest",
    connecting: "Connecting...",
    entering: "Entering...",
    versionOffline: "Version 1.0.0 • Offline Capable",
    loginFailed: "Login Failed",
    devLoginFailed: "Development login failed.",
    guestLoginFailed: "Failed to enter as guest.",
    googleLoginErrorDesc: "Unknown error signing in with Google.",
    googleShaErrorDesc: "Your local environment (debug.keystore) changed and the current SHA-1 signature does not match the Google Cloud Console. Use Mock Login or register your new signature (SHA-1) in GCP.",

    // Settings Screen
    settings: "Settings",
    epochsIdle: "Epochs Idle",
    geminiAi: "Gemini Artificial Intelligence",
    geminiDescription: "Use Google AI to generate unique diplomatic messages, event narratives, and ruler thoughts in real time. Get your free key at aistudio.google.com.",
    activateAi: "Enable AI Mode",
    activateAiDesc: "When disabled, uses high-quality pre-written text fallbacks.",
    apiKeyLabel: "Gemini API Key",
    apiKeyHint: "The key is stored locally on the device and is never sent to third parties.",
    saveKey: "💾 Save Key",
    testConnection: "🔌 Test Connection",
    saving: "Saving...",
    testing: "Testing...",
    connectionTestSuccess: "Connection test successful!",
    connectionTestFailed: "Connection test failed.",
    apiKeyRequired: "Please enter a valid API key.",
    apiKeySaveSuccess: "Gemini API Key successfully saved.",
    apiKeySaveError: "Could not save the key.",
    testConnectionError: "Unexpected error testing connection.",
    howItWorks: "How It Works",
    diplomaticMessagesTitle: "Diplomatic Messages",
    diplomaticMessagesDesc: "Every alliance proposal or declaration of war receives a unique, epic description.",
    eventNarrativesTitle: "Event Narratives",
    eventNarrativesDesc: "World events are narrated with historical richness and medieval drama.",
    rulerThoughtsTitle: "Ruler Thoughts",
    rulerThoughtsDesc: "Your ruler reflects on critical situations with depth and personality.",
    offlineFallbackTitle: "Offline Fallback",
    offlineFallbackDesc: "No internet or no key? The game uses high-quality pre-written text.",
    accountSection: "Account",
    loggedInAs: "You are logged in as: ",
    guest: "Guest",
    logoutConfirmTitle: "Log Out",
    logoutConfirmDesc: "Are you sure you want to log out?",
    aboutGame: "About the Game",
    versionLabel: "Version",
    engineLabel: "Engine",
    aiLabel: "AI",
    offlineModeLabel: "Offline Mode",
    offlineModeAvailable: "✅ Available",
    allRightsReserved: "Epochs Idle © 2025 • All rights reserved",
    selectLanguage: "Language / Idioma",

    // Load Game Modal
    savedChronicles: "📜 Saved Chronicles",
    readingArchives: "Reading archives...",
    noSavedCampaigns: "No saved campaigns found.",
    kingdomOfOld: "Kingdom of Old",
    cultureLabel: "Culture",
    yearLabel: "Year",
    tickLabel: "Tick",
    savedLabel: "Saved",
    resumeCampaign: "⚔️ Resume Campaign",
    loadSlotErrorTitle: "Load Error",
    loadSlotErrorDesc: "Could not load the selected saved game.",

    // Top HUD
    forgingWorld: "Forging the World...",
    yearFormat: "Year {year}",
    monthFormat: "Month {month}",
    play: "▶️ PLAY",
    pause: "⏸️ PAUSE",
    domainsFormat: "{count} Domains",
    domainsCount: "sovereign territories",

    // Menu Screen
    autosave: "Autosave",
    menuTitle: "System Menu",
    speedTitle: "Time Speed",
    savedGames: "Saved Games",
    emptySlot: "Empty",
    saveSuccess: "Empire successfully saved!",
    saveError: "Failed to save game.",
    loadSuccess: "Empire loaded. (May take 1s to reflect in UI)",
    loadError: "Failed to load.",
    godModeTitle: "God Mode",
    godModeSuccess: "State snapshot sent to AI!",
    sendStateToAi: "👁️ Send State to AI (God Mode)",
    newGameTitle: "New Game",
    newGameWarning: "Are you sure? This will delete your current progress (does not affect manually saved slots).",
    newGameConfirmBtn: "Yes, New Game",
    newGameBorn: "A new empire has just been born!",
    startNewGame: "⚠️ Start New Game",

    // App Navigation Tabs
    tabSaber: "Knowledge",
    tabWorld: "The World",
    tabTribeRegion: "Tribe & Region",
    tabGovernment: "Government",
    tabDiplomacy: "Diplomacy",
    tabCourt: "Court",
    tabMenu: "Menu",
    tabConfig: "Config",

    // Splash Screen
    forgingAurora: "Forging the Dawn of Humanity..."
  }
} as const;

export type Language = 'pt' | 'en';
export type TranslationKey = keyof typeof translations.pt;
```

### 3.2 Context & Custom Hook Provider (`mobile/src/ui/context/I18nContext.tsx`)

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language, TranslationKey } from './translations';

interface I18nContextProps {
  locale: Language;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  changeLanguage: (lang: Language) => Promise<void>;
  isLoaded: boolean;
}

const LANGUAGE_KEY = '@epochs_idle:language';

const I18nContext = createContext<I18nContextProps | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Language>('pt');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadStoredLanguage = async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (stored === 'en' || stored === 'pt') {
          setLocale(stored);
        } else {
          setLocale('pt'); // Default locale
        }
      } catch (e) {
        console.error('Failed to load language', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadStoredLanguage();
  }, []);

  const changeLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
      setLocale(lang);
    } catch (e) {
      console.error('Failed to save language', e);
    }
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const dict = translations[locale] || translations['pt'];
    let val = dict[key] as string;
    
    if (!val) {
      val = translations['pt'][key] || String(key);
    }
    
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        val = val.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
    }
    
    return val;
  };

  return (
    <I18nContext.Provider value={{ locale, t, changeLanguage, isLoaded }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
```

---

## 4. Proposed Code Integration Plan

The implementing agent should follow these steps to integrate the i18n system safely.

### Step 1: Create the i18n Dictionary and Provider
Write the `translations.ts` and `I18nContext.tsx` files inside `mobile/src/ui/context/`.

### Step 2: Wrap the Application in `I18nProvider`
In `mobile/App.tsx`, wrap the `GestureHandlerRootView` or `SafeAreaProvider` children with `I18nProvider`.

*Before:*
```typescript
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider style={{ flex: 1, backgroundColor: '#121212' }}>
        <AuthProvider>
          <GameProvider>
            <NavigationContainer theme={EmpireTheme}>
              <AppContent />
            </NavigationContainer>
          </GameProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

*After:*
```typescript
import { I18nProvider } from './src/ui/context/I18nContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider style={{ flex: 1, backgroundColor: '#121212' }}>
        <I18nProvider>
          <AuthProvider>
            <GameProvider>
              <NavigationContainer theme={EmpireTheme}>
                <AppContent />
              </NavigationContainer>
            </GameProvider>
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

### Step 3: Localize `App.tsx` (Tab Labels)
Use `useI18n()` inside `MainTabs` to translate navigation tab labels dynamically.

*Example:*
```typescript
function MainTabs() {
  const { gameState } = useGameState();
  const { t } = useI18n();

  if (!gameState) return null;

  const isCivilizationUnocked = gameState.meta.tick > 10;

  return (
    <Tab.Navigator ...>
      <Tab.Screen 
        name="Tech" 
        component={TechScreen}
        options={{
          ...
          tabBarLabel: t('tabSaber')
        }}
      />
      ...
```

### Step 4: Localize Component Files
For each of the scanned files, import `useI18n` and replace hardcoded string references with calls to `t('key')`.

*Example (`MainMenuScreen.tsx`):*
```typescript
import { useI18n } from '../context/I18nContext';

export default function MainMenuScreen({ onNewGame, onGameLoaded }: MainMenuScreenProps) {
  const { user, logout } = useAuth();
  const [isLoadModalVisible, setIsLoadModalVisible] = useState(false);
  const { t } = useI18n();

  return (
    ...
    <Text style={styles.userName}>{user?.displayName || t('sovereign')}</Text>
    <Text style={styles.userEmail}>{user?.email || t('guestPlayer')}</Text>
    ...
    <Text style={styles.primaryButtonText}>{t('newGame')}</Text>
    ...
```

*Example (`TopHUD.tsx` with interpolation):*
```typescript
import { useI18n } from '../context/I18nContext';

export default function TopHUD() {
  const { t } = useI18n();
  ...
  return (
    ...
    <Text style={styles.eraText}>
      {t('yearFormat', { year: Math.floor(gameState.meta.tick / 12) + 1 })} ({t('monthFormat', { month: (gameState.meta.tick % 12) + 1 })})
    </Text>
    ...
    <Text style={styles.statValue}>
      {t('domainsFormat', { count: regions })}
    </Text>
    ...
```

### Step 5: Add Language Switching UI in `SettingsScreen.tsx`
Add a dropdown or simple button toggle in `SettingsScreen.tsx` to switch languages:

```typescript
import { useI18n } from '../context/I18nContext';

// Inside SettingsScreen component
const { locale, changeLanguage, t } = useI18n();

// Add UI component section
<View style={styles.section}>
  <View style={styles.sectionTitleRow}>
    <Text style={styles.sectionIcon}>🌐</Text>
    <Text style={styles.sectionTitle}>{t('selectLanguage')}</Text>
  </View>
  <View style={styles.buttonRow}>
    <TouchableOpacity
      style={[styles.saveButton, locale === 'pt' && { backgroundColor: '#D4AF37' }, locale !== 'pt' && { backgroundColor: '#2C2C2C', borderColor: '#444', borderWidth: 1 }]}
      onPress={() => changeLanguage('pt')}
    >
      <Text style={[styles.saveButtonText, locale !== 'pt' && { color: '#888' }]}>Português (BR)</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.saveButton, locale === 'en' && { backgroundColor: '#D4AF37' }, locale !== 'en' && { backgroundColor: '#2C2C2C', borderColor: '#444', borderWidth: 1 }]}
      onPress={() => changeLanguage('en')}
    >
      <Text style={[styles.saveButtonText, locale !== 'en' && { color: '#888' }]}>English</Text>
    </TouchableOpacity>
  </View>
</View>
```
