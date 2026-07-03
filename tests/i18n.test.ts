import { describe, it, expect } from 'vitest';
import { translations } from '../mobile/src/ui/i18n/translations';

describe('i18n Dictionary Integrity & Rendering Tests', () => {
  it('should have exact key alignment between pt-BR and en-US', () => {
    const ptLanguages = Object.keys(translations['pt-BR']);
    const enLanguages = Object.keys(translations['en-US']);
    expect(ptLanguages.sort()).toEqual(enLanguages.sort());

    for (const mainKey of ptLanguages) {
      const ptSubObj = translations['pt-BR'][mainKey];
      const enSubObj = translations['en-US'][mainKey];

      if (typeof ptSubObj === 'object' && ptSubObj !== null) {
        expect(typeof enSubObj).toBe('object');
        const ptSubKeys = Object.keys(ptSubObj);
        const enSubKeys = Object.keys(enSubObj);
        expect(ptSubKeys.sort()).toEqual(enSubKeys.sort());
      }
    }
  });

  it('should resolve translations and replace placeholders', () => {
    // Simple helper replicating context's t function for validation
    const tMock = (locale: 'pt-BR' | 'en-US', key: string, params?: Record<string, string | number>): string => {
      const dictionary = translations[locale];
      const value = key.split('.').reduce<any>((obj, k) => obj?.[k], dictionary);
      if (typeof value !== 'string') return key;

      let text = value;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(new RegExp(`{${k}}`, 'g'), String(v));
        });
      }
      return text;
    };

    // Test pt-BR translation and interpolation
    expect(tMock('pt-BR', 'mainMenu.title')).toBe('EPOCHS IDLE');
    expect(tMock('pt-BR', 'topHud.eraText', { year: 5, month: 10 })).toBe('Ano 5 (Mês 10)');

    // Test en-US translation and interpolation
    expect(tMock('en-US', 'mainMenu.title')).toBe('EPOCHS IDLE');
    expect(tMock('en-US', 'topHud.eraText', { year: 5, month: 10 })).toBe('Year 5 (Month 10)');

    // Unresolved key fallback
    expect(tMock('pt-BR', 'nonexistent.key')).toBe('nonexistent.key');
  });
});
