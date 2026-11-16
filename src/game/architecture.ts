export interface InteriorBox {
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
}

export const TRAINING_BUILDING = {
  minX: -6,
  maxX: 6,
  minZ: -20.2,
  maxZ: -9.2,
  doorX: 0,
  doorZ: -8.6,
  exitZ: -9,
  stairMinX: 3.55,
  stairMaxX: 5.55,
  stairBottomZ: -19,
  stairTopZ: -12.15,
  upperFloorZ: -12.15,
  upperFloorHeight: 3.2,
} as const;

export function interiorGroundHeight(x: number, z: number, floor: number): number | null {
  const bounds = TRAINING_BUILDING;
  if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) return null;
  if (z > bounds.upperFloorZ) return x > 3.2 || floor === 1 ? bounds.upperFloorHeight : 0;
  if (x > bounds.stairMinX && x < bounds.stairMaxX &&
      z >= bounds.stairBottomZ && z <= bounds.stairTopZ) {
    return Math.max(0, Math.min(1, (z - bounds.stairBottomZ) /
      (bounds.stairTopZ - bounds.stairBottomZ))) * bounds.upperFloorHeight;
  }
  return 0;
}

export function circleIntersectsInteriorBox(x: number, z: number, radius: number, box: InteriorBox): boolean {
  const nearestX = Math.max(box.x - box.halfX, Math.min(x, box.x + box.halfX));
  const nearestZ = Math.max(box.z - box.halfZ, Math.min(z, box.z + box.halfZ));
  return Math.hypot(x - nearestX, z - nearestZ) < radius;
}
