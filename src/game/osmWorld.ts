import { classifyBuilding, type BuildingKind } from "./interiors.ts";
import type {
  FeatureProvenance,
  GeoDataDiagnostics,
  GeoSettlementType,
  HeritageSiteRecord,
} from "./geoDataEngine.ts";

export interface LocalPoint {
  x: number;
  z: number;
}

export type OsmRoadCategory =
  | "highway"
  | "primary"
  | "secondary"
  | "residential"
  | "service"
  | "pedestrian"
  | "path"
  | "cycleway"
  | "steps";

export type OsmGreenCategory =
  | "park"
  | "wood"
  | "grass"
  | "garden"
  | "pitch"
  | "farmland"
  | "plaza"
  | "sand"
  | "rock"
  | "wetland"
  | "glacier";

export type OsmLandmarkCategory =
  | "monument"
  | "culture"
  | "education"
  | "transport"
  | "health"
  | "commerce"
  | "civic"
  | "sports"
  | "park"
  | "fountain"
  | "peak";

export interface OsmBuildingSpec {
  id: string;
  name: string;
  kind: BuildingKind | "monument" | "civic";
  roofShape: "flat" | "gabled" | "stepped" | "dome";
  height: number;
  baseHeight: number;
  floors: number;
  wallColor: number;
  roofColor: number;
  outer: LocalPoint[];
  holes: LocalPoint[][];
  center: LocalPoint;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  entrancePoint: LocalPoint | null;
  entranceYaw: number;
  source: "osm";
  landuseContext?: string;
  provenance?: FeatureProvenance;
  tags: Record<string, unknown>;
}

export interface OsmRoadSpec {
  id: string;
  roadClass: string;
  streetName: string;
  category: OsmRoadCategory;
  brunnel: "none" | "bridge" | "tunnel";
  width: number;
  sidewalkWidth: number;
  hasCenterLine: boolean;
  isVehicular: boolean;
  surfaceColor: number;
  sidewalkColor: number;
  points: LocalPoint[];
  source: "osm";
  provenance?: FeatureProvenance;
}

export interface OsmGreenSpec {
  id: string;
  category: OsmGreenCategory;
  color: number;
  outer: LocalPoint[];
  holes: LocalPoint[][];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  treeDensity: number;
  source: "osm";
  provenance?: FeatureProvenance;
}

export interface OsmWaterSpec {
  id: string;
  kind: "polygon" | "stream";
  waterClass: string;
  outer: LocalPoint[];
  holes: LocalPoint[][];
  width: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  source: "osm";
  provenance?: FeatureProvenance;
}

export interface OsmLandmarkSpec {
  id: string;
  name: string;
  category: OsmLandmarkCategory;
  poiClass: string;
  x: number;
  z: number;
  radius: number;
  elevationMeters?: number;
  distanceMeters?: number;
  description?: string;
  source: "osm" | "osm-peak" | "wikipedia";
  provenance?: FeatureProvenance;
}

export interface OsmVegetationPoint {
  x: number;
  z: number;
  scale: number;
  kind: "tree" | "shrub";
  canopyColor: number;
  source: "osm-poi" | "osm-greenspace-fill" | "procedural-sparse";
}

export interface OsmStreetPropSpec {
  kind: "lamp" | "bench" | "bollard" | "bus_shelter";
  x: number;
  z: number;
  yaw: number;
  source: "procedural-street-furniture";
}

export type WorldDataRichness = "rich" | "moderate" | "sparse";
export type DominantBiome = "urban" | "park" | "coastal" | "mountain" | "rural" | "desert" | "sparse";

export interface OsmWorldSnapshot {
  origin: [number, number];
  buildings: OsmBuildingSpec[];
  roads: OsmRoadSpec[];
  intersections: LocalPoint[];
  greens: OsmGreenSpec[];
  waters: OsmWaterSpec[];
  landmarks: OsmLandmarkSpec[];
  vegetation: OsmVegetationPoint[];
  streetFurniture: OsmStreetPropSpec[];
  dataRichness: WorldDataRichness;
  dominantBiome: DominantBiome;
  settlementType: GeoSettlementType;
  diagnostics?: GeoDataDiagnostics;
  counts: {
    buildings: number;
    roads: number;
    greens: number;
    waters: number;
    landmarks: number;
    proceduralProps: number;
  };
}

export interface PresetArenaLocation {
  id: string;
  nameEn: string;
  nameFr: string;
  biome: "urban" | "monument" | "park" | "residential" | "sparse";
  lng: number;
  lat: number;
}

export const ARENA_PRESET_DROPS: PresetArenaLocation[] = [
  {
    id: "paris-centre",
    nameEn: "Paris · Rue Saint-Honoré & Opéra (Dense Urban)",
    nameFr: "Paris · Rue Saint-Honoré & Opéra (Urbain dense)",
    biome: "urban",
    lng: 2.3348,
    lat: 48.8648,
  },
  {
    id: "paris-eiffel",
    nameEn: "Paris · Eiffel & Champ de Mars (Monuments)",
    nameFr: "Paris · Tour Eiffel & Champ de Mars (Monuments)",
    biome: "monument",
    lng: 2.2945,
    lat: 48.8584,
  },
  {
    id: "nyc-central-park",
    nameEn: "New York · Central Park South (Park & City)",
    nameFr: "New York · Central Park Sud (Parc & Ville)",
    biome: "park",
    lng: -73.9712,
    lat: 40.7685,
  },
  {
    id: "algiers-casbah",
    nameEn: "Algiers · Casbah & Waterfront (Residential)",
    nameFr: "Alger · Casbah & Littoral (Résidentiel)",
    biome: "residential",
    lng: 3.0588,
    lat: 36.7850,
  },
  {
    id: "tamanrasset-desert",
    nameEn: "Tamanrasset · Hoggar Fringe (Sparse OSM)",
    nameFr: "Tamanrasset · Piémont du Hoggar (Données rares)",
    biome: "sparse",
    lng: 5.5228,
    lat: 22.7850,
  },
];

export interface RawOsmInputs {
  origin: [number, number];
  buildings: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[];
  roads: GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>[];
  greens?: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[];
  landuses?: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[];
  landcovers?: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[];
  waters?: GeoJSON.Feature<
    GeoJSON.Polygon | GeoJSON.MultiPolygon | GeoJSON.LineString | GeoJSON.MultiLineString
  >[];
  pois?: GeoJSON.Feature<GeoJSON.Point>[];
  places?: GeoJSON.Feature<GeoJSON.Point>[];
  peaks?: GeoJSON.Feature<GeoJSON.Point>[];
  streetNames?: GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>[];
  heritageSites?: HeritageSiteRecord[];
  elevationDeltaSpan?: number;
  diagnostics?: GeoDataDiagnostics;
  radiusMeters?: number;
}

const METERS_PER_LATITUDE = 111_320;

export function geoToLocalMeters(
  origin: [number, number],
  lng: number,
  lat: number,
): LocalPoint {
  const metersPerLng = Math.max(1000, METERS_PER_LATITUDE * Math.cos((origin[1] * Math.PI) / 180));
  return {
    x: (lng - origin[0]) * metersPerLng,
    z: -(lat - origin[1]) * METERS_PER_LATITUDE,
  };
}

export function localMetersToGeo(
  origin: [number, number],
  x: number,
  z: number,
): [number, number] {
  const metersPerLng = Math.max(1000, METERS_PER_LATITUDE * Math.cos((origin[1] * Math.PI) / 180));
  return [
    origin[0] + x / metersPerLng,
    origin[1] - z / METERS_PER_LATITUDE,
  ];
}

export function pointInLocalPolygon(x: number, z: number, ring: LocalPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    if ((a.z > z) !== (b.z > z) && x < ((b.x - a.x) * (z - a.z)) / ((b.z - a.z) || 1e-9) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function pointDistanceToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq <= 1e-6) return Math.hypot(px - ax, pz - az);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lenSq));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

function deterministicHash(seedA: number, seedB: number): number {
  const value = Math.sin(seedA * 12.9898 + seedB * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

const NAMED_COLORS: Record<string, number> = {
  white: 0xe6e1d6,
  ivory: 0xe5decb,
  beige: 0xd8cbb2,
  cream: 0xe4d9be,
  sand: 0xcab897,
  limestone: 0xd9cdb4,
  yellow: 0xd6bd78,
  ochre: 0xc79d63,
  orange: 0xc47e4f,
  red: 0xa65848,
  brick: 0x9c5545,
  terracotta: 0xb06149,
  brown: 0x7d624d,
  grey: 0x9aa3a8,
  gray: 0x9aa3a8,
  lightgrey: 0xbac1c4,
  darkgrey: 0x5c6469,
  blue: 0x6f8fa6,
  green: 0x77947d,
};

function parseOsmHexColor(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const hexMatch = trimmed.match(/^#([0-9a-f]{6}|[0-9a-f]{3})$/);
  if (hexMatch) {
    const h = hexMatch[1];
    if (h.length === 3) {
      return Number.parseInt(
        `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`,
        16,
      );
    }
    return Number.parseInt(h, 16);
  }
  return NAMED_COLORS[trimmed] ?? null;
}

function buildingPalette(kind: OsmBuildingSpec["kind"]): { wall: number; roof: number } {
  switch (kind) {
    case "monument":
      return { wall: 0xd9cdb2, roof: 0x8ea69a };
    case "civic":
      return { wall: 0xc9d0d6, roof: 0x627380 };
    case "school":
      return { wall: 0xd5c4a6, roof: 0x8f5b4a };
    case "shop":
      return { wall: 0xc8b59b, roof: 0x5c6870 };
    case "office":
      return { wall: 0x99aebc, roof: 0x455866 };
    case "industrial":
      return { wall: 0x8f969a, roof: 0x565d61 };
    case "apartment":
      return { wall: 0xc6bba7, roof: 0x676f73 };
    case "house":
      return { wall: 0xd7cbb8, roof: 0x9e5e49 };
    default:
      return { wall: 0xc2b8a6, roof: 0x666d70 };
  }
}

export function classifyOsmBuildingKind(tags: Record<string, unknown>): OsmBuildingSpec["kind"] {
  const combined = ["building", "class", "type", "historic", "tourism", "amenity", "name", "name_en"]
    .map((k) => String(tags[k] ?? "").toLowerCase())
    .join(" ");
  if (/monument|memorial|cathedral|basilica|palace|castle|museum|temple|shrine|mosque|church|tower|arch/.test(combined)) {
    return "monument";
  }
  if (/town_hall|courthouse|government|embassy|civic|station|terminal|hospital|fire_station|police/.test(combined)) {
    return "civic";
  }
  return classifyBuilding(tags);
}

export function classifyOsmRoad(properties: Record<string, unknown>): {
  roadClass: string;
  category: OsmRoadCategory;
  width: number;
  sidewalkWidth: number;
  hasCenterLine: boolean;
  isVehicular: boolean;
  surfaceColor: number;
  sidewalkColor: number;
} {
  const roadClass = String(properties.class ?? properties.subclass ?? "residential").toLowerCase();
  if (roadClass === "motorway" || roadClass === "trunk") {
    return { roadClass, category: "highway", width: 10.5, sidewalkWidth: 1.6, hasCenterLine: true, isVehicular: true, surfaceColor: 0x2f363d, sidewalkColor: 0x697177 };
  }
  if (roadClass === "primary") {
    return { roadClass, category: "primary", width: 8.6, sidewalkWidth: 1.9, hasCenterLine: true, isVehicular: true, surfaceColor: 0x353d44, sidewalkColor: 0x777f85 };
  }
  if (roadClass === "secondary" || roadClass === "tertiary") {
    return { roadClass, category: "secondary", width: 7.0, sidewalkWidth: 1.7, hasCenterLine: roadClass === "secondary", isVehicular: true, surfaceColor: 0x3a4249, sidewalkColor: 0x7a8186 };
  }
  if (roadClass === "minor" || roadClass === "residential" || roadClass === "unclassified" || roadClass === "living_street") {
    return { roadClass, category: "residential", width: 5.4, sidewalkWidth: 1.4, hasCenterLine: false, isVehicular: true, surfaceColor: 0x414950, sidewalkColor: 0x7c8284 };
  }
  if (roadClass === "service") {
    return { roadClass, category: "service", width: 3.8, sidewalkWidth: 0.7, hasCenterLine: false, isVehicular: true, surfaceColor: 0x4b5358, sidewalkColor: 0x747b7d };
  }
  if (roadClass === "pedestrian") {
    return { roadClass, category: "pedestrian", width: 4.6, sidewalkWidth: 0, hasCenterLine: false, isVehicular: false, surfaceColor: 0x898272, sidewalkColor: 0x898272 };
  }
  if (roadClass === "cycleway") {
    return { roadClass, category: "cycleway", width: 2.4, sidewalkWidth: 0, hasCenterLine: false, isVehicular: false, surfaceColor: 0x6c4c48, sidewalkColor: 0x6c4c48 };
  }
  if (roadClass === "steps") {
    return { roadClass, category: "steps", width: 2.2, sidewalkWidth: 0, hasCenterLine: false, isVehicular: false, surfaceColor: 0x9c927d, sidewalkColor: 0x9c927d };
  }
  return { roadClass, category: "path", width: roadClass === "track" ? 3.2 : 2.1, sidewalkWidth: 0, hasCenterLine: false, isVehicular: false, surfaceColor: 0x8b7e65, sidewalkColor: 0x8b7e65 };
}

export function classifyOsmGreen(properties: Record<string, unknown>): {
  category: OsmGreenCategory;
  color: number;
  treeDensity: number;
} {
  const raw = String(properties.class ?? properties.subclass ?? properties.landuse ?? "park").toLowerCase();
  if (/sand|beach|dune/.test(raw)) return { category: "sand", color: 0xcab88b, treeDensity: 0.01 };
  if (/rock|scree|bare_rock|cliff/.test(raw)) return { category: "rock", color: 0x6b7075, treeDensity: 0.02 };
  if (/glacier|ice|snow/.test(raw)) return { category: "glacier", color: 0xcde3eb, treeDensity: 0 };
  if (/wetland|marsh|bog/.test(raw)) return { category: "wetland", color: 0x3b6355, treeDensity: 0.14 };
  if (/wood|forest/.test(raw)) return { category: "wood", color: 0x2f5a3e, treeDensity: 1.0 };
  if (/park|garden|cemetery|nature_reserve|village_green|recreation_ground/.test(raw)) {
    return { category: "park", color: 0x42724d, treeDensity: 0.55 };
  }
  if (/pitch|playground|stadium|sports/.test(raw)) return { category: "pitch", color: 0x4c8254, treeDensity: 0.08 };
  if (/farmland|orchard|vineyard/.test(raw)) return { category: "farmland", color: 0x687946, treeDensity: 0.22 };
  if (/plaza|pedestrian|square/.test(raw)) return { category: "plaza", color: 0x827d6f, treeDensity: 0.06 };
  return { category: "grass", color: 0x527a4f, treeDensity: 0.22 };
}

export function classifyOsmLandmark(properties: Record<string, unknown>): OsmLandmarkCategory {
  const cls = String(properties.class ?? "").toLowerCase();
  const sub = String(properties.subclass ?? "").toLowerCase();
  const name = String(properties.name ?? properties.name_en ?? "").toLowerCase();
  const combined = `${cls} ${sub} ${name}`;
  if (/fountain|fontaine|jet d'eau/.test(combined)) return "fountain";
  if (/monument|memorial|castle|ruins|archaeological|statue|obelisk|arc de triomphe/.test(combined)) return "monument";
  if (/museum|art_gallery|theatre|cinema|attraction|viewpoint|place_of_worship|opera|basilica|cathedral/.test(combined)) return "culture";
  if (/school|college|university|kindergarten|library/.test(combined)) return "education";
  if (/bus|railway|subway|tram|ferry|airport|station/.test(combined)) return "transport";
  if (/hospital|clinic|doctors|pharmacy/.test(combined)) return "health";
  if (/police|fire_station|government|town_hall|courthouse|mairie|city hall/.test(combined)) return "civic";
  if (/stadium|sports_centre|pitch|playground|swimming_pool/.test(combined)) return "sports";
  if (/park|garden|nature_reserve/.test(combined)) return "park";
  return "commerce";
}

function ringBounds(points: LocalPoint[]): { minX: number; maxX: number; minZ: number; maxZ: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  return { minX, maxX, minZ, maxZ };
}

function ringSignedArea(points: LocalPoint[]): number {
  let area = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    area += points[i].x * points[i + 1].z - points[i + 1].x * points[i].z;
  }
  return Math.abs(area) * 0.5;
}

function findStreetFacingEntrance(
  outer: LocalPoint[],
  center: LocalPoint,
  roads: OsmRoadSpec[],
): { point: LocalPoint | null; yaw: number } {
  if (outer.length < 3) return { point: null, yaw: 0 };
  let bestMid: LocalPoint | null = null;
  let bestOutwardX = 0;
  let bestOutwardZ = 1;
  let bestScore = Infinity;

  for (let i = 0; i < outer.length - 1; i += 1) {
    const a = outer[i];
    const b = outer[i + 1];
    const edgeLen = Math.hypot(b.x - a.x, b.z - a.z);
    if (edgeLen < 2.2) continue;
    const midX = (a.x + b.x) * 0.5;
    const midZ = (a.z + b.z) * 0.5;
    let nx = -(b.z - a.z) / edgeLen;
    let nz = (b.x - a.x) / edgeLen;
    if (nx * (midX - center.x) + nz * (midZ - center.z) < 0) {
      nx = -nx;
      nz = -nz;
    }

    let minRoadDist = 90;
    for (const road of roads) {
      for (let r = 0; r < road.points.length - 1; r += 1) {
        const d = pointDistanceToSegment(
          midX + nx * 1.5,
          midZ + nz * 1.5,
          road.points[r].x,
          road.points[r].z,
          road.points[r + 1].x,
          road.points[r + 1].z,
        );
        if (d < minRoadDist) minRoadDist = d;
      }
    }
    const score = minRoadDist - Math.min(8, edgeLen * 0.15);
    if (score < bestScore) {
      bestScore = score;
      bestMid = { x: midX + nx * 0.25, z: midZ + nz * 0.25 };
      bestOutwardX = nx;
      bestOutwardZ = nz;
    }
  }
  return { point: bestMid, yaw: Math.atan2(bestOutwardX, bestOutwardZ) };
}

function getProvenance(props: Record<string, unknown>): FeatureProvenance | undefined {
  const p = props._provenance;
  if (p && typeof p === "object") return p as FeatureProvenance;
  return undefined;
}

function detectRoadIntersections(roads: OsmRoadSpec[], maxDist: number): LocalPoint[] {
  const cellHits = new Map<string, { sumX: number; sumZ: number; roadIds: Set<string>; count: number }>();
  for (const road of roads) {
    if (!road.isVehicular || road.brunnel === "tunnel") continue;
    for (const pt of road.points) {
      if (Math.hypot(pt.x, pt.z) > maxDist) continue;
      const gx = Math.round(pt.x / 3.5);
      const gz = Math.round(pt.z / 3.5);
      const key = `${gx}:${gz}`;
      let cell = cellHits.get(key);
      if (!cell) {
        cell = { sumX: 0, sumZ: 0, roadIds: new Set(), count: 0 };
        cellHits.set(key, cell);
      }
      cell.sumX += pt.x;
      cell.sumZ += pt.z;
      cell.roadIds.add(road.id);
      cell.count += 1;
    }
  }
  const intersections: LocalPoint[] = [];
  for (const cell of cellHits.values()) {
    if (cell.roadIds.size >= 2 && cell.count > 0) {
      intersections.push({ x: cell.sumX / cell.count, z: cell.sumZ / cell.count });
    }
    if (intersections.length >= 160) break;
  }
  return intersections;
}

export function buildOsmWorldSnapshot(input: RawOsmInputs): OsmWorldSnapshot {
  const radius = input.radiusMeters ?? 220;
  const maxDist = radius + 70;

  // Build street-name lookup lines from transportation_name
  const namedSegments: Array<{ name: string; points: LocalPoint[] }> = [];
  for (const sn of input.streetNames ?? []) {
    const props = (sn.properties ?? {}) as Record<string, unknown>;
    const name = String(props.name ?? props.name_en ?? "").trim();
    if (!name) continue;
    const lines = sn.geometry.type === "LineString" ? [sn.geometry.coordinates] : sn.geometry.coordinates;
    for (const coords of lines) {
      if (coords.length < 2) continue;
      namedSegments.push({
        name,
        points: coords.map(([lng, lat]) => geoToLocalMeters(input.origin, lng, lat)),
      });
    }
  }

  // 1. Roads first so buildings, street furniture & vegetation know road corridors
  const roads: OsmRoadSpec[] = [];
  const seenRoadIds = new Set<string>();
  input.roads.forEach((feature, idx) => {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const style = classifyOsmRoad(props);
    const brunnelRaw = String(props.brunnel ?? "none").toLowerCase();
    const brunnel: OsmRoadSpec["brunnel"] = brunnelRaw === "bridge"
      ? "bridge"
      : brunnelRaw === "tunnel"
        ? "tunnel"
        : "none";

    const lines = feature.geometry.type === "LineString"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
    lines.forEach((coords, partIdx) => {
      if (coords.length < 2) return;
      const points = coords.map(([lng, lat]) => geoToLocalMeters(input.origin, lng, lat));
      const inRange = points.some((p) => Math.hypot(p.x, p.z) <= maxDist);
      if (!inRange) return;
      const id = `${String(feature.id ?? "road")}-${idx}-${partIdx}`;
      if (seenRoadIds.has(id)) return;
      seenRoadIds.add(id);

      let streetName = String(props.name ?? props.name_en ?? "").trim();
      if (!streetName && namedSegments.length > 0 && style.isVehicular) {
        const midPt = points[Math.floor(points.length * 0.5)];
        for (const ns of namedSegments) {
          for (let s = 0; s < ns.points.length - 1; s += 1) {
            if (pointDistanceToSegment(midPt.x, midPt.z, ns.points[s].x, ns.points[s].z, ns.points[s + 1].x, ns.points[s + 1].z) < 8) {
              streetName = ns.name;
              break;
            }
          }
          if (streetName) break;
        }
      }

      roads.push({
        id,
        roadClass: style.roadClass,
        streetName,
        category: style.category,
        brunnel,
        width: style.width,
        sidewalkWidth: style.sidewalkWidth,
        hasCenterLine: style.hasCenterLine,
        isVehicular: style.isVehicular,
        surfaceColor: style.surfaceColor,
        sidewalkColor: style.sidewalkColor,
        points,
        source: "osm",
        provenance: getProvenance(props),
      });
    });
  });

  const intersections = detectRoadIntersections(roads, maxDist);

  // Precompute landuse zones in local meters for cross-enriching OpenFreeMap buildings
  const localLanduses: Array<{
    cls: string;
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
    outer: LocalPoint[];
  }> = [];
  for (const lu of input.landuses ?? []) {
    const cls = String((lu.properties as Record<string, unknown> | undefined)?.class ?? "").toLowerCase();
    if (!cls) continue;
    const polys = lu.geometry.type === "Polygon" ? [lu.geometry.coordinates] : lu.geometry.coordinates;
    for (const poly of polys) {
      const outerRaw = poly[0];
      if (!outerRaw || outerRaw.length < 4) continue;
      const outer = outerRaw.map(([lng, lat]) => geoToLocalMeters(input.origin, lng, lat));
      localLanduses.push({ cls, bounds: ringBounds(outer), outer });
    }
  }

  // Precompute POIs in local meters so buildings inside/adjacent inherit real place category & names
  const localPois = (input.pois ?? [])
    .filter((p) => p.geometry.type === "Point")
    .map((p) => {
      const pt = geoToLocalMeters(input.origin, p.geometry.coordinates[0], p.geometry.coordinates[1]);
      return {
        feature: p,
        x: pt.x,
        z: pt.z,
        props: (p.properties ?? {}) as Record<string, unknown>,
      };
    });

  // 2. Buildings with height, cross-enriched classification, color & street-facing entrance
  const buildings: OsmBuildingSpec[] = [];
  const seenBuildingKeys = new Set<string>();
  input.buildings.forEach((feature, idx) => {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const polygons = feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;

    polygons.forEach((poly, partIdx) => {
      const outerRaw = poly[0];
      if (!outerRaw || outerRaw.length < 4) return;
      const outer = outerRaw.map(([lng, lat]) => geoToLocalMeters(input.origin, lng, lat));
      const bounds = ringBounds(outer);
      const center = {
        x: (bounds.minX + bounds.maxX) * 0.5,
        z: (bounds.minZ + bounds.maxZ) * 0.5,
      };
      if (Math.hypot(center.x, center.z) > maxDist + 40) return;
      const dedupeKey = `${Math.round(center.x)}:${Math.round(center.z)}:${Math.round(bounds.maxX - bounds.minX)}`;
      if (seenBuildingKeys.has(dedupeKey)) return;
      seenBuildingKeys.add(dedupeKey);

      // Enrich tags from enclosing landuse & overlapping POIs
      let landuseContext: string | undefined;
      for (const lu of localLanduses) {
        if (
          center.x >= lu.bounds.minX && center.x <= lu.bounds.maxX
          && center.z >= lu.bounds.minZ && center.z <= lu.bounds.maxZ
          && pointInLocalPolygon(center.x, center.z, lu.outer)
        ) {
          landuseContext = lu.cls;
          break;
        }
      }

      let matchedPoiName = "";
      let matchedPoiCategory: OsmLandmarkCategory | null = null;
      for (const lp of localPois) {
        if (
          lp.x >= bounds.minX - 5 && lp.x <= bounds.maxX + 5
          && lp.z >= bounds.minZ - 5 && lp.z <= bounds.maxZ + 5
        ) {
          if (pointInLocalPolygon(lp.x, lp.z, outer) || Math.hypot(lp.x - center.x, lp.z - center.z) < 9) {
            matchedPoiCategory = classifyOsmLandmark(lp.props);
            matchedPoiName = String(lp.props.name ?? lp.props.name_en ?? "").trim();
            if (matchedPoiName) break;
          }
        }
      }

      const footprintArea = ringSignedArea(outer);
      let kind = classifyOsmBuildingKind(props);
      if (kind === "other") {
        if (matchedPoiCategory === "monument" || matchedPoiCategory === "culture") kind = "monument";
        else if (matchedPoiCategory === "education" || landuseContext === "school") kind = "school";
        else if (matchedPoiCategory === "health" || matchedPoiCategory === "civic" || matchedPoiCategory === "transport" || landuseContext === "hospital" || landuseContext === "railway") kind = "civic";
        else if (matchedPoiCategory === "commerce" || landuseContext === "retail") kind = "shop";
        else if (landuseContext === "industrial") kind = "industrial";
        else if (landuseContext === "commercial") kind = "office";
        else if (footprintArea > 420 && (Number(props.render_height ?? 0) >= 12 || Number(props["building:levels"] ?? 0) >= 4)) kind = "apartment";
        else if (footprintArea > 0 && footprintArea <= 165 && Number(props.render_height ?? 0) <= 8) kind = "house";
        else if (landuseContext === "residential" && footprintArea > 220) kind = "apartment";
        else if (landuseContext === "residential") kind = "house";
      }

      const rawHeight = Number(props.render_height ?? props.height ?? 0);
      const rawLevels = Number(props["building:levels"] ?? props.levels ?? 0);
      const fallbackHeight = kind === "monument"
        ? 14
        : kind === "apartment"
          ? 13.5
          : kind === "office"
            ? 15
            : kind === "house"
              ? 5.6
              : kind === "industrial"
                ? 7.8
                : 8.5;
      const computedHeight = rawHeight > 0
        ? rawHeight
        : rawLevels > 0
          ? rawLevels * 3.3
          : fallbackHeight;
      const height = Math.max(3.2, Math.min(115, Number.isFinite(computedHeight) ? computedHeight : fallbackHeight));
      const rawBase = Number(props.render_min_height ?? props.min_height ?? 0);
      const baseHeight = Math.max(0, Math.min(height - 1, Number.isFinite(rawBase) ? rawBase : 0));
      const floors = Math.max(1, Math.min(14, Math.round(rawLevels > 0 ? rawLevels : height / 3.3)));

      const palette = buildingPalette(kind);
      const parsedWall = parseOsmHexColor(props.colour ?? props["building:colour"]);
      const parsedRoof = parseOsmHexColor(props["roof:colour"]);
      const roofShape: OsmBuildingSpec["roofShape"] = kind === "monument"
        ? "dome"
        : kind === "house" && footprintArea < 210
          ? "gabled"
          : height > 16
            ? "stepped"
            : "flat";

      const holes = poly.slice(1)
        .filter((h) => h.length >= 4)
        .map((ring) => ring.map(([lng, lat]) => geoToLocalMeters(input.origin, lng, lat)));
      const entrance = findStreetFacingEntrance(outer, center, roads);
      const name = String(props.name ?? props.name_en ?? matchedPoiName ?? "").trim();

      buildings.push({
        id: `${String(feature.id ?? "bldg")}-${idx}-${partIdx}`,
        name,
        kind,
        roofShape,
        height,
        baseHeight,
        floors,
        wallColor: parsedWall ?? palette.wall,
        roofColor: parsedRoof ?? palette.roof,
        outer,
        holes,
        center,
        bounds,
        entrancePoint: entrance.point,
        entranceYaw: entrance.yaw,
        source: "osm",
        landuseContext,
        provenance: getProvenance(props),
        tags: props,
      });
    });
  });

  // 3. Green spaces, parks & natural landcover (including sand, rock, glacier, farmland)
  const greens: OsmGreenSpec[] = [];
  const rawGreens = [
    ...(input.greens ?? []),
    ...(input.landcovers ?? []),
  ];
  const seenGreenKeys = new Set<string>();
  rawGreens.forEach((feature, idx) => {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const cls = classifyOsmGreen(props);
    const polygons = feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
    polygons.forEach((poly, partIdx) => {
      const outerRaw = poly[0];
      if (!outerRaw || outerRaw.length < 4) return;
      const outer = outerRaw.map(([lng, lat]) => geoToLocalMeters(input.origin, lng, lat));
      const bounds = ringBounds(outer);
      if (bounds.maxX < -maxDist || bounds.minX > maxDist || bounds.maxZ < -maxDist || bounds.minZ > maxDist) {
        return;
      }
      const dedupeKey = `${cls.category}:${Math.round(bounds.minX)}:${Math.round(bounds.minZ)}:${Math.round(bounds.maxX)}`;
      if (seenGreenKeys.has(dedupeKey)) return;
      seenGreenKeys.add(dedupeKey);

      const holes = poly.slice(1)
        .filter((h) => h.length >= 4)
        .map((ring) => ring.map(([lng, lat]) => geoToLocalMeters(input.origin, lng, lat)));
      greens.push({
        id: `${String(feature.id ?? "green")}-${idx}-${partIdx}`,
        category: cls.category,
        color: cls.color,
        outer,
        holes,
        bounds,
        treeDensity: cls.treeDensity,
        source: "osm",
        provenance: getProvenance(props),
      });
    });
  });

  // 4. Water polygons & streams
  const waters: OsmWaterSpec[] = [];
  (input.waters ?? []).forEach((feature, idx) => {
    const geom = feature.geometry;
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const waterClass = String(props.class ?? props.waterway ?? "water").toLowerCase();
    if (geom.type === "Polygon" || geom.type === "MultiPolygon") {
      const polygons = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
      polygons.forEach((poly, partIdx) => {
        const outerRaw = poly[0];
        if (!outerRaw || outerRaw.length < 4) return;
        const outer = outerRaw.map(([lng, lat]) => geoToLocalMeters(input.origin, lng, lat));
        const bounds = ringBounds(outer);
        if (bounds.maxX < -maxDist || bounds.minX > maxDist || bounds.maxZ < -maxDist || bounds.minZ > maxDist) return;
        const holes = poly.slice(1)
          .filter((h) => h.length >= 4)
          .map((ring) => ring.map(([lng, lat]) => geoToLocalMeters(input.origin, lng, lat)));
        waters.push({
          id: `${String(feature.id ?? "water")}-${idx}-${partIdx}`,
          kind: "polygon",
          waterClass,
          outer,
          holes,
          width: 0,
          bounds,
          source: "osm",
          provenance: getProvenance(props),
        });
      });
    } else if (geom.type === "LineString" || geom.type === "MultiLineString") {
      const lines = geom.type === "LineString" ? [geom.coordinates] : geom.coordinates;
      lines.forEach((line, partIdx) => {
        if (line.length < 2) return;
        const outer = line.map(([lng, lat]) => geoToLocalMeters(input.origin, lng, lat));
        const bounds = ringBounds(outer);
        if (bounds.maxX < -maxDist || bounds.minX > maxDist || bounds.maxZ < -maxDist || bounds.minZ > maxDist) return;
        const width = waterClass === "river" || waterClass === "canal" ? 12 : 4.5;
        waters.push({
          id: `${String(feature.id ?? "stream")}-${idx}-${partIdx}`,
          kind: "stream",
          waterClass,
          outer,
          holes: [],
          width,
          bounds,
          source: "osm",
          provenance: getProvenance(props),
        });
      });
    }
  });

  // 5. Landmarks, POIs, Mountain Peaks & Wikipedia Heritage
  const landmarks: OsmLandmarkSpec[] = [];
  const seenLandmarkKeys = new Set<string>();
  (input.pois ?? []).forEach((feature, idx) => {
    if (feature.geometry.type !== "Point") return;
    const [lng, lat] = feature.geometry.coordinates;
    const pt = geoToLocalMeters(input.origin, lng, lat);
    if (Math.hypot(pt.x, pt.z) > maxDist) return;
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const poiClass = String(props.class ?? props.subclass ?? "place");
    const name = String(props.name ?? props.name_en ?? "").trim();
    const key = `${Math.round(pt.x / 6)}:${Math.round(pt.z / 6)}:${name || poiClass}`;
    if (seenLandmarkKeys.has(key)) return;
    seenLandmarkKeys.add(key);
    const category = classifyOsmLandmark(props);
    landmarks.push({
      id: `${String(feature.id ?? "poi")}-${idx}`,
      name,
      category,
      poiClass,
      x: pt.x,
      z: pt.z,
      radius: category === "monument" || category === "fountain" ? 2.6 : 1.6,
      distanceMeters: Math.round(Math.hypot(pt.x, pt.z)),
      source: "osm",
      provenance: getProvenance(props),
    });
  });

  (input.peaks ?? []).forEach((feature, idx) => {
    if (feature.geometry.type !== "Point") return;
    const [lng, lat] = feature.geometry.coordinates;
    const pt = geoToLocalMeters(input.origin, lng, lat);
    if (Math.hypot(pt.x, pt.z) > maxDist * 1.4) return;
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const name = String(props.name ?? props.name_en ?? "Summit").trim();
    const ele = Number(props.ele ?? 0);
    landmarks.push({
      id: `peak-${String(feature.id ?? idx)}`,
      name,
      category: "peak",
      poiClass: "mountain_peak",
      x: pt.x,
      z: pt.z,
      radius: 2.2,
      elevationMeters: Number.isFinite(ele) && ele > 0 ? Math.round(ele) : undefined,
      distanceMeters: Math.round(Math.hypot(pt.x, pt.z)),
      source: "osm-peak",
      provenance: getProvenance(props),
    });
  });

  (input.heritageSites ?? []).forEach((site) => {
    const pt = geoToLocalMeters(input.origin, site.lng, site.lat);
    if (Math.hypot(pt.x, pt.z) > maxDist + 45) return;
    const duplicateNear = landmarks.some(
      (lm) => Math.hypot(lm.x - pt.x, lm.z - pt.z) < 32 && lm.name.length > 0,
    );
    if (duplicateNear) return;
    landmarks.push({
      id: site.id,
      name: site.name,
      category: "monument",
      poiClass: "wikipedia_heritage",
      x: pt.x,
      z: pt.z,
      radius: 2.4,
      distanceMeters: site.distanceMeters,
      description: site.description,
      source: "wikipedia",
    });
  });

  // Helper checks so vegetation NEVER overlaps buildings, roads, or water
  const isClearOfBuildingsAndRoads = (x: number, z: number, pad = 2.4): boolean => {
    for (const b of buildings) {
      if (
        x >= b.bounds.minX - pad
        && x <= b.bounds.maxX + pad
        && z >= b.bounds.minZ - pad
        && z <= b.bounds.maxZ + pad
      ) {
        if (pointInLocalPolygon(x, z, b.outer) || pad > 0) return false;
      }
    }
    for (const road of roads) {
      if (road.brunnel === "tunnel") continue;
      const clearance = road.width * 0.5 + road.sidewalkWidth + 1.8;
      for (let i = 0; i < road.points.length - 1; i += 1) {
        if (pointDistanceToSegment(x, z, road.points[i].x, road.points[i].z, road.points[i + 1].x, road.points[i + 1].z) < clearance) {
          return false;
        }
      }
    }
    for (const w of waters) {
      if (w.kind === "polygon") {
        if (
          x >= w.bounds.minX - 2 && x <= w.bounds.maxX + 2
          && z >= w.bounds.minZ - 2 && z <= w.bounds.maxZ + 2
          && pointInLocalPolygon(x, z, w.outer)
        ) {
          return false;
        }
      } else {
        for (let i = 0; i < w.outer.length - 1; i += 1) {
          if (pointDistanceToSegment(x, z, w.outer[i].x, w.outer[i].z, w.outer[i + 1].x, w.outer[i + 1].z) < w.width * 0.5 + 2) {
            return false;
          }
        }
      }
    }
    return true;
  };

  // Determine dominant biome & settlement type from real features
  const hasSand = greens.some((g) => g.category === "sand");
  const hasRockOrGlacier = greens.some((g) => g.category === "rock" || g.category === "glacier");
  const hasCoastWater = waters.some((w) => w.kind === "polygon" && /ocean|sea|bay/.test(w.waterClass));
  const peakOrHighRelief = (input.peaks?.length ?? 0) > 0 || (input.elevationDeltaSpan ?? 0) >= 28;
  const totalParks = greens.filter((g) => g.category === "park" || g.category === "wood").length;

  let dominantBiome: DominantBiome = "sparse";
  if (buildings.length >= 25) {
    dominantBiome = totalParks >= 4 && buildings.length < 75 ? "park" : "urban";
  } else if (hasCoastWater || (hasSand && waters.length > 0)) {
    dominantBiome = "coastal";
  } else if (hasRockOrGlacier || peakOrHighRelief) {
    dominantBiome = "mountain";
  } else if (totalParks >= 2) {
    dominantBiome = "park";
  } else if (roads.length >= 1 || greens.length >= 1 || buildings.length >= 1) {
    dominantBiome = "rural";
  } else if (Math.abs(input.origin[1]) < 32) {
    dominantBiome = "desert";
  }

  let settlementType: GeoSettlementType = input.diagnostics?.settlementType ?? "unknown";
  if (settlementType === "unknown") {
    if (buildings.length >= 55) settlementType = "dense_city";
    else if (buildings.length >= 18) settlementType = "town";
    else if (buildings.length >= 4) settlementType = "village";
    else if (dominantBiome === "mountain") settlementType = "mountain";
    else if (dominantBiome === "coastal") settlementType = "coastal";
    else if (roads.length > 0 || greens.length > 0) settlementType = "rural";
    else settlementType = "natural";
  }

  // 6. Populate 3D vegetation strictly inside mapped green polygons (never on sand beaches/glaciers/buildings/roads)
  const vegetation: OsmVegetationPoint[] = [];
  const treeCanopyPalette = dominantBiome === "mountain"
    ? [0x2a5438, 0x355f42, 0x244931, 0x456b49]
    : [0x3b6e44, 0x4b7f4c, 0x2f5a39, 0x5c8c51];
  const maxTrees = 180;

  for (const green of greens) {
    if (vegetation.length >= maxTrees) break;
    if (green.treeDensity <= 0.05) continue;
    const step = green.category === "wood" ? 11 : green.category === "park" ? 15 : 22;
    const startX = Math.max(-radius, Math.floor(green.bounds.minX / step) * step);
    const endX = Math.min(radius, Math.ceil(green.bounds.maxX / step) * step);
    const startZ = Math.max(-radius, Math.floor(green.bounds.minZ / step) * step);
    const endZ = Math.min(radius, Math.ceil(green.bounds.maxZ / step) * step);

    for (let gx = startX; gx <= endX; gx += step) {
      for (let gz = startZ; gz <= endZ; gz += step) {
        if (vegetation.length >= maxTrees) break;
        const jx = gx + (deterministicHash(gx, gz) - 0.5) * step * 0.68;
        const jz = gz + (deterministicHash(gz + 17, gx + 31) - 0.5) * step * 0.68;
        if (Math.hypot(jx, jz) > radius || Math.hypot(jx, jz) < 5) continue;
        if (!pointInLocalPolygon(jx, jz, green.outer)) continue;
        if (green.holes.some((h) => pointInLocalPolygon(jx, jz, h))) continue;
        if (!isClearOfBuildingsAndRoads(jx, jz, 2.2)) continue;
        const h = deterministicHash(jx * 0.7, jz * 0.7);
        if (h > green.treeDensity) continue;
        vegetation.push({
          x: jx,
          z: jz,
          scale: 0.78 + h * 0.65,
          kind: h < 0.28 ? "shrub" : "tree",
          canopyColor: treeCanopyPalette[Math.floor(h * 100) % treeCanopyPalette.length],
          source: "osm-greenspace-fill",
        });
      }
    }
  }

  // 7. Procedural street-side props anchored cleanly on mapped sidewalks & parks (clearly marked procedural-street-furniture)
  const streetFurniture: OsmStreetPropSpec[] = [];
  for (const road of roads) {
    if (road.brunnel === "tunnel" || road.brunnel === "bridge") continue;
    for (let i = 0; i < road.points.length - 1; i += 1) {
      const a = road.points[i];
      const b = road.points[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const segLen = Math.hypot(dx, dz);
      if (segLen < 12) continue;
      const nx = -dz / segLen;
      const nz = dx / segLen;
      if (road.isVehicular && road.sidewalkWidth >= 1.3 && streetFurniture.length < 140) {
        const offset = road.width * 0.5 + road.sidewalkWidth * 0.52;
        const lx = a.x + dx * 0.5 + nx * offset;
        const lz = a.z + dz * 0.5 + nz * offset;
        if (Math.hypot(lx, lz) < 170) {
          streetFurniture.push({
            kind: "lamp",
            x: lx,
            z: lz,
            yaw: Math.atan2(-nx, -nz),
            source: "procedural-street-furniture",
          });
        }
        if ((road.category === "primary" || road.category === "secondary") && segLen > 24 && i % 2 === 0 && streetFurniture.length < 140) {
          const bx = a.x + dx * 0.25 - nx * (road.width * 0.5 + road.sidewalkWidth * 0.35);
          const bz = a.z + dz * 0.25 - nz * (road.width * 0.5 + road.sidewalkWidth * 0.35);
          if (Math.hypot(bx, bz) < 150) {
            streetFurniture.push({
              kind: "bollard",
              x: bx,
              z: bz,
              yaw: Math.atan2(dx, dz),
              source: "procedural-street-furniture",
            });
          }
        }
      } else if (road.category === "pedestrian" && i % 2 === 0 && streetFurniture.length < 140) {
        const bx = a.x + dx * 0.5 + nx * (road.width * 0.42);
        const bz = a.z + dz * 0.5 + nz * (road.width * 0.42);
        if (Math.hypot(bx, bz) < 160) {
          streetFurniture.push({
            kind: "bench",
            x: bx,
            z: bz,
            yaw: Math.atan2(-nx, -nz),
            source: "procedural-street-furniture",
          });
        }
      }
    }
  }

  // Determine OSM data richness honestly
  const totalOsmFeatures = buildings.length + roads.length + greens.length + waters.length + landmarks.length;
  const dataRichness: WorldDataRichness = buildings.length >= 10 || totalOsmFeatures >= 20
    ? "rich"
    : totalOsmFeatures >= 4
      ? "moderate"
      : "sparse";

  // In genuinely sparse real-world open land (never in urban/water/error zones), add subtle natural scrub
  let proceduralProps = 0;
  const isErrorState = input.diagnostics?.status === "error" || input.diagnostics?.status === "unavailable";
  if (dataRichness === "sparse" && !isErrorState && !hasCoastWater && vegetation.length < 18) {
    const ringStep = 28;
    for (let gx = -120; gx <= 120; gx += ringStep) {
      for (let gz = -120; gz <= 120; gz += ringStep) {
        if (Math.hypot(gx, gz) < 12) continue;
        const h = deterministicHash(gx + Math.round(input.origin[0] * 100), gz + Math.round(input.origin[1] * 100));
        if (h < 0.42) continue;
        const px = gx + (h - 0.5) * 14;
        const pz = gz + (deterministicHash(gz, gx) - 0.5) * 14;
        if (!isClearOfBuildingsAndRoads(px, pz, 2.5)) continue;
        vegetation.push({
          x: px,
          z: pz,
          scale: 0.65 + (h - 0.4) * 0.6,
          kind: h > 0.78 ? "tree" : "shrub",
          canopyColor: dominantBiome === "desert" ? 0x76724c : 0x5c754d,
          source: "procedural-sparse",
        });
        proceduralProps += 1;
      }
    }
  }

  return {
    origin: [...input.origin] as [number, number],
    buildings,
    roads,
    intersections,
    greens,
    waters,
    landmarks,
    vegetation,
    streetFurniture,
    dataRichness,
    dominantBiome,
    settlementType,
    diagnostics: input.diagnostics,
    counts: {
      buildings: buildings.length,
      roads: roads.length,
      greens: greens.length,
      waters: waters.length,
      landmarks: landmarks.length,
      proceduralProps,
    },
  };
}
