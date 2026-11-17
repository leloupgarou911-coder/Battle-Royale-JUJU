import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { DominantBiome, OsmBuildingSpec, OsmLandmarkCategory, OsmLandmarkSpec } from "./osmWorld.ts";

export type GraphicsQualityTier = "performance" | "balanced" | "quality";

function hashUnit(seed: number): number {
  const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function toCssHex(hex: number, shade = 0): string {
  const c = new THREE.Color(hex);
  if (shade !== 0) {
    c.offsetHSL(0, 0, shade);
  }
  return `#${c.getHexString()}`;
}

export function createBuildingFacadeTexture(
  wallColorHex: number,
  kind: OsmBuildingSpec["kind"],
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = toCssHex(wallColorHex);
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 420; i += 1) {
    const x = hashUnit(i + 1) * 256;
    const y = hashUnit(i + 501) * 256;
    const w = 4 + hashUnit(i + 901) * 14;
    ctx.fillStyle = hashUnit(i + 1201) > 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.045)";
    ctx.fillRect(x, y, w, 3);
  }

  ctx.fillStyle = toCssHex(wallColorHex, -0.09);
  ctx.fillRect(0, 0, 256, 16);
  ctx.fillStyle = toCssHex(wallColorHex, 0.06);
  ctx.fillRect(0, 16, 256, 5);

  if (kind === "monument" || kind === "civic" || kind === "apartment") {
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 2;
    for (let y = 32; y < 256; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
  }

  if (kind === "industrial") {
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    for (let x = 0; x < 256; x += 16) {
      ctx.fillRect(x, 0, 4, 256);
    }
    ctx.fillStyle = "#2b424f";
    ctx.fillRect(14, 44, 100, 44);
    ctx.fillRect(142, 44, 100, 44);
    ctx.fillStyle = "rgba(180,224,240,0.28)";
    ctx.fillRect(18, 48, 92, 34);
    ctx.fillRect(146, 48, 92, 34);
  } else if (kind === "office") {
    ctx.fillStyle = "#314756";
    ctx.fillRect(12, 34, 104, 186);
    ctx.fillRect(140, 34, 104, 186);
    for (const bx of [16, 144]) {
      const grad = ctx.createLinearGradient(bx, 38, bx + 96, 214);
      grad.addColorStop(0, "#4c7891");
      grad.addColorStop(0.55, "#264254");
      grad.addColorStop(1, "#1a2f3d");
      ctx.fillStyle = grad;
      ctx.fillRect(bx, 38, 96, 178);
      ctx.fillStyle = "rgba(255, 224, 165, 0.22)";
      ctx.fillRect(bx + 8, 120, 36, 78);
      ctx.fillStyle = "#22313b";
      ctx.fillRect(bx + 46, 38, 4, 178);
      ctx.fillRect(bx, 122, 96, 4);
    }
  } else {
    const bays = [30, 150];
    bays.forEach((bx, idx) => {
      const winW = kind === "shop" ? 84 : 74;
      const winH = kind === "house" ? 116 : 136;
      const winY = kind === "house" ? 64 : 52;

      ctx.fillStyle = toCssHex(wallColorHex, -0.14);
      ctx.fillRect(bx - 5, winY - 6, winW + 10, winH + 12);

      const lit = hashUnit(bx + wallColorHex + idx * 17) > 0.56;
      const glassGrad = ctx.createLinearGradient(bx, winY, bx, winY + winH);
      if (lit) {
        glassGrad.addColorStop(0, "#345163");
        glassGrad.addColorStop(0.45, "#6b6552");
        glassGrad.addColorStop(1, "#caa465");
      } else {
        glassGrad.addColorStop(0, "#375569");
        glassGrad.addColorStop(0.6, "#223847");
        glassGrad.addColorStop(1, "#162631");
      }
      ctx.fillStyle = glassGrad;
      ctx.fillRect(bx, winY, winW, winH);

      ctx.fillStyle = "#e8e3d9";
      ctx.fillRect(bx + winW * 0.5 - 2, winY, 4, winH);
      ctx.fillRect(bx, winY + winH * 0.48 - 2, winW, 4);

      if (kind === "apartment" || kind === "civic") {
        ctx.fillStyle = "#232a2e";
        ctx.fillRect(bx - 4, winY + winH - 26, winW + 8, 4);
        for (let r = bx; r < bx + winW; r += 10) {
          ctx.fillRect(r, winY + winH - 26, 2, 26);
        }
      }
      ctx.fillStyle = toCssHex(wallColorHex, 0.12);
      ctx.fillRect(bx - 7, winY + winH + 2, winW + 14, 7);
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1 / 6.2, 1 / 3.4);
  texture.anisotropy = Math.max(1, Math.min(8, maxAnisotropy));
  texture.needsUpdate = true;
  return texture;
}

export function createRoofTexture(
  roofColorHex: number,
  kind: OsmBuildingSpec["kind"],
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = toCssHex(roofColorHex);
  ctx.fillRect(0, 0, 128, 128);

  if (kind === "house" || kind === "school") {
    ctx.strokeStyle = "rgba(0,0,0,0.14)";
    ctx.lineWidth = 2;
    for (let y = 0; y < 128; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(128, y);
      ctx.stroke();
    }
    for (let y = 0; y < 128; y += 16) {
      const offset = (y / 16) % 2 === 0 ? 0 : 12;
      for (let x = offset; x < 128; x += 24) {
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.fillRect(x, y + 2, 10, 12);
      }
    }
  } else {
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 2;
    for (let p = 0; p < 128; p += 32) {
      ctx.strokeRect(p, 0, 32, 128);
    }
    for (let i = 0; i < 180; i += 1) {
      ctx.fillStyle = hashUnit(i + 99) > 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.05)";
      ctx.fillRect(hashUnit(i * 3) * 124, hashUnit(i * 7) * 124, 3, 3);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1 / 4.5, 1 / 4.5);
  texture.anisotropy = Math.max(1, Math.min(8, maxAnisotropy));
  texture.needsUpdate = true;
  return texture;
}

export function createAsphaltTexture(baseColorHex: number, maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = toCssHex(baseColorHex);
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 600; i += 1) {
    const x = hashUnit(i * 11) * 128;
    const y = hashUnit(i * 23) * 128;
    ctx.fillStyle = hashUnit(i * 5) > 0.5 ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.08)";
    ctx.fillRect(x, y, 2, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2);
  texture.anisotropy = Math.max(1, Math.min(8, maxAnisotropy));
  texture.needsUpdate = true;
  return texture;
}

export function createPavingTexture(baseColorHex: number, maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = toCssHex(baseColorHex);
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "rgba(0,0,0,0.14)";
  ctx.lineWidth = 2;
  for (let x = 0; x <= 128; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 128);
    ctx.stroke();
  }
  for (let y = 0; y <= 128; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.anisotropy = Math.max(1, Math.min(8, maxAnisotropy));
  texture.needsUpdate = true;
  return texture;
}

export function createGroundTurfTexture(
  baseColorHex: number,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = toCssHex(baseColorHex);
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 60; i += 1) {
    const x = hashUnit(i * 11 + 3) * 256;
    const y = hashUnit(i * 23 + 7) * 256;
    const r = 10 + hashUnit(i * 5) * 20;
    const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
    const tone = hashUnit(i * 17) > 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.045)";
    grad.addColorStop(0, tone);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  for (let i = 0; i < 1600; i += 1) {
    const x = hashUnit(i * 13) * 256;
    const y = hashUnit(i * 29) * 256;
    ctx.fillStyle = hashUnit(i * 19) > 0.5 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)";
    ctx.fillRect(x, y, 1.5, 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(64, 64);
  texture.anisotropy = Math.max(1, Math.min(8, maxAnisotropy));
  texture.needsUpdate = true;
  return texture;
}

export function createTerrainBiomeTexture(
  biome: DominantBiome,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const palette: Record<DominantBiome, number> = {
    urban: 0x3b4447,
    park: 0x395240,
    coastal: 0xb7a67d,
    mountain: 0x5c6469,
    rural: 0x4b5c42,
    desert: 0x9b865f,
    sparse: 0x6f6853,
  };
  const baseHex = palette[biome] ?? 0x3b4a40;
  if (biome === "urban") return createPavingTexture(baseHex, maxAnisotropy);
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = toCssHex(baseHex);
  ctx.fillRect(0, 0, 256, 256);

  if (biome === "coastal" || biome === "desert") {
    // Wind ripples across sand/dunes
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 3;
    for (let y = 12; y < 256; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(64, y - 6, 192, y + 6, 256, y);
      ctx.stroke();
    }
  } else if (biome === "mountain") {
    // Mineral slate & scree flecks
    for (let i = 0; i < 900; i += 1) {
      const x = hashUnit(i * 13) * 256;
      const y = hashUnit(i * 29) * 256;
      const sz = 2 + hashUnit(i * 7) * 5;
      ctx.fillStyle = hashUnit(i * 19) > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)";
      ctx.fillRect(x, y, sz, sz * 0.7);
    }
  } else {
    return createGroundTurfTexture(baseHex, maxAnisotropy);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(48, 48);
  texture.anisotropy = Math.max(1, Math.min(8, maxAnisotropy));
  texture.needsUpdate = true;
  return texture;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, "rgba(4, 10, 14, 0.68)");
  grad.addColorStop(0.55, "rgba(4, 10, 14, 0.32)");
  grad.addColorStop(1, "rgba(4, 10, 14, 0.0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createBroadleafCrownGeometry(): THREE.BufferGeometry {
  const main = new THREE.DodecahedronGeometry(1.55, 1);
  main.translate(0, 0.1, 0);
  const lobeA = new THREE.DodecahedronGeometry(1.05, 1);
  lobeA.translate(0.92, -0.25, 0.55);
  const lobeB = new THREE.DodecahedronGeometry(1.1, 1);
  lobeB.translate(-0.85, -0.15, -0.45);
  const lobeC = new THREE.DodecahedronGeometry(0.95, 1);
  lobeC.translate(0.15, 0.92, -0.2);
  const merged = mergeGeometries([main, lobeA, lobeB, lobeC]);
  main.dispose();
  lobeA.dispose();
  lobeB.dispose();
  lobeC.dispose();
  return merged;
}

export function createConiferCrownGeometry(): THREE.BufferGeometry {
  const lower = new THREE.ConeGeometry(1.45, 2.0, 8);
  lower.translate(0, -0.4, 0);
  const mid = new THREE.ConeGeometry(1.12, 1.85, 8);
  mid.translate(0, 0.75, 0);
  const top = new THREE.ConeGeometry(0.75, 1.55, 8);
  top.translate(0, 1.75, 0);
  const merged = mergeGeometries([lower, mid, top]);
  lower.dispose();
  mid.dispose();
  top.dispose();
  return merged;
}

export function createStreetLampPostGeometry(): THREE.BufferGeometry {
  const base = new THREE.CylinderGeometry(0.14, 0.2, 0.55, 8);
  base.translate(0, 0.275, 0);
  const pole = new THREE.CylinderGeometry(0.06, 0.09, 4.1, 7);
  pole.translate(0, 2.3, 0);
  const arm = new THREE.BoxGeometry(0.95, 0.09, 0.09);
  arm.translate(0.42, 4.28, 0);
  const hood = new THREE.BoxGeometry(0.36, 0.1, 0.22);
  hood.translate(0.84, 4.26, 0);
  const merged = mergeGeometries([base, pole, arm, hood]);
  base.dispose();
  pole.dispose();
  arm.dispose();
  hood.dispose();
  return merged;
}

export function createParkBenchGeometry(): THREE.BufferGeometry {
  const seat = new THREE.BoxGeometry(1.65, 0.08, 0.52);
  seat.translate(0, 0.45, 0);
  const back = new THREE.BoxGeometry(1.65, 0.44, 0.08);
  back.translate(0, 0.74, -0.22);
  const legL = new THREE.BoxGeometry(0.1, 0.45, 0.48);
  legL.translate(-0.68, 0.225, 0);
  const legR = new THREE.BoxGeometry(0.1, 0.45, 0.48);
  legR.translate(0.68, 0.225, 0);
  const merged = mergeGeometries([seat, back, legL, legR]);
  seat.dispose();
  back.dispose();
  legL.dispose();
  legR.dispose();
  return merged;
}

export function createBollardGeometry(): THREE.BufferGeometry {
  const base = new THREE.CylinderGeometry(0.14, 0.16, 0.72, 8);
  base.translate(0, 0.36, 0);
  const cap = new THREE.SphereGeometry(0.13, 8, 6);
  cap.translate(0, 0.74, 0);
  const merged = mergeGeometries([base, cap]);
  base.dispose();
  cap.dispose();
  return merged;
}

export interface LandmarkMaterialSet {
  stone: THREE.MeshStandardMaterial;
  bronze: THREE.MeshStandardMaterial;
  water: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
}

export type LandmarkModelBuilder = (
  landmark: OsmLandmarkSpec,
  materials: LandmarkMaterialSet,
) => { group: THREE.Group; colliderRadius: number };

const landmarkRegistry = new Map<OsmLandmarkCategory, LandmarkModelBuilder>();

export function registerLandmarkModelBuilder(
  category: OsmLandmarkCategory,
  builder: LandmarkModelBuilder,
): void {
  landmarkRegistry.set(category, builder);
}

registerLandmarkModelBuilder("monument", (_lm, { stone, bronze, accent }) => {
  const group = new THREE.Group();
  const plinthBase = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.85, 0.45, 8), stone);
  plinthBase.position.y = 0.225;
  const plinthStep = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.28, 0.52, 8), stone);
  plinthStep.position.y = 0.71;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.54, 3.6, 4), stone);
  shaft.rotation.y = Math.PI * 0.25;
  shaft.position.y = 2.75;
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.16, 8), bronze);
  ring.position.y = 4.62;
  const pyramid = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.78, 4), bronze);
  pyramid.rotation.y = Math.PI * 0.25;
  pyramid.position.y = 5.05;
  const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), accent);
  beacon.position.y = 5.65;
  group.add(plinthBase, plinthStep, shaft, ring, pyramid, beacon);
  return { group, colliderRadius: 1.55 };
});

registerLandmarkModelBuilder("culture", (_lm, { stone, bronze, accent }) => {
  const group = new THREE.Group();
  const stylobate = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.42, 2.6), stone);
  stylobate.position.y = 0.21;
  group.add(stylobate);
  for (const cx of [-1.25, -0.45, 0.45, 1.25]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.5, 8), stone);
    col.position.set(cx, 1.65, 0.85);
    group.add(col);
  }
  const core = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 1.5), stone);
  core.position.set(0, 1.6, -0.3);
  const entablature = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.35, 2.65), bronze);
  entablature.position.y = 3.02;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), accent);
  dome.position.y = 3.2;
  group.add(core, entablature, dome);
  return { group, colliderRadius: 1.65 };
});

registerLandmarkModelBuilder("fountain", (_lm, { stone, water, accent }) => {
  const group = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.3, 0.55, 12), stone);
  rim.position.y = 0.275;
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.42, 12), water);
  pool.position.y = 0.36;
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.55, 1.4, 10), stone);
  pedestal.position.y = 0.85;
  const upperBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.35, 0.35, 10), stone);
  upperBowl.position.y = 1.62;
  const jet = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.85, 8), accent);
  jet.position.y = 2.15;
  group.add(rim, pool, pedestal, upperBowl, jet);
  return { group, colliderRadius: 1.9 };
});

registerLandmarkModelBuilder("transport", (_lm, { stone, bronze, accent }) => {
  const group = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.14, 1.6), stone);
  pad.position.y = 0.07;
  const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.3, 6), bronze);
  postL.position.set(-1.0, 1.22, 0);
  const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.3, 6), bronze);
  postR.position.set(1.0, 1.22, 0);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.16, 1.7), accent);
  canopy.position.y = 2.42;
  group.add(pad, postL, postR, canopy);
  return { group, colliderRadius: 0 };
});

registerLandmarkModelBuilder("peak", (_lm, { stone, bronze, accent }) => {
  const group = new THREE.Group();
  const cairnBase = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05, 0), stone);
  cairnBase.scale.set(1.2, 0.72, 1.1);
  cairnBase.position.y = 0.45;
  const cairnTop = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 0), stone);
  cairnTop.position.y = 1.18;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.65, 6), bronze);
  pole.position.y = 1.95;
  const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), accent);
  crest.position.y = 2.9;
  group.add(cairnBase, cairnTop, pole, crest);
  return { group, colliderRadius: 1.1 };
});

export function buildLandmarkGroup(
  landmark: OsmLandmarkSpec,
  materials: LandmarkMaterialSet,
): { group: THREE.Group; colliderRadius: number } {
  const builder = landmarkRegistry.get(landmark.category);
  if (builder) {
    return builder(landmark, materials);
  }
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.56, 0.28, 8), materials.stone);
  base.position.y = 0.14;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 2.1, 8), materials.stone);
  post.position.y = 1.3;
  const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), materials.accent);
  cap.position.y = 2.62;
  group.add(base, post, cap);
  return { group, colliderRadius: 0 };
}
