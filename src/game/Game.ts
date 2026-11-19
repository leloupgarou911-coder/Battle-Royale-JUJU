import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { circleIntersectsInteriorBox, interiorGroundHeight, TRAINING_BUILDING } from "./architecture.ts";
import { createInteriorLayout, type BuildingKind } from "./interiors.ts";
import { getBuildingPrefab, isRoomWithinLoadRadius } from "./buildingPrefabs.ts";
import { generateBuildingPlan, isValidSavedInterior, type ProceduralBuildingPlan, type SavedInteriorProgress } from "./buildingGenerator.ts";
import { SpatialCollisionIndex } from "./collisions.ts";
import {
  buildOsmWorldSnapshot,
  geoToLocalMeters,
  localMetersToGeo,
  pointInLocalPolygon,
  type OsmBuildingSpec,
  type OsmLandmarkSpec,
  type OsmWorldSnapshot,
  type RawOsmInputs,
} from "./osmWorld.ts";
import type { GeoDataDiagnostics, HeritageSiteRecord } from "./geoDataEngine.ts";
import {
  ArenaSessionManager,
  type ArenaGameMode,
  type ArenaMatchState,
} from "./multiplayer.ts";
import {
  buildLandmarkGroup,
  createAsphaltTexture,
  createBollardGeometry,
  createBroadleafCrownGeometry,
  createBuildingFacadeTexture,
  createConiferCrownGeometry,
  createContactShadowTexture,
  createGroundTurfTexture,
  createParkBenchGeometry,
  createPavingTexture,
  createRoofTexture,
  createStreetLampPostGeometry,
  createTerrainBiomeTexture,
  type GraphicsQualityTier,
  type LandmarkMaterialSet,
} from "./worldVisuals.ts";

type PositionCallback = (x: number, z: number, lng: number, lat: number) => void;
type MappedBuildingFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
type MappedRoadFeature = GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>;
type MappedGreenFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
type MappedWaterFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon | GeoJSON.LineString | GeoJSON.MultiLineString>;
type MappedPoiFeature = GeoJSON.Feature<GeoJSON.Point>;

interface TerrainSample {
  x: number;
  z: number;
  elevation: number;
}

export interface GameWorldData {
  origin: [number, number];
  buildings: MappedBuildingFeature[];
  roads: MappedRoadFeature[];
  greens?: MappedGreenFeature[];
  landuses?: MappedGreenFeature[];
  landcovers?: MappedGreenFeature[];
  waters?: MappedWaterFeature[];
  pois?: MappedPoiFeature[];
  places?: MappedPoiFeature[];
  peaks?: MappedPoiFeature[];
  streetNames?: MappedRoadFeature[];
  heritageSites?: HeritageSiteRecord[];
  terrain: TerrainSample[];
  terrainSize: number;
  terrainSegments: number;
  originElevationMeters?: number | null;
  diagnostics?: GeoDataDiagnostics;
  saveSlotId?: string;
  initialInterior?: SavedInteriorProgress;
  onInteriorSave?: (state: SavedInteriorProgress) => void;
  onNeedChunkRefresh?: (lng: number, lat: number, dirX: number, dirZ: number) => void;
  onWorldLoaded?: (snapshot: OsmWorldSnapshot) => void;
  onLandmarkInspect?: (landmark: OsmLandmarkSpec) => void;
  onEnterBuilding?: (info: { name: string; kind: BuildingKind; floors: number; source: "osm" | "procedural" }) => void;
  onMatchState?: (state: ArenaMatchState) => void;
  language?: "en" | "fr";
}

interface BuildingCollisionShape {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  rings: [number, number][][];
}

interface WaterCollisionShape {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  rings: [number, number][][];
}

interface ObstacleCollider {
  x: number;
  z: number;
  radius: number;
}

interface BoxCollider {
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
}

interface EntranceNode {
  building: OsmBuildingSpec;
  x: number;
  z: number;
  yaw: number;
}

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? "");
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createProceduralSurfaceTexture(
  baseHex: number,
  seamHex: number,
  pattern: "brick" | "tile" | "asphalt",
  maxAnisotropy: number,
): THREE.DataTexture {
  const size = 64;
  const base = new THREE.Color(baseHex);
  const seam = new THREE.Color(seamHex);
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const row = Math.floor(y / 16);
      const shiftedX = pattern === "brick" ? (x + (row % 2) * 16) % 32 : x % 16;
      const seamPixel = pattern === "brick"
        ? y % 16 < 2 || shiftedX < 2
        : pattern === "tile"
          ? x % 16 < 2 || y % 16 < 2
          : false;
      const noise = ((x * 17 + y * 31) % 11 - 5) / 255;
      const color = seamPixel ? seam : base;
      const offset = (y * size + x) * 4;
      data[offset] = Math.max(0, Math.min(255, Math.round(color.r * 255 + noise * 255)));
      data[offset + 1] = Math.max(0, Math.min(255, Math.round(color.g * 255 + noise * 255)));
      data[offset + 2] = Math.max(0, Math.min(255, Math.round(color.b * 255 + noise * 255)));
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.anisotropy = Math.max(1, maxAnisotropy);
  texture.needsUpdate = true;
  return texture;
}

function shortestAngleDiff(from: number, to: number): number {
  let diff = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function prepareForMerge(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const nonIndexed = geo.index ? geo.toNonIndexed() : geo;
  if (nonIndexed !== geo) geo.dispose();
  if (!nonIndexed.getAttribute("normal")) {
    nonIndexed.computeVertexNormals();
  }
  return nonIndexed;
}

export class Game {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(48, 1, 0.5, 950);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly isSoftwareGl: boolean;
  private qualityTier: GraphicsQualityTier;
  private envRenderTarget: THREE.WebGLRenderTarget | null = null;
  private readonly clock = new THREE.Clock();
  private contactShadowTex: THREE.Texture | null = null;

  // Root groups for clean chunk streaming & disposal
  private readonly worldChunkGroup = new THREE.Group();
  private readonly interiorChamberGroup = new THREE.Group();
  private readonly arenaOverlayGroup = new THREE.Group();
  private readonly player = new THREE.Group();
  private readonly playerGroundHalo = new THREE.Group();

  private readonly keys = new Set<string>();
  private readonly direction = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly camTarget = new THREE.Vector3();
  private readonly camDesired = new THREE.Vector3();
  private readonly camLookAhead = new THREE.Vector3();
  private readonly camRayDir = new THREE.Vector3();
  private readonly cameraRaycaster = new THREE.Raycaster();

  private readonly onPosition: PositionCallback;
  private worldData: GameWorldData;
  private osmSnapshot: OsmWorldSnapshot;
  private chunkOrigin: [number, number];
  private lastChunkRefreshAt = 0;

  private animationFrame = 0;
  private softwareTimer = 0;
  private isRunning = false;
  private language: "en" | "fr";

  // Bullet Echo-inspired tactical top-down camera defaults
  private isDraggingCamera = false;
  private lastDragX = 0;
  private lastDragY = 0;
  private yaw = 0;
  private pitch = 0.96; // Elevated tactical downward angle (~55 deg) showing buildings & streets clearly
  private cameraDistance = 32;
  private moveSpeedMetersPerSec = 5.6;
  private playerHeadingYaw = 0;

  private verticalVelocity = 0;
  private readonly gravity = 18;
  private readonly jumpImpulse = 6.2;
  private readonly maxStepHeight = 0.65;

  private readonly buildingCollisionShapes: BuildingCollisionShape[] = [];
  private readonly buildingCollisionIndex = new SpatialCollisionIndex<BuildingCollisionShape>(32);
  private readonly waterCollisionShapes: WaterCollisionShape[] = [];
  private readonly mappedBuildingPlans: ProceduralBuildingPlan[] = [];
  private readonly obstacleColliders: ObstacleCollider[] = [];
  private readonly entranceNodes: EntranceNode[] = [];
  private readonly tallBuildingOccluders: Array<{
    mesh: THREE.Mesh;
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  }> = [];
  private readonly fadedBuildings = new Set<THREE.Mesh>();

  private readonly animatedLimbs: THREE.Group[] = [];
  private playerTorso: THREE.Mesh | null = null;
  private walkPhase = 0;
  private idleTime = 0;
  private smoothedFrameMs = 16.6;

  // Interior room state
  private readonly interiorColliders: BoxCollider[] = [];
  private readonly interiorOffset = { x: 0, y: -60, z: 0 }; // Isolated subsurface chamber so exterior world stays intact
  private insideBuilding = false;
  private exteriorReturnPosition = new THREE.Vector3();
  private interiorFloor = 0;
  private activeInteriorKind: BuildingKind = "other";
  private activeInteriorName = "";
  private activeInteriorFloors = 1;
  private activeBuildingId = "";
  private readonly streamedRoomGroups: { group: THREE.Group; x: number; z: number }[] = [];

  // UI & prompts
  private readonly interactionPrompt = document.createElement("div");
  private saveElapsed = 0;
  private lastGrounded = true;
  private currentSpeed = 0;
  private paused = false;

  // Multiplayer & Modes
  private readonly arenaSession = new ArenaSessionManager();
  private readonly remoteActorMeshes = new Map<string, THREE.Group>();
  private readonly objectiveRings = new Map<string, { ring: THREE.Mesh; beacon: THREE.Mesh }>();
  private zoneRingMesh: THREE.Mesh | null = null;

  constructor(
    private readonly container: HTMLElement,
    onPosition: PositionCallback,
    worldData: GameWorldData,
  ) {
    this.onPosition = onPosition;
    this.worldData = worldData;
    this.chunkOrigin = [...worldData.origin] as [number, number];
    this.language = worldData.language ?? "fr";
    this.isSoftwareGl = detectSoftwareWebGL();
    this.qualityTier = this.isSoftwareGl ? "balanced" : "quality";
    this.contactShadowTex = createContactShadowTexture();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.container.appendChild(this.renderer.domElement);

    if (!this.isSoftwareGl) {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.envRenderTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
      this.scene.environment = this.envRenderTarget.texture;
      pmremGenerator.dispose();
    }

    this.scene.add(this.worldChunkGroup);
    this.scene.add(this.interiorChamberGroup);
    this.scene.add(this.arenaOverlayGroup);

    this.setupLightingAndSky();
    this.osmSnapshot = this.buildOsmChunk(worldData);
    this.buildPlayer();
    this.restoreInteriorSession();

    const [sx, sz] = this.findSafeLocalSpawn(this.player.position.x, this.player.position.z);
    if (!this.insideBuilding) {
      this.player.position.set(sx, this.groundHeightAt(sx, sz), sz);
    }

    this.arenaSession.configureMode("free_roam", this.osmSnapshot);
    this.syncCameraImmediate();
    this.resize();

    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onWindowBlur);
    this.renderer.domElement.addEventListener("pointerdown", this.onCanvasPointerDown);
    this.renderer.domElement.addEventListener("contextmenu", this.onContextMenu);
    window.addEventListener("pointermove", this.onCanvasPointerMove);
    window.addEventListener("pointerup", this.onCanvasPointerUp);
    this.renderer.domElement.addEventListener("wheel", this.onCameraWheel, { passive: false });

    this.interactionPrompt.className = "game-3d-interaction";
    this.interactionPrompt.setAttribute("aria-live", "polite");
    this.interactionPrompt.hidden = true;
    this.container.appendChild(this.interactionPrompt);
    this.worldData.onWorldLoaded?.(this.osmSnapshot);
    this.updateInteraction();
  }

  private setupLightingAndSky(): void {
    this.scene.background = new THREE.Color(0x0c1b26);
    this.scene.fog = new THREE.FogExp2(0x10222f, 0.0042);

    const hemisphere = new THREE.HemisphereLight(0xd9ecff, 0x2e3b33, 1.55);
    this.scene.add(hemisphere);

    const keySun = new THREE.DirectionalLight(0xffe7c7, 2.55);
    keySun.position.set(-55, 110, 48);
    keySun.castShadow = !this.isSoftwareGl;
    keySun.shadow.mapSize.set(2048, 2048);
    keySun.shadow.bias = -0.0004;
    keySun.shadow.normalBias = 0.025;
    keySun.shadow.camera.left = -120;
    keySun.shadow.camera.right = 120;
    keySun.shadow.camera.top = 120;
    keySun.shadow.camera.bottom = -120;
    keySun.shadow.camera.near = 10;
    keySun.shadow.camera.far = 260;
    this.scene.add(keySun);

    const rimLight = new THREE.DirectionalLight(0x7cc7d9, 0.65);
    rimLight.position.set(60, 45, -50);
    this.scene.add(rimLight);
  }

  private disposeGroupChildren(group: THREE.Group): void {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        if (obj.geometry) geometries.add(obj.geometry);
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (!m) return;
          materials.add(m);
          const std = m as THREE.MeshStandardMaterial;
          if (std.map && std.map !== this.contactShadowTex) {
            textures.add(std.map);
          }
        });
      }
    });
    geometries.forEach((g) => g.dispose());
    textures.forEach((t) => t.dispose());
    materials.forEach((m) => m.dispose());
    group.clear();
  }

  private buildOsmChunk(data: GameWorldData): OsmWorldSnapshot {
    this.disposeGroupChildren(this.worldChunkGroup);
    this.buildingCollisionShapes.length = 0;
    this.waterCollisionShapes.length = 0;
    this.mappedBuildingPlans.length = 0;
    this.obstacleColliders.length = 0;
    this.entranceNodes.length = 0;
    this.tallBuildingOccluders.length = 0;
    this.fadedBuildings.clear();

    // Clear spatial index cleanly
    const existing = this.buildingCollisionIndex.query({ minX: -10_000, maxX: 10_000, minZ: -10_000, maxZ: 10_000 });
    existing.forEach((item) => this.buildingCollisionIndex.remove(item));

    const elevationSpan = data.diagnostics
      ? data.diagnostics.maxElevationDelta - data.diagnostics.minElevationDelta
      : 0;
    const raw: RawOsmInputs = {
      origin: data.origin,
      buildings: data.buildings,
      roads: data.roads,
      greens: data.greens,
      landuses: data.landuses,
      landcovers: data.landcovers,
      waters: data.waters,
      pois: data.pois,
      places: data.places,
      peaks: data.peaks,
      streetNames: data.streetNames,
      heritageSites: data.heritageSites,
      elevationDeltaSpan: elevationSpan,
      diagnostics: data.diagnostics,
      radiusMeters: 220,
    };
    const snapshot = buildOsmWorldSnapshot(raw);

    // 1. Base Ground / DEM Terrain
    this.buildTerrainSurface(data, snapshot);

    // 2. Green spaces, Parks & Natural Biomes (polygonal turf/sand/rock pads)
    this.buildGreenSpaces(snapshot);

    // 3. Water bodies & Rivers
    this.buildWaterBodies(snapshot);

    // 4. Roads, Bridges, Intersections & Sidewalks + Crosswalks + Instanced Street Furniture
    this.buildRoadsAndSidewalks(snapshot);

    // 5. Extruded Real OSM Buildings + Facade Windows + Roofs + Doors
    this.buildBuildings(snapshot);

    // 6. Real OSM Vegetation (Multi-species InstancedMesh trees & shrubs + contact shadows)
    this.buildVegetation(snapshot);

    // 7. Real OSM Landmarks, Monuments, Fountains, Peaks & Wikipedia Heritage
    this.buildLandmarks(snapshot);

    if (snapshot.diagnostics) {
      snapshot.diagnostics.counts.generated3dObjects =
        snapshot.buildings.length
        + snapshot.roads.length
        + snapshot.greens.length
        + snapshot.waters.length
        + snapshot.landmarks.length
        + snapshot.vegetation.length
        + snapshot.streetFurniture.length;
    }

    return snapshot;
  }

  private buildTerrainSurface(data: GameWorldData, snapshot: OsmWorldSnapshot): void {
    const { terrain, terrainSegments, terrainSize } = data;
    const expected = (terrainSegments + 1) * (terrainSegments + 1);
    const maxAniso = this.isSoftwareGl ? 1 : this.renderer.capabilities.getMaxAnisotropy();
    const turfTex = createTerrainBiomeTexture(snapshot.dominantBiome, maxAniso);

    if (terrain.length === expected && terrainSegments >= 1) {
      const positions: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];
      for (let row = 0; row <= terrainSegments; row += 1) {
        for (let col = 0; col <= terrainSegments; col += 1) {
          const sample = terrain[row * (terrainSegments + 1) + col];
          positions.push(sample.x, sample.elevation, sample.z);
          uvs.push(col / terrainSegments, row / terrainSegments);
        }
      }
      for (let row = 0; row < terrainSegments; row += 1) {
        for (let col = 0; col < terrainSegments; col += 1) {
          const a = row * (terrainSegments + 1) + col;
          const b = a + 1;
          const c = a + terrainSegments + 1;
          const d = c + 1;
          indices.push(a, c, b, b, c, d);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ map: turfTex, roughness: 0.96, side: THREE.DoubleSide }),
      );
      mesh.receiveShadow = true;
      mesh.name = "mapped-terrain";
      this.worldChunkGroup.add(mesh);
      return;
    }

    const size = Math.max(460, terrainSize || 460);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshStandardMaterial({ map: turfTex, roughness: 0.96 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = "arena-ground";
    this.worldChunkGroup.add(ground);
  }

  private buildGreenSpaces(snapshot: OsmWorldSnapshot): void {
    const maxAniso = this.isSoftwareGl ? 1 : this.renderer.capabilities.getMaxAnisotropy();
    const matCache = new Map<number, THREE.MeshStandardMaterial>();
    const buckets = new Map<string, { mat: THREE.MeshStandardMaterial; name: string; geos: THREE.BufferGeometry[] }>();
    for (const green of snapshot.greens) {
      if (green.outer.length < 3) continue;
      let mat = matCache.get(green.color);
      if (!mat) {
        const tex = green.category === "plaza"
          ? createPavingTexture(green.color, maxAniso)
          : createGroundTurfTexture(green.color, maxAniso);
        tex.repeat.set(0.26, 0.26);
        mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.94 });
        matCache.set(green.color, mat);
      }
      const shape = new THREE.Shape();
      shape.moveTo(green.outer[0].x, -green.outer[0].z);
      for (let i = 1; i < green.outer.length; i += 1) shape.lineTo(green.outer[i].x, -green.outer[i].z);
      shape.closePath();
      for (const hole of green.holes) {
        if (hole.length < 3) continue;
        const holePath = new THREE.Path();
        holePath.moveTo(hole[0].x, -hole[0].z);
        for (let i = 1; i < hole.length; i += 1) holePath.lineTo(hole[i].x, -hole[i].z);
        holePath.closePath();
        shape.holes.push(holePath);
      }
      const geom = prepareForMerge(new THREE.ShapeGeometry(shape, 1));
      geom.rotateX(-Math.PI / 2);
      const y = 0.03 + this.terrainHeightAt((green.bounds.minX + green.bounds.maxX) * 0.5, (green.bounds.minZ + green.bounds.maxZ) * 0.5);
      geom.translate(0, y, 0);
      const key = `${green.color}-${green.category}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { mat, name: `osm-green-${green.category}`, geos: [] };
        buckets.set(key, bucket);
      }
      bucket.geos.push(geom);
    }
    for (const bucket of buckets.values()) {
      const merged = bucket.geos.length === 1 ? bucket.geos[0] : mergeGeometries(bucket.geos, false);
      if (bucket.geos.length > 1) bucket.geos.forEach((g) => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, bucket.mat);
      mesh.receiveShadow = true;
      mesh.name = bucket.name;
      this.worldChunkGroup.add(mesh);
    }
  }

  private buildWaterBodies(snapshot: OsmWorldSnapshot): void {
    const inlandWaterMat = new THREE.MeshStandardMaterial({
      color: 0x1e6685,
      roughness: 0.16,
      metalness: 0.2,
    });
    const seaWaterMat = new THREE.MeshStandardMaterial({
      color: 0x155475,
      roughness: 0.14,
      metalness: 0.24,
    });
    for (const water of snapshot.waters) {
      const isSea = /ocean|sea|bay/.test(water.waterClass);
      const mat = isSea ? seaWaterMat : inlandWaterMat;
      if (water.kind === "polygon" && water.outer.length >= 3) {
        const shape = new THREE.Shape();
        shape.moveTo(water.outer[0].x, -water.outer[0].z);
        for (let i = 1; i < water.outer.length; i += 1) shape.lineTo(water.outer[i].x, -water.outer[i].z);
        shape.closePath();
        for (const hole of water.holes) {
          if (hole.length < 3) continue;
          const holePath = new THREE.Path();
          holePath.moveTo(hole[0].x, -hole[0].z);
          for (let i = 1; i < hole.length; i += 1) holePath.lineTo(hole[i].x, -hole[i].z);
          holePath.closePath();
          shape.holes.push(holePath);
        }
        const geom = new THREE.ShapeGeometry(shape, 1);
        geom.rotateX(-Math.PI / 2);
        const cx = (water.bounds.minX + water.bounds.maxX) * 0.5;
        const cz = (water.bounds.minZ + water.bounds.maxZ) * 0.5;
        const baseY = this.terrainHeightAt(cx, cz);
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.y = baseY + 0.04;
        mesh.receiveShadow = true;
        mesh.name = "osm-water";
        this.worldChunkGroup.add(mesh);

        const rings: [number, number][][] = [
          water.outer.map((p) => [p.x, p.z]),
          ...water.holes.map((h) => h.map((p) => [p.x, p.z] as [number, number])),
        ];
        this.waterCollisionShapes.push({ ...water.bounds, rings });
      } else if (water.kind === "stream" && water.outer.length >= 2) {
        const ribbon = this.buildRibbonGeometry(water.outer, water.width, 0.038);
        const mesh = new THREE.Mesh(ribbon, mat);
        mesh.name = "osm-waterway";
        this.worldChunkGroup.add(mesh);
      }
    }
  }

  private buildRibbonGeometry(points: { x: number; z: number }[], width: number, elevationOffset: number): THREE.BufferGeometry {
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let accumDist = 0;
    for (let i = 0; i < points.length; i += 1) {
      if (i > 0) {
        accumDist += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
      }
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      const dx = next.x - prev.x;
      const dz = next.z - prev.z;
      const len = Math.hypot(dx, dz) || 1;
      const ox = (-dz / len) * width * 0.5;
      const oz = (dx / len) * width * 0.5;
      const y = this.terrainHeightAt(points[i].x, points[i].z) + elevationOffset;
      vertices.push(points[i].x + ox, y, points[i].z + oz);
      vertices.push(points[i].x - ox, y, points[i].z - oz);
      uvs.push(0, accumDist / 12, 1, accumDist / 12);
      if (i > 0) {
        const a = (i - 1) * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  private buildRoadsAndSidewalks(snapshot: OsmWorldSnapshot): void {
    const maxAniso = this.isSoftwareGl ? 1 : this.renderer.capabilities.getMaxAnisotropy();
    const roadMatCache = new Map<string, THREE.MeshStandardMaterial>();
    const getMat = (color: number, kind: "asphalt" | "paving", roughness: number): THREE.MeshStandardMaterial => {
      const key = `${color}-${kind}-${roughness}`;
      let mat = roadMatCache.get(key);
      if (!mat) {
        const map = kind === "asphalt"
          ? createAsphaltTexture(color, maxAniso)
          : createPavingTexture(color, maxAniso);
        mat = new THREE.MeshStandardMaterial({ map, roughness, side: THREE.DoubleSide });
        roadMatCache.set(key, mat);
      }
      return mat;
    };

    const roadBuckets = new Map<string, { mat: THREE.MeshStandardMaterial; name: string; geos: THREE.BufferGeometry[] }>();
    const bridgeRailMat = new THREE.MeshStandardMaterial({ color: 0x9aa4aa, roughness: 0.72, metalness: 0.25 });
    const bridgeGeos: THREE.BufferGeometry[] = [];

    const dashTransforms: { x: number; y: number; z: number; yaw: number; len: number }[] = [];
    const crosswalkTransforms: { x: number; y: number; z: number; yaw: number; width: number }[] = [];

    for (const road of snapshot.roads) {
      if (road.points.length < 2) continue;
      // Do not draw underground tunnels over surface buildings/parks
      if (road.brunnel === "tunnel") continue;

      const bridgeBoost = road.brunnel === "bridge" ? 1.05 : 0;

      if (road.isVehicular && road.sidewalkWidth > 0) {
        const swGeom = prepareForMerge(
          this.buildRibbonGeometry(
            road.points,
            road.width + road.sidewalkWidth * 2,
            0.055 + bridgeBoost,
          ),
        );
        const swKey = `sw-${road.sidewalkColor}`;
        let swBucket = roadBuckets.get(swKey);
        if (!swBucket) {
          swBucket = { mat: getMat(road.sidewalkColor, "paving", 0.94), name: "osm-sidewalk", geos: [] };
          roadBuckets.set(swKey, swBucket);
        }
        swBucket.geos.push(swGeom);
      }

      const roadGeom = prepareForMerge(
        this.buildRibbonGeometry(
          road.points,
          road.width,
          (road.isVehicular ? 0.088 : 0.068) + bridgeBoost,
        ),
      );
      const rKey = `rd-${road.surfaceColor}-${road.isVehicular ? "a" : "p"}`;
      let rBucket = roadBuckets.get(rKey);
      if (!rBucket) {
        rBucket = {
          mat: getMat(road.surfaceColor, road.isVehicular ? "asphalt" : "paving", 0.88),
          name: `osm-road-${road.category}`,
          geos: [],
        };
        roadBuckets.set(rKey, rBucket);
      }
      rBucket.geos.push(roadGeom);

      for (let i = 0; i < road.points.length - 1; i += 1) {
        const a = road.points[i];
        const b = road.points[i + 1];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const segLen = Math.hypot(dx, dz);
        if (segLen < 3.5) continue;
        const yaw = Math.atan2(dx, dz);

        if (road.brunnel === "bridge" && bridgeGeos.length < 180) {
          const nx = -dz / segLen;
          const nz = dx / segLen;
          const railOffset = road.width * 0.5 + road.sidewalkWidth + 0.15;
          const midX = (a.x + b.x) * 0.5;
          const midZ = (a.z + b.z) * 0.5;
          const midY = this.terrainHeightAt(midX, midZ) + bridgeBoost + 0.45;
          for (const side of [-1, 1]) {
            const railGeo = prepareForMerge(new THREE.BoxGeometry(0.24, 0.85, segLen));
            railGeo.rotateY(yaw);
            railGeo.translate(midX + nx * railOffset * side, midY, midZ + nz * railOffset * side);
            bridgeGeos.push(railGeo);
          }
        }

        if (road.hasCenterLine && dashTransforms.length < 520) {
          const step = 6.2;
          for (let d = 3; d < segLen - 3; d += step) {
            const t = d / segLen;
            const px = a.x + dx * t;
            const pz = a.z + dz * t;
            if (Math.hypot(px, pz) > 200) continue;
            dashTransforms.push({
              x: px,
              y: this.terrainHeightAt(px, pz) + 0.105 + bridgeBoost,
              z: pz,
              yaw,
              len: 2.6,
            });
          }
        }

        if (
          road.isVehicular
          && road.brunnel !== "bridge"
          && (road.category === "primary" || road.category === "secondary" || road.category === "residential")
          && segLen > 14
          && crosswalkTransforms.length < 180
        ) {
          for (const distEnd of [4.2, segLen - 4.2]) {
            const t = distEnd / segLen;
            const cx = a.x + dx * t;
            const cz = a.z + dz * t;
            if (Math.hypot(cx, cz) > 180) continue;
            crosswalkTransforms.push({
              x: cx,
              y: this.terrainHeightAt(cx, cz) + 0.108,
              z: cz,
              yaw,
              width: Math.max(3.2, road.width - 1.2),
            });
          }
        }
      }
    }

    // Asphalt intersection discs where multiple roads meet
    if (snapshot.intersections.length > 0) {
      const discMat = getMat(0x3a4249, "asphalt", 0.88);
      const discGeos: THREE.BufferGeometry[] = [];
      for (const ix of snapshot.intersections) {
        const g = prepareForMerge(new THREE.CylinderGeometry(4.4, 4.4, 0.04, 14));
        g.translate(ix.x, this.terrainHeightAt(ix.x, ix.z) + 0.085, ix.z);
        discGeos.push(g);
      }
      const mergedDiscs = discGeos.length === 1 ? discGeos[0] : mergeGeometries(discGeos, false);
      if (discGeos.length > 1) discGeos.forEach((g) => g.dispose());
      if (mergedDiscs) {
        const ixMesh = new THREE.Mesh(mergedDiscs, discMat);
        ixMesh.receiveShadow = true;
        ixMesh.name = "osm-road-intersections";
        this.worldChunkGroup.add(ixMesh);
      }
    }

    for (const bucket of roadBuckets.values()) {
      const merged = bucket.geos.length === 1 ? bucket.geos[0] : mergeGeometries(bucket.geos, false);
      if (bucket.geos.length > 1) bucket.geos.forEach((g) => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, bucket.mat);
      mesh.receiveShadow = true;
      mesh.name = bucket.name;
      this.worldChunkGroup.add(mesh);
    }

    if (bridgeGeos.length > 0) {
      const mergedRails = bridgeGeos.length === 1 ? bridgeGeos[0] : mergeGeometries(bridgeGeos, false);
      if (bridgeGeos.length > 1) bridgeGeos.forEach((g) => g.dispose());
      if (mergedRails) {
        const bridgeMesh = new THREE.Mesh(mergedRails, bridgeRailMat);
        bridgeMesh.castShadow = !this.isSoftwareGl;
        bridgeMesh.name = "osm-bridge-rails";
        this.worldChunkGroup.add(bridgeMesh);
      }
    } else {
      bridgeRailMat.dispose();
    }

    if (dashTransforms.length > 0) {
      const dashGeo = new THREE.PlaneGeometry(0.22, 1);
      dashGeo.rotateX(-Math.PI / 2);
      const dashMat = new THREE.MeshBasicMaterial({ color: 0xead7a6, side: THREE.DoubleSide });
      const dashInst = new THREE.InstancedMesh(dashGeo, dashMat, dashTransforms.length);
      const dummy = new THREE.Object3D();
      dashTransforms.forEach((d, idx) => {
        dummy.position.set(d.x, d.y, d.z);
        dummy.rotation.set(0, d.yaw, 0);
        dummy.scale.set(1, 1, d.len);
        dummy.updateMatrix();
        dashInst.setMatrixAt(idx, dummy.matrix);
      });
      dashInst.instanceMatrix.needsUpdate = true;
      dashInst.computeBoundingSphere();
      dashInst.name = "osm-road-dashes";
      this.worldChunkGroup.add(dashInst);
    }

    if (crosswalkTransforms.length > 0 && this.qualityTier !== "performance") {
      const barsPerCrosswalk = 5;
      const barGeo = new THREE.PlaneGeometry(0.45, 2.2);
      barGeo.rotateX(-Math.PI / 2);
      const barMat = new THREE.MeshBasicMaterial({ color: 0xe9edf0, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
      const totalBars = crosswalkTransforms.length * barsPerCrosswalk;
      const barInst = new THREE.InstancedMesh(barGeo, barMat, totalBars);
      const dummy = new THREE.Object3D();
      let idx = 0;
      for (const cw of crosswalkTransforms) {
        const px = Math.cos(cw.yaw);
        const pz = -Math.sin(cw.yaw);
        const halfW = cw.width * 0.42;
        for (let b = 0; b < barsPerCrosswalk; b += 1) {
          const frac = (b / (barsPerCrosswalk - 1)) * 2 - 1;
          dummy.position.set(cw.x + px * frac * halfW, cw.y, cw.z + pz * frac * halfW);
          dummy.rotation.set(0, cw.yaw, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          barInst.setMatrixAt(idx, dummy.matrix);
          idx += 1;
        }
      }
      barInst.instanceMatrix.needsUpdate = true;
      barInst.computeBoundingSphere();
      barInst.name = "osm-crosswalks";
      this.worldChunkGroup.add(barInst);
    }

    // Procedural street-side furniture anchored to mapped sidewalks & parks (clearly distinct from OSM objects)
    const lamps = snapshot.streetFurniture.filter((f) => f.kind === "lamp").slice(0, 85);
    const benches = snapshot.streetFurniture.filter((f) => f.kind === "bench").slice(0, 36);
    const bollards = snapshot.streetFurniture.filter((f) => f.kind === "bollard").slice(0, 48);

    if (lamps.length > 0 && this.qualityTier !== "performance") {
      const postGeo = createStreetLampPostGeometry();
      const postMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.48, metalness: 0.65 });
      const bulbGeo = new THREE.SphereGeometry(0.14, 8, 6);
      const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff0c4, emissive: 0xffcf7a, emissiveIntensity: 1.4 });
      const posts = new THREE.InstancedMesh(postGeo, postMat, lamps.length);
      const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, lamps.length);
      const dummy = new THREE.Object3D();
      lamps.forEach((l, idx) => {
        const y = this.terrainHeightAt(l.x, l.z) + 0.055;
        dummy.position.set(l.x, y, l.z);
        dummy.rotation.set(0, l.yaw, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        posts.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(l.x + Math.cos(l.yaw) * 0.84, y + 4.18, l.z - Math.sin(l.yaw) * 0.84);
        dummy.updateMatrix();
        bulbs.setMatrixAt(idx, dummy.matrix);
      });
      posts.instanceMatrix.needsUpdate = true;
      bulbs.instanceMatrix.needsUpdate = true;
      posts.computeBoundingSphere();
      bulbs.computeBoundingSphere();
      posts.name = "procedural-streetlamps";
      bulbs.name = "procedural-streetlamp-bulbs";
      this.worldChunkGroup.add(posts, bulbs);
    }

    if (benches.length > 0) {
      const benchGeo = createParkBenchGeometry();
      const benchMat = new THREE.MeshStandardMaterial({ color: 0x7a5638, roughness: 0.82 });
      const benchInst = new THREE.InstancedMesh(benchGeo, benchMat, benches.length);
      const dummy = new THREE.Object3D();
      benches.forEach((b, idx) => {
        dummy.position.set(b.x, this.terrainHeightAt(b.x, b.z) + 0.07, b.z);
        dummy.rotation.set(0, b.yaw, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        benchInst.setMatrixAt(idx, dummy.matrix);
      });
      benchInst.instanceMatrix.needsUpdate = true;
      benchInst.computeBoundingSphere();
      benchInst.name = "procedural-benches";
      this.worldChunkGroup.add(benchInst);
    }

    if (bollards.length > 0 && this.qualityTier === "quality") {
      const bollardGeo = createBollardGeometry();
      const bollardMat = new THREE.MeshStandardMaterial({ color: 0x3b444a, roughness: 0.45, metalness: 0.6 });
      const bollardInst = new THREE.InstancedMesh(bollardGeo, bollardMat, bollards.length);
      const dummy = new THREE.Object3D();
      bollards.forEach((b, idx) => {
        dummy.position.set(b.x, this.terrainHeightAt(b.x, b.z) + 0.055, b.z);
        dummy.rotation.set(0, b.yaw, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        bollardInst.setMatrixAt(idx, dummy.matrix);
      });
      bollardInst.instanceMatrix.needsUpdate = true;
      bollardInst.computeBoundingSphere();
      bollardInst.name = "procedural-bollards";
      this.worldChunkGroup.add(bollardInst);
    }
  }

  private buildBuildings(snapshot: OsmWorldSnapshot): void {
    const maxAniso = this.isSoftwareGl ? 1 : this.renderer.capabilities.getMaxAnisotropy();
    const entranceRingMat = new THREE.MeshBasicMaterial({ color: 0x79e2d2, side: THREE.DoubleSide });
    const entranceRingGeo = new THREE.RingGeometry(0.55, 0.82, 22);
    entranceRingGeo.rotateX(-Math.PI / 2);
    const doorFrameGeo = new THREE.BoxGeometry(1.55, 2.35, 0.24);
    const doorGlassGeo = new THREE.BoxGeometry(1.18, 2.05, 0.28);
    const awningGeo = new THREE.BoxGeometry(1.9, 0.16, 0.85);
    const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x3b2c20, roughness: 0.72 });
    const doorGlassMat = new THREE.MeshStandardMaterial({ color: 0x5696ad, emissive: 0x264c5a, roughness: 0.25, metalness: 0.2 });
    const awningMat = new THREE.MeshStandardMaterial({ color: 0x285b6c, roughness: 0.55 });
    const roofVentGeo = new THREE.BoxGeometry(1.6, 0.75, 1.3);
    const roofVentMat = new THREE.MeshStandardMaterial({ color: 0x869299, roughness: 0.55, metalness: 0.45 });

    const wallMatCache = new Map<string, THREE.MeshStandardMaterial>();
    const roofMatCache = new Map<string, THREE.MeshStandardMaterial>();
    const wallBuckets = new Map<string, { mat: THREE.MeshStandardMaterial; geos: THREE.BufferGeometry[] }>();
    const roofBuckets = new Map<string, { mat: THREE.MeshStandardMaterial; geos: THREE.BufferGeometry[] }>();
    const ventPositions: { x: number; y: number; z: number }[] = [];
    const doorTransforms: { x: number; y: number; z: number; yaw: number }[] = [];
    const facadeWindows: { x: number; y: number; z: number; yaw: number; width: number; tint: number }[] = [];
    const windowTints = [0x9bb9c9, 0x7799ad, 0xb6c7d1, 0x6e8998, 0xc6d2d8];

    for (const b of snapshot.buildings) {
      if (b.outer.length < 4) continue;

      // Register collision rings
      const rings: [number, number][][] = [
        b.outer.map((p) => [p.x, p.z]),
        ...b.holes.map((h) => h.map((p) => [p.x, p.z] as [number, number])),
      ];
      const collider: BuildingCollisionShape = { ...b.bounds, rings };
      this.buildingCollisionShapes.push(collider);
      this.buildingCollisionIndex.insert(collider, b.bounds);

      const plan = generateBuildingPlan({
        points: b.outer.map((p) => ({ x: p.x, z: p.z })),
        sourceId: b.id,
        tags: b.tags,
        kind: b.kind === "monument" || b.kind === "civic" ? "office" : b.kind,
      });
      if (plan) this.mappedBuildingPlans.push(plan);

      const wallKey = `${b.wallColor}-${b.kind}`;
      let wallMat = wallMatCache.get(wallKey);
      if (!wallMat) {
        wallMat = new THREE.MeshStandardMaterial({
          map: createBuildingFacadeTexture(b.wallColor, b.kind, maxAniso),
          roughness: b.kind === "office" ? 0.45 : 0.84,
          metalness: b.kind === "office" ? 0.25 : 0.04,
          transparent: false,
          opacity: 1,
        });
        wallMatCache.set(wallKey, wallMat);
      }

      const roofKey = `${b.roofColor}-${b.kind}`;
      let roofMat = roofMatCache.get(roofKey);
      if (!roofMat) {
        roofMat = new THREE.MeshStandardMaterial({
          map: createRoofTexture(b.roofColor, b.kind, maxAniso),
          roughness: 0.76,
          metalness: 0.1,
          transparent: false,
          opacity: 1,
        });
        roofMatCache.set(roofKey, roofMat);
      }

      const shape = new THREE.Shape();
      shape.moveTo(b.outer[0].x, -b.outer[0].z);
      for (let i = 1; i < b.outer.length; i += 1) shape.lineTo(b.outer[i].x, -b.outer[i].z);
      shape.closePath();
      for (const hole of b.holes) {
        if (hole.length < 4) continue;
        const hp = new THREE.Path();
        hp.moveTo(hole[0].x, -hole[0].z);
        for (let i = 1; i < hole.length; i += 1) hp.lineTo(hole[i].x, -hole[i].z);
        hp.closePath();
        shape.holes.push(hp);
      }

      const extrudeDepth = Math.max(2.8, b.height - b.baseHeight);
      const bodyGeo = prepareForMerge(
        new THREE.ExtrudeGeometry(shape, { depth: extrudeDepth, bevelEnabled: false, curveSegments: 1 }),
      );
      bodyGeo.rotateX(-Math.PI / 2);
      const groundY = this.terrainHeightAt(b.center.x, b.center.z);

      // Keep nearby tall buildings as separate meshes for Bullet Echo occlusion fade; batch all others!
      const canOcclude = extrudeDepth > 8 && Math.hypot(b.center.x, b.center.z) < 120;
      if (canOcclude) {
        const body = new THREE.Mesh(bodyGeo, wallMat.clone());
        body.position.y = b.baseHeight + groundY;
        body.castShadow = !this.isSoftwareGl;
        body.receiveShadow = true;
        body.name = "osm-building";
        this.worldChunkGroup.add(body);
        this.tallBuildingOccluders.push({
          mesh: body,
          minX: b.bounds.minX,
          maxX: b.bounds.maxX,
          minZ: b.bounds.minZ,
          maxZ: b.bounds.maxZ,
        });
      } else {
        bodyGeo.translate(0, b.baseHeight + groundY, 0);
        let wBucket = wallBuckets.get(wallKey);
        if (!wBucket) {
          wBucket = { mat: wallMat, geos: [] };
          wallBuckets.set(wallKey, wBucket);
        }
        wBucket.geos.push(bodyGeo);
      }

      const roofCapGeo = prepareForMerge(new THREE.ShapeGeometry(shape, 1));
      roofCapGeo.rotateX(-Math.PI / 2);
      const roofY = b.baseHeight + groundY + extrudeDepth + 0.04;
      roofCapGeo.translate(0, roofY, 0);
      let rBucket = roofBuckets.get(roofKey);
      if (!rBucket) {
        rBucket = { mat: roofMat, geos: [] };
        roofBuckets.set(roofKey, rBucket);
      }
      rBucket.geos.push(roofCapGeo);

      // Add real 3D window frames and glass to the mapped footprint instead of relying only on painted facade pixels.
      // Keep this bounded for dense areas and use instancing to avoid a draw call per window.
      if (facadeWindows.length < 2200 && extrudeDepth >= 2.5) {
        const centroid = b.center;
        const floorCount = Math.max(1, Math.min(10, Math.floor((extrudeDepth - 0.35) / 3.05)));
        for (let edge = 0; edge < b.outer.length - 1 && facadeWindows.length < 2200; edge += 1) {
          const a = b.outer[edge];
          const p = b.outer[edge + 1];
          const dx = p.x - a.x;
          const dz = p.z - a.z;
          const edgeLength = Math.hypot(dx, dz);
          if (edgeLength < 4.6) continue;
          const tangentX = dx / edgeLength;
          const tangentZ = dz / edgeLength;
          let normalX = -tangentZ;
          let normalZ = tangentX;
          const midX = (a.x + p.x) * 0.5;
          const midZ = (a.z + p.z) * 0.5;
          if (normalX * (midX - centroid.x) + normalZ * (midZ - centroid.z) < 0) {
            normalX = -normalX;
            normalZ = -normalZ;
          }
          const yaw = Math.atan2(-tangentZ, tangentX);
          const windowsOnEdge = Math.max(1, Math.floor(edgeLength / 4.1));
          const spacing = edgeLength / windowsOnEdge;
          const winWidth = Math.min(1.42, spacing * 0.48);
          const winHeight = Math.min(1.58, Math.max(1.05, extrudeDepth / floorCount * 0.5));
          for (let floor = 0; floor < floorCount && facadeWindows.length < 2200; floor += 1) {
            const floorHeight = extrudeDepth / floorCount;
            const winY = b.baseHeight + groundY + floor * floorHeight + floorHeight * 0.57;
            if (winY > b.baseHeight + groundY + extrudeDepth - 0.5) continue;
            for (let w = 0; w < windowsOnEdge && facadeWindows.length < 2200; w += 1) {
              const along = (w + 0.5) * spacing - edgeLength * 0.5;
              facadeWindows.push({
                x: midX + tangentX * along + normalX * 0.09,
                y: winY,
                z: midZ + tangentZ * along + normalZ * 0.09,
                yaw,
                width: winWidth,
                tint: windowTints[(Math.abs(Math.round(midX + midZ + floor * 7 + w)) % windowTints.length)],
              });
            }
          }
        }
      }

      const footprintW = b.bounds.maxX - b.bounds.minX;
      const footprintD = b.bounds.maxZ - b.bounds.minZ;
      if (footprintW > 11 && footprintD > 11 && b.kind !== "house" && ventPositions.length < 120) {
        ventPositions.push({ x: b.center.x, y: roofY + 0.37, z: b.center.z });
      }

      // Street-facing architectural doorway & tactical threshold pad (instanced below)
      if (b.entrancePoint && Math.hypot(b.entrancePoint.x, b.entrancePoint.z) < 155) {
        const ey = this.terrainHeightAt(b.entrancePoint.x, b.entrancePoint.z);
        if (doorTransforms.length < 130) {
          doorTransforms.push({
            x: b.entrancePoint.x,
            y: ey,
            z: b.entrancePoint.z,
            yaw: b.entranceYaw,
          });
        }
        this.entranceNodes.push({
          building: b,
          x: b.entrancePoint.x,
          z: b.entrancePoint.z,
          yaw: b.entranceYaw,
        });
      }
    }

    if (facadeWindows.length > 0) {
      const frameGeo = new THREE.BoxGeometry(1, 1, 0.16);
      const glassGeo = new THREE.BoxGeometry(1, 1, 0.07);
      const sillGeo = new THREE.BoxGeometry(1, 1, 0.2);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0xd5d0c6, roughness: 0.68, metalness: 0.08 });
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, roughness: 0.24, metalness: 0.18,
        emissive: 0x172b36, emissiveIntensity: 0.08,
      });
      const sillMat = new THREE.MeshStandardMaterial({ color: 0xb8b2a7, roughness: 0.76 });
      const frames = new THREE.InstancedMesh(frameGeo, frameMat, facadeWindows.length);
      const glasses = new THREE.InstancedMesh(glassGeo, glassMat, facadeWindows.length);
      const sills = new THREE.InstancedMesh(sillGeo, sillMat, facadeWindows.length);
      const dummy = new THREE.Object3D();
      const tint = new THREE.Color();
      facadeWindows.forEach((w, idx) => {
        dummy.position.set(w.x, w.y, w.z);
        dummy.rotation.set(0, w.yaw, 0);
        dummy.scale.set(w.width + 0.18, 1.72, 1);
        dummy.updateMatrix();
        frames.setMatrixAt(idx, dummy.matrix);
        frames.setColorAt(idx, tint.setHex(idx % 7 === 0 ? 0xc7bcae : idx % 5 === 0 ? 0xaaa69d : 0xe2ddd3));

        dummy.position.set(w.x, w.y, w.z + 0.015);
        dummy.scale.set(w.width, 1.42, 1);
        dummy.updateMatrix();
        glasses.setMatrixAt(idx, dummy.matrix);
        glasses.setColorAt(idx, tint.setHex(w.tint));

        dummy.position.set(w.x, w.y - 0.88, w.z + 0.055);
        dummy.scale.set(w.width + 0.3, 0.13, 1);
        dummy.updateMatrix();
        sills.setMatrixAt(idx, dummy.matrix);
      });
      frames.instanceMatrix.needsUpdate = true;
      glasses.instanceMatrix.needsUpdate = true;
      sills.instanceMatrix.needsUpdate = true;
      if (frames.instanceColor) frames.instanceColor.needsUpdate = true;
      if (glasses.instanceColor) glasses.instanceColor.needsUpdate = true;
      frames.computeBoundingSphere();
      glasses.computeBoundingSphere();
      sills.computeBoundingSphere();
      frames.name = "real-3d-window-frames";
      glasses.name = "real-3d-window-glass";
      sills.name = "real-3d-window-sills";
      this.worldChunkGroup.add(frames, glasses, sills);
    }

    for (const bucket of wallBuckets.values()) {
      const merged = bucket.geos.length === 1 ? bucket.geos[0] : mergeGeometries(bucket.geos, false);
      if (bucket.geos.length > 1) bucket.geos.forEach((g) => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, bucket.mat);
      mesh.castShadow = !this.isSoftwareGl;
      mesh.receiveShadow = true;
      mesh.name = "osm-building-batch";
      this.worldChunkGroup.add(mesh);
    }

    for (const bucket of roofBuckets.values()) {
      const merged = bucket.geos.length === 1 ? bucket.geos[0] : mergeGeometries(bucket.geos, false);
      if (bucket.geos.length > 1) bucket.geos.forEach((g) => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, bucket.mat);
      mesh.receiveShadow = true;
      mesh.name = "osm-building-roof-batch";
      this.worldChunkGroup.add(mesh);
    }

    if (doorTransforms.length > 0) {
      const pads = new THREE.InstancedMesh(entranceRingGeo, entranceRingMat, doorTransforms.length);
      const frames = new THREE.InstancedMesh(doorFrameGeo, doorFrameMat, doorTransforms.length);
      const glasses = new THREE.InstancedMesh(doorGlassGeo, doorGlassMat, doorTransforms.length);
      const awnings = new THREE.InstancedMesh(awningGeo, awningMat, doorTransforms.length);
      const dummy = new THREE.Object3D();
      const upAxis = new THREE.Vector3(0, 1, 0);
      const offsetVec = new THREE.Vector3();

      doorTransforms.forEach((d, idx) => {
        dummy.position.set(d.x, d.y + 0.115, d.z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        pads.setMatrixAt(idx, dummy.matrix);

        dummy.rotation.set(0, d.yaw, 0);

        offsetVec.set(0, 1.18, -0.15).applyAxisAngle(upAxis, d.yaw);
        dummy.position.set(d.x + offsetVec.x, d.y + offsetVec.y, d.z + offsetVec.z);
        dummy.updateMatrix();
        frames.setMatrixAt(idx, dummy.matrix);

        offsetVec.set(0, 1.08, -0.14).applyAxisAngle(upAxis, d.yaw);
        dummy.position.set(d.x + offsetVec.x, d.y + offsetVec.y, d.z + offsetVec.z);
        dummy.updateMatrix();
        glasses.setMatrixAt(idx, dummy.matrix);

        offsetVec.set(0, 2.42, 0.22).applyAxisAngle(upAxis, d.yaw);
        dummy.position.set(d.x + offsetVec.x, d.y + offsetVec.y, d.z + offsetVec.z);
        dummy.updateMatrix();
        awnings.setMatrixAt(idx, dummy.matrix);
      });

      pads.instanceMatrix.needsUpdate = true;
      frames.instanceMatrix.needsUpdate = true;
      glasses.instanceMatrix.needsUpdate = true;
      awnings.instanceMatrix.needsUpdate = true;
      pads.computeBoundingSphere();
      frames.computeBoundingSphere();
      glasses.computeBoundingSphere();
      awnings.computeBoundingSphere();
      pads.name = "osm-building-entrances";
      frames.name = "osm-entrance-frames";
      glasses.name = "osm-entrance-glass";
      awnings.name = "osm-entrance-awnings";
      this.worldChunkGroup.add(pads, frames, glasses, awnings);
    } else {
      entranceRingGeo.dispose();
      entranceRingMat.dispose();
      doorFrameGeo.dispose();
      doorFrameMat.dispose();
      doorGlassGeo.dispose();
      doorGlassMat.dispose();
      awningGeo.dispose();
      awningMat.dispose();
    }

    if (ventPositions.length > 0 && this.qualityTier !== "performance") {
      const ventInst = new THREE.InstancedMesh(roofVentGeo, roofVentMat, ventPositions.length);
      const dummy = new THREE.Object3D();
      ventPositions.forEach((v, idx) => {
        dummy.position.set(v.x, v.y, v.z);
        dummy.rotation.set(0, (idx * 0.7) % Math.PI, 0);
        dummy.updateMatrix();
        ventInst.setMatrixAt(idx, dummy.matrix);
      });
      ventInst.instanceMatrix.needsUpdate = true;
      ventInst.computeBoundingSphere();
      ventInst.name = "osm-roof-vents";
      this.worldChunkGroup.add(ventInst);
    } else {
      roofVentGeo.dispose();
      roofVentMat.dispose();
    }
  }

  private buildVegetation(snapshot: OsmWorldSnapshot): void {
    const allTrees = snapshot.vegetation.filter((v) => v.kind === "tree");
    const broadleaf = allTrees.filter((_, idx) => idx % 3 !== 0);
    const conifers = allTrees.filter((_, idx) => idx % 3 === 0);
    const shrubs = snapshot.vegetation.filter((v) => v.kind === "shrub");

    if (allTrees.length > 0 && this.contactShadowTex) {
      const shadowGeo = new THREE.PlaneGeometry(3.8, 3.8);
      shadowGeo.rotateX(-Math.PI / 2);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: this.contactShadowTex,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });
      const shadows = new THREE.InstancedMesh(shadowGeo, shadowMat, allTrees.length);
      const dummy = new THREE.Object3D();
      allTrees.forEach((t, idx) => {
        const y = this.terrainHeightAt(t.x, t.z);
        dummy.position.set(t.x, y + 0.045, t.z);
        dummy.scale.set(t.scale, 1, t.scale);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        shadows.setMatrixAt(idx, dummy.matrix);
      });
      shadows.instanceMatrix.needsUpdate = true;
      shadows.computeBoundingSphere();
      shadows.name = "osm-tree-shadows";
      this.worldChunkGroup.add(shadows);
    }

    const addTreeBatch = (
      list: typeof allTrees,
      crownGeo: THREE.BufferGeometry,
      crownHeightOffset: number,
      nameSuffix: string,
    ): void => {
      if (list.length === 0) {
        crownGeo.dispose();
        return;
      }
      const trunkGeo = new THREE.CylinderGeometry(0.18, 0.34, 2.5, 7);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c422f, roughness: 0.92 });
      const crownMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86 });

      const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, list.length);
      const crowns = new THREE.InstancedMesh(crownGeo, crownMat, list.length);
      trunks.castShadow = !this.isSoftwareGl;
      crowns.castShadow = !this.isSoftwareGl;
      crowns.receiveShadow = true;

      const dummy = new THREE.Object3D();
      const color = new THREE.Color();
      list.forEach((t, idx) => {
        const y = this.terrainHeightAt(t.x, t.z);
        dummy.position.set(t.x, y + 1.25 * t.scale, t.z);
        dummy.scale.set(t.scale, t.scale, t.scale);
        dummy.rotation.set(0, (idx * 1.1) % (Math.PI * 2), 0);
        dummy.updateMatrix();
        trunks.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(t.x, y + crownHeightOffset * t.scale, t.z);
        dummy.scale.set(t.scale, t.scale * 1.08, t.scale);
        dummy.updateMatrix();
        crowns.setMatrixAt(idx, dummy.matrix);
        crowns.setColorAt(idx, color.setHex(t.canopyColor));

        this.obstacleColliders.push({ x: t.x, z: t.z, radius: 0.55 * t.scale });
      });
      trunks.instanceMatrix.needsUpdate = true;
      crowns.instanceMatrix.needsUpdate = true;
      if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
      trunks.computeBoundingSphere();
      crowns.computeBoundingSphere();
      trunks.name = `osm-tree-trunks-${nameSuffix}`;
      crowns.name = `osm-tree-crowns-${nameSuffix}`;
      this.worldChunkGroup.add(trunks, crowns);
    };

    addTreeBatch(broadleaf, createBroadleafCrownGeometry(), 3.25, "broadleaf");
    addTreeBatch(conifers, createConiferCrownGeometry(), 3.45, "conifer");

    if (shrubs.length > 0) {
      const shrubGeo = new THREE.DodecahedronGeometry(0.85, 0);
      const shrubMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94 });
      const inst = new THREE.InstancedMesh(shrubGeo, shrubMat, shrubs.length);
      const dummy = new THREE.Object3D();
      const color = new THREE.Color();
      shrubs.forEach((s, idx) => {
        const y = this.terrainHeightAt(s.x, s.z);
        dummy.position.set(s.x, y + 0.45 * s.scale, s.z);
        dummy.scale.set(s.scale, s.scale * 0.72, s.scale);
        dummy.rotation.set(0, idx * 0.9, 0);
        dummy.updateMatrix();
        inst.setMatrixAt(idx, dummy.matrix);
        inst.setColorAt(idx, color.setHex(s.canopyColor));
      });
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.computeBoundingSphere();
      inst.name = "osm-shrubs";
      this.worldChunkGroup.add(inst);
    }
  }

  private buildLandmarks(snapshot: OsmWorldSnapshot): void {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd7cbb1, roughness: 0.68, metalness: 0.08 });
    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xc89e52, roughness: 0.35, metalness: 0.65 });
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x3596b8, roughness: 0.16, metalness: 0.2 });
    const beaconMats: Record<string, THREE.MeshStandardMaterial> = {
      monument: new THREE.MeshStandardMaterial({ color: 0xf4c96b, emissive: 0x6b4f18, roughness: 0.32, metalness: 0.5 }),
      culture: new THREE.MeshStandardMaterial({ color: 0xe6a870, emissive: 0x523118, roughness: 0.4 }),
      education: new THREE.MeshStandardMaterial({ color: 0x6cb8ee, emissive: 0x16415c, roughness: 0.4 }),
      transport: new THREE.MeshStandardMaterial({ color: 0xf0c954, emissive: 0x55420e, roughness: 0.45 }),
      health: new THREE.MeshStandardMaterial({ color: 0xe97171, emissive: 0x5d1b1b, roughness: 0.4 }),
      commerce: new THREE.MeshStandardMaterial({ color: 0xb78be8, emissive: 0x3b215c, roughness: 0.45 }),
      civic: new THREE.MeshStandardMaterial({ color: 0x8bc5d4, emissive: 0x1b4552, roughness: 0.45 }),
      sports: new THREE.MeshStandardMaterial({ color: 0x6cd6a6, emissive: 0x175237, roughness: 0.45 }),
      park: new THREE.MeshStandardMaterial({ color: 0x79c97b, emissive: 0x1f4f20, roughness: 0.55 }),
      fountain: new THREE.MeshStandardMaterial({ color: 0x90e8ff, emissive: 0x246278, roughness: 0.2 }),
      peak: new THREE.MeshStandardMaterial({ color: 0xf0d68a, emissive: 0x695420, roughness: 0.4 }),
    };

    for (const lm of snapshot.landmarks.slice(0, 64)) {
      const y = this.terrainHeightAt(lm.x, lm.z);
      const mats: LandmarkMaterialSet = {
        stone: stoneMat,
        bronze: bronzeMat,
        water: waterMat,
        accent: beaconMats[lm.category] ?? beaconMats.culture,
      };
      const built = buildLandmarkGroup(lm, mats);
      built.group.position.set(lm.x, y, lm.z);
      built.group.name = `osm-landmark-${lm.category}`;
      if (built.colliderRadius > 0) {
        this.obstacleColliders.push({ x: lm.x, z: lm.z, radius: built.colliderRadius });
      }
      this.worldChunkGroup.add(built.group);
    }
  }

  private buildPlayer(): void {
    const skin = new THREE.MeshStandardMaterial({ color: 0xdba170, roughness: 0.78 });
    const jacket = new THREE.MeshStandardMaterial({ color: 0x1f6275, roughness: 0.72 });
    const armor = new THREE.MeshStandardMaterial({ color: 0xe6b56c, roughness: 0.36, metalness: 0.42 });
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x8ef5eb, emissive: 0x20847d, roughness: 0.2 });

    // Grounded contact shadow disc so character is anchored even when shadows are disabled on SwiftShader
    if (this.contactShadowTex) {
      const shadowGeo = new THREE.PlaneGeometry(2.1, 2.1);
      shadowGeo.rotateX(-Math.PI / 2);
      const shadowDisc = new THREE.Mesh(
        shadowGeo,
        new THREE.MeshBasicMaterial({ map: this.contactShadowTex, transparent: true, opacity: 0.65, depthWrite: false }),
      );
      shadowDisc.position.y = 0.04;
      shadowDisc.renderOrder = 2;
      this.player.add(shadowDisc);
    }

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.68, 4, 10), jacket);
    torso.position.y = 1.18;
    torso.castShadow = !this.isSoftwareGl;
    this.playerTorso = torso;
    this.player.add(torso);

    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.56, 0.26), armor);
    pack.position.set(0, 1.24, -0.34);
    pack.castShadow = !this.isSoftwareGl;
    this.player.add(pack);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), skin);
    head.position.y = 1.92;
    head.castShadow = !this.isSoftwareGl;
    this.player.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.16), visorMat);
    visor.position.set(0, 1.95, 0.22);
    this.player.add(visor);

    const makeLimb = (length: number, material: THREE.Material, x: number, y: number): THREE.Group => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, length, 3, 6), material);
      limb.position.y = -length * 0.42;
      limb.castShadow = !this.isSoftwareGl;
      pivot.add(limb);
      this.player.add(pivot);
      this.animatedLimbs.push(pivot);
      return pivot;
    };
    makeLimb(0.58, jacket, -0.49, 1.48);
    makeLimb(0.58, jacket, 0.49, 1.48);
    makeLimb(0.68, jacket, -0.2, 0.78);
    makeLimb(0.68, jacket, 0.2, 0.78);

    // Tactical Bullet Echo ground readability halo & forward orientation arrow
    const ringGeo = new THREE.RingGeometry(0.76, 0.98, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x7ef3e3, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.14;
    this.playerGroundHalo.add(ring);

    const coneGeo = new THREE.CircleGeometry(2.8, 16, -Math.PI * 0.22, Math.PI * 0.44);
    coneGeo.rotateX(-Math.PI / 2);
    coneGeo.rotateY(Math.PI * 0.5);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x7ef3e3,
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = 0.13;
    this.playerGroundHalo.add(cone);

    this.player.add(this.playerGroundHalo);
    this.scene.add(this.player);
  }

  private buildProceduralInteriorChamber(kind: BuildingKind): void {
    this.disposeGroupChildren(this.interiorChamberGroup);
    this.interiorColliders.length = 0;
    this.streamedRoomGroups.length = 0;

    const prefab = getBuildingPrefab(kind);
    const layout = createInteriorLayout(kind);
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    this.interiorChamberGroup.position.set(this.interiorOffset.x, this.interiorOffset.y, this.interiorOffset.z);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: createProceduralSurfaceTexture(prefab.wallColor, 0x5c5044, "brick", maxAniso),
      roughness: 0.9,
    });
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: createProceduralSurfaceTexture(prefab.floorColor, 0x3b3d3e, "tile", maxAniso),
      roughness: 0.94,
    });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x455a60, roughness: 0.6, metalness: 0.2 });
    const furnitureMat = new THREE.MeshStandardMaterial({ color: 0x8c6d4f, roughness: 0.85 });

    const interiorLight = new THREE.PointLight(0xfff1d6, 2.2, 32);
    interiorLight.position.set(0, 4.5, -15);
    this.interiorChamberGroup.add(interiorLight);

    const addBox = (
      parent: THREE.Object3D,
      name: string,
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
      material: THREE.Material,
      solid = false,
    ): THREE.Mesh => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
      mesh.position.set(x, y, z);
      mesh.name = name;
      mesh.receiveShadow = true;
      parent.add(mesh);
      if (solid) {
        this.interiorColliders.push({
          x: x + this.interiorOffset.x,
          z: z + this.interiorOffset.z,
          halfX: sx * 0.5,
          halfZ: sz * 0.5,
        });
      }
      return mesh;
    };

    // Main floor & open top-down walls (no ceiling so tactical camera sees inside clearly!)
    addBox(this.interiorChamberGroup, "interior-floor", 0, -0.1, -15, 13.0, 0.2, 11.4, floorMat);
    addBox(this.interiorChamberGroup, "interior-wall-back", 0, 1.8, -20.6, 13.0, 3.6, 0.35, wallMat, true);
    addBox(this.interiorChamberGroup, "interior-wall-left", -6.4, 1.8, -15, 0.35, 3.6, 11.4, wallMat, true);
    addBox(this.interiorChamberGroup, "interior-wall-right", 6.4, 1.8, -15, 0.35, 3.6, 11.4, wallMat, true);
    addBox(this.interiorChamberGroup, "interior-wall-front-l", -4.1, 1.8, -9.2, 4.6, 3.6, 0.35, wallMat, true);
    addBox(this.interiorChamberGroup, "interior-wall-front-r", 4.1, 1.8, -9.2, 4.6, 3.6, 0.35, wallMat, true);
    addBox(this.interiorChamberGroup, "interior-partition-a", -1.6, 1.45, -14.4, 0.2, 2.9, 5.2, wallMat, true);
    addBox(this.interiorChamberGroup, "interior-partition-b", 1.8, 1.45, -18.0, 0.2, 2.9, 4.2, wallMat, true);

    // Exit doorway glow pad
    const exitPad = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.85, 24),
      new THREE.MeshBasicMaterial({ color: 0x79e2d2, side: THREE.DoubleSide }),
    );
    exitPad.rotation.x = -Math.PI / 2;
    exitPad.position.set(0, 0.04, -9.2);
    this.interiorChamberGroup.add(exitPad);

    const roomAnchors = [
      { x: -3.4, z: -12.2 }, { x: 3.4, z: -12.2 },
      { x: -3.4, z: -17.8 }, { x: 3.4, z: -17.8 },
    ];
    const furnitureShapes: Record<string, [number, number, number]> = {
      sofa: [1.8, 0.9, 0.8], bed: [1.8, 0.55, 1.25], table: [1.25, 0.75, 0.9],
      kitchen: [1.5, 1.1, 0.65], cabinet: [0.8, 1.65, 0.55], locker: [0.8, 1.8, 0.55],
      board: [2.0, 1.2, 0.12], desk: [1.2, 0.8, 0.7], counter: [1.8, 1.05, 0.7],
      shelf: [0.75, 1.7, 0.45], crate: [0.8, 0.8, 0.8], machine: [1.1, 1.4, 1.0],
      reception: [1.8, 1.0, 0.75], workstation: [1.2, 0.85, 0.7], plant: [0.55, 1.0, 0.55],
      chair: [0.65, 0.9, 0.65], "hall-chair": [0.65, 0.9, 0.65],
    };
    const objectGroups = new Map<string, THREE.Group>();
    layout.objects.forEach((item, index) => {
      const roomIndex = index % roomAnchors.length;
      const anchor = roomAnchors[roomIndex];
      let roomGroup = objectGroups.get(`room-${roomIndex}`);
      if (!roomGroup) {
        roomGroup = new THREE.Group();
        roomGroup.name = `streamed-room-${roomIndex}`;
        this.interiorChamberGroup.add(roomGroup);
        objectGroups.set(`room-${roomIndex}`, roomGroup);
        this.streamedRoomGroups.push({
          group: roomGroup,
          x: anchor.x + this.interiorOffset.x,
          z: anchor.z + this.interiorOffset.z,
        });
      }
      const key = item.id.replace(/-(a|b|c|\d+)$/, "");
      const shapeKey = key.includes("desk") ? "desk" : key;
      const [sx, sy, sz] = furnitureShapes[shapeKey] ?? [0.9, 0.9, 0.75];
      const x = anchor.x + (item.x - 6) * 0.18;
      const z = anchor.z + (item.y - 4) * 0.16;
      addBox(roomGroup, `interior-${item.id}`, x, sy * 0.5, z, sx, sy, sz, furnitureMat, true);
    });

    // Multi-floor staircase when building has >1 floor
    if (this.activeInteriorFloors > 1) {
      const stairMat = new THREE.MeshStandardMaterial({ color: 0x9b896d, roughness: 0.9 });
      const steps = 12;
      for (let i = 0; i < steps; i += 1) {
        const y = ((i + 1) / steps) * 3.2;
        const z = -19.0 + (i + 0.5) * (7.0 / steps);
        addBox(this.interiorChamberGroup, "interior-stair-step", 4.55, y * 0.5, z, 2.0, y, 7.0 / steps, stairMat);
      }
      addBox(this.interiorChamberGroup, "interior-upper-floor", 0, 3.2, -10.85, 12.4, 0.18, 2.9, floorMat);
      addBox(this.interiorChamberGroup, "interior-upper-rail", 0, 3.7, -12.25, 12.2, 0.9, 0.12, trimMat);
    }
  }

  private getInteriorStorageKey(): string {
    return `juju-world-3d-interior:${this.worldData.saveSlotId ?? "local"}:${this.worldData.origin[0].toFixed(4)}:${this.worldData.origin[1].toFixed(4)}`;
  }

  private saveInteriorSession(): void {
    try {
      this.worldData.onInteriorSave?.({
        buildingId: this.activeBuildingId || `osm:${this.chunkOrigin[0].toFixed(4)}:${this.chunkOrigin[1].toFixed(4)}`,
        floor: this.interiorFloor,
        x: this.player.position.x,
        y: this.player.position.y,
        z: this.player.position.z,
        yaw: this.yaw,
        inside: this.insideBuilding,
        savedAt: Date.now(),
        outside: [this.exteriorReturnPosition.x, this.exteriorReturnPosition.y, this.exteriorReturnPosition.z],
        doorOpen: this.insideBuilding,
      });
    } catch {
      // Never crash on local storage errors.
    }
  }

  private restoreInteriorSession(): void {
    const saved = this.worldData.initialInterior;
    if (!saved || !isValidSavedInterior(saved) || !saved.inside) return;
    if (Array.isArray(saved.outside) && saved.outside.length === 3 && saved.outside.every(Number.isFinite)) {
      this.exteriorReturnPosition.set(saved.outside[0], saved.outside[1], saved.outside[2]);
    }
  }

  private updateRoomStreaming(): void {
    if (!this.insideBuilding) return;
    for (const room of this.streamedRoomGroups) {
      room.group.visible = isRoomWithinLoadRadius(
        this.player.position.x,
        this.player.position.z,
        room.x,
        room.z,
        15,
      );
    }
  }

  private terrainHeightAt(x: number, z: number): number {
    const { terrain, terrainSegments, terrainSize } = this.worldData;
    if (!terrain.length || terrainSegments < 1) return 0;
    const half = terrainSize * 0.5;
    const column = THREE.MathUtils.clamp(((x + half) / terrainSize) * terrainSegments, 0, terrainSegments);
    const row = THREE.MathUtils.clamp(((z + half) / terrainSize) * terrainSegments, 0, terrainSegments);
    const c0 = Math.floor(column);
    const r0 = Math.floor(row);
    const c1 = Math.min(terrainSegments, c0 + 1);
    const r1 = Math.min(terrainSegments, r0 + 1);
    const tx = column - c0;
    const tz = row - r0;
    const stride = terrainSegments + 1;
    const a = terrain[r0 * stride + c0]?.elevation ?? 0;
    const b = terrain[r0 * stride + c1]?.elevation ?? a;
    const c = terrain[r1 * stride + c0]?.elevation ?? a;
    const d = terrain[r1 * stride + c1]?.elevation ?? a;
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, tx), THREE.MathUtils.lerp(c, d, tx), tz);
  }

  private groundHeightAt(x: number, z: number): number {
    if (this.insideBuilding) {
      const lx = x - this.interiorOffset.x;
      const lz = z - this.interiorOffset.z;
      const h = interiorGroundHeight(lx, lz, this.interiorFloor);
      return h !== null ? this.interiorOffset.y + h : this.interiorOffset.y;
    }
    return this.terrainHeightAt(x, z);
  }

  private collidesWithEnvironment = (x: number, z: number): boolean => {
    const radius = 0.62;
    const offsets: [number, number][] = [
      [0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius],
      [radius * 0.7, radius * 0.7], [-radius * 0.7, radius * 0.7],
      [radius * 0.7, -radius * 0.7], [-radius * 0.7, -radius * 0.7],
    ];
    if (this.insideBuilding) {
      for (const box of this.interiorColliders) {
        if (circleIntersectsInteriorBox(x, z, radius, box)) return true;
      }
      return false;
    }
    const nearbyBuildings = this.buildingCollisionIndex.query({
      minX: x - radius, maxX: x + radius, minZ: z - radius, maxZ: z + radius,
    });
    for (const building of nearbyBuildings) {
      const hits = offsets.some(([ox, oz]) => {
        const sx = x + ox;
        const sz = z + oz;
        return pointInLocalPolygon(sx, sz, building.rings[0].map(([px, pz]) => ({ x: px, z: pz })))
          && !building.rings.slice(1).some((h) => pointInLocalPolygon(sx, sz, h.map(([px, pz]) => ({ x: px, z: pz }))));
      });
      if (hits) return true;
    }
    for (const water of this.waterCollisionShapes) {
      if (x < water.minX - radius || x > water.maxX + radius || z < water.minZ - radius || z > water.maxZ + radius) {
        continue;
      }
      const inWater = pointInLocalPolygon(x, z, water.rings[0].map(([px, pz]) => ({ x: px, z: pz })))
        && !water.rings.slice(1).some((h) => pointInLocalPolygon(x, z, h.map(([px, pz]) => ({ x: px, z: pz }))));
      if (inWater) return true;
    }
    for (const obs of this.obstacleColliders) {
      const combined = radius + obs.radius;
      if (Math.abs(x - obs.x) > combined || Math.abs(z - obs.z) > combined) continue;
      if (Math.hypot(x - obs.x, z - obs.z) < combined) return true;
    }
    return false;
  };

  private findSafeLocalSpawn(startX: number, startZ: number): [number, number] {
    if (!this.collidesWithEnvironment(startX, startZ)) return [startX, startZ];
    for (const radius of [3, 6, 10, 15, 22, 32, 44]) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
        const cx = startX + Math.cos(angle) * radius;
        const cz = startZ + Math.sin(angle) * radius;
        if (!this.collidesWithEnvironment(cx, cz)) return [cx, cz];
      }
    }
    return [startX, startZ];
  }

  private nearestEntrance(): EntranceNode | null {
    let best: EntranceNode | null = null;
    let bestDist = 4.2;
    for (const node of this.entranceNodes) {
      const d = Math.hypot(this.player.position.x - node.x, this.player.position.z - node.z);
      if (d < bestDist) {
        bestDist = d;
        best = node;
      }
    }
    return best;
  }

  private nearestLandmark(): OsmLandmarkSpec | null {
    let best: OsmLandmarkSpec | null = null;
    let bestDist = 5.0;
    for (const lm of this.osmSnapshot.landmarks) {
      const d = Math.hypot(this.player.position.x - lm.x, this.player.position.z - lm.z);
      if (d < bestDist) {
        bestDist = d;
        best = lm;
      }
    }
    return best;
  }

  private updateInteraction(): void {
    const fr = this.language === "fr";
    if (this.insideBuilding) {
      const ex = this.interiorOffset.x;
      const ez = this.interiorOffset.z - 9.2;
      const atExit = Math.hypot(this.player.position.x - ex, this.player.position.z - ez) < 2.6;
      const lx = this.player.position.x - this.interiorOffset.x;
      const lz = this.player.position.z - this.interiorOffset.z;
      const atStairs = this.activeInteriorFloors > 1 && lx > 3.2 && lz < -12.0;
      this.interactionPrompt.hidden = false;
      this.interactionPrompt.textContent = atExit
        ? (fr ? "E · Sortir dans la rue" : "E · Exit to street")
        : atStairs
          ? (fr ? "Escalier · Montez vers l'étage supérieur" : "Stairs · Walk up to upper floor")
          : `${this.activeInteriorName || this.activeInteriorKind.toUpperCase()} · ${fr ? "Étage" : "Floor"} ${this.interiorFloor + 1}/${this.activeInteriorFloors} · ${fr ? "Intérieur procédural (emprise OSM)" : "Procedural interior (OSM footprint)"}`;
      return;
    }

    const entrance = this.nearestEntrance();
    if (entrance) {
      const label = entrance.building.name || entrance.building.kind.toUpperCase();
      this.interactionPrompt.hidden = false;
      this.interactionPrompt.textContent = fr
        ? `E · Entrer : ${label} (${entrance.building.floors} niv.)`
        : `E · Enter: ${label} (${entrance.building.floors} fl.)`;
      return;
    }

    const landmark = this.nearestLandmark();
    if (landmark) {
      this.interactionPrompt.hidden = false;
      this.interactionPrompt.textContent = fr
        ? `E · Inspecter : ${landmark.name || landmark.poiClass}`
        : `E · Inspect: ${landmark.name || landmark.poiClass}`;
      return;
    }

    this.interactionPrompt.hidden = true;
  }

  private interact(): void {
    if (this.insideBuilding) {
      const ex = this.interiorOffset.x;
      const ez = this.interiorOffset.z - 9.2;
      if (Math.hypot(this.player.position.x - ex, this.player.position.z - ez) < 2.8) {
        this.insideBuilding = false;
        this.interiorChamberGroup.visible = false;
        this.worldChunkGroup.visible = true;
        this.player.position.copy(this.exteriorReturnPosition);
        this.verticalVelocity = 0;
        this.interiorFloor = 0;
        this.saveInteriorSession();
        this.updateInteraction();
        return;
      }
      const lx = this.player.position.x - this.interiorOffset.x;
      const lz = this.player.position.z - this.interiorOffset.z;
      if (lx > 3.2 && lz > -12.8 && this.interiorFloor === 1) {
        this.interiorFloor = 0;
        this.player.position.y = this.interiorOffset.y;
      }
      return;
    }

    const entrance = this.nearestEntrance();
    if (entrance) {
      this.exteriorReturnPosition.copy(this.player.position);
      const rawKind = entrance.building.kind;
      const mappedKind: BuildingKind = rawKind === "monument" || rawKind === "civic" ? "office" : rawKind;
      this.activeInteriorKind = mappedKind;
      this.activeInteriorName = entrance.building.name || entrance.building.kind.toUpperCase();
      this.activeInteriorFloors = Math.min(3, Math.max(1, entrance.building.floors));
      this.activeBuildingId = entrance.building.id;
      this.buildProceduralInteriorChamber(mappedKind);
      this.interiorChamberGroup.visible = true;
      this.worldChunkGroup.visible = false;
      this.insideBuilding = true;
      this.interiorFloor = 0;
      this.verticalVelocity = 0;
      this.player.position.set(this.interiorOffset.x, this.interiorOffset.y, this.interiorOffset.z - 10.6);
      this.worldData.onEnterBuilding?.({
        name: this.activeInteriorName,
        kind: mappedKind,
        floors: this.activeInteriorFloors,
        source: "osm",
      });
      this.saveInteriorSession();
      this.updateInteraction();
      return;
    }

    const landmark = this.nearestLandmark();
    if (landmark) {
      this.worldData.onLandmarkInspect?.(landmark);
    }
  }

  /** Smoothly update loaded OSM world around the player when walking to new city blocks! */
  updateWorldChunk(nextData: GameWorldData): void {
    const prevOrigin = this.chunkOrigin;
    const prevPlayerGeo = localMetersToGeo(prevOrigin, this.player.position.x, this.player.position.z);
    this.worldData = { ...this.worldData, ...nextData };
    this.chunkOrigin = [...nextData.origin] as [number, number];
    this.osmSnapshot = this.buildOsmChunk(this.worldData);

    const nextLocal = geoToLocalMeters(this.chunkOrigin, prevPlayerGeo[0], prevPlayerGeo[1]);
    if (!this.insideBuilding) {
      const [sx, sz] = this.findSafeLocalSpawn(nextLocal.x, nextLocal.z);
      this.player.position.set(sx, this.groundHeightAt(sx, sz), sz);
    } else {
      this.exteriorReturnPosition.set(nextLocal.x, this.groundHeightAt(nextLocal.x, nextLocal.z), nextLocal.z);
    }
    this.syncCameraImmediate();
    this.worldData.onWorldLoaded?.(this.osmSnapshot);
  }

  setGameMode(mode: ArenaGameMode, simulationBots?: boolean): void {
    this.arenaSession.configureMode(mode, this.osmSnapshot, { simulationBots });
    this.syncArenaVisuals(this.arenaSession.getState());
  }

  setRoomCode(code: string, playerName?: string): void {
    this.arenaSession.setRoomCode(code, playerName);
  }

  setSimulationBots(enabled: boolean): void {
    this.arenaSession.setSimulationBots(enabled);
  }

  setLanguage(lang: "en" | "fr"): void {
    this.language = lang;
    this.updateInteraction();
  }

  setMovementSpeed(speed: number): void {
    if (Number.isFinite(speed)) {
      this.moveSpeedMetersPerSec = THREE.MathUtils.clamp(speed, 2.5, 14);
    }
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) this.keys.clear();
  }

  adjustCameraZoom(delta: number): void {
    this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance + delta, 14, 60);
  }

  resetCameraNorth(): void {
    this.yaw = 0;
    this.pitch = 0.96;
    this.cameraDistance = 32;
  }

  setGraphicsQuality(tier: GraphicsQualityTier): void {
    if (this.qualityTier === tier) return;
    this.qualityTier = tier;
    const ratio = this.isSoftwareGl
      ? (tier === "performance" ? 0.75 : 1)
      : tier === "performance"
        ? 1
        : tier === "balanced"
          ? Math.min(window.devicePixelRatio, 1.5)
          : Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(ratio);
    this.osmSnapshot = this.buildOsmChunk(this.worldData);
    this.resize();
  }

  getDiagnostics(): {
    fps: number;
    frameMs: number;
    drawCalls: number;
    triangles: number;
    buildings: number;
    roads: number;
    trees: number;
    landmarks: number;
    generated3dObjects: number;
    dataRichness: string;
    dominantBiome: string;
    quality: GraphicsQualityTier;
    geo: GeoDataDiagnostics | null;
  } {
    const fps = this.smoothedFrameMs > 0 ? Math.min(120, Math.round(1000 / this.smoothedFrameMs)) : 60;
    const generated3dObjects =
      this.osmSnapshot.buildings.length
      + this.osmSnapshot.roads.length
      + this.osmSnapshot.greens.length
      + this.osmSnapshot.waters.length
      + this.osmSnapshot.landmarks.length
      + this.osmSnapshot.vegetation.length
      + this.osmSnapshot.streetFurniture.length;
    return {
      fps,
      frameMs: Math.round(this.smoothedFrameMs * 10) / 10,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      buildings: this.osmSnapshot.counts.buildings,
      roads: this.osmSnapshot.counts.roads,
      trees: this.osmSnapshot.vegetation.length,
      landmarks: this.osmSnapshot.counts.landmarks,
      generated3dObjects,
      dataRichness: this.osmSnapshot.dataRichness,
      dominantBiome: this.osmSnapshot.dominantBiome,
      quality: this.qualityTier,
      geo: this.osmSnapshot.diagnostics ?? null,
    };
  }

  getOsmSnapshot(): OsmWorldSnapshot {
    return this.osmSnapshot;
  }

  getMatchState(): ArenaMatchState {
    return this.arenaSession.getState();
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.renderer.compile(this.scene, this.camera);
    this.clock.start();
    this.animate();
  }

  private scheduleNextFrame(): void {
    if (!this.isRunning) return;
    if (this.isSoftwareGl) {
      const yieldMs = this.idleTime < 1.0 ? 22 : 8;
      this.softwareTimer = window.setTimeout(() => {
        if (!this.isRunning) return;
        this.animationFrame = requestAnimationFrame(this.animate);
      }, yieldMs);
    } else {
      this.animationFrame = requestAnimationFrame(this.animate);
    }
  }

  private animate = (): void => {
    if (!this.isRunning) return;
    const frameStart = performance.now();
    const delta = Math.min(this.clock.getDelta(), this.isSoftwareGl ? 0.14 : 0.06);
    this.idleTime += delta;

    if (!this.paused) {
      this.updatePlayer(delta);
      this.updateRoomStreaming();

      if (!this.insideBuilding) {
        const matchState = this.arenaSession.update(
          delta,
          { x: this.player.position.x, z: this.player.position.z, yaw: this.playerHeadingYaw, speed: this.currentSpeed },
          this.collidesWithEnvironment,
        );
        this.syncArenaVisuals(matchState);
        this.worldData.onMatchState?.(matchState);

        // Request live OSM world chunk refresh when player travels > 110m from chunk origin
        if (
          this.worldData.onNeedChunkRefresh
          && Math.hypot(this.player.position.x, this.player.position.z) > 110
          && performance.now() - this.lastChunkRefreshAt > 2500
        ) {
          this.lastChunkRefreshAt = performance.now();
          const [lng, lat] = localMetersToGeo(this.chunkOrigin, this.player.position.x, this.player.position.z);
          this.worldData.onNeedChunkRefresh(
            lng,
            lat,
            Math.sin(this.playerHeadingYaw),
            Math.cos(this.playerHeadingYaw),
          );
        }
      }

      this.saveElapsed += delta;
      if (this.saveElapsed >= 5) {
        this.saveElapsed = 0;
        this.saveInteriorSession();
      }
    }

    this.updateCamera(delta);
    this.renderer.render(this.scene, this.camera);
    const frameElapsed = Math.max(1, performance.now() - frameStart);
    this.smoothedFrameMs = THREE.MathUtils.lerp(this.smoothedFrameMs, frameElapsed, 0.12);

    const [lng, lat] = localMetersToGeo(this.chunkOrigin, this.player.position.x, this.player.position.z);
    this.onPosition(this.player.position.x, this.player.position.z, lng, lat);
    this.scheduleNextFrame();
  };

  private updatePlayer(delta: number): void {
    const floorAtPlayer = this.groundHeightAt(this.player.position.x, this.player.position.z);
    const grounded = this.player.position.y <= floorAtPlayer + 0.04;
    this.lastGrounded = grounded;

    if (grounded) {
      this.player.position.y = floorAtPlayer;
      this.verticalVelocity = 0;
      if (this.keys.has(" ") || this.keys.has("space")) {
        this.verticalVelocity = this.jumpImpulse;
        this.keys.delete(" ");
        this.keys.delete("space");
        this.lastGrounded = false;
      }
    } else {
      this.verticalVelocity -= this.gravity * delta;
      this.player.position.y += this.verticalVelocity * delta;
      const groundY = this.groundHeightAt(this.player.position.x, this.player.position.z);
      if (this.player.position.y <= groundY) {
        this.player.position.y = groundY;
        this.verticalVelocity = 0;
        this.lastGrounded = true;
      }
    }

    // Q/E optional camera yaw rotation in tactical view if holding Alt/Bracket or mouse drag; standard WASD/ZQSD stays cardinal to camera yaw!
    const sprinting = this.keys.has("shift");
    const speed = sprinting ? this.moveSpeedMetersPerSec * 1.55 : this.moveSpeedMetersPerSec;
    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.direction.set(0, 0, 0);

    if (this.keys.has("w") || this.keys.has("z") || this.keys.has("arrowup")) this.direction.add(this.forward);
    if (this.keys.has("s") || this.keys.has("arrowdown")) this.direction.sub(this.forward);
    if (this.keys.has("d") || this.keys.has("arrowright")) this.direction.add(this.right);
    if (this.keys.has("a") || this.keys.has("q") || this.keys.has("arrowleft")) this.direction.sub(this.right);

    const isMoving = this.direction.lengthSq() > 0;
    this.currentSpeed = isMoving ? speed : 0;

    if (isMoving) {
      this.direction.normalize();
      const totalStep = speed * delta;
      const substeps = Math.max(1, Math.ceil(totalStep / 0.25));
      const subDx = (this.direction.x * totalStep) / substeps;
      const subDz = (this.direction.z * totalStep) / substeps;

      const canStepTo = (x: number, z: number, currentGround: number): boolean => {
        if (this.collidesWithEnvironment(x, z)) return false;
        if (this.insideBuilding) {
          const lx = x - this.interiorOffset.x;
          const lz = z - this.interiorOffset.z;
          if (lx < TRAINING_BUILDING.minX || lx > TRAINING_BUILDING.maxX
            || lz < TRAINING_BUILDING.minZ || lz > TRAINING_BUILDING.maxZ) {
            return false;
          }
        }
        const nextGround = this.groundHeightAt(x, z);
        return nextGround - currentGround <= this.maxStepHeight;
      };

      for (let i = 0; i < substeps; i += 1) {
        const currentGround = this.groundHeightAt(this.player.position.x, this.player.position.z);
        const nextX = this.player.position.x + subDx;
        const nextZ = this.player.position.z + subDz;
        if (canStepTo(nextX, this.player.position.z, currentGround)) this.player.position.x = nextX;
        if (canStepTo(this.player.position.x, nextZ, currentGround)) this.player.position.z = nextZ;
      }

      if (grounded && this.verticalVelocity === 0) {
        const targetGround = this.groundHeightAt(this.player.position.x, this.player.position.z);
        this.player.position.y = Math.max(this.player.position.y, targetGround);
      }

      // Smooth damped orientation toward movement heading
      const targetYaw = Math.atan2(this.direction.x, this.direction.z);
      const diff = shortestAngleDiff(this.playerHeadingYaw, targetYaw);
      this.playerHeadingYaw += diff * (1 - Math.exp(-14 * delta));
      this.player.rotation.y = this.playerHeadingYaw;
      this.walkPhase += delta * (sprinting ? 14 : 9);
    }

    if (this.insideBuilding) {
      const lx = this.player.position.x - this.interiorOffset.x;
      const lz = this.player.position.z - this.interiorOffset.z;
      if (this.activeInteriorFloors > 1 && lz > -12.15 && lx < 3.0) this.interiorFloor = 1;
      else if (lz < -13.0) this.interiorFloor = 0;
    }

    const floor = this.groundHeightAt(this.player.position.x, this.player.position.z);
    if (this.player.position.y < floor) {
      this.player.position.y = floor;
      this.verticalVelocity = 0;
      this.lastGrounded = true;
    }

    this.updateInteraction();

    const airborne = this.player.position.y > floor + 0.08;
    const swing = isMoving && !airborne ? Math.sin(this.walkPhase) * (sprinting ? 0.72 : 0.48) : 0;
    const idleArm = !isMoving && !airborne ? Math.sin(this.idleTime * 2.1) * 0.05 : 0;
    this.animatedLimbs.forEach((limb, index) => {
      const targetRot = airborne
        ? (index >= 2 ? -0.42 : 0.35)
        : isMoving
          ? (index % 2 === 0 ? swing : -swing)
          : (index < 2 ? (index === 0 ? idleArm : -idleArm) : 0);
      limb.rotation.x = THREE.MathUtils.damp(limb.rotation.x, targetRot, 16, delta);
    });
    if (this.playerTorso) {
      const bob = isMoving && !airborne
        ? Math.abs(Math.sin(this.walkPhase * 2)) * 0.05
        : Math.sin(this.idleTime * 2.2) * 0.018;
      this.playerTorso.position.y = THREE.MathUtils.damp(this.playerTorso.position.y, 1.18 + bob, 16, delta);
      this.playerTorso.rotation.x = THREE.MathUtils.damp(this.playerTorso.rotation.x, isMoving && sprinting ? 0.14 : 0, 12, delta);
    }
  }

  private syncCameraImmediate(): void {
    const dist = this.insideBuilding ? Math.min(18, this.cameraDistance) : this.cameraDistance;
    const horiz = Math.cos(this.pitch) * dist;
    const vert = Math.sin(this.pitch) * dist;
    this.camTarget.set(this.player.position.x, this.player.position.y + 1.1, this.player.position.z);
    this.camera.position.set(
      this.camTarget.x + Math.sin(this.yaw) * horiz,
      this.camTarget.y + vert,
      this.camTarget.z + Math.cos(this.yaw) * horiz,
    );
    this.camera.lookAt(this.camTarget);
  }

  private updateCamera(delta: number): void {
    const dist = this.insideBuilding ? Math.min(16.5, this.cameraDistance) : this.cameraDistance;
    const lookAheadFactor = this.currentSpeed > 0.2 ? 1.8 : 0;
    const desiredLookX = this.player.position.x + Math.sin(this.playerHeadingYaw) * lookAheadFactor;
    const desiredLookZ = this.player.position.z + Math.cos(this.playerHeadingYaw) * lookAheadFactor;
    const followAlpha = 1 - Math.exp(-9 * delta);

    this.camLookAhead.set(desiredLookX, this.player.position.y + 1.1, desiredLookZ);
    this.camTarget.lerp(this.camLookAhead, followAlpha);

    const horiz = Math.cos(this.pitch) * dist;
    const vert = Math.sin(this.pitch) * dist;
    this.camDesired.set(
      this.camTarget.x + Math.sin(this.yaw) * horiz,
      this.camTarget.y + vert,
      this.camTarget.z + Math.cos(this.yaw) * horiz,
    );
    this.camera.position.lerp(this.camDesired, followAlpha);
    this.camera.lookAt(this.camTarget);

    // Fast AABB-filtered Bullet Echo occlusion fade: only raycast against nearby tall buildings
    this.fadedBuildings.forEach((mesh) => {
      const m = mesh.material as THREE.MeshStandardMaterial;
      m.transparent = false;
      m.opacity = 1;
    });
    this.fadedBuildings.clear();

    if (!this.insideBuilding && this.tallBuildingOccluders.length > 0) {
      const segMinX = Math.min(this.camera.position.x, this.camTarget.x) - 3;
      const segMaxX = Math.max(this.camera.position.x, this.camTarget.x) + 3;
      const segMinZ = Math.min(this.camera.position.z, this.camTarget.z) - 3;
      const segMaxZ = Math.max(this.camera.position.z, this.camTarget.z) + 3;
      const candidates: THREE.Mesh[] = [];
      for (const b of this.tallBuildingOccluders) {
        if (b.maxX >= segMinX && b.minX <= segMaxX && b.maxZ >= segMinZ && b.minZ <= segMaxZ) {
          candidates.push(b.mesh);
        }
      }
      if (candidates.length > 0) {
        this.camRayDir.copy(this.camTarget).sub(this.camera.position);
        const len = this.camRayDir.length();
        if (len > 1) {
          this.camRayDir.divideScalar(len);
          this.cameraRaycaster.set(this.camera.position, this.camRayDir);
          this.cameraRaycaster.far = len - 1.5;
          const hits = this.cameraRaycaster.intersectObjects(candidates, false);
          for (const h of hits) {
            if (h.object instanceof THREE.Mesh) {
              const mat = h.object.material as THREE.MeshStandardMaterial;
              mat.transparent = true;
              mat.opacity = 0.36;
              this.fadedBuildings.add(h.object);
            }
          }
        }
      }
    }
  }

  private syncArenaVisuals(state: ArenaMatchState): void {
    // 1. Capture Objectives
    const activeObjIds = new Set(state.objectives.map((o) => o.id));
    for (const [id, entry] of this.objectiveRings) {
      if (!activeObjIds.has(id)) {
        this.arenaOverlayGroup.remove(entry.ring, entry.beacon);
        entry.ring.geometry.dispose();
        entry.beacon.geometry.dispose();
        (entry.ring.material as THREE.Material).dispose();
        (entry.beacon.material as THREE.Material).dispose();
        this.objectiveRings.delete(id);
      }
    }
    for (const obj of state.objectives) {
      let entry = this.objectiveRings.get(obj.id);
      const color = obj.owner === "alpha" ? 0x62e8b0 : obj.owner === "bravo" ? 0xe9786b : 0xf4c868;
      if (!entry) {
        const ringGeo = new THREE.RingGeometry(obj.radius - 0.55, obj.radius, 36);
        ringGeo.rotateX(-Math.PI / 2);
        const ring = new THREE.Mesh(
          ringGeo,
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
        );
        const beacon = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.18, 6.5, 8),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.48 }),
        );
        const y = this.terrainHeightAt(obj.x, obj.z);
        ring.position.set(obj.x, y + 0.16, obj.z);
        beacon.position.set(obj.x, y + 3.25, obj.z);
        this.arenaOverlayGroup.add(ring, beacon);
        entry = { ring, beacon };
        this.objectiveRings.set(obj.id, entry);
      } else {
        (entry.ring.material as THREE.MeshBasicMaterial).color.setHex(color);
        (entry.beacon.material as THREE.MeshBasicMaterial).color.setHex(color);
      }
    }

    // 2. Arena Zone Perimeter Circle
    if (state.zone.active) {
      if (!this.zoneRingMesh) {
        const geo = new THREE.RingGeometry(0.985, 1, 64);
        geo.rotateX(-Math.PI / 2);
        this.zoneRingMesh = new THREE.Mesh(
          geo,
          new THREE.MeshBasicMaterial({ color: 0xe66558, transparent: true, opacity: 0.78, side: THREE.DoubleSide }),
        );
        this.arenaOverlayGroup.add(this.zoneRingMesh);
      }
      this.zoneRingMesh.visible = true;
      this.zoneRingMesh.position.set(state.zone.centerX, 0.22, state.zone.centerZ);
      this.zoneRingMesh.scale.set(state.zone.radius, 1, state.zone.radius);
    } else if (this.zoneRingMesh) {
      this.zoneRingMesh.visible = false;
    }

    // 3. Remote & Simulated Arena Actors
    const activeIds = new Set(state.participants.filter((p) => !p.isLocal).map((p) => p.id));
    for (const [id, mesh] of this.remoteActorMeshes) {
      if (!activeIds.has(id)) {
        this.arenaOverlayGroup.remove(mesh);
        this.remoteActorMeshes.delete(id);
      }
    }
    for (const actor of state.participants) {
      if (actor.isLocal) continue;
      let group = this.remoteActorMeshes.get(actor.id);
      if (!group) {
        group = new THREE.Group();
        const actorColor = actor.team === "alpha" ? 0x52c7e8 : 0xe96b5c;
        const body = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.38, 0.7, 4, 8),
          new THREE.MeshStandardMaterial({ color: actorColor, roughness: 0.7 }),
        );
        body.position.y = 1.15;
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.26, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xffe0c4, roughness: 0.75 }),
        );
        head.position.y = 1.9;
        const haloGeo = new THREE.RingGeometry(0.7, 0.9, 24);
        haloGeo.rotateX(-Math.PI / 2);
        const halo = new THREE.Mesh(
          haloGeo,
          new THREE.MeshBasicMaterial({ color: actorColor, side: THREE.DoubleSide }),
        );
        halo.position.y = 0.14;
        group.add(body, head, halo);
        this.arenaOverlayGroup.add(group);
        this.remoteActorMeshes.set(actor.id, group);
      }
      const gy = this.terrainHeightAt(actor.x, actor.z);
      group.position.set(actor.x, gy, actor.z);
      group.rotation.y = actor.yaw;
    }
  }

  setVirtualKey(key: string, pressed: boolean): void {
    const normalized = key.toLowerCase();
    if (pressed) this.keys.add(normalized);
    else this.keys.delete(normalized);
  }

  triggerJump(): void {
    this.keys.add("space");
  }

  triggerInteract(): void {
    this.interact();
  }

  getState(): {
    x: number;
    y: number;
    z: number;
    yaw: number;
    inside: boolean;
    floor: number;
    grounded: boolean;
    speed: number;
    cameraDistance: number;
    headingYaw: number;
  } {
    return {
      x: this.player.position.x,
      y: this.player.position.y,
      z: this.player.position.z,
      yaw: this.yaw,
      inside: this.insideBuilding,
      floor: this.interiorFloor,
      grounded: this.lastGrounded,
      speed: this.currentSpeed,
      cameraDistance: this.cameraDistance,
      headingYaw: this.playerHeadingYaw,
    };
  }

  private resize = (): void => {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
    const key = event.key.toLowerCase();
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
    if (key === "e" && !event.repeat && !this.paused) this.interact();
    if (key === "r" && !event.repeat) this.resetCameraNorth();
    this.keys.add(key);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key.toLowerCase());
  };

  private onWindowBlur = (): void => {
    this.keys.clear();
    this.isDraggingCamera = false;
  };

  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private onCanvasPointerDown = (event: PointerEvent): void => {
    this.isDraggingCamera = true;
    this.lastDragX = event.clientX;
    this.lastDragY = event.clientY;
  };

  private onCanvasPointerMove = (event: PointerEvent): void => {
    if (!this.isDraggingCamera) return;
    const dx = event.clientX - this.lastDragX;
    const dy = event.clientY - this.lastDragY;
    this.lastDragX = event.clientX;
    this.lastDragY = event.clientY;
    this.yaw -= dx * 0.0055;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.004, 0.55, 1.38);
  };

  private onCanvasPointerUp = (): void => {
    this.isDraggingCamera = false;
  };

  private onCameraWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.adjustCameraZoom(Math.sign(event.deltaY) * 2.2);
  };

  dispose(): void {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrame);
    clearTimeout(this.softwareTimer);
    window.removeEventListener("resize", this.resize);
    this.renderer.domElement.removeEventListener("pointerdown", this.onCanvasPointerDown);
    this.renderer.domElement.removeEventListener("contextmenu", this.onContextMenu);
    window.removeEventListener("pointermove", this.onCanvasPointerMove);
    window.removeEventListener("pointerup", this.onCanvasPointerUp);
    this.renderer.domElement.removeEventListener("wheel", this.onCameraWheel);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onWindowBlur);

    this.disposeGroupChildren(this.worldChunkGroup);
    this.disposeGroupChildren(this.interiorChamberGroup);
    this.disposeGroupChildren(this.arenaOverlayGroup);
    this.disposeGroupChildren(this.player);

    this.envRenderTarget?.dispose();
    this.envRenderTarget = null;
    this.contactShadowTex?.dispose();
    this.contactShadowTex = null;
    this.arenaSession.dispose();
    this.renderer.dispose();
    this.saveInteriorSession();
    this.interactionPrompt.remove();
    this.renderer.domElement.remove();
    void this.getInteriorStorageKey();
  }
}