import type { Feature, FeatureCollection, Point, Polygon } from "geojson";

export const GAME_ZONE_METERS = 750;
export const EARTH_RADIUS_METERS = 6_371_008.8;
const LATITUDE_STEP_DEGREES = GAME_ZONE_METERS / EARTH_RADIUS_METERS * 180 / Math.PI;

export interface GameZone {
  x: number;
  y: number;
  key: string;
}

export interface GameZoneBounds {
  west: number;
  east: number;
  south: number;
  north: number;
  columns: number;
}

function latitudeBand(y: number): { south: number; north: number; center: number } {
  const south = -90 + y * LATITUDE_STEP_DEGREES;
  const north = Math.min(90, south + LATITUDE_STEP_DEGREES);
  return { south, north, center: (south + north) / 2 };
}

function columnsForBand(y: number): number {
  const { center } = latitudeBand(y);
  const circumference = 2 * Math.PI * EARTH_RADIUS_METERS * Math.max(0, Math.cos(center * Math.PI / 180));
  return Math.max(1, Math.round(circumference / GAME_ZONE_METERS));
}

function normalizeLongitude(lng: number): number {
  return ((lng + 180) % 360 + 360) % 360;
}

export function zoneFor(lng: number, lat: number): GameZone {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    throw new RangeError("Zone coordinates must be finite numbers.");
  }
  const safeLat = Math.max(-89.999999, Math.min(89.999999, lat));
  const y = Math.floor((safeLat + 90) / LATITUDE_STEP_DEGREES);
  const columns = columnsForBand(y);
  const x = Math.min(columns - 1, Math.floor(normalizeLongitude(lng) / 360 * columns));
  return { x, y, key: `${x}:${y}` };
}

export function zoneBounds(zoneX: number, zoneY: number): GameZoneBounds {
  const { south, north } = latitudeBand(zoneY);
  const columns = columnsForBand(zoneY);
  const x = ((zoneX % columns) + columns) % columns;
  return {
    west: -180 + x * 360 / columns,
    east: -180 + (x + 1) * 360 / columns,
    south,
    north,
    columns,
  };
}

export function spawnForZone(zoneX: number, zoneY: number): [number, number] {
  const bounds = zoneBounds(zoneX, zoneY);
  return [(bounds.west + bounds.east) / 2, (bounds.south + bounds.north) / 2];
}

export function zonePolygon(zoneX: number, zoneY: number): Feature<Polygon> {
  const bounds = zoneBounds(zoneX, zoneY);
  const ring: [number, number][] = [
    [bounds.west, bounds.south],
    [bounds.east, bounds.south],
    [bounds.east, bounds.north],
    [bounds.west, bounds.north],
    [bounds.west, bounds.south],
  ];
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [ring] },
  };
}

// Offsets preserve the game's screen convention: positive Y points south.
export function zoneAtOffset(zoneX: number, zoneY: number, offsetX: number, offsetY: number): GameZone {
  if (offsetX === 0 && offsetY === 0) {
    const bounds = zoneBounds(zoneX, zoneY);
    return zoneFor((bounds.west + bounds.east) / 2, (bounds.south + bounds.north) / 2);
  }
  const [lng, lat] = spawnForZone(zoneX, zoneY);
  const distance = GAME_ZONE_METERS * Math.hypot(offsetX, offsetY);
  const bearing = Math.atan2(offsetX, -offsetY);
  const angularDistance = distance / EARTH_RADIUS_METERS;
  const latitude = lat * Math.PI / 180;
  const nextLatitude = Math.asin(
    Math.sin(latitude) * Math.cos(angularDistance)
    + Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const nextLongitude = lng * Math.PI / 180 + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
    Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(nextLatitude),
  );
  return zoneFor(nextLongitude * 180 / Math.PI, nextLatitude * 180 / Math.PI);
}

export function createZoneObstacles(zoneX: number, zoneY: number): FeatureCollection<Point> {
  let seed = (Math.imul(zoneX, 73_856_093) ^ Math.imul(zoneY, 19_349_663)) >>> 0;
  if (seed === 0) seed = 1;
  const random = (): number => {
    seed = (Math.imul(seed, 16_807) >>> 0) % 2_147_483_647;
    return seed / 2_147_483_647;
  };
  const bounds = zoneBounds(zoneX, zoneY);
  const features: Feature<Point>[] = [];
  for (let index = 0; index < 28; index += 1) {
    const localX = 0.08 + random() * 0.84;
    const localY = 0.08 + random() * 0.84;
    if (Math.hypot(localX - 0.5, localY - 0.5) < 0.13) continue;
    features.push({
      type: "Feature",
      properties: { kind: random() > 0.28 ? "tree" : "rock", radius: random() > 0.5 ? 13 : 10 },
      geometry: {
        type: "Point",
        coordinates: [
          bounds.west + (bounds.east - bounds.west) * localX,
          bounds.south + (bounds.north - bounds.south) * localY,
        ],
      },
    });
  }
  return { type: "FeatureCollection", features };
}

// Converts a legacy Web-Mercator 750 m tile centre to longitude/latitude.
// Used only to migrate local exploration history created by older builds.
export function legacyMercatorZoneCenter(zoneX: number, zoneY: number): [number, number] {
  const size = GAME_ZONE_METERS / 40_075_016.68557849;
  const x = (zoneX + 0.5) * size;
  const y = (zoneY + 0.5) * size;
  return [
    x * 360 - 180,
    Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI,
  ];
}
