import { describe, expect, it } from "vitest";
import { interpolateColor, applyFogOfWar, getFogOfWarCacheSize } from "../mobile/src/ui/components/map/map-helpers";

// Helper function to convert RGB to HSL for mathematical validation
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h, s, l };
}

// Helper to parse hex string into RGB
function parseHex(hex: string) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

describe("Map Helpers Boundary Conditions", () => {
  describe("interpolateColor", () => {
    const c1 = "#112233";
    const c2 = "#445566";

    it("clamps negative factor values to 0 and returns color1", () => {
      expect(interpolateColor(c1, c2, -0.1)).toBe(c1);
      expect(interpolateColor(c1, c2, -5)).toBe(c1);
      expect(interpolateColor(c1, c2, -Infinity)).toBe(c1);
    });

    it("clamps factor values > 1 to 1 and returns color2", () => {
      expect(interpolateColor(c1, c2, 1.1)).toBe(c2);
      expect(interpolateColor(c1, c2, 10)).toBe(c2);
      expect(interpolateColor(c1, c2, Infinity)).toBe(c2);
    });

    it("handles NaN factor values by returning color1", () => {
      expect(interpolateColor(c1, c2, NaN)).toBe(c1);
    });

    it("never returns invalid formats like #NaNNaNNaN or #nannannan", () => {
      // Test different factors
      const factors = [-1.5, 0.5, 1.8, NaN, Infinity, -Infinity];
      for (const f of factors) {
        const result = interpolateColor(c1, c2, f);
        expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(result.toLowerCase()).not.toContain("nan");
      }
    });

    it("handles edge case factor values close to boundaries", () => {
      expect(interpolateColor("#000000", "#ffffff", 0.000001)).toBe("#000000");
      expect(interpolateColor("#000000", "#ffffff", 0.999999)).toBe("#ffffff");
    });

    it("handles malformed hex strings gracefully without throwing", () => {
      const malformedHexStrings = [
        "",
        "#",
        "xyz",
        "#xyz",
        "123",
        "#123",
        " #112233 ",
        "  #abcdef",
        "x#112233",
        "##112233",
        "1234567890abcdef",
        "#1234567890abcdef",
        "rgb(255, 0, 0)",
        "red",
      ];

      for (const hex of malformedHexStrings) {
        expect(() => interpolateColor(hex, "#ffffff", 0.5)).not.toThrow();
        expect(() => interpolateColor("#ffffff", hex, 0.5)).not.toThrow();

        const result1 = interpolateColor(hex, "#ffffff", 0.5);
        expect(result1).toMatch(/^#[0-9a-fA-F]{6}$/);

        const result2 = interpolateColor("#ffffff", hex, 0.5);
        expect(result2).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    it("throws a TypeError when non-string inputs (null, undefined, number) are passed", () => {
      const invalidInputs = [
        null,
        undefined,
        12345,
        {},
        [],
      ];

      for (const val of invalidInputs) {
        expect(() => interpolateColor(val as any, "#ffffff", 0.5)).toThrow();
        expect(() => interpolateColor("#ffffff", val as any, 0.5)).toThrow();
      }
    });
  });

  describe("applyFogOfWar", () => {
    const testCases = [
      { name: "absolute black", hex: "#000000" },
      { name: "absolute white", hex: "#ffffff" },
      { name: "pure gray", hex: "#808080" },
      { name: "highly saturated red", hex: "#ff0000" },
      { name: "highly saturated green", hex: "#00ff00" },
      { name: "highly saturated blue", hex: "#0000ff" },
      { name: "highly saturated yellow", hex: "#ffff00" },
      { name: "highly saturated magenta", hex: "#ff00ff" },
      { name: "highly saturated cyan", hex: "#00ffff" },
      { name: "random skin tone or orange", hex: "#e08030" },
      { name: "dark navy", hex: "#0a1530" },
    ];

    testCases.forEach(({ name, hex }) => {
      it(`correctly processes ${name} (${hex})`, () => {
        const output = applyFogOfWar(hex);

        // 1. Output must be a valid hex color format
        expect(output).toMatch(/^#[0-9a-fA-F]{6}$/);

        // Parse colors
        const inputRgb = parseHex(hex);
        const outputRgb = parseHex(output);
        
        const inputHsl = rgbToHsl(inputRgb.r, inputRgb.g, inputRgb.b);
        const outputHsl = rgbToHsl(outputRgb.r, outputRgb.g, outputRgb.b);

        // 2. Ensure output is never brighter than input (component-wise compared to max input component)
        const maxInput = Math.max(inputRgb.r, inputRgb.g, inputRgb.b);
        expect(outputRgb.r).toBeLessThanOrEqual(maxInput);
        expect(outputRgb.g).toBeLessThanOrEqual(maxInput);
        expect(outputRgb.b).toBeLessThanOrEqual(maxInput);

        // 3. Verify HSL properties are scaled proportionally (within floating point precision limits)
        const expectedS = inputHsl.s * 0.25;
        const expectedL = inputHsl.l * 0.35;

        // Allow a small delta (e.g. 0.05) due to 8-bit RGB discretization and rounding errors
        expect(Math.abs(outputHsl.s - expectedS)).toBeLessThanOrEqual(0.05);
        expect(Math.abs(outputHsl.l - expectedL)).toBeLessThanOrEqual(0.05);

        // 4. Outputs are never brightened (lightness must be <= input lightness)
        expect(outputHsl.l).toBeLessThanOrEqual(inputHsl.l + 1e-9);
      });
    });

    it("verifies relative scaling logic prevents brightening on extreme light colors", () => {
      // Extremely bright colors
      const veryBright = "#fefefe";
      const output = applyFogOfWar(veryBright);
      const inputRgb = parseHex(veryBright);
      const outputRgb = parseHex(output);
      
      expect(outputRgb.r).toBeLessThan(inputRgb.r);
      expect(outputRgb.g).toBeLessThan(inputRgb.g);
      expect(outputRgb.b).toBeLessThan(inputRgb.b);
    });

    it("limits the cache size to 1000 to prevent unbounded growth", () => {
      for (let i = 0; i < 1100; i++) {
        const hex = `#${i.toString(16).padStart(6, "0")}`;
        applyFogOfWar(hex);
      }
      const finalSize = getFogOfWarCacheSize();
      expect(finalSize).toBeLessThan(1000);
      expect(finalSize).toBeGreaterThan(0);
    });

    it("handles malformed hex strings gracefully without throwing", () => {
      const malformedHexStrings = [
        "",
        "#",
        "xyz",
        "#xyz",
        "123",
        "#123",
        " #112233 ",
        "  #abcdef",
        "x#112233",
        "##112233",
        "1234567890abcdef",
        "#1234567890abcdef",
        "rgb(255, 0, 0)",
        "red",
      ];

      for (const hex of malformedHexStrings) {
        expect(() => applyFogOfWar(hex)).not.toThrow();
        const result = applyFogOfWar(hex);
        expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    it("throws a TypeError when non-string inputs (null, undefined, number) are passed", () => {
      const invalidInputs = [
        null,
        undefined,
        12345,
        {},
        [],
      ];

      for (const val of invalidInputs) {
        expect(() => applyFogOfWar(val as any)).toThrow();
      }
    });
  });
});
