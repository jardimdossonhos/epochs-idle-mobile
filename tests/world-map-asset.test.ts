import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface FeatureCollection {
  type: string;
  features: Array<{
    properties?: {
      regionId?: string;
      name?: string;
    };
  }>;
}

interface WorldDefinitionsPayload {
  regions: Array<{ id: string }>;
}

describe("world map asset", () => {
  it("contains global coverage and campaign region ids", () => {
    const mapFile = new URL("../public/assets/maps/world-countries-v1.geojson", import.meta.url);
    const definitionsFile = new URL("../public/assets/maps/world-definitions-v1.json", import.meta.url);
    const payload = JSON.parse(readFileSync(mapFile, "utf8")) as FeatureCollection;
    const definitions = JSON.parse(readFileSync(definitionsFile, "utf8")) as WorldDefinitionsPayload;

    expect(payload.type).toBe("FeatureCollection");
    expect(payload.features.length).toBeGreaterThanOrEqual(200);

    const ids = new Set(payload.features.map((item) => item.properties?.regionId).filter(Boolean));
    const missingIds = definitions.regions
      .map((region) => region.id)
      .filter((regionId) => !ids.has(regionId));

    expect(missingIds).toEqual([]);
  });
});
