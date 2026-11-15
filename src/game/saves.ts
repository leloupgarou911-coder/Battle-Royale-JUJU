export const SESSION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export interface SavedGameSession {
  lng: number;
  lat: number;
  zoneX: number;
  zoneY: number;
  movementSpeed: number;
  zoom: number;
  savedAt: number;
}

export function isValidGameSession(
  value: unknown,
  now = Date.now(),
  maxAgeMs = SESSION_MAX_AGE_MS,
): value is SavedGameSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<SavedGameSession>;
  return Number.isFinite(session.lng) && (session.lng as number) >= -180 && (session.lng as number) <= 180
    && Number.isFinite(session.lat) && (session.lat as number) >= -85.051129 && (session.lat as number) <= 85.051129
    && Number.isInteger(session.zoneX) && Number.isInteger(session.zoneY)
    && Number.isFinite(session.movementSpeed) && (session.movementSpeed as number) >= 1 && (session.movementSpeed as number) <= 360
    && Number.isFinite(session.zoom) && (session.zoom as number) >= 0 && (session.zoom as number) <= 24
    && Number.isFinite(session.savedAt) && (session.savedAt as number) <= now
    && now - (session.savedAt as number) <= maxAgeMs;
}
