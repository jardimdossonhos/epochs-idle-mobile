# Handoff Report: R2 Settings & Language Storage Analysis

## 1. Observation
We observed the following files and code blocks:

*   **Preference Storage mechanism**:
    *   File: `mobile/src/application/ai/gemini-service.ts`
        *   Lines 4-5 define storage keys:
            ```typescript
            const GEMINI_API_KEY_STORAGE = 'epochs_gemini_api_key';
            const GEMINI_AI_ENABLED_STORAGE = 'epochs_gemini_ai_enabled';
            ```
        *   Lines 59-82 implement storage operations using `@react-native-async-storage/async-storage`:
            ```typescript
            async getApiKey(): Promise<string | null> {
              try {
                return await AsyncStorage.getItem(GEMINI_API_KEY_STORAGE);
              } catch {
                return null;
              }
            }
            // Similar wrappers exist for setApiKey, isAiEnabled, setAiEnabled
            ```
*   **Loading Settings in UI**:
    *   File: `mobile/src/ui/screens/SettingsScreen.tsx`
        *   Lines 36-53 use `useFocusEffect` to reload settings when the view is focused:
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
*   **Hardcoded Portuguese UI Labels**:
    *   File: `mobile/App.tsx`
        *   Lines 76, 83, 95, 108, 121, 133, 143 define bottom tab bar labels using hardcoded Portuguese strings (e.g. `tabBarLabel: 'Governo'`).
*   **Hardcoded PT-BR Prompts & Fallbacks**:
    *   File: `mobile/src/application/ai/gemini-service.ts`
        *   Lines 11-39 define fallback arrays `DIPLOMATIC_FALLBACKS`, `EVENT_NARRATIVE_FALLBACKS`, and `RULER_THOUGHT_FALLBACKS` entirely in Portuguese.
        *   Lines 167-170, 191-194, and 212-215 specify prompt instructions in Portuguese (e.g. `"Gere UMA mensagem diplomática curta... em português do Brasil"`).

---

## 2. Logic Chain
1. **Goal**: Reactively translate the UI across all screens (including navigation tabs) when language changes, supporting both PT-BR and EN-US, and save this preference.
2. **Current Preference Saving**: `SettingsScreen` uses `geminiService` methods which load/save values from `AsyncStorage`. Therefore, language preferences should be persisted in `AsyncStorage` using a new key (e.g., `epochs_user_locale`).
3. **Reactive Re-rendering**: Since React components require state updates to trigger re-renders, hardcoded strings in screens and the tab navigator will not update if we just query `AsyncStorage` imperatively on each load.
4. **Context Solution**: Creating a `LanguageContext` containing a `locale` state, translation function `t`, and update function `changeLocale` solves this. When `changeLocale` is called, the context state updates, forcing all consumer components (tabs, menus, settings, etc.) to re-render.
5. **AI Adaptation**: Since generative text also needs to adapt to the language, `GeminiService` needs to dynamically read the saved locale from `AsyncStorage` when generating prompts and choosing offline fallbacks.

---

## 3. Caveats
- **Translating Core Game State Data**: The game state engine (e.g. item names, technology definitions, world history definitions) might contain static text definitions generated in `WORLD_DEFINITIONS_V1`. Localizing the underlying game simulation rules or static assets was not investigated as it falls outside the scope of settings UI/language preference storage, but the UI wrappers should translate display text.
- **System Locale Detection**: We assumed a default fallback to `'pt-BR'`. In production, using libraries like `expo-localization` to detect the device's system language as initial state could be considered.

---

## 4. Conclusion
We have verified that settings are currently saved and loaded via `AsyncStorage` calls. To introduce localization, we proposed:
1. A new `LanguageContext` + `LanguageProvider` wrapper at the root of `App.tsx`.
2. A language selector section at the top of `SettingsScreen.tsx` using native layout and styled buttons.
3. Hook-based updates to bottom tabs (`App.tsx`) and general screens using the `useLanguage()` hook.
4. Adapting `GeminiService` prompts and offline fallbacks dynamically based on the current locale key in `AsyncStorage`.

This design is fully robust, modular, and does not require third-party i18n libraries, keeping the bundle size optimal and matching the lightweight nature of the mobile codebase.

---

## 5. Verification Method
To verify the implementation once coded:
1. **AsyncStorage Check**: Call `changeLocale` from the Settings Screen and verify the value is persisted across application restarts.
2. **UI Reactivity Check**: Select 'EN-US' and ensure the bottom tabs (e.g., 'Saber', 'Governo', 'Menu') and Settings screen elements change language immediately without screen reload or app restart.
3. **AI Generation Check**: Toggle AI mode on and mock a Gemini API response, verifying the prompt instructions passed to the API specify 'English' when 'EN-US' is selected.
4. **Offline Fallback Check**: With internet disabled, trigger a diplomatic event or ruler thought, and verify the selected random fallback matches the chosen language.
