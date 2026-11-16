import type { BuildingKind } from "./interiors.ts";

export interface BuildingPrefab {
  kind: BuildingKind;
  width: number;
  depth: number;
  wallHeight: number;
  floors: number;
  wallColor: number;
  floorColor: number;
  rooms: string[];
}

const prefabs: Record<BuildingKind, BuildingPrefab> = {
  house: { kind: "house", width: 12, depth: 11, wallHeight: 3.2, floors: 1, wallColor: 0xcbbda8, floorColor: 0x887b68, rooms: ["Hall", "Living room", "Kitchen", "Bedroom"] },
  apartment: { kind: "apartment", width: 13, depth: 11, wallHeight: 3.2, floors: 2, wallColor: 0xc4c8c9, floorColor: 0x777f86, rooms: ["Hall", "Living room", "Kitchen", "Bedroom", "Upper floor"] },
  school: { kind: "school", width: 15, depth: 13, wallHeight: 3.8, floors: 2, wallColor: 0xd2cbb8, floorColor: 0x85877d, rooms: ["Corridor", "Classroom", "Library", "Staff room"] },
  shop: { kind: "shop", width: 12, depth: 10, wallHeight: 3.4, floors: 1, wallColor: 0xd1c7ad, floorColor: 0x8a8273, rooms: ["Sales floor", "Counter", "Stock room"] },
  office: { kind: "office", width: 14, depth: 12, wallHeight: 3.6, floors: 2, wallColor: 0xc2cbd0, floorColor: 0x737e86, rooms: ["Reception", "Workspace", "Meeting room", "Upper floor"] },
  industrial: { kind: "industrial", width: 16, depth: 14, wallHeight: 5, floors: 1, wallColor: 0x9ca5a5, floorColor: 0x777c7c, rooms: ["Workshop", "Storage", "Loading area"] },
  other: { kind: "other", width: 12, depth: 11, wallHeight: 3.2, floors: 1, wallColor: 0xc6bda9, floorColor: 0x777e76, rooms: ["Hall", "Main room", "Side room"] },
};

export function getBuildingPrefab(kind: BuildingKind): BuildingPrefab {
  const prefab = prefabs[kind] ?? prefabs.other;
  return { ...prefab, rooms: [...prefab.rooms] };
}

export function inferBuildingPrefabKind(
  tags: Record<string, unknown>[],
  classify: (value: Record<string, unknown>) => BuildingKind,
): BuildingKind {
  const counts = new Map<BuildingKind, number>();
  for (const tag of tags) {
    const kind = classify(tag);
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  let best: BuildingKind = "house";
  let bestCount = 0;
  for (const [kind, count] of counts) {
    if (kind !== "other" && count > bestCount) {
      best = kind;
      bestCount = count;
    }
  }
  return best;
}

export function isRoomWithinLoadRadius(
  playerX: number,
  playerZ: number,
  roomX: number,
  roomZ: number,
  radius: number,
): boolean {
  if (![playerX, playerZ, roomX, roomZ, radius].every(Number.isFinite) || radius < 0) return false;
  return Math.hypot(playerX - roomX, playerZ - roomZ) <= radius;
}
