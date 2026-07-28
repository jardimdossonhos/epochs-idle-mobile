import { describe, expect, it } from "vitest";
import { interpolateColor, applyFogOfWar, calculateVisibility } from "../mobile/src/ui/components/map/map-helpers";



describe("Map Overhaul Features", () => {
  describe("Color Interpolation", () => {
    it("returns start color when factor is 0", () => {
      expect(interpolateColor("#000000", "#ffffff", 0)).toBe("#000000");
    });

    it("returns end color when factor is 1", () => {
      expect(interpolateColor("#000000", "#ffffff", 1)).toBe("#ffffff");
    });

    it("correctly interpolates mid point color", () => {
      expect(interpolateColor("#000000", "#ffffff", 0.5)).toBe("#808080");
    });
  });

  describe("Fog of War Shading", () => {
    it("returns a valid darkened and desaturated color starting with #", () => {
      const red = "#ff0000";
      const foggedRed = applyFogOfWar(red);
      
      expect(foggedRed).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(foggedRed).not.toBe(red);
    });

    it("consistently desaturates different colors", () => {
      const greenFogged = applyFogOfWar("#00ff00");
      const blueFogged = applyFogOfWar("#0000ff");
      
      expect(greenFogged).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(blueFogged).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  describe("Fog of War Visibility Algorithm", () => {
    it("correctly flags regions as visible or hidden", () => {
      const playerKingdomId = "k_player";
      const playerRelations = {
        "k_ally": { status: "allied" },
        "k_enemy": { status: "hostile" },
      };

      const definitions = {
        "A": { neighbors: ["B"] },
        "B": { neighbors: ["A", "C"] },
        "C": { neighbors: ["B", "D"] },
        "D": { neighbors: ["C"] },
        "E": { neighbors: ["F"] },
        "F": { neighbors: ["E"] },
      };

      const regions = {
        "A": { ownerId: "k_player" }, // Player owned
        "B": { ownerId: "unclaimed" },
        "C": { ownerId: "k_enemy" },   // Hostile
        "D": { ownerId: "k_enemy" },   // Hostile
        "E": { ownerId: "k_ally" },    // Allied
        "F": { ownerId: "unclaimed" },
      };

      const visibility = calculateVisibility(definitions, regions, playerKingdomId, playerRelations);

      // A (player) -> visible
      expect(visibility.has("A")).toBe(true);
      // E (ally) -> visible
      expect(visibility.has("E")).toBe(true);
      // B (adjacent to A) -> visible
      expect(visibility.has("B")).toBe(true);
      // F (adjacent to E) -> visible
      expect(visibility.has("F")).toBe(true);
      
      // C (adjacent to B, but B is not owned/controlled by player/ally) -> NOT visible
      expect(visibility.has("C")).toBe(false);
      // D (only adjacent to C) -> NOT visible
      expect(visibility.has("D")).toBe(false);
    });
  });
});
