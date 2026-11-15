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
