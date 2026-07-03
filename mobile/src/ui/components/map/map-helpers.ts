import { DiplomaticRelation } from "../../../core/models/enums";

const fogOfWarCache = new Map<string, string>();

/**
 * Interpolates between two hex colors based on a factor.
 * Clamps factor to [0, 1], returns color1 if factor is NaN, and clamps output components to [0, 255].
 */
export function interpolateColor(color1: string, color2: string, factor: number): string {
  if (isNaN(factor)) {
    return color1;
  }
  const clampedFactor = Math.max(0, Math.min(1, factor));

  const parseHex = (hex: string) => {
    const clean = hex.replace("#", "");
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  };

  const c1 = parseHex(color1);
  const c2 = parseHex(color2);

  const r = Math.max(0, Math.min(255, Math.round(c1.r + clampedFactor * (c2.r - c1.r))));
  const g = Math.max(0, Math.min(255, Math.round(c1.g + clampedFactor * (c2.g - c1.g))));
  const b = Math.max(0, Math.min(255, Math.round(c1.b + clampedFactor * (c2.b - c1.b))));

  const toHex = (val: number) => {
    const hex = val.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Applies Fog of War to a color: desaturates (s * 0.25) and darkens (l * 0.35) relatively.
 * Caches output to prevent expensive HSL calculations.
 */
export function applyFogOfWar(hexColor: string): string {
  if (fogOfWarCache.has(hexColor)) {
    return fogOfWarCache.get(hexColor)!;
  }

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

  // Relative scaling of Saturation and Lightness
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

  const result = `#${toHex(finalR)}${toHex(finalG)}${toHex(finalB)}`;
  if (fogOfWarCache.size >= 1000) {
    fogOfWarCache.clear();
  }
  fogOfWarCache.set(hexColor, result);
  return result;
}

/**
 * Returns the current size of the fog of war cache. Used for testing.
 */
export function getFogOfWarCacheSize(): number {
  return fogOfWarCache.size;
}

/**
 * Checks if a specific region is visible based on the visible set.
 */
export function isRegionVisible(regionId: string, visibleRegionsSet: Set<string>): boolean {
  return visibleRegionsSet.has(regionId);
}

/**
 * Calculates visibility of regions: player-owned/controlled and allied regions are visible,
 * plus their direct neighbors.
 */
export function calculateVisibility(
  definitions: Record<string, { neighbors?: string[] }>,
  regions: Record<string, { ownerId?: string; controllerId?: string }>,
  playerKingdomId: string,
  playerRelations: Record<string, { status: string | DiplomaticRelation }>
): Set<string> {
  const visibleRegions = new Set<string>();

  Object.keys(definitions).forEach(regionId => {
    const regionState = regions[regionId];
    if (!regionState) return;
    const ownerId = regionState.ownerId;
    const controllerId = regionState.controllerId;

    const isPlayer = ownerId === playerKingdomId || controllerId === playerKingdomId;
    const isAlly = (ownerId && playerRelations[ownerId]?.status === DiplomaticRelation.Allied) ||
                   (controllerId && playerRelations[controllerId]?.status === DiplomaticRelation.Allied);

    if (isPlayer || isAlly) {
      visibleRegions.add(regionId);
    }
  });

  const initialVisible = Array.from(visibleRegions);
  initialVisible.forEach(regionId => {
    const regionDef = definitions[regionId];
    if (regionDef?.neighbors) {
      regionDef.neighbors.forEach((neighborId: string) => {
        visibleRegions.add(neighborId);
      });
    }
  });

  return visibleRegions;
}
