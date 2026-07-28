import type { Locale, TranslationKey } from "./types";

type Dictionary = Record<TranslationKey, string>;

export const DEFAULT_LOCALE: Locale = "pt-BR";

const MESSAGES: Record<Locale, Dictionary> = {
  "pt-BR": {
    "app.title": "Epochs Idle PC",
    "app.subtitle": "Simulação local-first com mapa estratégico e saves persistentes.",
    "hud.tick": "Ciclo",
    "hud.date": "Atualizado",
    "hud.status": "Estado",
    "hud.statusRunning": "Executando",
    "hud.statusPaused": "Pausado",
    "hud.speed": "Velocidade",
    "hud.pause": "Pausar",
    "hud.resume": "Retomar",
    "hud.saveManual": "Salvar manual",
    "hud.saveSafety": "Save de segurança",
    "hud.reloadSaves": "Atualizar saves",
    "hud.map": "Mapa Estratégico",
    "hud.regionInfo": "Região selecionada",
    "hud.noRegionSelected": "Selecione uma região no mapa.",
    "hud.owner": "Dono",
    "hud.unrest": "Instabilidade",
    "hud.autonomy": "Autonomia",
    "hud.assimilation": "Assimilação",
    "hud.resources": "Recursos do Reino",
    "hud.kingdom": "Resumo do Reino",
    "hud.saveSlots": "Slots de Save",
    "hud.load": "Carregar",
    "hud.events": "Registro de Eventos",
    "hud.noEvents": "Sem eventos recentes.",
    "hud.victory": "Vitória",
    "hud.victoryNone": "Ainda não alcançada",
    "hud.postVictory": "Modo pós-vitória",
    "toast.manualSaved": "Save manual concluído.",
    "toast.safetySaved": "Save de segurança concluído.",
    "toast.savesReloaded": "Lista de saves atualizada.",
    "toast.saveFailed": "Falha ao salvar.",
    "toast.loadFailed": "Falha ao carregar save.",
    "toast.recoveredSave": "Save restaurado com sucesso."
  },
  "en-US": {
    "app.title": "Epochs Idle PC",
    "app.subtitle": "Local-first simulation with strategic map and persistent saves.",
    "hud.tick": "Tick",
    "hud.date": "Updated",
    "hud.status": "Status",
    "hud.statusRunning": "Running",
    "hud.statusPaused": "Paused",
    "hud.speed": "Speed",
    "hud.pause": "Pause",
    "hud.resume": "Resume",
    "hud.saveManual": "Manual save",
    "hud.saveSafety": "Safety save",
    "hud.reloadSaves": "Refresh saves",
    "hud.map": "Strategic Map",
    "hud.regionInfo": "Selected region",
    "hud.noRegionSelected": "Select a region on the map.",
    "hud.owner": "Owner",
    "hud.unrest": "Unrest",
    "hud.autonomy": "Autonomy",
    "hud.assimilation": "Assimilation",
    "hud.resources": "Kingdom Resources",
    "hud.kingdom": "Kingdom Summary",
    "hud.saveSlots": "Save Slots",
    "hud.load": "Load",
    "hud.events": "Event Log",
    "hud.noEvents": "No recent events.",
    "hud.victory": "Victory",
    "hud.victoryNone": "Not achieved yet",
    "hud.postVictory": "Post-victory mode",
    "toast.manualSaved": "Manual save completed.",
    "toast.safetySaved": "Safety save completed.",
    "toast.savesReloaded": "Save list refreshed.",
    "toast.saveFailed": "Failed to save.",
    "toast.loadFailed": "Failed to load save.",
    "toast.recoveredSave": "Save restored successfully."
  }
};

function normalizeLocale(locale: string | undefined | null): Locale {
  const value = locale?.trim().toLowerCase() ?? "";

  if (value.startsWith("pt")) {
    return "pt-BR";
  }

  if (value.startsWith("en")) {
    return "en-US";
  }

  return DEFAULT_LOCALE;
}

export function resolveLocale(preferredLocale?: string): Locale {
  if (preferredLocale) {
    return normalizeLocale(preferredLocale);
  }

  if (typeof navigator !== "undefined") {
    return normalizeLocale(navigator.language);
  }

  return DEFAULT_LOCALE;
}

export function translate(locale: Locale, key: TranslationKey): string {
  return MESSAGES[locale][key] ?? MESSAGES[DEFAULT_LOCALE][key];
}
