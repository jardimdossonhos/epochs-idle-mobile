import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// --- MOCK LOCALSTORAGE FOR PC I18N SYSTEM ---
const mockLocalStorageStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: vi.fn((key: string) => mockLocalStorageStore[key] || null),
  setItem: vi.fn((key: string, value: string) => { mockLocalStorageStore[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockLocalStorageStore[key]; }),
  clear: vi.fn(() => { for (const k in mockLocalStorageStore) delete mockLocalStorageStore[k]; }),
  length: 0,
  key: vi.fn(),
};

if (typeof global.localStorage === 'undefined') {
  global.localStorage = mockLocalStorage as any;
} else {
  vi.spyOn(global.localStorage, 'getItem').mockImplementation(mockLocalStorage.getItem);
  vi.spyOn(global.localStorage, 'setItem').mockImplementation(mockLocalStorage.setItem);
}

// --- REACT HOOKS SIMULATION FOR MOBILE LANGUAGE PROVIDER ---
let stateIndex = 0;
let states: any[] = [];
let stateSetters: any[] = [];
let registeredEffects: Array<{ effect: () => any; deps?: any[] }> = [];
let effectCleanups: Array<() => void> = [];

// Trigger re-render of our simulated hook environment
function renderLanguageProvider() {
  stateIndex = 0;
  const element = LanguageProvider({ children: null }) as any;
  if (!element) return null;
  return element.props.value;
}

// React Mock Setup
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: (initialValue: any) => {
      const currentIndex = stateIndex++;
      if (states[currentIndex] === undefined) {
        states[currentIndex] = typeof initialValue === 'function' ? initialValue() : initialValue;
        stateSetters[currentIndex] = (newValue: any) => {
          if (typeof newValue === 'function') {
            states[currentIndex] = newValue(states[currentIndex]);
          } else {
            states[currentIndex] = newValue;
          }
          renderLanguageProvider();
        };
      }
      return [states[currentIndex], stateSetters[currentIndex]];
    },
    useEffect: (effect: () => any, deps?: any[]) => {
      registeredEffects.push({ effect, deps });
    },
  };
});

// Import PC i18n modules
import { getLocale, setLocale, createTranslator } from '../src/ui/i18n/index';
import { translate } from '../src/ui/i18n/messages';

// Import Mobile i18n modules after mocking react
import { LanguageProvider } from '../mobile/src/ui/context/LanguageContext';
import { translations } from '../mobile/src/ui/i18n/translations';
import AsyncStorageMock from './mocks/async-storage-mock';

// Helper to flush asynchronous microtasks
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 10));

describe('Dynamic Translation & i18n System Tests', () => {

  describe('PC Translation System (Static & Fallback)', () => {
    beforeEach(() => {
      mockLocalStorage.clear();
      vi.clearAllMocks();
    });

    it('should initialize locale based on localStorage or default', () => {
      expect(getLocale()).toBe('pt-BR'); // default since localStorage is empty

      setLocale('en-US');
      expect(getLocale()).toBe('en-US');
    });

    it('should translate keys correctly for specified locale', () => {
      const tPt = createTranslator('pt-BR');
      expect(tPt('hud.tick')).toBe('Ciclo');

      const tEn = createTranslator('en-US');
      expect(tEn('hud.tick')).toBe('Tick');
    });

    it('should fall back to undefined for totally nonexistent keys', () => {
      const result = translate('en-US', 'nonexistent.key' as any);
      expect(result).toBeUndefined();
    });
  });

  describe('Mobile Translation System (React Context & Dynamic Hook)', () => {
    beforeEach(() => {
      AsyncStorageMock._setStore({});
      states = [];
      stateSetters = [];
      registeredEffects = [];
      effectCleanups = [];
      stateIndex = 0;
      vi.clearAllMocks();
    });

    afterEach(() => {
      for (const cleanup of effectCleanups) {
        if (cleanup) cleanup();
      }
    });

    async function mountLanguageProvider() {
      renderLanguageProvider();
      
      // Execute all registered effects (simulates React mount)
      const activeEffects = [...registeredEffects];
      registeredEffects = [];
      for (const { effect } of activeEffects) {
        const cleanup = effect();
        if (typeof cleanup === 'function') {
          effectCleanups.push(cleanup);
        }
      }
      
      // Wait for the async loadLocale to run and complete
      await flushPromises();
      
      // Re-evaluate context values after initial load completes
      return renderLanguageProvider();
    }

    it('should load default locale pt-BR and fetch translations', async () => {
      const context = await mountLanguageProvider();
      expect(context).not.toBeNull();
      expect(context.locale).toBe('pt-BR');
      expect(context.t('mainMenu.newGame')).toBe('Novo Jogo');
    });

    it('should load saved locale from AsyncStorage on mount', async () => {
      AsyncStorageMock._setStore({ epochs_user_locale: 'en-US' });
      const context = await mountLanguageProvider();
      expect(context).not.toBeNull();
      expect(context.locale).toBe('en-US');
      expect(context.t('mainMenu.newGame')).toBe('New Game');
    });

    it('should switch locale dynamically and persist choice in AsyncStorage', async () => {
      let context = await mountLanguageProvider();
      expect(context.locale).toBe('pt-BR');
      expect(context.t('mainMenu.newGame')).toBe('Novo Jogo');

      // Change locale dynamically
      await context.changeLocale('en-US');
      
      // Retrieve updated context
      context = renderLanguageProvider();
      expect(context.locale).toBe('en-US');
      expect(context.t('mainMenu.newGame')).toBe('New Game');

      // Verify it persists
      const saved = await AsyncStorageMock.getItem('epochs_user_locale');
      expect(saved).toBe('en-US');
    });

    it('should perform correct template string interpolation', async () => {
      const context = await mountLanguageProvider();
      
      // pt-BR: 'Ano {year} (Mês {month})'
      const ptResult = context.t('topHud.eraText', { year: 12, month: 5 });
      expect(ptResult).toBe('Ano 12 (Mês 5)');

      // en-US: 'Year {year} (Month {month})'
      await context.changeLocale('en-US');
      const updatedContext = renderLanguageProvider();
      const enResult = updatedContext.t('topHud.eraText', { year: 45, month: 11 });
      expect(enResult).toBe('Year 45 (Month 11)');
    });

    it('should handle missing template parameters by keeping placeholders intact', async () => {
      const context = await mountLanguageProvider();
      const result = context.t('topHud.eraText', { year: 10 });
      expect(result).toBe('Ano 10 (Mês {month})');
    });

    it('shows that missing keys do NOT fall back to default language pt-BR in mobile app (documented limitation)', async () => {
      const context = await mountLanguageProvider();
      
      // Mutate translations to inject a test key
      translations['pt-BR'].testOnly = { missingInEn: 'Valor em PT' };
      // Make sure it is undefined in en-US
      if (translations['en-US'].testOnly) {
        delete translations['en-US'].testOnly.missingInEn;
      }

      // In pt-BR locale, it returns the value
      expect(context.t('testOnly.missingInEn')).toBe('Valor em PT');

      // Change to en-US locale
      await context.changeLocale('en-US');
      const updatedContext = renderLanguageProvider();

      // In en-US locale, it fails to fall back to pt-BR and instead returns the key name!
      expect(updatedContext.t('testOnly.missingInEn')).toBe('testOnly.missingInEn');

      // Clean up mutated translations
      delete translations['pt-BR'].testOnly;
      if (translations['en-US'].testOnly) {
        delete translations['en-US'].testOnly;
      }
    });
  });
});
