import type { AdministrationState, AdministrationModifierCache } from "../../models/administration";
import { getCharacterIdentity } from "./character-interpreter";

export const DEFAULT_ADMIN_MODIFIERS: AdministrationModifierCache = {
  taxMultiplier: 1.0,
  unrestReduction: 0,
  militaryUpkeepMultiplier: 1.0,
  legitimacyFlat: 0
};

export function recalculateAdminModifiers(administration: AdministrationState): void {
  const cache: AdministrationModifierCache = { ...DEFAULT_ADMIN_MODIFIERS };

  if (administration.council) {
    for (const minister of Object.values(administration.council)) {
      if (!minister) continue;
      
      const identity = getCharacterIdentity(minister.id, minister.cultureId);
      
      for (const trait of identity.traits) {
        if (trait.effect.type === "goldIncome_mult") {
          cache.taxMultiplier += trait.effect.value;
        } else if (trait.effect.type === "unrest_flat") {
          cache.unrestReduction += trait.effect.value;
        } else if (trait.effect.type === "militaryUpkeep_mult") {
          cache.militaryUpkeepMultiplier += trait.effect.value;
        } else if (trait.effect.type === "legitimacy_flat") {
          cache.legitimacyFlat += trait.effect.value;
        }
      }
    }
  }

  administration.modifierCache = cache;
}
