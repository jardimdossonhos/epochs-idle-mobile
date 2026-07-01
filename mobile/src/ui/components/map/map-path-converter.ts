export interface SvgPathObject {
  id: string;
  regionId: string;
  name: string;
  isWater: boolean;
  biome: string;
  path: string;
  center: { x: number; y: number };
}

export interface GeoPoint {
  x: number;
  y: number;
}

export function geoPointToSvg(lng: number, lat: number, width = 1000, height = 600): [number, number] {
  const x = Math.round((((lng + 180) / 360) * width) * 100) / 100;
  const y = Math.round((((90 - lat) / 180) * height) * 100) / 100;
  return [x, y];
}

export function geoCenterToSvg(center: GeoPoint, width = 1000, height = 600): GeoPoint {
  const [x, y] = geoPointToSvg(center.x, center.y, width, height);
  return { x, y };
}

export function coordinatesToPathString(coordinates: any, geometryType: string, width = 1000, height = 600): string {
  if (!coordinates || !Array.isArray(coordinates)) return "";

  const processRing = (ring: number[][]): string => {
    if (!ring || ring.length === 0) return "";
    return ring
      .map((pt, index) => {
        const [x, y] = geoPointToSvg(pt[0], pt[1], width, height);
        return `${index === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ") + " Z";
  };

  if (geometryType === "Polygon") {
    return coordinates.map(processRing).join(" ");
  } else if (geometryType === "MultiPolygon") {
    return coordinates.map((poly: number[][][]) => poly.map(processRing).join(" ")).join(" ");
  }

  return "";
}

export function convertGeoJsonFeatureToSvgPath(feature: any, width = 1000, height = 600): SvgPathObject | null {
  if (!feature || !feature.geometry || !feature.properties) return null;

  const regionId = feature.properties.regionId || `region_${feature.id}`;
  const name = feature.properties.name || regionId;
  const isWater = Boolean(feature.properties.isWater);
  const biome = feature.properties.biome || (isWater ? "ocean" : "plains");

  const path = coordinatesToPathString(feature.geometry.coordinates, feature.geometry.type, width, height);

  // Calculate approximate centroid from first ring if center not provided
  let center: GeoPoint = { x: 500, y: 300 };
  if (feature.geometry.coordinates && feature.geometry.coordinates.length > 0) {
    const ring = feature.geometry.type === "MultiPolygon"
      ? feature.geometry.coordinates[0]?.[0]
      : feature.geometry.coordinates[0];
    if (ring && ring.length > 0) {
      let sumLng = 0;
      let sumLat = 0;
      ring.forEach((pt: number[]) => {
        sumLng += pt[0];
        sumLat += pt[1];
      });
      const avgLng = sumLng / ring.length;
      const avgLat = sumLat / ring.length;
      center = geoCenterToSvg({ x: avgLng, y: avgLat }, width, height);
    }
  }

  return {
    id: String(feature.id ?? regionId),
    regionId,
    name,
    isWater,
    biome,
    path,
    center,
  };
}

const pathCache = new Map<string, Record<string, SvgPathObject>>();

export function convertGeoJsonToPathObjects(geojson: any, width = 1000, height = 600): Record<string, SvgPathObject> {
  if (!geojson || !Array.isArray(geojson.features)) return {};

  const cacheKey = `${geojson.name || "default"}_${width}x${height}_${geojson.features.length}`;
  if (pathCache.has(cacheKey)) {
    return pathCache.get(cacheKey)!;
  }

  const resultMap: Record<string, SvgPathObject> = {};
  for (const feature of geojson.features) {
    const svgObj = convertGeoJsonFeatureToSvgPath(feature, width, height);
    if (svgObj && svgObj.regionId) {
      resultMap[svgObj.regionId] = svgObj;
    }
  }

  pathCache.set(cacheKey, resultMap);
  return resultMap;
}
