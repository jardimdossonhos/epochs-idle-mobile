# Handoff Report: R2 Internationalization (i18n) to PT-BR Analysis

This handoff report summarizes the read-only exploration of the Epochs Idle mobile codebase to prepare for R2: Internationalization to PT-BR.

---

## 1. Observation
We scanned the game client components and screens inside `mobile/src/ui/` and identified various hardcoded texts in English and Portuguese. Here are direct quotes and locations:

- **`mobile/src/ui/screens/MainMenuScreen.tsx`**:
  - Line 27: `<Text style={styles.userName}>{user?.displayName || 'Sovereign'}</Text>`
  - Line 28: `<Text style={styles.userEmail}>{user?.email || 'Guest Player'}</Text>`
  - Line 41: `<Text style={styles.subtitle}>Main Menu</Text>`
  - Line 49: `<Text style={styles.primaryButtonText}>New Game</Text>`
  - Line 54: `<Text style={styles.secondaryButtonText}>Load Game</Text>`

- **`mobile/src/ui/screens/AuthScreen.tsx`**:
  - Line 73: `<Text style={styles.subtitle}>Sovereigns of History</Text>`
  - Line 78: `<Text style={styles.cardTitle}>Enter the Realms</Text>`
  - Line 79-81: `<Text style={styles.cardDescription}>Identify yourself, Sovereign, to forge your dynasty across eras.</Text>`
  - Line 96: `<Text style={styles.googleButtonText}>{loadingProvider === 'google' ? 'Conectando...' : 'Sign in with Google'}</Text>`
  - Line 111: `<Text style={styles.mockButtonText}>{loadingProvider === 'mock' ? 'Entrando...' : 'Mock Login (Dev)'}</Text>`
  - Line 126: `<Text style={styles.guestButtonText}>{loadingProvider === 'guest' ? 'Entrando...' : 'Continue as Guest'}</Text>`
  - Line 131: `<Text style={styles.footerText}>Version 1.0.0 • Offline Capable</Text>`

- **`mobile/src/ui/components/LoadGameModal.tsx`**:
  - Line 80: `<Text style={styles.kingdomName}>{summary.playerKingdomName || 'Kingdom of Old'}</Text>`
  - Line 85: `<Text style={styles.detailText}>👑 Culture: <Text style={styles.highlight}>{culture.toUpperCase()}</Text></Text>`
  - Line 86: `<Text style={styles.detailText}>⏳ Year: <Text style={styles.highlight}>{year}</Text> (Tick {summary.tick})</Text>`
  - Line 87: `<Text style={styles.detailText}>📅 Saved: {dateStr}</Text>`
  - Line 91: `<Text style={styles.loadButtonText}>⚔️ Resume Campaign</Text>`
  - Line 102: `<Text style={styles.modalTitle}>📜 Saved Chronicles</Text>`
  - Line 111: `<Text style={styles.loadingText}>Reading archives...</Text>`
  - Line 115: `<Text style={styles.emptyText}>No saved campaigns found.</Text>`

- **`mobile/src/ui/components/TopHUD.tsx`**:
  - Line 13: `<Text style={styles.loadingText}>Forjando o Mundo...</Text>`
  - Line 33: `<Text style={styles.eraText}>Ano {Math.floor(gameState.meta.tick / 12) + 1} (Mês {gameState.meta.tick % 12 + 1})</Text>`
  - Line 36: `<Text style={styles.pauseBtnText}>{isPaused ? '▶️ PLAY' : '⏸️ PAUSE'}</Text>`
  - Line 42: `<Text style={styles.statValue}>{regions} Domínios</Text>`

- **`mobile/App.tsx`** (Navigation labels):
  - Line 76: `tabBarLabel: 'Saber'`
  - Line 83: `tabBarLabel: isCivilizationUnocked ? 'O Mundo' : 'Tribo & Região'`
  - Line 95: `tabBarLabel: 'Governo'`
  - Line 108: `tabBarLabel: 'Diplomacia'`
  - Line 121: `tabBarLabel: 'Corte'`
  - Line 133: `tabBarLabel: 'Menu'`
  - Line 143: `tabBarLabel: 'Config'`

---

## 2. Logic Chain
1. **Goal**: The application needs to support English and Portuguese (PT-BR) locales, defaulting to PT-BR, with language switching at runtime.
2. **Current State**: 
   - The application has no translation framework configured (neither in `package.json` nor in the source code).
   - Text strings are hardcoded inline (some in English, some in Portuguese, some mixed).
3. **Approach**: A zero-dependency custom React Context and state-driven translation dictionary is chosen.
   - *Why zero-dependency?* Adding external packages like `react-i18next` adds complexity, package installation overhead, and config issues in Expo.
   - *Why React Context?* React Context seamlessly broadcasts language updates to all consumer components instantly, causing a re-render with the new translations.
   - *Why AsyncStorage?* Standard persistence tool in React Native to store the chosen locale across application relaunches.

---

## 3. Caveats
- **Simulation/Engine Text**: Some texts returned by the simulation (e.g. trait descriptions, event strings, dynamic country names, culture names) are generated either programmatically inside the core domain or via Google Gemini AI. These texts are out of scope for the UI localizer context but can be localized dynamically if the AI Prompt or generators adapt to the locale.
- **Dynamic Portrayals**: Dicebear avatar URLs are constructed using culture keys (`nordic`, `latin`, etc.) which should remain unchanged as code-level identifiers.

---

## 4. Conclusion
We conclude that R2 Internationalization can be achieved by:
1. Creating a custom translation provider `I18nProvider` that wraps the app and manages current language state and storage.
2. Building a statically-typed dictionary mapping PT-BR and EN.
3. Replacing inline text elements with `t('key')` values across `MainMenuScreen.tsx`, `AuthScreen.tsx`, `SettingsScreen.tsx`, `LoadGameModal.tsx`, `TopHUD.tsx`, `App.tsx`, and `SplashScreen.tsx`.
4. Adding an language toggler UI section in `SettingsScreen.tsx`.

A detailed plan is fully drafted in `analysis.md`.

---

## 5. Verification Method
To independently verify the implementation:
1. **Typescript Check**: Run `npx tsc --noEmit` in the `mobile/` directory to verify there are no compilation errors after extracting texts.
2. **Launch Application**: Run `npm run android`, `npm run ios`, or `npm run start` and navigate to the settings screen.
3. **Switch Language**: Verify toggling the language dynamically switches all hardcoded strings (e.g., "New Game" -> "Novo Jogo") without needing a full app restart.
4. **Persist Check**: Restart the app and verify the selected language is retained (by inspecting AsyncStorage or observing the initial screen language).
