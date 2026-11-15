export type BuildingKind = "house" | "apartment" | "school" | "shop" | "office" | "industrial" | "other";

export interface InteriorObject {
  id: string;
  x: number;
  y: number;
  label: string;
  glyph: string;
}

export interface InteriorDoor {
  id: string;
  x: number;
  y: number;
  room: string;
}

export interface InteriorLayout {
  objects: InteriorObject[];
  doors: InteriorDoor[];
}

export function classifyBuilding(tags: Record<string, unknown>): BuildingKind {
  const values = ["building", "class", "type", "amenity", "shop", "office", "name", "name_en"]
    .map((key) => String(tags[key] ?? "").toLowerCase()).join(" ");
  if (/school|college|university|kindergarten|education/.test(values)) return "school";
  if (/apartments|residential|dormitory|flats/.test(values)) return "apartment";
  if (/house|detached|semidetached_house|terrace|bungalow|villa/.test(values)) return "house";
  if (/retail|commercial|supermarket|convenience|shop|bakery|clothes|pharmacy/.test(values)) return "shop";
  if (/office|government|bank|administrative|company/.test(values)) return "office";
  if (/industrial|warehouse|factory|manufacture|workshop/.test(values)) return "industrial";
  return "other";
}

const layouts: Record<BuildingKind, InteriorLayout> = {
  house: {
    objects: [
      { id: "hall-chair", x: 2, y: 2, label: "interiorHallObject", glyph: "♜" },
      { id: "sofa", x: 6, y: 2, label: "interiorSofa", glyph: "▰" },
      { id: "kitchen", x: 9, y: 2, label: "furnitureKitchen", glyph: "▤" },
      { id: "bed", x: 2, y: 5, label: "furnitureBed", glyph: "▰" },
      { id: "table", x: 8, y: 5, label: "interiorTable", glyph: "▤" },
    ],
    doors: [{ id: "hall-door", x: 4, y: 3, room: "interiorHallName" }, { id: "bedroom-door", x: 7, y: 4, room: "roomBedroom" }],
  },
  apartment: {
    objects: [
      { id: "sofa", x: 6, y: 2, label: "interiorSofa", glyph: "▰" },
      { id: "table", x: 9, y: 2, label: "interiorTable", glyph: "▤" },
      { id: "bed", x: 2, y: 5, label: "furnitureBed", glyph: "▰" },
      { id: "kitchen", x: 6, y: 5, label: "furnitureKitchen", glyph: "▤" },
      { id: "cabinet", x: 9, y: 5, label: "interiorCabinet", glyph: "▥" },
    ],
    doors: [{ id: "hall-door", x: 4, y: 3, room: "interiorHallName" }, { id: "room-door", x: 7, y: 4, room: "roomBedroom" }],
  },
  school: {
    objects: [
      { id: "board", x: 6, y: 1, label: "furnitureBoard", glyph: "▤" },
      { id: "desk-a", x: 6, y: 3, label: "furnitureDesk", glyph: "▰" },
      { id: "desk-b", x: 8, y: 3, label: "furnitureDesk", glyph: "▰" },
      { id: "desk-c", x: 6, y: 5, label: "furnitureDesk", glyph: "▰" },
      { id: "locker", x: 2, y: 5, label: "furnitureLocker", glyph: "▥" },
    ],
    doors: [{ id: "class-door", x: 4, y: 3, room: "roomClassroom" }, { id: "corridor-door", x: 7, y: 4, room: "roomCorridor" }],
  },
  shop: {
    objects: [
      { id: "counter", x: 6, y: 2, label: "furnitureCounter", glyph: "▰" },
      { id: "shelf-a", x: 9, y: 2, label: "furnitureShelf", glyph: "▥" },
      { id: "shelf-b", x: 9, y: 5, label: "furnitureShelf", glyph: "▥" },
      { id: "crate", x: 2, y: 5, label: "interiorCrate", glyph: "▣" },
    ],
    doors: [{ id: "shop-door", x: 4, y: 3, room: "roomShopFloor" }, { id: "stock-door", x: 7, y: 4, room: "roomStock" }],
  },
  office: {
    objects: [
      { id: "reception", x: 2, y: 2, label: "roomReception", glyph: "▰" },
      { id: "desk-a", x: 6, y: 2, label: "furnitureWorkstation", glyph: "▤" },
      { id: "desk-b", x: 9, y: 2, label: "furnitureWorkstation", glyph: "▤" },
      { id: "cabinet", x: 6, y: 5, label: "interiorCabinet", glyph: "▥" },
      { id: "plant", x: 9, y: 5, label: "furniturePlant", glyph: "♣" },
    ],
    doors: [{ id: "office-door", x: 4, y: 3, room: "roomWorkspace" }, { id: "meeting-door", x: 7, y: 4, room: "roomReception" }],
  },
  industrial: {
    objects: [
      { id: "machine-a", x: 2, y: 2, label: "furnitureMachine", glyph: "⚙" },
      { id: "machine-b", x: 6, y: 2, label: "furnitureMachine", glyph: "⚙" },
      { id: "crate-a", x: 9, y: 2, label: "interiorCrate", glyph: "▣" },
      { id: "shelf", x: 6, y: 5, label: "furnitureShelf", glyph: "▥" },
    ],
    doors: [{ id: "workshop-door", x: 4, y: 3, room: "roomWorkshop" }, { id: "storage-door", x: 7, y: 4, room: "roomStock" }],
  },
  other: {
    objects: [
      { id: "chair", x: 2, y: 2, label: "interiorHallObject", glyph: "♜" },
      { id: "sofa", x: 6, y: 2, label: "interiorSofa", glyph: "▰" },
      { id: "table", x: 9, y: 2, label: "interiorTable", glyph: "▤" },
      { id: "cabinet", x: 6, y: 5, label: "interiorCabinet", glyph: "▥" },
      { id: "crate", x: 9, y: 5, label: "interiorCrate", glyph: "▣" },
    ],
    doors: [{ id: "hall-door", x: 4, y: 3, room: "interiorHallName" }, { id: "storage-door", x: 7, y: 4, room: "interiorSideName" }],
  },
};

export function createInteriorLayout(kind: BuildingKind): InteriorLayout {
  const layout = layouts[kind];
  return {
    objects: layout.objects.map((item) => ({ ...item })),
    doors: layout.doors.map((door) => ({ ...door })),
  };
}
