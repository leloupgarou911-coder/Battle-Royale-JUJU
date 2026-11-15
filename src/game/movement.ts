import { EARTH_RADIUS_METERS } from "./zones.ts";

export interface GeographicPoint {
  lng: number;
  lat: number;
}

export interface Direction {
  x: number;
  y: number;
}

export function normalizeDirection(direction: Direction): Direction | null {
  const length = Math.hypot(direction.x, direction.y);
  if (!Number.isFinite(length) || length === 0) return null;
  return { x: direction.x / length, y: direction.y / length };
}

export function destinationFromDirection(
  origin: GeographicPoint,
  direction: Direction,
  distanceMeters: number,
): GeographicPoint {
  if (![origin.lng, origin.lat, direction.x, direction.y, distanceMeters].every(Number.isFinite)) {
    throw new RangeError("Movement inputs must be finite numbers.");
  }
  if (distanceMeters < 0) throw new RangeError("Movement distance cannot be negative.");
  const normalized = normalizeDirection(direction);
  if (!normalized || distanceMeters === 0) return { lng: origin.lng, lat: origin.lat };

  // The game screen uses positive Y for south; bearing is measured clockwise from north.
  const bearing = Math.atan2(normalized.x, -normalized.y);
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;
  const latitude = origin.lat * Math.PI / 180;
  const nextLatitude = Math.asin(
    Math.sin(latitude) * Math.cos(angularDistance)
    + Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const nextLongitude = origin.lng * Math.PI / 180 + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
    Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(nextLatitude),
  );
  return {
    lng: ((nextLongitude * 180 / Math.PI + 540) % 360) - 180,
    lat: nextLatitude * 180 / Math.PI,
  };
}

export function haversineDistance(from: GeographicPoint, to: GeographicPoint): number {
  const radians = Math.PI / 180;
  const latitude1 = from.lat * radians;
  const latitude2 = to.lat * radians;
  const deltaLatitude = (to.lat - from.lat) * radians;
  const deltaLongitude = (to.lng - from.lng) * radians;
  const a = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLongitude / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
