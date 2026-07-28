import { DEFAULT_LOCALE, resolveLocale, translate } from "./messages";
import type { Locale, TranslationKey, Translator } from "./types";

const LOCALE_STORAGE_KEY = "mik.locale";

export function getLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return resolveLocale(stored ?? undefined);
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function setLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore storage restrictions in private contexts.
  }
}

export function createTranslator(locale: Locale): Translator {
  return (key: TranslationKey) => translate(locale, key);
}
