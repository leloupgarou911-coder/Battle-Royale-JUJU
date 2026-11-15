import test from "node:test";
import assert from "node:assert/strict";
import {
  GAME_ZONE_METERS,
  createZoneObstacles,
  spawnForZone,
  zoneAtOffset,
  zoneBounds,
  zoneFor,
  zonePolygon,
} from "../src/game/zones.ts";
import {
  destinationFromDirection,
  haversineDistance,
  normalizeDirection,
} from "../src/game/movement.ts";
import { classifyBuilding, createInteriorLayout } from "../src/game/interiors.ts";
import { applyDailyMissionProgress, createDailyMissionState, emptyProgress, normalizeProgress, recordDiscoveredCity, recordDiscoveredZone, recordTravelDistance } from "../src/game/progression.ts";
import { detectStreamingProfile } from "../src/game/streaming.ts";

test("zone centres map back to their own zone at the equator and higher latitudes", () => {
  for (const latitude of [0, 35, 60, 80, -35, -60, -80]) {
    const zone = zoneFor(12.5, latitude);
    const [lng, lat] = spawnForZone(zone.x, zone.y);
    assert.equal(zoneFor(lng, lat).key, zone.key);
  }
});

test("zone width is approximately 750 metres at several latitudes", () => {
  for (const latitude of [0, 35, 60, 80, -60]) {
    const zone = zoneFor(12.5, latitude);
    const bounds = zoneBounds(zone.x, zone.y);
    const west = { lng: bounds.west, lat: (bounds.south + bounds.north) / 2 };
    const east = { lng: bounds.east, lat: west.lat };
    const width = haversineDistance(west, east);
    assert.ok(Math.abs(width - GAME_ZONE_METERS) < 2, `width at ${latitude}° was ${width}m`);
  }
});

test("zone height is approximately 750 metres", () => {
  for (const latitude of [0, 35, 60, -60]) {
    const zone = zoneFor(12.5, latitude);
    const bounds = zoneBounds(zone.x, zone.y);
    const centreLng = (bounds.west + bounds.east) / 2;
    const height = haversineDistance(
      { lng: centreLng, lat: bounds.south },
      { lng: centreLng, lat: bounds.north },
    );
    assert.ok(Math.abs(height - GAME_ZONE_METERS) < 0.01);
  }
});

test("zone polygons close and match their calculated bounds", () => {
  const zone = zoneFor(-73.9, 40.7);
  const polygon = zonePolygon(zone.x, zone.y);
  const ring = polygon.geometry.coordinates[0];
  assert.deepEqual(ring[0], ring[ring.length - 1]);
  const bounds = zoneBounds(zone.x, zone.y);
  assert.equal(ring[0][0], bounds.west);
  assert.equal(ring[2][1], bounds.north);
});

test("neighbour offsets move east, west, north and south", () => {
  const origin = zoneFor(2.35, 48.86);
  const [lng, lat] = spawnForZone(origin.x, origin.y);
  assert.ok(spawnForZone(zoneAtOffset(origin.x, origin.y, 1, 0).x, zoneAtOffset(origin.x, origin.y, 1, 0).y)[0] > lng);
  assert.ok(spawnForZone(zoneAtOffset(origin.x, origin.y, -1, 0).x, zoneAtOffset(origin.x, origin.y, -1, 0).y)[0] < lng);
  assert.ok(spawnForZone(zoneAtOffset(origin.x, origin.y, 0, -1).x, zoneAtOffset(origin.x, origin.y, 0, -1).y)[1] > lat);
  assert.ok(spawnForZone(zoneAtOffset(origin.x, origin.y, 0, 1).x, zoneAtOffset(origin.x, origin.y, 0, 1).y)[1] < lat);
});

test("procedural obstacles are deterministic and stay inside their zone", () => {
  const zone = zoneFor(3.05, 36.75);
  const first = createZoneObstacles(zone.x, zone.y);
  const second = createZoneObstacles(zone.x, zone.y);
  assert.deepEqual(first, second);
  const bounds = zoneBounds(zone.x, zone.y);
  for (const feature of first.features) {
    const [lng, lat] = feature.geometry.coordinates;
    assert.ok(lng >= bounds.west && lng <= bounds.east);
    assert.ok(lat >= bounds.south && lat <= bounds.north);
  }
});

test("movement normalizes diagonals and travels the requested distance", () => {
  assert.deepEqual(normalizeDirection({ x: 3, y: 4 }), { x: 0.6, y: 0.8 });
  const origin = { lng: 2.35, lat: 48.86 };
  for (const direction of [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: -1 }]) {
    const destination = destinationFromDirection(origin, direction, 120);
    assert.ok(Math.abs(haversineDistance(origin, destination) - 120) < 0.001);
  }
});

test("movement handles the international date line and rejects invalid inputs", () => {
  const east = destinationFromDirection({ lng: 179.999, lat: 0 }, { x: 1, y: 0 }, 500);
  assert.ok(east.lng < -179.99);
  assert.throws(() => destinationFromDirection({ lng: 0, lat: 0 }, { x: 1, y: 0 }, -1), RangeError);
  assert.equal(normalizeDirection({ x: 0, y: 0 }), null);
});

test("latitude-aware zones remain valid close to the poles and date line", () => {
  for (const point of [{ lng: 179.999, lat: 89.99 }, { lng: -179.999, lat: -89.99 }, { lng: 180, lat: 0 }]) {
    const zone = zoneFor(point.lng, point.lat);
    const bounds = zoneBounds(zone.x, zone.y);
    const [lng, lat] = spawnForZone(zone.x, zone.y);
    assert.ok(lng >= bounds.west && lng <= bounds.east);
    assert.ok(lat >= bounds.south && lat <= bounds.north);
    assert.equal(zoneFor(lng, lat).key, zone.key);
  }
});

test("building tags are classified into appropriate fictional interior templates", () => {
  assert.equal(classifyBuilding({ building: "school" }), "school");
  assert.equal(classifyBuilding({ building: "apartments" }), "apartment");
  assert.equal(classifyBuilding({ shop: "supermarket" }), "shop");
  assert.equal(classifyBuilding({ office: "company" }), "office");
  assert.equal(classifyBuilding({ building: "warehouse" }), "industrial");
  assert.equal(classifyBuilding({ building: "detached" }), "house");
  assert.equal(classifyBuilding({ building: "yes" }), "other");
  for (const kind of ["house", "apartment", "school", "shop", "office", "industrial", "other"]) {
    const layout = createInteriorLayout(kind);
    assert.ok(layout.objects.length > 0);
    assert.ok(layout.doors.length > 0);
    for (const item of layout.objects) {
      assert.ok(item.x >= 0 && item.x < 12);
      assert.ok(item.y >= 0 && item.y < 8);
    }
  }
});

test("interior layouts return independent copies", () => {
  const first = createInteriorLayout("house");
  const second = createInteriorLayout("house");
  first.objects[0].x = 11;
  assert.notEqual(second.objects[0].x, 11);
});

test("saved player progress is normalized and bounded", () => {
  const normalized = normalizeProgress({
    xp: -5,
    distanceMeters: 1200,
    remainder: 40,
    zones: Array.from({ length: 1005 }, (_, index) => String(index)),
    cities: Array.from({ length: 205 }, (_, index) => String(index)),
    achievements: ["first", 12, "second"],
  });
  assert.equal(normalized.xp, 0);
  assert.equal(normalized.remainder, 24.999);
  assert.equal(normalized.zones.length, 1000);
  assert.equal(normalized.cities.length, 200);
  assert.deepEqual(normalized.achievements, ["first", "second"]);
});

test("zone and city discovery award XP once only", () => {
  const progress = emptyProgress();
  assert.equal(recordDiscoveredZone(progress, 2, 3), true);
  assert.equal(recordDiscoveredZone(progress, 2, 3), false);
  assert.equal(recordDiscoveredCity(progress, "Oran", "Algeria"), true);
  assert.equal(recordDiscoveredCity(progress, " oran ", " algeria "), false);
  assert.equal(progress.xp, 75);
});

test("travel XP carries distance remainder without losing fractions", () => {
  const progress = emptyProgress();
  assert.equal(recordTravelDistance(progress, 12.5), 0);
  assert.equal(recordTravelDistance(progress, 12.5), 1);
  assert.equal(progress.xp, 1);
  assert.equal(progress.remainder, 0);
  assert.equal(progress.distanceMeters, 25);
});

test("daily missions reset on a new date and grant rewards only once", () => {
  const slot = { progress: emptyProgress(), dailyMissions: createDailyMissionState("2026-11-15") };
  const first = applyDailyMissionProgress(slot, "zones", 2, "2026-11-15", 1000);
  assert.deepEqual(first, { completed: false, rewardXp: 0 });
  const completed = applyDailyMissionProgress(slot, "zones", 1, "2026-11-15", 2000);
  assert.deepEqual(completed, { completed: true, rewardXp: 75 });
  const repeated = applyDailyMissionProgress(slot, "zones", 3, "2026-11-15", 3000);
  assert.deepEqual(repeated, { completed: false, rewardXp: 0 });
  assert.equal(slot.progress.xp, 75);
  assert.equal(slot.missionHistory.length, 1);
  applyDailyMissionProgress(slot, "zones", 1, "2026-11-16", 4000);
  assert.equal(slot.dailyMissions.date, "2026-11-16");
  assert.equal(slot.dailyMissions.missions[0].progress, 1);
});

test("mission progress rejects invalid or negative increments", () => {
  const slot = { progress: emptyProgress() };
  assert.equal(applyDailyMissionProgress(slot, "distance", -10, "2026-11-15", 1000).completed, false);
  assert.equal(applyDailyMissionProgress(slot, "unknown", 10, "2026-11-15", 1000).completed, false);
  assert.equal(slot.progress.xp, 0);
});

test("saved sessions reject invalid coordinates, corrupt settings and stale timestamps", async () => {
  const { isValidGameSession, SESSION_MAX_AGE_MS } = await import("../src/game/saves.ts");
  const now = 2_000_000_000_000;
  const valid = { lng: 3.05, lat: 36.75, zoneX: 12, zoneY: 20, movementSpeed: 4.5, zoom: 16, savedAt: now - 1000 };
  assert.equal(isValidGameSession(valid, now), true);
  assert.equal(isValidGameSession({ ...valid, lng: 181 }, now), false);
  assert.equal(isValidGameSession({ ...valid, movementSpeed: -1 }, now), false);
  assert.equal(isValidGameSession({ ...valid, zoom: 30 }, now), false);
  assert.equal(isValidGameSession({ ...valid, savedAt: now - SESSION_MAX_AGE_MS - 1 }, now), false);
  assert.equal(isValidGameSession({ ...valid, savedAt: now + 1 }, now), false);
});

test("adaptive streaming selects economy, balanced and performance budgets", () => {
  assert.deepEqual(detectStreamingProfile({ online: false }), {
    tier: "economy", tileCacheSize: 48, zoneCacheLimit: 25, prefetchDepth: 1,
  });
  assert.equal(detectStreamingProfile({ online: true, memory: 2, cores: 8 }).tier, "economy");
  assert.equal(detectStreamingProfile({ online: true, connection: { effectiveType: "3g" } }).tier, "economy");
  assert.equal(detectStreamingProfile({ online: true }).tier, "balanced");
  assert.deepEqual(detectStreamingProfile({
    online: true, memory: 8, cores: 8, connection: { downlink: 10 },
  }), { tier: "performance", tileCacheSize: 256, zoneCacheLimit: 81, prefetchDepth: 3 });
});
