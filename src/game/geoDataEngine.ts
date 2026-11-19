import { VectorTile } from "@mapbox/vector-tile";
import { PbfReader } from "pbf";

export type GeoDataStatus =
  | "complete"
  | "partial"
  | "sparse_real"
  | "unavailable"
  | "error"
  | "loading";

export type GeoSettlementType =
  | "dense_city"
  | "town"
  | "village"
  | "rural"
  | "natural"
  | "coastal"
  | "mountain"
  | "unknown";

export interface FeatureProvenance {
  source: string;
  datasetVersion: string;
  tile: string;
  featureId: string;
  accuracyMeters: number;
  fetchedAt: number;
}

export interface TerrainElevationSample {
  x: number;
  z: number;
  elevation: number;
}

export interface HeritageSiteRecord {
  id: string;
  name: string;
  lng: number;
  lat: number;
  distanceMeters: number;
  description?: string;
  source: "wikipedia";
}

export interface GeoDataDiagnostics {
  status: GeoDataStatus;
  origin: [number, number];
  regionName: string;
  settlementType: GeoSettlementType;
  tilesRequested: number;
  tilesReceived: number;
  tileErrors: number;
  cacheHits: number;
  fetchMs: number;
  datasetVersion: string;
  sourcesUsed: string[];
  elevationStatus: "available" | "unavailable" | "error";
  originElevationMeters: number | null;
  minElevationDelta: number;
  maxElevationDelta: number;
  counts: {
    buildings: number;
    roads: number;
    greens: number;
    waters: number;
    pois: number;
    landuses: number;
    places: number;
    peaks: number;
    heritage: number;
    generated3dObjects: number;
  };
  missingCategories: string[];
  errors: string[];
}

export interface LoadedGeoAreaResult {
  origin: [number, number];
  buildings: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[];
  roads: GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>[];
  greens: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[];
  landuses: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[];
  landcovers: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[];
  waters: GeoJSON.Feature<
    GeoJSON.Polygon | GeoJSON.MultiPolygon | GeoJSON.LineString | GeoJSON.MultiLineString
  >[];
  pois: GeoJSON.Feature<GeoJSON.Point>[];
  places: GeoJSON.Feature<GeoJSON.Point>[];
  peaks: GeoJSON.Feature<GeoJSON.Point>[];
  streetNames: GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>[];
  heritageSites: HeritageSiteRecord[];
  terrain: TerrainElevationSample[];
  terrainSize: number;
  terrainSegments: number;
  originElevationMeters: number | null;
  diagnostics: GeoDataDiagnostics;
}

export interface ParsedVectorTileLayers {
  tileKey: string;
  buildings: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[];
  roads: GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>[];
  greens: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[];
  landuses: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[];
  landcovers: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[];
  waters: GeoJSON.Feature<
    GeoJSON.Polygon | GeoJSON.MultiPolygon | GeoJSON.LineString | GeoJSON.MultiLineString
  >[];
  pois: GeoJSON.Feature<GeoJSON.Point>[];
  places: GeoJSON.Feature<GeoJSON.Point>[];
  peaks: GeoJSON.Feature<GeoJSON.Point>[];
  streetNames: GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>[];
}

export interface VectorWorldProvider {
  readonly id: string;
  readonly name: string;
  readonly attribution: string;
  fetchArea(
    lng: number,
    lat: number,
    radiusMeters: number,
    signal?: AbortSignal,
  ): Promise<{
    layers: Omit<ParsedVectorTileLayers, "tileKey">;
    tilesRequested: number;
    tilesReceived: number;
    tileErrors: number;
    cacheHits: number;
    datasetVersion: string;
    errors: string[];
  }>;
  prefetchAround?(lng: number, lat: number, dirX: number, dirZ: number): void;
}

export interface ElevationProvider {
  readonly id: string;
  fetchTerrainGrid(
    lng: number,
    lat: number,
    sizeMeters: number,
    segments: number,
    signal?: AbortSignal,
  ): Promise<{
    status: "available" | "unavailable" | "error";
    terrain: TerrainElevationSample[];
    originElevationMeters: number | null;
    minElevationDelta: number;
    maxElevationDelta: number;
    sourceLabel: string;
    error?: string;
  }>;
}

export interface HeritageProvider {
  readonly id: string;
  fetchHeritageNear(
    lng: number,
    lat: number,
    radiusMeters: number,
    language: "en" | "fr",
    signal?: AbortSignal,
  ): Promise<{ sites: HeritageSiteRecord[]; sourceLabel?: string; error?: string }>;
}

const DEFAULT_OFM_TILE_TEMPLATE = "https://tiles.openfreemap.org/planet/20261115_080022_pt/{z}/{x}/{y}.pbf";
const DEFAULT_OFM_VERSION = "20261115_080022_pt";
const OFM_TILEJSON_URL = "https://tiles.openfreemap.org/planet";
const MAPTERHORN_TILE_URL = "https://tiles.mapterhorn.com/{z}/{x}/{y}.webp";
const MAPLIBRE_DEM_TILE_URL = "https://demotiles.maplibre.org/terrain-tiles/{z}/{x}/{y}.png";

const ROAD_CLASSES = new Set([
  "motorway",
  "trunk",
  "primary",
  "secondary",
  "tertiary",
  "minor",
  "residential",
  "unclassified",
  "service",
  "living_street",
  "pedestrian",
  "track",
  "path",
  "footway",
  "cycleway",
  "steps",
]);

const GREEN_LANDUSE_CLASSES = new Set([
  "park",
  "cemetery",
  "recreation_ground",
  "village_green",
  "garden",
  "farmland",
  "forest",
  "grass",
  "meadow",
  "orchard",
  "vineyard",
]);

export function decodeTerrariumRgb(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768;
}

export function lngLatToTile(
  lng: number,
  lat: number,
  zoom: number,
): { x: number; y: number; z: number } {
  const n = 2 ** zoom;
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const latRad = (clampedLat * Math.PI) / 180;
  const x = Math.floor((((((lng + 180) % 360) + 360) % 360) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return {
    x: Math.max(0, Math.min(n - 1, x)),
    y: Math.max(0, Math.min(n - 1, y)),
    z: zoom,
  };
}

export function lngLatToTilePixel(
  lng: number,
  lat: number,
  zoom: number,
  tileSize = 512,
): { tileX: number; tileY: number; px: number; py: number } {
  const n = 2 ** zoom;
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const latRad = (clampedLat * Math.PI) / 180;
  const worldX = (((((lng + 180) % 360) + 360) % 360) / 360) * n;
  const worldY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const tileX = Math.max(0, Math.min(n - 1, Math.floor(worldX)));
  const tileY = Math.max(0, Math.min(n - 1, Math.floor(worldY)));
  const px = Math.max(0, Math.min(tileSize - 1, (worldX - tileX) * tileSize));
  const py = Math.max(0, Math.min(tileSize - 1, (worldY - tileY) * tileSize));
  return { tileX, tileY, px, py };
}

export function tilesCoveringRadius(
  lng: number,
  lat: number,
  radiusMeters: number,
  zoom = 14,
): { x: number; y: number; z: number }[] {
  const cosLat = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const dLat = radiusMeters / 111_320;
  const dLng = radiusMeters / (111_320 * cosLat);
  const nw = lngLatToTile(lng - dLng, lat + dLat, zoom);
  const se = lngLatToTile(lng + dLng, lat - dLat, zoom);
  const n = 2 ** zoom;
  const tiles: { x: number; y: number; z: number }[] = [];
  const seen = new Set<string>();
  const dxCount = nw.x <= se.x ? se.x - nw.x : n - nw.x + se.x;
  for (let dx = 0; dx <= Math.min(3, dxCount); dx += 1) {
    const tx = (nw.x + dx) % n;
    for (let ty = Math.max(0, nw.y); ty <= Math.min(n - 1, se.y); ty += 1) {
      const key = `${zoom}/${tx}/${ty}`;
      if (!seen.has(key)) {
        seen.add(key);
        tiles.push({ x: tx, y: ty, z: zoom });
      }
    }
  }
  return tiles;
}

function lruSet<K, V>(map: Map<K, V>, key: K, value: V, limit: number): void {
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  while (map.size > limit) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
}

function raceWithAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (val) => {
        signal.removeEventListener("abort", onAbort);
        resolve(val);
      },
      (err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      },
    );
  });
}

function attachProvenance<G extends GeoJSON.Geometry>(
  feature: GeoJSON.Feature<G>,
  source: string,
  datasetVersion: string,
  tileKey: string,
  accuracyMeters: number,
  fetchedAt: number,
): GeoJSON.Feature<G> {
  const rawProps = (feature.properties ?? {}) as Record<string, unknown>;
  const featureId = String(feature.id ?? rawProps.id ?? "");
  return {
    ...feature,
    properties: {
      ...rawProps,
      _provenance: {
        source,
        datasetVersion,
        tile: tileKey,
        featureId,
        accuracyMeters,
        fetchedAt,
      } satisfies FeatureProvenance,
    },
  };
}

export function decodeMvtTileBuffer(
  buffer: Uint8Array,
  x: number,
  y: number,
  z: number,
  datasetVersion = DEFAULT_OFM_VERSION,
  source = "OpenFreeMap / OpenStreetMap",
): ParsedVectorTileLayers {
  const tileKey = `${z}/${x}/${y}`;
  const fetchedAt = Date.now();
  const vt = new VectorTile(new PbfReader(buffer));
  const accuracyMeters = z >= 14 ? 2.5 : 8;

  const result: ParsedVectorTileLayers = {
    tileKey,
    buildings: [],
    roads: [],
    greens: [],
    landuses: [],
    landcovers: [],
    waters: [],
    pois: [],
    places: [],
    peaks: [],
    streetNames: [],
  };

  const readLayer = (
    layerName: string,
    onFeature: (feature: GeoJSON.Feature) => void,
  ): void => {
    const layer = vt.layers[layerName];
    if (!layer) return;
    for (let i = 0; i < layer.length; i += 1) {
      try {
        const gj = layer.feature(i).toGeoJSON(x, y, z) as GeoJSON.Feature;
        if (!gj.geometry) continue;
        onFeature(gj);
      } catch {
        // Ignore malformed geometry within a single feature
      }
    }
  };

  readLayer("building", (gj) => {
    if (gj.geometry.type !== "Polygon" && gj.geometry.type !== "MultiPolygon") return;
    if (gj.properties?.hide_3d === true) return;
    result.buildings.push(
      attachProvenance(
        gj as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
        source,
        datasetVersion,
        tileKey,
        accuracyMeters,
        fetchedAt,
      ),
    );
  });

  readLayer("transportation", (gj) => {
    if (gj.geometry.type !== "LineString" && gj.geometry.type !== "MultiLineString") return;
    const cls = String(gj.properties?.class ?? "").toLowerCase();
    if (!ROAD_CLASSES.has(cls)) return;
    result.roads.push(
      attachProvenance(
        gj as GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>,
        source,
        datasetVersion,
        tileKey,
        accuracyMeters,
        fetchedAt,
      ),
    );
  });

  readLayer("transportation_name", (gj) => {
    if (gj.geometry.type !== "LineString" && gj.geometry.type !== "MultiLineString") return;
    if (!gj.properties?.name && !gj.properties?.name_en) return;
    result.streetNames.push(
      attachProvenance(
        gj as GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>,
        source,
        datasetVersion,
        tileKey,
        accuracyMeters,
        fetchedAt,
      ),
    );
  });

  readLayer("park", (gj) => {
    if (gj.geometry.type !== "Polygon" && gj.geometry.type !== "MultiPolygon") return;
    result.greens.push(
      attachProvenance(
        gj as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
        source,
        datasetVersion,
        tileKey,
        accuracyMeters,
        fetchedAt,
      ),
    );
  });

  readLayer("landcover", (gj) => {
    if (gj.geometry.type !== "Polygon" && gj.geometry.type !== "MultiPolygon") return;
    const tagged = attachProvenance(
      gj as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
      source,
      datasetVersion,
      tileKey,
      accuracyMeters,
      fetchedAt,
    );
    result.landcovers.push(tagged);
    result.greens.push(tagged);
  });

  readLayer("landuse", (gj) => {
    if (gj.geometry.type !== "Polygon" && gj.geometry.type !== "MultiPolygon") return;
    const tagged = attachProvenance(
      gj as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
      source,
      datasetVersion,
      tileKey,
      accuracyMeters,
      fetchedAt,
    );
    result.landuses.push(tagged);
    const cls = String(gj.properties?.class ?? "").toLowerCase();
    if (GREEN_LANDUSE_CLASSES.has(cls)) {
      result.greens.push(tagged);
    }
  });

  readLayer("water", (gj) => {
    if (gj.geometry.type !== "Polygon" && gj.geometry.type !== "MultiPolygon") return;
    result.waters.push(
      attachProvenance(
        gj as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
        source,
        datasetVersion,
        tileKey,
        accuracyMeters,
        fetchedAt,
      ),
    );
  });

  readLayer("waterway", (gj) => {
    if (gj.geometry.type !== "LineString" && gj.geometry.type !== "MultiLineString") return;
    result.waters.push(
      attachProvenance(
        gj as GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>,
        source,
        datasetVersion,
        tileKey,
        accuracyMeters,
        fetchedAt,
      ),
    );
  });

  readLayer("poi", (gj) => {
    if (gj.geometry.type !== "Point") return;
    result.pois.push(
      attachProvenance(
        gj as GeoJSON.Feature<GeoJSON.Point>,
        source,
        datasetVersion,
        tileKey,
        accuracyMeters,
        fetchedAt,
      ),
    );
  });

  readLayer("place", (gj) => {
    if (gj.geometry.type !== "Point") return;
    result.places.push(
      attachProvenance(
        gj as GeoJSON.Feature<GeoJSON.Point>,
        source,
        datasetVersion,
        tileKey,
        accuracyMeters,
        fetchedAt,
      ),
    );
  });

  readLayer("mountain_peak", (gj) => {
    if (gj.geometry.type !== "Point") return;
    result.peaks.push(
      attachProvenance(
        gj as GeoJSON.Feature<GeoJSON.Point>,
        source,
        datasetVersion,
        tileKey,
        accuracyMeters,
        fetchedAt,
      ),
    );
  });

  return result;
}

function measureFeatureProximity(
  coords: unknown,
  originLng: number,
  originLat: number,
  cosLat: number,
  maxDeg: number,
): { inRange: boolean; distSq: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const walk = (node: unknown): void => {
    if (!Array.isArray(node) || node.length === 0) return;
    if (typeof node[0] === "number" && typeof node[1] === "number") {
      const x = node[0];
      const y = node[1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    } else {
      for (let i = 0; i < node.length; i += 1) {
        walk(node[i]);
      }
    }
  };
  walk(coords);
  if (!Number.isFinite(minX)) return { inRange: false, distSq: Infinity };
  const dxEdge = Math.max(minX - originLng, 0, originLng - maxX) * cosLat;
  const dyEdge = Math.max(minY - originLat, 0, originLat - maxY);
  if (dxEdge > maxDeg || dyEdge > maxDeg) {
    return { inRange: false, distSq: Infinity };
  }
  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  const dxCenter = (cx - originLng) * cosLat;
  const dyCenter = cy - originLat;
  const edgeDistSq = dxEdge * dxEdge + dyEdge * dyEdge;
  const centerDistSq = dxCenter * dxCenter + dyCenter * dyCenter;
  return {
    inRange: true,
    distSq: edgeDistSq > 0 ? edgeDistSq * 4 + centerDistSq * 0.05 : centerDistSq,
  };
}

function dedupeKeyForFeature(prefix: string, feature: GeoJSON.Feature): string {
  const geom = feature.geometry;
  if (geom.type === "Point") {
    return `${prefix}:${geom.coordinates[0].toFixed(5)}:${geom.coordinates[1].toFixed(5)}:${String(feature.properties?.name ?? "")}`;
  }
  const first =
    geom.type === "LineString"
      ? geom.coordinates[0]
      : geom.type === "MultiLineString"
        ? geom.coordinates[0]?.[0]
        : geom.type === "Polygon"
          ? geom.coordinates[0]?.[0]
          : geom.type === "MultiPolygon"
            ? geom.coordinates[0]?.[0]?.[0]
            : null;
  const coordTag = first ? `${first[0].toFixed(6)},${first[1].toFixed(6)}` : "";
  return `${prefix}:${String(feature.id ?? "")}:${coordTag}`;
}

export class OpenFreeMapMvtProvider implements VectorWorldProvider {
  readonly id = "openfreemap-mvt";
  readonly name = "OpenFreeMap / OpenStreetMap Vector Tiles";
  readonly attribution = "© OpenStreetMap contributors · OpenFreeMap";

  private tileTemplate = DEFAULT_OFM_TILE_TEMPLATE;
  private datasetVersion = DEFAULT_OFM_VERSION;
  private tileJsonFetchedAt = 0;
  private readonly tileCache = new Map<string, ParsedVectorTileLayers>();
  private readonly pendingTiles = new Map<string, Promise<{ parsed: ParsedVectorTileLayers; cacheHit: boolean }>>();

  private async ensureTileTemplate(): Promise<void> {
    if (Date.now() - this.tileJsonFetchedAt < 10 * 60_000) return;
    const ctrl = new AbortController();
    const timer = globalThis.setTimeout(() => ctrl.abort(), 3500);
    try {
      const res = await fetch(OFM_TILEJSON_URL, { signal: ctrl.signal });
      if (!res.ok) return;
      const json = (await res.json()) as { tiles?: string[] };
      const first = json.tiles?.[0];
      if (first && first.includes("{z}/{x}/{y}")) {
        this.tileTemplate = first;
        const match = first.match(/\/planet\/([^/]+)\//);
        if (match) this.datasetVersion = match[1];
        this.tileJsonFetchedAt = Date.now();
      }
    } catch {
      // Keep safe default template if TileJSON metadata request fails
    } finally {
      globalThis.clearTimeout(timer);
    }
  }

  private async fetchSingleTile(
    x: number,
    y: number,
    z: number,
  ): Promise<{ parsed: ParsedVectorTileLayers; cacheHit: boolean }> {
    const key = `${z}/${x}/${y}`;
    const cached = this.tileCache.get(key);
    if (cached) {
      // Refresh LRU ordering
      lruSet(this.tileCache, key, cached, 48);
      return { parsed: cached, cacheHit: true };
    }
    const existing = this.pendingTiles.get(key);
    if (existing) return existing;

    const promise = (async () => {
      await this.ensureTileTemplate();
      const url = this.tileTemplate
        .replace("{z}", String(z))
        .replace("{x}", String(x))
        .replace("{y}", String(y));

      let lastErr: unknown;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const ctrl = new AbortController();
        const timer = globalThis.setTimeout(() => ctrl.abort(), 6500);
        try {
          const res = await fetch(url, { signal: ctrl.signal });
          if (res.status === 204 || res.status === 404) {
            const empty = decodeMvtTileBuffer(new Uint8Array(0), x, y, z, this.datasetVersion, this.name);
            lruSet(this.tileCache, key, empty, 48);
            return { parsed: empty, cacheHit: false };
          }
          if (!res.ok) {
            throw new Error(`HTTP ${res.status} (${key})`);
          }
          const buf = new Uint8Array(await res.arrayBuffer());
          const parsed = decodeMvtTileBuffer(buf, x, y, z, this.datasetVersion, this.name);
          lruSet(this.tileCache, key, parsed, 48);
          return { parsed, cacheHit: false };
        } catch (err) {
          lastErr = err;
          if (attempt === 0) {
            await new Promise((r) => globalThis.setTimeout(r, 140));
          }
        } finally {
          globalThis.clearTimeout(timer);
        }
      }
      throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
    })();

    this.pendingTiles.set(key, promise);
    try {
      return await promise;
    } finally {
      this.pendingTiles.delete(key);
    }
  }

  async fetchArea(
    lng: number,
    lat: number,
    radiusMeters: number,
    signal?: AbortSignal,
  ) {
    const tiles = tilesCoveringRadius(lng, lat, radiusMeters, 14);
    const cosLat = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
    const maxDegBldg = (radiusMeters + 90) / 111_320;
    const maxDegContext = (radiusMeters + 150) / 111_320;

    let tilesReceived = 0;
    let tileErrors = 0;
    let cacheHits = 0;
    const errors: string[] = [];

    const results = await Promise.all(
      tiles.map(async (tile) => {
        try {
          const res = await raceWithAbort(this.fetchSingleTile(tile.x, tile.y, tile.z), signal);
          tilesReceived += 1;
          if (res.cacheHit) cacheHits += 1;
          return res.parsed;
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") throw err;
          tileErrors += 1;
          errors.push(`MVT ${tile.z}/${tile.x}/${tile.y}: ${err instanceof Error ? err.message : String(err)}`);
          return null;
        }
      }),
    );

    const bldgMap = new Map<string, { feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>; distSq: number }>();
    const roadMap = new Map<string, { feature: GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>; distSq: number }>();
    const greenMap = new Map<string, { feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>; distSq: number }>();
    const landuseMap = new Map<string, { feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>; distSq: number }>();
    const landcoverMap = new Map<string, { feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>; distSq: number }>();
    const waterMap = new Map<string, { feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon | GeoJSON.LineString | GeoJSON.MultiLineString>; distSq: number }>();
    const poiMap = new Map<string, { feature: GeoJSON.Feature<GeoJSON.Point>; distSq: number }>();
    const placeMap = new Map<string, GeoJSON.Feature<GeoJSON.Point>>();
    const peakMap = new Map<string, GeoJSON.Feature<GeoJSON.Point>>();
    const streetMap = new Map<string, GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>>();

    for (const tile of results) {
      if (!tile) continue;
      for (const b of tile.buildings) {
        const prox = measureFeatureProximity(b.geometry.coordinates, lng, lat, cosLat, maxDegBldg);
        if (!prox.inRange) continue;
        const k = dedupeKeyForFeature("b", b);
        if (!bldgMap.has(k)) bldgMap.set(k, { feature: b, distSq: prox.distSq });
      }
      for (const r of tile.roads) {
        const prox = measureFeatureProximity(r.geometry.coordinates, lng, lat, cosLat, maxDegContext);
        if (!prox.inRange) continue;
        const k = dedupeKeyForFeature("r", r);
        if (!roadMap.has(k)) roadMap.set(k, { feature: r, distSq: prox.distSq });
      }
      for (const g of tile.greens) {
        const prox = measureFeatureProximity(g.geometry.coordinates, lng, lat, cosLat, maxDegContext);
        if (!prox.inRange) continue;
        const k = dedupeKeyForFeature("g", g);
        if (!greenMap.has(k)) greenMap.set(k, { feature: g, distSq: prox.distSq });
      }
      for (const lu of tile.landuses) {
        const prox = measureFeatureProximity(lu.geometry.coordinates, lng, lat, cosLat, maxDegContext);
        if (!prox.inRange) continue;
        const k = dedupeKeyForFeature("lu", lu);
        if (!landuseMap.has(k)) landuseMap.set(k, { feature: lu, distSq: prox.distSq });
      }
      for (const lc of tile.landcovers) {
        const prox = measureFeatureProximity(lc.geometry.coordinates, lng, lat, cosLat, maxDegContext);
        if (!prox.inRange) continue;
        const k = dedupeKeyForFeature("lc", lc);
        if (!landcoverMap.has(k)) landcoverMap.set(k, { feature: lc, distSq: prox.distSq });
      }
      for (const w of tile.waters) {
        const prox = measureFeatureProximity(w.geometry.coordinates, lng, lat, cosLat, maxDegContext);
        if (!prox.inRange) continue;
        const k = dedupeKeyForFeature("w", w);
        if (!waterMap.has(k)) waterMap.set(k, { feature: w, distSq: prox.distSq });
      }
      for (const p of tile.pois) {
        const prox = measureFeatureProximity(p.geometry.coordinates, lng, lat, cosLat, maxDegBldg);
        if (!prox.inRange) continue;
        const k = dedupeKeyForFeature("p", p);
        if (!poiMap.has(k)) poiMap.set(k, { feature: p, distSq: prox.distSq });
      }
      for (const pl of tile.places) {
        const k = dedupeKeyForFeature("pl", pl);
        if (!placeMap.has(k)) placeMap.set(k, pl);
      }
      for (const pk of tile.peaks) {
        const prox = measureFeatureProximity(pk.geometry.coordinates, lng, lat, cosLat, maxDegContext * 2);
        if (!prox.inRange) continue;
        const k = dedupeKeyForFeature("pk", pk);
        if (!peakMap.has(k)) peakMap.set(k, pk);
      }
      for (const sn of tile.streetNames) {
        const prox = measureFeatureProximity(sn.geometry.coordinates, lng, lat, cosLat, maxDegContext);
        if (!prox.inRange) continue;
        const k = dedupeKeyForFeature("sn", sn);
        if (!streetMap.has(k)) streetMap.set(k, sn);
      }
    }

    const byDist = <T>(m: Map<string, { feature: T; distSq: number }>, limit: number): T[] =>
      [...m.values()]
        .sort((a, b) => a.distSq - b.distSq)
        .slice(0, limit)
        .map((e) => e.feature);

    return {
      layers: {
        buildings: byDist(bldgMap, 340),
        roads: byDist(roadMap, 900),
        greens: byDist(greenMap, 360),
        landuses: byDist(landuseMap, 260),
        landcovers: byDist(landcoverMap, 260),
        waters: byDist(waterMap, 240),
        pois: byDist(poiMap, 180),
        places: [...placeMap.values()].slice(0, 40),
        peaks: [...peakMap.values()].slice(0, 30),
        streetNames: [...streetMap.values()].slice(0, 260),
      },
      tilesRequested: tiles.length,
      tilesReceived,
      tileErrors,
      cacheHits,
      datasetVersion: this.datasetVersion,
      errors,
    };
  }

  prefetchAround(lng: number, lat: number, dirX: number, dirZ: number): void {
    const cosLat = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
    const aheadLng = lng + (dirX * 260) / (111_320 * cosLat);
    const aheadLat = lat - (dirZ * 260) / 111_320;
    for (const tile of tilesCoveringRadius(aheadLng, aheadLat, 160, 14)) {
      const key = `${tile.z}/${tile.x}/${tile.y}`;
      if (this.tileCache.has(key) || this.pendingTiles.has(key)) continue;
      void this.fetchSingleTile(tile.x, tile.y, tile.z).catch(() => {});
    }
  }
}

interface DecodedDemTile {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}

export class MapterhornDemProvider implements ElevationProvider {
  readonly id = "mapterhorn-terrarium";
  private readonly tileCache = new Map<string, DecodedDemTile>();
  private readonly pendingTiles = new Map<string, Promise<DecodedDemTile>>();

  private async decodeImagePixels(blob: Blob): Promise<DecodedDemTile> {
    if (typeof createImageBitmap !== "function") {
      throw new Error("ImageBitmap decoder unavailable in current runtime");
    }
    const bitmap = await createImageBitmap(blob);
    const w = bitmap.width;
    const h = bitmap.height;
    try {
      if (typeof OffscreenCanvas !== "undefined") {
        const canvas = new OffscreenCanvas(w, h);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0);
          return { width: w, height: h, pixels: ctx.getImageData(0, 0, w, h).data };
        }
      }
      if (typeof document !== "undefined") {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0);
          return { width: w, height: h, pixels: ctx.getImageData(0, 0, w, h).data };
        }
      }
      throw new Error("Canvas 2D unavailable for DEM decoding");
    } finally {
      bitmap.close?.();
    }
  }

  private async fetchTile(tx: number, ty: number): Promise<DecodedDemTile> {
    const key = `12/${tx}/${ty}`;
    const cached = this.tileCache.get(key);
    if (cached) {
      lruSet(this.tileCache, key, cached, 24);
      return cached;
    }
    const existing = this.pendingTiles.get(key);
    if (existing) return existing;

    const promise = (async () => {
      const urls = [
        `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/${tx}/${ty}.png`,
        `https://elevation-tiles-prod.s3.amazonaws.com/terrarium/12/${tx}/${ty}.png`,
        MAPLIBRE_DEM_TILE_URL.replace("{z}", "12").replace("{x}", String(tx)).replace("{y}", String(ty)),
        MAPTERHORN_TILE_URL.replace("{z}", "12").replace("{x}", String(tx)).replace("{y}", String(ty)),
      ];
      const failures: string[] = [];
      for (const url of urls) {
        const ctrl = new AbortController();
        const timer = globalThis.setTimeout(() => ctrl.abort(), 4000);
        try {
          const res = await fetch(url, { signal: ctrl.signal, mode: "cors" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          const decoded = await this.decodeImagePixels(blob);
          lruSet(this.tileCache, key, decoded, 24);
          return decoded;
        } catch (err) {
          failures.push(`${new URL(url).hostname}: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
          globalThis.clearTimeout(timer);
        }
      }
      throw new Error(`All Terrarium DEM providers failed (${failures.join("; ")})`);
    })();

    this.pendingTiles.set(key, promise);
    try {
      return await promise;
    } finally {
      this.pendingTiles.delete(key);
    }
  }

  private sampleBilinear(tile: DecodedDemTile, px: number, py: number): number {
    const x0 = Math.max(0, Math.min(tile.width - 1, Math.floor(px)));
    const y0 = Math.max(0, Math.min(tile.height - 1, Math.floor(py)));
    const x1 = Math.min(tile.width - 1, x0 + 1);
    const y1 = Math.min(tile.height - 1, y0 + 1);
    const fx = px - x0;
    const fy = py - y0;
    const at = (cx: number, cy: number): number => {
      const idx = (cy * tile.width + cx) * 4;
      return decodeTerrariumRgb(tile.pixels[idx], tile.pixels[idx + 1], tile.pixels[idx + 2]);
    };
    const top = at(x0, y0) * (1 - fx) + at(x1, y0) * fx;
    const bot = at(x0, y1) * (1 - fx) + at(x1, y1) * fx;
    return top * (1 - fy) + bot * fy;
  }

  async fetchTerrainGrid(
    lng: number,
    lat: number,
    sizeMeters: number,
    segments: number,
    signal?: AbortSignal,
  ) {
    if (typeof createImageBitmap !== "function") {
      return {
        status: "unavailable" as const,
        terrain: [],
        originElevationMeters: null,
        minElevationDelta: 0,
        maxElevationDelta: 0,
        sourceLabel: "Mapterhorn Terrarium DEM",
      };
    }

    const metersPerLng = Math.max(1000, 111_320 * Math.cos((lat * Math.PI) / 180));
    const half = sizeMeters * 0.5;
    const corners = [
      { lng, lat },
      { lng: lng - half / metersPerLng, lat: lat + half / 111_320 },
      { lng: lng + half / metersPerLng, lat: lat - half / 111_320 },
    ];
    const needed = new Map<string, { x: number; y: number }>();
    // Load every DEM tile touched by the actual terrain grid, not just the
    // origin and two diagonal corners (which can miss tiles on wide grids).
    for (const c of corners) {
      const t = lngLatToTile(c.lng, c.lat, 12);
      needed.set(`${t.x}/${t.y}`, { x: t.x, y: t.y });
    }
    for (let row = 0; row <= segments; row += 1) {
      for (let col = 0; col <= segments; col += 1) {
        const sampleLng = lng + ((col / segments) * sizeMeters - half) / metersPerLng;
        const sampleLat = lat - ((row / segments) * sizeMeters - half) / 111_320;
        const t = lngLatToTile(sampleLng, sampleLat, 12);
        needed.set(`${t.x}/${t.y}`, { x: t.x, y: t.y });
      }
    }

    const loadedTiles = new Map<string, DecodedDemTile>();
    try {
      await Promise.all(
        [...needed.values()].map(async (t) => {
          const tile = await raceWithAbort(this.fetchTile(t.x, t.y), signal);
          loadedTiles.set(`${t.x}/${t.y}`, tile);
        }),
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      return {
        status: "error" as const,
        terrain: [],
        originElevationMeters: null,
        minElevationDelta: 0,
        maxElevationDelta: 0,
        sourceLabel: "Mapterhorn Terrarium DEM",
        error: `DEM: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    const sampleGeo = (sLng: number, sLat: number): number => {
      const p = lngLatToTilePixel(sLng, sLat, 12, 512);
      const tile = loadedTiles.get(`${p.tileX}/${p.tileY}`);
      if (!tile) return 0;
      const sx = (p.px / 512) * tile.width;
      const sy = (p.py / 512) * tile.height;
      return this.sampleBilinear(tile, sx, sy);
    };

    const originElevation = sampleGeo(lng, lat);
    const terrain: TerrainElevationSample[] = [];
    let minDelta = Infinity;
    let maxDelta = -Infinity;

    for (let row = 0; row <= segments; row += 1) {
      for (let col = 0; col <= segments; col += 1) {
        const x = -half + (col / segments) * sizeMeters;
        const z = -half + (row / segments) * sizeMeters;
        const sLng = lng + x / metersPerLng;
        const sLat = lat - z / 111_320;
        const absElev = sampleGeo(sLng, sLat);
        // Keep sea-level oceans slightly below 0 if real ocean floor / shoreline is negative while spawn at origin sits around y = 0
        const delta = Math.max(-45, Math.min(180, absElev - originElevation));
        if (delta < minDelta) minDelta = delta;
        if (delta > maxDelta) maxDelta = delta;
        terrain.push({ x, z, elevation: Math.round(delta * 100) / 100 });
      }
    }

    return {
      status: "available" as const,
      terrain,
      originElevationMeters: Math.round(originElevation * 10) / 10,
      minElevationDelta: Number.isFinite(minDelta) ? Math.round(minDelta * 10) / 10 : 0,
      maxElevationDelta: Number.isFinite(maxDelta) ? Math.round(maxDelta * 10) / 10 : 0,
      sourceLabel: "Mapterhorn Terrarium DEM (z12)",
    };
  }
}

export class WikipediaGeoSearchProvider implements HeritageProvider {
  readonly id = "wikipedia-geosearch";
  private readonly cache = new Map<string, HeritageSiteRecord[]>();

  async fetchHeritageNear(
    lng: number,
    lat: number,
    radiusMeters: number,
    language: "en" | "fr",
    signal?: AbortSignal,
  ) {
    const key = `${language}:${lat.toFixed(3)}:${lng.toFixed(3)}`;
    const cached = this.cache.get(key);
    if (cached) {
      return { sites: cached, sourceLabel: `${language}.wikipedia.org` };
    }

    const wikiHost = language === "fr" ? "fr.wikipedia.org" : "en.wikipedia.org";
    const radius = Math.max(150, Math.min(600, Math.round(radiusMeters)));
    const url = `https://${wikiHost}/w/api.php?action=query&list=geosearch&gscoord=${lat.toFixed(6)}|${lng.toFixed(6)}&gsradius=${radius}&gslimit=10&format=json&origin=*`;

    const ctrl = new AbortController();
    const timer = globalThis.setTimeout(() => ctrl.abort(), 2400);
    const onParentAbort = () => ctrl.abort();
    signal?.addEventListener("abort", onParentAbort, { once: true });

    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) {
        return { sites: [], error: `Wikipedia HTTP ${res.status}` };
      }
      const data = (await res.json()) as {
        query?: {
          geosearch?: Array<{
            pageid: number;
            title: string;
            lat: number;
            lon: number;
            dist: number;
          }>;
        };
      };
      const sites: HeritageSiteRecord[] = (data.query?.geosearch ?? []).map((item) => ({
        id: `wiki-${item.pageid}`,
        name: item.title,
        lng: item.lon,
        lat: item.lat,
        distanceMeters: Math.round(item.dist),
        source: "wikipedia",
      }));
      lruSet(this.cache, key, sites, 32);
      return { sites, sourceLabel: wikiHost };
    } catch (err) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      return { sites: [], error: `Wikipedia: ${err instanceof Error ? err.message : String(err)}` };
    } finally {
      globalThis.clearTimeout(timer);
      signal?.removeEventListener("abort", onParentAbort);
    }
  }
}

export function classifyAreaDiagnostics(params: {
  origin: [number, number];
  regionName: string;
  tilesRequested: number;
  tilesReceived: number;
  tileErrors: number;
  cacheHits: number;
  fetchMs: number;
  datasetVersion: string;
  sourcesUsed: string[];
  elevationStatus: "available" | "unavailable" | "error";
  originElevationMeters: number | null;
  minElevationDelta: number;
  maxElevationDelta: number;
  buildingsCount: number;
  roadsCount: number;
  greensCount: number;
  watersCount: number;
  poisCount: number;
  landusesCount: number;
  places: GeoJSON.Feature<GeoJSON.Point>[];
  peaks: GeoJSON.Feature<GeoJSON.Point>[];
  heritageCount: number;
  landcovers: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[];
  errors: string[];
}): GeoDataDiagnostics {
  const missingCategories: string[] = [];
  if (params.buildingsCount === 0) missingCategories.push("buildings");
  if (params.roadsCount === 0) missingCategories.push("roads");
  if (params.greensCount === 0 && params.watersCount === 0) missingCategories.push("landcover");
  if (params.poisCount === 0 && params.heritageCount === 0) missingCategories.push("pois");
  if (params.elevationStatus !== "available") missingCategories.push("elevation");

  // Prefer the nearest mapped settlement label. A distant city label elsewhere in the
  // requested tiles must not turn a small village into a dense city.
  let settlementType: GeoSettlementType = "unknown";
  const placeCandidates = params.places
    .filter((p) => p.geometry?.type === "Point")
    .map((p) => {
      const [placeLng, placeLat] = p.geometry.coordinates;
      const dx = (placeLng - params.origin[0]) * Math.cos((params.origin[1] * Math.PI) / 180);
      const dy = placeLat - params.origin[1];
      return {
        kind: String(p.properties?.class ?? "").toLowerCase(),
        distanceMeters: Math.hypot(dx, dy) * 111_320,
      };
    })
    .filter((p) => p.kind.length > 0)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
  const nearestPlace = placeCandidates.find((p) => p.distanceMeters <= 3000);
  const reliefSpan = params.maxElevationDelta - params.minElevationDelta;
  const hasBeachOrCoast = params.landcovers.some((lc) =>
    /sand|beach/.test(String(lc.properties?.class ?? lc.properties?.subclass ?? "").toLowerCase()),
  ) || (params.watersCount > 0 && params.buildingsCount < 85 && params.landusesCount < 20);

  if (nearestPlace && ["city", "suburb", "neighbourhood", "quarter"].includes(nearestPlace.kind)) {
    settlementType = "dense_city";
  } else if (nearestPlace?.kind === "town") {
    settlementType = "town";
  } else if (nearestPlace && ["village", "hamlet", "isolated_dwelling"].includes(nearestPlace.kind)) {
    settlementType = "village";
  } else if (params.buildingsCount >= 55) {
    settlementType = "dense_city";
  } else if (params.buildingsCount >= 18) {
    settlementType = "town";
  } else if (params.buildingsCount >= 4) {
    settlementType = "village";
  } else if (params.peaks.length > 0 || reliefSpan >= 28 || (params.originElevationMeters ?? 0) > 850) {
    settlementType = "mountain";
  } else if (hasBeachOrCoast && params.watersCount > 0 && params.buildingsCount < 25) {
    settlementType = "coastal";
  } else if (params.roadsCount > 0 || params.greensCount > 0) {
    settlementType = "rural";
  } else if (params.tilesReceived > 0) {
    settlementType = "natural";
  }

  let status: GeoDataStatus;
  if (params.tilesReceived === 0 && params.tileErrors > 0) {
    status = "error";
  } else if (params.tilesReceived === 0) {
    status = "unavailable";
  } else if (
    (params.buildingsCount >= 8 || params.roadsCount >= 5)
    && params.elevationStatus === "available"
    && params.tileErrors === 0
  ) {
    status = "complete";
  } else if (
    params.buildingsCount >= 1
    || params.roadsCount >= 2
    || params.greensCount >= 2
    || params.watersCount >= 1
    || params.peaks.length >= 1
  ) {
    status = "partial";
  } else {
    status = "sparse_real";
  }

  // Infer best readable place name from OSM place / mountain_peak features if none provided
  const namedPlace = params.places.find((p) => p.properties?.name || p.properties?.name_en);
  const inferredName = String(
    namedPlace?.properties?.name_en ?? namedPlace?.properties?.name ?? "",
  ).trim();

  return {
    status,
    origin: params.origin,
    regionName: params.regionName || inferredName || `${params.origin[1].toFixed(4)}, ${params.origin[0].toFixed(4)}`,
    settlementType,
    tilesRequested: params.tilesRequested,
    tilesReceived: params.tilesReceived,
    tileErrors: params.tileErrors,
    cacheHits: params.cacheHits,
    fetchMs: params.fetchMs,
    datasetVersion: params.datasetVersion,
    sourcesUsed: params.sourcesUsed,
    elevationStatus: params.elevationStatus,
    originElevationMeters: params.originElevationMeters,
    minElevationDelta: params.minElevationDelta,
    maxElevationDelta: params.maxElevationDelta,
    counts: {
      buildings: params.buildingsCount,
      roads: params.roadsCount,
      greens: params.greensCount,
      waters: params.watersCount,
      pois: params.poisCount,
      landuses: params.landusesCount,
      places: params.places.length,
      peaks: params.peaks.length,
      heritage: params.heritageCount,
      generated3dObjects: 0,
    },
    missingCategories,
    errors: params.errors,
  };
}

export class GeoDataEngine {
  readonly vectorProvider: VectorWorldProvider;
  readonly elevationProvider: ElevationProvider;
  readonly heritageProvider: HeritageProvider;

  constructor(deps?: {
    vectorProvider?: VectorWorldProvider;
    elevationProvider?: ElevationProvider;
    heritageProvider?: HeritageProvider;
  }) {
    this.vectorProvider = deps?.vectorProvider ?? new OpenFreeMapMvtProvider();
    this.elevationProvider = deps?.elevationProvider ?? new MapterhornDemProvider();
    this.heritageProvider = deps?.heritageProvider ?? new WikipediaGeoSearchProvider();
  }

  async loadArea(
    lng: number,
    lat: number,
    options?: {
      radiusMeters?: number;
      terrainSize?: number;
      terrainSegments?: number;
      language?: "en" | "fr";
      regionName?: string;
      signal?: AbortSignal;
      includeHeritage?: boolean;
    },
  ): Promise<LoadedGeoAreaResult> {
    const startMs = performance.now();
    const radiusMeters = options?.radiusMeters ?? 230;
    const terrainSize = options?.terrainSize ?? 440;
    const terrainSegments = options?.terrainSegments ?? 18;
    const language = options?.language ?? "fr";

    const vectorPromise = this.vectorProvider.fetchArea(lng, lat, radiusMeters, options?.signal);
    const elevationPromise = this.elevationProvider.fetchTerrainGrid(
      lng,
      lat,
      terrainSize,
      terrainSegments,
      options?.signal,
    );
    const heritagePromise = options?.includeHeritage === false
      ? Promise.resolve({ sites: [] as HeritageSiteRecord[], sourceLabel: undefined, error: undefined })
      : this.heritageProvider.fetchHeritageNear(lng, lat, radiusMeters * 1.4, language, options?.signal);

    const [vectorRes, elevationRes, heritageRes] = await Promise.all([
      vectorPromise,
      elevationPromise,
      heritagePromise,
    ]);

    const sourcesUsed = [this.vectorProvider.name];
    if (elevationRes.status === "available") sourcesUsed.push(elevationRes.sourceLabel);
    if (heritageRes.sourceLabel && heritageRes.sites.length > 0) {
      sourcesUsed.push(`Wikipedia (${heritageRes.sourceLabel})`);
    }

    const errors = [...vectorRes.errors];
    if (elevationRes.error) errors.push(elevationRes.error);
    if (heritageRes.error) errors.push(heritageRes.error);

    const diagnostics = classifyAreaDiagnostics({
      origin: [lng, lat],
      regionName: options?.regionName ?? "",
      tilesRequested: vectorRes.tilesRequested,
      tilesReceived: vectorRes.tilesReceived,
      tileErrors: vectorRes.tileErrors,
      cacheHits: vectorRes.cacheHits,
      fetchMs: Math.round(performance.now() - startMs),
      datasetVersion: vectorRes.datasetVersion,
      sourcesUsed,
      elevationStatus: elevationRes.status,
      originElevationMeters: elevationRes.originElevationMeters,
      minElevationDelta: elevationRes.minElevationDelta,
      maxElevationDelta: elevationRes.maxElevationDelta,
      buildingsCount: vectorRes.layers.buildings.length,
      roadsCount: vectorRes.layers.roads.length,
      greensCount: vectorRes.layers.greens.length,
      watersCount: vectorRes.layers.waters.length,
      poisCount: vectorRes.layers.pois.length,
      landusesCount: vectorRes.layers.landuses.length,
      places: vectorRes.layers.places,
      peaks: vectorRes.layers.peaks,
      heritageCount: heritageRes.sites.length,
      landcovers: vectorRes.layers.landcovers,
      errors,
    });

    return {
      origin: [lng, lat],
      buildings: vectorRes.layers.buildings,
      roads: vectorRes.layers.roads,
      greens: vectorRes.layers.greens,
      landuses: vectorRes.layers.landuses,
      landcovers: vectorRes.layers.landcovers,
      waters: vectorRes.layers.waters,
      pois: vectorRes.layers.pois,
      places: vectorRes.layers.places,
      peaks: vectorRes.layers.peaks,
      streetNames: vectorRes.layers.streetNames,
      heritageSites: heritageRes.sites,
      terrain: elevationRes.terrain,
      terrainSize,
      terrainSegments,
      originElevationMeters: elevationRes.originElevationMeters,
      diagnostics,
    };
  }

  prefetchAhead(lng: number, lat: number, dirX: number, dirZ: number): void {
    this.vectorProvider.prefetchAround?.(lng, lat, dirX, dirZ);
  }
}
