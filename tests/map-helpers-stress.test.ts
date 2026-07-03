import { describe, expect, it } from "vitest";
import { applyFogOfWar, interpolateColor, calculateVisibility, getFogOfWarCacheSize } from "../mobile/src/ui/components/map/map-helpers";
import { DiplomaticRelation } from "../mobile/src/core/models/enums";

// Replicated logic without cache for direct comparison
function applyFogOfWarNoCache(hexColor: string): string {
  const clean = hexColor.replace("#", "");
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }

  const targetS = s * 0.25;
  const targetL = l * 0.35;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = targetL < 0.5 ? targetL * (1 + targetS) : targetL + targetS - targetL * targetS;
  const p = 2 * targetL - q;
  const finalR = hue2rgb(p, q, h + 1 / 3);
  const finalG = hue2rgb(p, q, h);
  const finalB = hue2rgb(p, q, h - 1 / 3);

  const toHex = (val: number) => {
    const clampedVal = Math.max(0, Math.min(255, Math.round(val * 255)));
    const hex = clampedVal.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(finalR)}${toHex(finalG)}${toHex(finalB)}`;
}

// Helper to generate distinct hex colors
function generateUniqueColors(count: number, offset = 0): string[] {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const val = offset + i;
    const r = (val >> 16) & 255;
    const g = (val >> 8) & 255;
    const b = val & 255;
    const toHex = (v: number) => {
      const hex = v.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    colors.push(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
  }
  return colors;
}

// Helper to generate mock map data
function generateMockMapData(regionCount: number, neighborCountPerRegion = 6) {
  const definitions: Record<string, { neighbors: string[] }> = {};
  const regions: Record<string, { ownerId: string; controllerId: string }> = {};

  for (let i = 0; i < regionCount; i++) {
    const regionId = `r_${i}`;
    const neighbors: string[] = [];
    for (let n = 0; n < neighborCountPerRegion; n++) {
      const neighborIndex = (i + n + 1) % regionCount;
      neighbors.push(`r_${neighborIndex}`);
    }
    definitions[regionId] = { neighbors };

    // Assign owner/controller
    let ownerId = "unclaimed";
    if (i % 10 === 0) ownerId = "k_player";
    else if (i % 10 === 1) ownerId = "k_ally";
    else if (i % 10 === 2) ownerId = "k_enemy";

    regions[regionId] = {
      ownerId,
      controllerId: ownerId
    };
  }

  return { definitions, regions };
}

describe("Map Helpers Comprehensive Stress Test", () => {

  describe("applyFogOfWar Performance & Cache Hit Rate", () => {
    it("runs simulated workloads for applyFogOfWar", () => {
      const ITERATIONS = 10000;

      // WORKLOAD 1: Uncached (0% hit rate, 10,000 unique colors)
      // Use an offset to guarantee they are never-before-seen colors
      const uniqueColors = generateUniqueColors(ITERATIONS, 300000);
      
      const t0 = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        applyFogOfWar(uniqueColors[i]);
      }
      const t1 = performance.now();
      const durationUncached = t1 - t0;

      // WORKLOAD 2: Cached (100% hit rate, 10,000 calls using 50 pre-warmed colors)
      const baseColors = generateUniqueColors(50, 400000);
      // Warm up
      baseColors.forEach(c => applyFogOfWar(c));

      // Build workload
      const workloadColors: string[] = [];
      for (let i = 0; i < ITERATIONS; i++) {
        workloadColors.push(baseColors[i % baseColors.length]);
      }

      const t2 = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        applyFogOfWar(workloadColors[i]);
      }
      const t3 = performance.now();
      const durationCached = t3 - t2;

      // WORKLOAD 3: Pure calculations (No cache check/map set overhead)
      const t4 = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        applyFogOfWarNoCache(uniqueColors[i]);
      }
      const t5 = performance.now();
      const durationPureCalculations = t5 - t4;

      console.log(`--- applyFogOfWar (10,000 iterations) ---`);
      console.log(`Uncached (0% Cache Hit Rate): ${durationUncached.toFixed(4)} ms`);
      console.log(`Cached (100% Cache Hit Rate): ${durationCached.toFixed(4)} ms`);
      console.log(`Pure calculations (no cache wrapper): ${durationPureCalculations.toFixed(4)} ms`);
      console.log(`Cache Speedup factor: ${(durationUncached / durationCached).toFixed(2)}x`);

      // Verify budget: Cached execution must be negligible (< 1ms)
      expect(durationCached).toBeLessThan(1.0);
    });

    it("verifies that cache size is capped correctly and memory remains stable under heavy simulated load", () => {
      const LARGE_SCALE = 100000;
      const largeUniqueColors = generateUniqueColors(LARGE_SCALE, 500000);

      const memBefore = process.memoryUsage().heapUsed;
      const t0 = performance.now();
      
      for (let i = 0; i < LARGE_SCALE; i++) {
        applyFogOfWar(largeUniqueColors[i]);
        
        // Periodically verify cache size never exceeds 1000
        if (i % 1000 === 0) {
          const currentSize = getFogOfWarCacheSize();
          expect(currentSize).toBeLessThanOrEqual(1000);
        }
      }
      
      const t1 = performance.now();
      const memAfter = process.memoryUsage().heapUsed;
      const finalSize = getFogOfWarCacheSize();

      console.log(`--- Cache Size Capping & Memory Stress ---`);
      console.log(`Injected ${LARGE_SCALE} unique entries in: ${(t1 - t0).toFixed(2)} ms`);
      console.log(`Final Cache Size: ${finalSize}`);
      console.log(`Heap memory used before: ${(memBefore / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Heap memory used after: ${(memAfter / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Delta Heap memory: ${((memAfter - memBefore) / 1024 / 1024).toFixed(2)} MB`);
      
      // Verify that the final size is indeed capped to <= 1000
      expect(finalSize).toBeLessThanOrEqual(1000);
      
      // Check that the cache is functional after clearing and refilling
      expect(finalSize).toBeGreaterThan(0);
    });
  });

  describe("interpolateColor Performance & Edge Cases", () => {
    it("benchmarks interpolateColor under 10,000 calls", () => {
      const ITERATIONS = 10000;
      const color1 = "#ff0000";
      const color2 = "#0000ff";

      const t0 = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        interpolateColor(color1, color2, i / ITERATIONS);
      }
      const t1 = performance.now();
      const duration = t1 - t0;

      console.log(`--- interpolateColor (10,000 iterations) ---`);
      console.log(`Total execution time: ${duration.toFixed(4)} ms`);
      expect(duration).toBeLessThan(50); // Generous check, usually runs in < 5ms
    });

    it("ADVERSARIAL REVIEW: handles malformed inputs to parseHex gracefully without throwing, but produces incorrect colors", () => {
      // Testing behavior with non-hex string colors
      // The implementation parses the string using parseInt(clean, 16)
      // "invalid" parses to NaN
      const color = interpolateColor("invalid", "#ffffff", 0.5);
      
      // Since parseInt("invalid", 16) results in NaN, the bitwise operations convert it to 0.
      // Let's verify that this does not throw, but produces a silent failure color
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      console.log(`interpolateColor with invalid input returned: ${color}`);
    });
  });

  describe("calculateVisibility Performance Stress Test", () => {
    it("benchmarks calculateVisibility on large maps (1,000 and 5,000 regions)", () => {
      const playerKingdomId = "k_player";
      const playerRelations = {
        "k_ally": { status: DiplomaticRelation.Allied },
        "k_enemy": { status: DiplomaticRelation.Hostile },
      };

      // 1. Map size 1,000 regions
      const map1000 = generateMockMapData(1000);
      const t0 = performance.now();
      const vis1000 = calculateVisibility(map1000.definitions, map1000.regions, playerKingdomId, playerRelations);
      const t1 = performance.now();
      const duration1000 = t1 - t0;

      // 2. Map size 5,000 regions
      const map5000 = generateMockMapData(5000);
      const t2 = performance.now();
      const vis5000 = calculateVisibility(map5000.definitions, map5000.regions, playerKingdomId, playerRelations);
      const t3 = performance.now();
      const duration5000 = t3 - t2;

      console.log(`--- calculateVisibility Scale Benchmark ---`);
      console.log(`1,000 regions visibility computed in: ${duration1000.toFixed(4)} ms (Visible regions: ${vis1000.size})`);
      console.log(`5,000 regions visibility computed in: ${duration5000.toFixed(4)} ms (Visible regions: ${vis5000.size})`);

      // Ensure that calculating visibility for a very large map (5,000 regions) stays within frame budget (< 16.6ms)
      expect(duration5000).toBeLessThan(16.6); // Must run inside 1 frame budget
    });
  });
});
