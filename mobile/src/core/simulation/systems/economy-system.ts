import { ResourceType, TreatyType } from "../../models/enums";
import { createEmptyStock } from "../../models/economy";
import type { SimulationSystem } from "../tick-pipeline";
import { clamp, createEventId, ensureResourceNonNegative, getOwnedRegionIds, roundTo } from "./utils";

export function createEconomySystem(): SimulationSystem {
  return {
    id: "economy",
    run(context): void {
      const state = context.nextState;
      const definitions = context.staticData.definitions;
      let eventSeq = 0;

      for (const kingdomId of Object.keys(state.kingdoms).sort()) {
        if (kingdomId === "k_nature") continue;
        const kingdom = state.kingdoms[kingdomId];
        const ownedRegionIds = getOwnedRegionIds(state, kingdom.id);

        const regionEconomy = ownedRegionIds.reduce(
          (acc, regionId) => {
            const definition = definitions[regionId];
            const region = state.world.regions[regionId];

            if (!definition || !region) {
              return acc;
            }

            const productivity = clamp(
              1 - region.unrest * 0.48 - region.devastation * 0.62 - region.autonomy * 0.2 + region.assimilation * 0.16,
              0.28,
              1.35
            );

            return {
              economy: acc.economy + definition.economyValue * productivity,
              military: acc.military + definition.militaryValue * productivity,
              food: acc.food + definition.economyValue * (1.12 - region.devastation * 0.5)
            };
          },
          { economy: 0, military: 0, food: 0 }
        );

        const populationFactor = kingdom.population.total / 100_000;
        const soldierShare = kingdom.population.groups.soldiers;
        const merchantShare = kingdom.population.groups.merchants;
        const armyManpower = kingdom.military.armies.reduce((sum, army) => sum + army.manpower, 0);

        const taxLoad = clamp(
          kingdom.economy.taxPolicy.baseRate +
            kingdom.economy.taxPolicy.tariffRate * 0.45 -
            kingdom.economy.taxPolicy.nobleRelief * 0.22 -
            kingdom.economy.taxPolicy.clergyExemption * 0.18,
          0.06,
          0.58
        );

        const budget = kingdom.economy.budgetPriority;
        const militaryBudgetFactor = budget.military / 100;
        const economyBudgetFactor = budget.economy / 100;
        const administrationBudgetFactor = budget.administration / 100;

        const taxIncomeFactor = 0.72 + taxLoad * 1.05;

        const goldIncome = roundTo(
          (regionEconomy.economy * (0.78 + merchantShare * 0.62) + populationFactor * 0.24) * taxIncomeFactor
        );
        const foodIncome = roundTo(regionEconomy.food * (0.92 + economyBudgetFactor * 0.24) + kingdom.population.groups.peasants * 3.2);
        const woodIncome = roundTo(regionEconomy.economy * (0.4 + economyBudgetFactor * 0.15));
        const ironIncome = roundTo(regionEconomy.military * (0.26 + militaryBudgetFactor * 0.22));
        const faithIncome = roundTo(ownedRegionIds.length * 0.12 * (1 + kingdom.religion.authority));
        const legitimacyIncome = roundTo(0.06 + kingdom.stability / 560 + kingdom.legitimacy / 1_200);

        const adminPenalty = clamp(kingdom.administration.usedCapacity / Math.max(1, kingdom.administration.adminCapacity), 0.4, 1.9);
        
        let councilSalaryTotal = 0;
        if (kingdom.administration.council) {
          for (const minister of Object.values(kingdom.administration.council)) {
            if (minister && minister.salary) councilSalaryTotal += minister.salary;
          }
        }

        const goldUpkeep = roundTo(
          armyManpower / 8_300 +
            kingdom.administration.usedCapacity * 0.042 +
            kingdom.economy.corruption * 1.8 +
            adminPenalty * (0.12 - administrationBudgetFactor * 0.04) +
            councilSalaryTotal
        );
        const foodUpkeep = roundTo(kingdom.population.total / 95_000 + armyManpower / 5_500);
        const woodUpkeep = roundTo(armyManpower / 30_000);
        const ironUpkeep = roundTo((armyManpower / 22_000) * (0.8 + soldierShare));
        const faithUpkeep = roundTo(0.04 + (1 - kingdom.religion.tolerance) * 0.2);
        const legitimacyUpkeep = roundTo((100 - kingdom.stability) / 900 + Math.max(0, taxLoad - 0.34) * 0.07);

        kingdom.economy.incomePerTick = createEmptyStock();
        kingdom.economy.upkeepPerTick = createEmptyStock();

        kingdom.economy.incomePerTick[ResourceType.Gold] = goldIncome;
        kingdom.economy.incomePerTick[ResourceType.Food] = foodIncome;
        kingdom.economy.incomePerTick[ResourceType.Wood] = woodIncome;
        kingdom.economy.incomePerTick[ResourceType.Iron] = ironIncome;
        kingdom.economy.incomePerTick[ResourceType.Faith] = faithIncome;
        kingdom.economy.incomePerTick[ResourceType.Legitimacy] = legitimacyIncome;

        kingdom.economy.upkeepPerTick[ResourceType.Gold] = goldUpkeep;
        kingdom.economy.upkeepPerTick[ResourceType.Food] = foodUpkeep;
        kingdom.economy.upkeepPerTick[ResourceType.Wood] = woodUpkeep;
        kingdom.economy.upkeepPerTick[ResourceType.Iron] = ironUpkeep;
        kingdom.economy.upkeepPerTick[ResourceType.Faith] = faithUpkeep;
        kingdom.economy.upkeepPerTick[ResourceType.Legitimacy] = legitimacyUpkeep;

        for (const resource of Object.values(ResourceType)) {
          kingdom.economy.stock[resource] = roundTo(
            kingdom.economy.stock[resource] + kingdom.economy.incomePerTick[resource] - kingdom.economy.upkeepPerTick[resource]
          );
        }

        ensureResourceNonNegative(kingdom);

        kingdom.population.pressure.taxation = roundTo(clamp(taxLoad, 0, 1));
        kingdom.stability = roundTo(
          clamp(kingdom.stability - Math.max(0, taxLoad - 0.32) * 0.26 + economyBudgetFactor * 0.08 - kingdom.economy.corruption * 0.05, 0, 100)
        );

        if (kingdom.economy.stock[ResourceType.Food] < kingdom.population.total / 8_000 && context.nextState.meta.tick % 5 === 0) {
          context.events.push({
            id: createEventId({
              prefix: "evt_food",
              tick: context.nextState.meta.tick,
              systemId: "economy",
              actorId: kingdom.id,
              sequence: eventSeq++
            }),
            type: "economy.food_shortage",
            actorKingdomId: kingdom.id,
            payload: {
              stock: kingdom.economy.stock[ResourceType.Food],
              required: roundTo(kingdom.population.total / 8_000)
            },
            occurredAt: context.now
          });
        }
      }

      // Processamento de Tributos Contínuos (Vassalagem)
      for (const kingdomId of Object.keys(state.kingdoms)) {
        const kingdom = state.kingdoms[kingdomId];
        for (const treaty of kingdom.diplomacy.treaties) {
          if (treaty.type === TreatyType.Vassalage && treaty.terms.vassalId === kingdom.id) {
             const overlord = state.kingdoms[treaty.terms.overlordId as string];
             if (overlord) {
                 const tribute = roundTo(kingdom.economy.incomePerTick[ResourceType.Gold] * (treaty.terms.tributeRate as number || 0.15));
                 kingdom.economy.incomePerTick[ResourceType.Gold] -= tribute;
                 kingdom.economy.stock[ResourceType.Gold] = Math.max(0, kingdom.economy.stock[ResourceType.Gold] - tribute);
                 overlord.economy.incomePerTick[ResourceType.Gold] += tribute;
                 overlord.economy.stock[ResourceType.Gold] += tribute;
             }
          }
        }
      }
    }
  };
}
