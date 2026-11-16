import type { BuildingKind } from "./interiors.ts";

export interface PlanPoint { x: number; z: number; }
export interface PlanBounds { minX: number; maxX: number; minZ: number; maxZ: number; }
export interface PlanRoom { id: string; name: string; x: number; z: number; width: number; depth: number; floor: number; }
export interface PlanOpening { id: string; wall: "north" | "south" | "east" | "west"; offset: number; width: number; floor: number; kind: "door" | "window"; connectsTo?: string; }
export interface PlanFurniture { id: string; roomId: string; kind: string; x: number; z: number; floor: number; }
export interface ProceduralBuildingPlan {
  id: string;
  kind: BuildingKind;
  bounds: PlanBounds;
  width: number;
  depth: number;
  floors: number;
  wallHeight: number;
  rooms: PlanRoom[];
  openings: PlanOpening[];
  furniture: PlanFurniture[];
  stair: { x: number; z: number; width: number; run: number; rise: number; steps: number } | null;
}

const roomNames: Record<BuildingKind, string[]> = {
  house: ["Hall", "Living room", "Kitchen", "Bedroom"],
  apartment: ["Hall", "Living room", "Kitchen", "Bedroom"],
  school: ["Corridor", "Classroom", "Library", "Staff room"],
  shop: ["Sales floor", "Counter", "Stock room"],
  office: ["Reception", "Workspace", "Meeting room"],
  industrial: ["Workshop", "Storage", "Loading area"],
  other: ["Hall", "Main room", "Side room"],
};

const furniture: Record<BuildingKind, string[]> = {
  house: ["sofa", "table", "kitchen", "bed"],
  apartment: ["sofa", "table", "kitchen", "bed"],
  school: ["board", "desk", "desk", "locker"],
  shop: ["counter", "shelf", "shelf", "crate"],
  office: ["reception", "desk", "desk", "cabinet"],
  industrial: ["machine", "machine", "crate", "shelf"],
  other: ["chair", "table", "cabinet"],
};

function finiteBounds(points: PlanPoint[]): PlanBounds | null {
  if (points.length < 4 || points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.z))) return null;
  const bounds = points.reduce((b, p) => ({
    minX: Math.min(b.minX, p.x), maxX: Math.max(b.maxX, p.x),
    minZ: Math.min(b.minZ, p.z), maxZ: Math.max(b.maxZ, p.z),
  }), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity });
  return bounds.maxX - bounds.minX >= 5 && bounds.maxZ - bounds.minZ >= 5 ? bounds : null;
}

export function stableBuildingId(
  sourceId: string | number | undefined,
  bounds: PlanBounds,
): string {
  if (sourceId !== undefined && String(sourceId).trim()) return String(sourceId);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  return `osm-${Math.round(cx * 2)}-${Math.round(cz * 2)}`;
}

export function generateBuildingPlan(input: {
  points: PlanPoint[];
  sourceId?: string | number;
  tags?: Record<string, unknown>;
  kind: BuildingKind;
}): ProceduralBuildingPlan | null {
  const bounds = finiteBounds(input.points);
  if (!bounds) return null;
  const width = Math.min(80, bounds.maxX - bounds.minX);
  const depth = Math.min(80, bounds.maxZ - bounds.minZ);
  const tags = input.tags ?? {};
  const rawFloors = Number(tags["building:levels"] ?? tags.levels ?? 1);
  const floors = Math.max(1, Math.min(5, Number.isFinite(rawFloors) ? Math.round(rawFloors) : 1));
  const wallHeight = input.kind === "industrial" ? 4.8 : input.kind === "school" ? 3.8 : 3.2;
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  const names = roomNames[input.kind] ?? roomNames.other;
  const roomWidth = width / 2;
  const roomDepth = depth / 2;
  const rooms: PlanRoom[] = names.map((name, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    return {
      id: `room-${index}`, name,
      x: bounds.minX + roomWidth * (col + 0.5),
      z: bounds.minZ + roomDepth * (row + 0.5),
      width: roomWidth - 0.2, depth: roomDepth - 0.2,
      floor: Math.min(floors - 1, row),
    };
  });
  const openings: PlanOpening[] = [
    { id: "entrance", wall: "south", offset: 0, width: 1.15, floor: 0, kind: "door" },
    { id: "window-west", wall: "west", offset: -depth * 0.22, width: 1.4, floor: 0, kind: "window" },
    { id: "window-east", wall: "east", offset: depth * 0.22, width: 1.4, floor: 0, kind: "window" },
    { id: "room-door-a", wall: "north", offset: -width * 0.25, width: 0.95, floor: 0, kind: "door", connectsTo: "room-0" },
    { id: "room-door-b", wall: "north", offset: width * 0.25, width: 0.95, floor: 0, kind: "door", connectsTo: "room-1" },
  ];
  for (let floor = 1; floor < floors; floor += 1) {
    openings.push(
      { id: `window-west-${floor}`, wall: "west", offset: 0, width: 1.4, floor, kind: "window" },
      { id: `window-east-${floor}`, wall: "east", offset: 0, width: 1.4, floor, kind: "window" },
    );
  }
  const kinds = furniture[input.kind] ?? furniture.other;
  const furnishings = kinds.map((kind, index) => {
    const room = rooms[index % rooms.length];
    return {
      id: `furniture-${index}`, roomId: room.id, kind,
      x: room.x, z: room.z, floor: room.floor,
    };
  });
  const hasStairs = floors > 1;
  return {
    id: stableBuildingId(input.sourceId, bounds),
    kind: input.kind, bounds, width, depth, floors, wallHeight,
    rooms, openings, furniture: furnishings,
    stair: hasStairs ? {
      x: cx + width * 0.3, z: cz, width: 1.1,
      run: Math.min(5, depth * 0.42), rise: wallHeight, steps: Math.max(8, Math.round(wallHeight * 3.5)),
    } : null,
  };
}

export function isPlanWithinStreamingRadius(
  player: PlanPoint, plan: ProceduralBuildingPlan, radius: number,
): boolean {
  if (![player.x, player.z, radius].every(Number.isFinite) || radius < 0) return false;
  const cx = (plan.bounds.minX + plan.bounds.maxX) / 2;
  const cz = (plan.bounds.minZ + plan.bounds.maxZ) / 2;
  return Math.hypot(player.x - cx, player.z - cz) <= radius;
}

export function isPlanPositionBlocked(
  x: number, z: number, radius: number, plan: ProceduralBuildingPlan,
): boolean {
  if (![x, z, radius].every(Number.isFinite) || radius < 0) return true;
  return x + radius > plan.bounds.minX && x - radius < plan.bounds.maxX &&
    z + radius > plan.bounds.minZ && z - radius < plan.bounds.maxZ;
}

export interface SavedInteriorProgress {
  buildingId: string;
  floor: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  inside: boolean;
  savedAt: number;
  outside?: [number, number, number];
  doorOpen?: boolean;
}

export function isValidSavedInterior(
  value: unknown, now = Date.now(), maxAgeMs = 30 * 24 * 60 * 60 * 1000,
): value is SavedInteriorProgress {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<SavedInteriorProgress>;
  return typeof v.buildingId === "string" && v.buildingId.length > 0 && v.buildingId.length <= 160 &&
    Number.isInteger(v.floor) && (v.floor as number) >= 0 && (v.floor as number) < 5 &&
    [v.x, v.y, v.z, v.yaw, v.savedAt].every(Number.isFinite) &&
    (v.savedAt as number) <= now && now - (v.savedAt as number) <= maxAgeMs &&
    typeof v.inside === "boolean" &&
    (v.outside === undefined || (Array.isArray(v.outside) && v.outside.length === 3 && v.outside.every(Number.isFinite))) &&
    (v.doorOpen === undefined || typeof v.doorOpen === "boolean");
}
