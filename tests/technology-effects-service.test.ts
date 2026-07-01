import { describe, expect, it, vi } from "vitest";
import { calculateTechnologyBonuses, getTechnologyBonus } from "../src/core/models/technology-effects-service";
import { TechnologyDomain } from "../src/core/models/enums";
import type { TechnologyState } from "../src/core/models/technology";

vi.mock("../src/core/data/technology-tree", () => {
  return {
    getTechnologyNode: (id: string) => {
      if (id === "agri_basics") {
        return {
          id,
          effects: [
            { target: "economy.food_production_multiplier", value: 0.1 },
            { target: "population.growth_rate_multiplier", value: 0.05 }
          ]
        };
      }
      if (id === "crop_rotation") {
        return {
          id,
          effects: [
            { target: "economy.food_production_multiplier", value: 0.15 },
            { target: "economy.tax_income_multiplier", value: 0.05 }
          ]
        };
      }
      if (id === "trade_charters") {
        return {
          id,
          effects: [
            { target: "economy.trade_income_multiplier", value: 0.15 },
            { target: "stability_additive", value: 5 }
          ]
        };
      }
      if (id === "provincial_courts") {
        return {
          id,
          effects: [
            { target: "stability_additive", value: 10 },
            { target: "administration.capacity_additive", value: 10 }
          ]
        };
      }
      return undefined;
    }
  };
});

describe("Technology Effects Service", () => {
  describe("calculateTechnologyBonuses", () => {
    it("returns an empty map for a kingdom with no technologies", () => {
      const state: TechnologyState = {
        unlocked: [],
        activeResearchId: null,
        researchFocus: TechnologyDomain.Economy,
        researchGoalId: null,
        accumulatedResearch: 0
      };

      const bonuses = calculateTechnologyBonuses(state);
      expect(bonuses.size).toBe(0);
    });

    it("returns the correct bonus for a single unlocked technology", () => {
      const state: TechnologyState = {
        unlocked: ["agri_basics"],
        activeResearchId: null,
        researchFocus: TechnologyDomain.Economy,
        researchGoalId: null,
        accumulatedResearch: 0
      };

      const bonuses = calculateTechnologyBonuses(state);

      expect(bonuses.size).toBe(2);
      expect(bonuses.get("economy.food_production_multiplier")).toBeCloseTo(0.1);
      expect(bonuses.get("population.growth_rate_multiplier")).toBeCloseTo(0.05);
    });

    it("correctly sums bonuses from multiple technologies", () => {
      const state: TechnologyState = {
        unlocked: ["agri_basics", "crop_rotation"],
        activeResearchId: null,
        researchFocus: TechnologyDomain.Economy,
        researchGoalId: null,
        accumulatedResearch: 0
      };

      const bonuses = calculateTechnologyBonuses(state);

      expect(bonuses.size).toBe(3);
      expect(bonuses.get("economy.food_production_multiplier")).toBeCloseTo(0.25);
      expect(bonuses.get("population.growth_rate_multiplier")).toBeCloseTo(0.05);
      expect(bonuses.get("economy.tax_income_multiplier")).toBeCloseTo(0.05);
    });

    it("handles additive and multiplier effects correctly", () => {
      const state: TechnologyState = {
        unlocked: ["trade_charters", "provincial_courts"],
        activeResearchId: null,
        researchFocus: TechnologyDomain.Economy,
        researchGoalId: null,
        accumulatedResearch: 0
      };

      const bonuses = calculateTechnologyBonuses(state);

      expect(bonuses.size).toBe(3);
      expect(bonuses.get("economy.trade_income_multiplier")).toBeCloseTo(0.15);
      expect(bonuses.get("stability_additive")).toBeCloseTo(15);
      expect(bonuses.get("administration.capacity_additive")).toBeCloseTo(10);
    });

    it("returns an empty map when technology ids are invalid", () => {
      const state: TechnologyState = {
        unlocked: ["invalid_tech_id", "another_one"],
        activeResearchId: null,
        researchFocus: TechnologyDomain.Economy,
        researchGoalId: null,
        accumulatedResearch: 0
      };

      const bonuses = calculateTechnologyBonuses(state);
      expect(bonuses.size).toBe(0);
    });
  });

  describe("getTechnologyBonus", () => {
    it("returns the correct value for an existing key", () => {
      const bonuses = new Map<string, number>([
        ["economy.food_production_multiplier", 0.25],
        ["stability_additive", 15]
      ]);

      const value = getTechnologyBonus(bonuses, "stability_additive");
      expect(value).toBe(15);
    });

    it("returns the default value for a non-existing key", () => {
      const bonuses = new Map<string, number>([["economy.food_production_multiplier", 0.25]]);

      const value = getTechnologyBonus(bonuses, "military.manpower_recovery_multiplier");
      expect(value).toBe(0);
    });

    it("returns a custom default value for a non-existing key", () => {
      const bonuses = new Map<string, number>();
      const value = getTechnologyBonus(bonuses, "some_key", 1);
      expect(value).toBe(1);
    });
  });
});
