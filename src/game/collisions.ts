export interface ScreenPoint {
  x: number;
  y: number;
}

export function collisionSampleOffsets(radius: number): [number, number][] {
  const safeRadius = Math.max(0, Number.isFinite(radius) ? radius : 0);
  return [
    [0, 0],
    [safeRadius, 0],
    [-safeRadius, 0],
    [0, safeRadius],
    [0, -safeRadius],
    [safeRadius * 0.7, safeRadius * 0.7],
    [-safeRadius * 0.7, safeRadius * 0.7],
    [safeRadius * 0.7, -safeRadius * 0.7],
    [-safeRadius * 0.7, -safeRadius * 0.7],
  ];
}

export function circlesOverlap(
  first: ScreenPoint,
  second: ScreenPoint,
  firstRadius: number,
  secondRadius: number,
): boolean {
  if (![first.x, first.y, second.x, second.y, firstRadius, secondRadius].every(Number.isFinite)) return false;
  if (firstRadius < 0 || secondRadius < 0) return false;
  return Math.hypot(first.x - second.x, first.y - second.y) < firstRadius + secondRadius;
}

export interface CollisionBounds {
  minX: number; maxX: number; minZ: number; maxZ: number;
}

/** Uniform spatial hash for broad-phase collision checks in dense mapped areas. */
export class SpatialCollisionIndex<T> {
  private readonly cells = new Map<string, Set<T>>();
  private readonly boundsByItem = new Map<T, CollisionBounds>();

  readonly cellSize: number;

  constructor(cellSize = 32) {
    if (!Number.isFinite(cellSize) || cellSize <= 0) throw new RangeError("cellSize must be positive");
    this.cellSize = cellSize;
  }

  private key(x: number, z: number): string {
    return `${x},${z}`;
  }

  private cellRange(bounds: CollisionBounds): [number, number, number, number] {
    return [
      Math.floor(bounds.minX / this.cellSize), Math.floor(bounds.maxX / this.cellSize),
      Math.floor(bounds.minZ / this.cellSize), Math.floor(bounds.maxZ / this.cellSize),
    ];
  }

  insert(item: T, bounds: CollisionBounds): void {
    if (![bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ].every(Number.isFinite) ||
        bounds.minX > bounds.maxX || bounds.minZ > bounds.maxZ) return;
    this.remove(item);
    this.boundsByItem.set(item, { ...bounds });
    const [minX, maxX, minZ, maxZ] = this.cellRange(bounds);
    for (let x = minX; x <= maxX; x += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        const key = this.key(x, z);
        const cell = this.cells.get(key) ?? new Set<T>();
        cell.add(item);
        this.cells.set(key, cell);
      }
    }
  }

  remove(item: T): void {
    const bounds = this.boundsByItem.get(item);
    if (!bounds) return;
    const [minX, maxX, minZ, maxZ] = this.cellRange(bounds);
    for (let x = minX; x <= maxX; x += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        const key = this.key(x, z);
        const cell = this.cells.get(key);
        cell?.delete(item);
        if (cell?.size === 0) this.cells.delete(key);
      }
    }
    this.boundsByItem.delete(item);
  }

  query(bounds: CollisionBounds): T[] {
    if (![bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ].every(Number.isFinite) ||
        bounds.minX > bounds.maxX || bounds.minZ > bounds.maxZ) return [];
    const [minX, maxX, minZ, maxZ] = this.cellRange(bounds);
    const found = new Set<T>();
    for (let x = minX; x <= maxX; x += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        this.cells.get(this.key(x, z))?.forEach((item) => found.add(item));
      }
    }
    return [...found].filter((item) => {
      const b = this.boundsByItem.get(item);
      return !!b && b.maxX >= bounds.minX && b.minX <= bounds.maxX &&
        b.maxZ >= bounds.minZ && b.minZ <= bounds.maxZ;
    });
  }

  get size(): number { return this.boundsByItem.size; }
}
