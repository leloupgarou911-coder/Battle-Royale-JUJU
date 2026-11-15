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
