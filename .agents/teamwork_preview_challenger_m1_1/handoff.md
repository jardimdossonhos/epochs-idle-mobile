# Dynamic i18n Translation System Verification Report

## 1. Observation

During empirical verification and stress-testing of the i18n translation systems in both the PC (`src/ui/i18n`) and Mobile (`mobile/src/ui/i18n`, `mobile/src/ui/context`) codebases, the following facts, file locations, line numbers, and tool outputs were directly observed:

### A. Test Suite Integration
- Created a new unit test suite `tests/i18n-dynamic.test.ts` to test dynamic locale switching, template interpolation, and fallback resolution.
- Executed the full test suite via `npm test` (vitest run):
```
 RUN  v3.2.4 C:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle

 ✓ tests/i18n-dynamic.test.ts (9 tests) 100ms
 ✓ tests/auth-signout-resets.test.ts (6 tests) 119ms
 ...
 Test Files  30 passed (30)
      Tests  102 passed (102)
   Start at  09:21:59
   Duration  5.41s
```
All 102 tests passed successfully.

### B. Mobile App Translation Fallback Defect
- In `mobile/src/ui/context/LanguageContext.tsx` (lines 56-73), the `t` function is defined as:
```typescript
  const t = (key: string, params?: Record<string, string | number>): string => {
    const dictionary = translations[locale] || translations['pt-BR'];
    
    // Resolve nested keys (e.g. 'mainMenu.title')
    const value = key.split('.').reduce<any>((obj, k) => obj?.[k], dictionary);
    
    if (typeof value !== 'string') {
      return key;
    }

    let text = value;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
    }
    return text;
  };
```
- When a key is missing in `'en-US'` but present in the default `'pt-BR'`, the `value` resolved from `translations['en-US']` is `undefined`. Because `typeof value !== 'string'` evaluates to `true`, the function immediately returns the key itself (e.g., `'testOnly.missingKey'`) instead of falling back to `'pt-BR'`.
- This behavior was verified empirically in the new unit test (`tests/i18n-dynamic.test.ts` lines 152-177) by dynamically mutating `translations` to simulate a missing key, confirming that `t` returns the raw key name rather than the default language value.

### C. PC Translation System Integration Gaps
- In `src/ui/i18n/index.ts`, `createTranslator` binds the `locale` statically at creation time:
```typescript
export function createTranslator(locale: Locale): Translator {
  return (key: TranslationKey) => translate(locale, key);
}
```
- If `setLocale(newLocale)` is called, the existing translator returned by `createTranslator` does not update dynamically; it remains locked to the initial locale.
- Crucially, a search of the entire PC source codebase (`src/` directory) revealed **zero usages** of the i18n translation functions or translators in `src/main.ts` or any UI controllers. All user-facing UI panels, menus, labels, and settings are hardcoded in Portuguese (e.g., `Nome do Monarca (Você)`, `Configurações e perfil local`). There is no language selector in the PC settings panel.

### D. Template String Interpolation
- In `mobile/src/ui/context/LanguageContext.tsx` (lines 66-72), parameters are replaced using regular expressions.
- Verification in `tests/i18n-dynamic.test.ts` (lines 146-150) shows that if a parameter placeholder is missing from the params object (e.g., `{ year: 10 }` for `'Ano {year} (Mês {month})'`), the placeholder `{month}` is left unresolved inside the returned string instead of throwing a runtime error or replacing it with an empty/blank value.

---

## 2. Logic Chain

1. **Premise 1**: A robust i18n translation system must fallback gracefully to a default language (e.g., Portuguese `'pt-BR'`) when a key is missing in the user's selected language (e.g., English `'en-US'`).
2. **Step 1 (Mobile Fallback Defect)**: From Observation B, the mobile app's `t` function only accesses the current `locale`'s dictionary. If a key is missing there, it does not attempt to query `translations['pt-BR']`. As proven by the unit test, it returns the key path name. This represents a defect in fallback resolution.
3. **Step 2 (PC Static Limitation)**: From Observation C, the PC `createTranslator` function binds the locale parameter inside the returned closure. Changing the locale requires recreating the translator function instance.
4. **Step 3 (PC Integration Gap)**: A search of `src/main.ts` and related files confirms that the PC i18n system is dead code. No UI elements use `translate` or `createTranslator`. The PC app remains completely monolingual (Portuguese).
5. **Step 4 (Interpolation Safety)**: From Observation D, template interpolation is safe from runtime exceptions when params are missing, but it exposes raw placeholder brackets (`{month}`) directly to the user.

---

## 3. Caveats

- **Test Environment Context**: Testing was performed using simulated hook/state loops mimicking the React context lifecycle rather than launching React Native components in an emulator or loading an Electron process.
- **Key Alignment**: Currently, the dictionary files (`translations.ts`) have 100% key parity between `pt-BR` and `en-US` via a separate dictionary integrity test (`tests/i18n.test.ts`), so the mobile fallback defect does not present user-visible bugs in the current release. It represents a regression vulnerability if future updates introduce misaligned keys.

---

## 4. Conclusion

The dynamic i18n translation verification has revealed:
1. **Mobile Fallback Defect**: The mobile translator returns the key name rather than falling back to the default language (`pt-BR`) when keys are missing in the selected language.
2. **PC Monolingual Hardcoding**: The PC translation system is fully implemented in `src/ui/i18n` but is completely omitted from the main application thread (`src/main.ts`), leaving the PC version hardcoded to Portuguese.
3. **Static PC Translator**: PC translators created via `createTranslator` are static closures that do not dynamically react to locale updates without being reconstructed.

---

## 5. Verification Method

To verify these results independently:
1. Run the entire unit test suite containing the new tests:
   ```bash
   npm test
   ```
2. Inspect the test suite file:
   `tests/i18n-dynamic.test.ts`
3. Inspect the mobile translator implementation:
   `mobile/src/ui/context/LanguageContext.tsx`
4. Inspect the PC translator factory:
   `src/ui/i18n/index.ts`
