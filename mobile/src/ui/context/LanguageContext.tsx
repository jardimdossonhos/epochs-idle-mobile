import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Locale, translations } from '../i18n/translations';

const LOCALE_STORAGE_KEY = 'epochs_user_locale';

interface LanguageContextData {
  locale: Locale;
  changeLocale: (newLocale: Locale) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextData>({
  locale: 'pt-BR',
  changeLocale: async () => {},
  t: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('pt-BR');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const loadLocale = async () => {
      try {
        const saved = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
        if (saved && (saved === 'pt-BR' || saved === 'en-US') && isMounted) {
          setLocale(saved as Locale);
        }
      } catch (e) {
        console.error('[LanguageContext] Failed to load locale from storage', e);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    loadLocale();
    return () => {
      isMounted = false;
    };
  }, []);

  const changeLocale = async (newLocale: Locale) => {
    setLocale(newLocale);
    try {
      await AsyncStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    } catch (e) {
      console.error('[LanguageContext] Failed to save locale to storage', e);
    }
  };

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

  // Wait for loading to avoid screen flash or wrong initial language rendering
  if (isLoading) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ locale, changeLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
