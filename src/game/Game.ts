import * as THREE from "three";
import { circleIntersectsInteriorBox, interiorGroundHeight } from "./architecture.ts";

type PositionCallback = (x: number, z: number, lng: number, lat: number) => void;
type MappedBuildingFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
type MappedRoadFeature = GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>;
interface TerrainSample { x: number; z: number; elevation: number; }
interface GameWorldData { origin: [number, number]; buildings: MappedBuildingFeature[]; roads: MappedRoadFeature[]; terrain: TerrainSample[]; terrainSize: number; terrainSegments: number; }
interface BuildingCollisionShape { minX: number; maxX: number; minZ: number; maxZ: number; rings: [number, number][][]; }
interface ObstacleCollider { x: number; z: number; radius: number; }

export class Game {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(65, 1, 0.1, 1200);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly clock = new THREE.Clock();
  private readonly player = new THREE.Group();
  private readonly keys = new Set<string>();
  private readonly direction = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly onPosition: PositionCallback;
  private readonly worldData: GameWorldData;
  private readonly metersPerLongitude: number;
  private readonly metersPerLatitude = 111_320;
  private animationFrame = 0;
  private isRunning = false;
  private pointerLocked = false;
  private yaw = 0;
  private pitch = -0.18;
  private cameraDistance = 7;
  private verticalVelocity = 0;
  private readonly gravity = 18;
  private readonly jumpImpulse = 6.2;
  private readonly maxStepHeight = 0.65;
  private readonly cameraRaycaster = new THREE.Raycaster();
  private readonly buildingCollisionShapes: BuildingCollisionShape[] = [];
  private readonly cameraObstacles: THREE.Object3D[] = [];
  private readonly obstacleColliders: ObstacleCollider[] = [];
  private readonly animatedLimbs: THREE.Group[] = [];
  private playerTorso: THREE.Mesh | null = null;
  private walkPhase = 0;
  private readonly interiorColliders: { x: number; z: number; halfX: number; halfZ: number }[] = [];
  private readonly interactionPrompt = document.createElement("div");
  private readonly interiorRoot = new THREE.Group();
  private readonly exteriorDoor = new THREE.Group();
  private insideDemoBuilding = false;
  private demoDoorOpen = false;
  private exteriorReturnPosition = new THREE.Vector3();
  private interiorFloor = 0;


  constructor(
    private readonly container: HTMLElement,
    onPosition: PositionCallback,
    worldData: GameWorldData,
  ) {
    this.onPosition = onPosition;
    this.worldData = worldData;
    this.metersPerLongitude = 111_320 * Math.cos(worldData.origin[1] * Math.PI / 180);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    this.buildWorld();
    this.buildInteractiveArchitecture();
    this.buildMappedTerrain();
    this.buildMappedRoads();
    this.buildMappedBuildings();
    this.buildPlayer();
    this.camera.position.set(0, 5, 9);
    this.resize();
    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
    this.renderer.domElement.addEventListener("click", this.requestPointerLock);
    this.interactionPrompt.className = "game-3d-interaction";
    this.interactionPrompt.setAttribute("aria-live", "polite");
    this.interactionPrompt.textContent = "Approach the training building door";
    this.container.appendChild(this.interactionPrompt);
    this.renderer.domElement.addEventListener("wheel", this.onCameraWheel, { passive: false });
    document.addEventListener("mousemove", this.onMouseMove);
  }

  private buildWorld(): void {
    this.scene.background = new THREE.Color(0x9bb9c8);
    this.scene.fog = new THREE.Fog(0x9bb9c8, 75, 260);

    const hemisphere = new THREE.HemisphereLight(0xdcecff, 0x59604c, 2.0);
    this.scene.add(hemisphere);

    const sun = new THREE.DirectionalLight(0xffe3bd, 3.1);
    sun.position.set(-45, 75, 35);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    this.scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500),
      new THREE.MeshStandardMaterial({ color: 0x66765b, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = "procedural-ground";
    this.scene.add(ground);

    if (this.worldData.roads.length === 0) {
      this.addRoad(0, 0, 12, 190, true);
      this.addRoad(0, 0, 190, 12, false);
    }

    if (this.worldData.buildings.length === 0) {
      const blockPositions = [-70, -28, 28, 70];
      blockPositions.forEach((x, xi) => {
        blockPositions.forEach((z, zi) => {
          if ((xi + zi) % 5 === 0) return;
          this.addBuilding(x, z, 12 + ((xi * 3 + zi * 5) % 17), 10 + ((xi + zi * 2) % 12));
        });
      });
    }

    for (let i = 0; i < 34; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (10 + (i % 4) * 2.5);
      const z = -78 + i * 4.7;
      this.addTree(x, z);
    }
    for (let i = 0; i < 18; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      this.addRock(side * (22 + (i % 3) * 4), -92 + i * 10.5);
    }

    const grid = new THREE.GridHelper(500, 100, 0x71816b, 0x71816b);
    grid.position.y = 0.015;
    (grid.material as THREE.Material).opacity = 0.12;
    (grid.material as THREE.Material).transparent = true;
    this.scene.add(grid);
  }

  private buildInteractiveArchitecture(): void {
    // Reusable fictional training-building prefab. It is deliberately separate
    // from OSM footprints: map data never supplies private indoor floor plans.
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xc6bda9, roughness: 0.92 });
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x777e76, roughness: 0.96 });
    const trimMaterial = new THREE.MeshStandardMaterial({ color: 0x4d6267, roughness: 0.72 });
    const furnitureMaterial = new THREE.MeshStandardMaterial({ color: 0x856b50, roughness: 0.9 });
    const addBox = (parent: THREE.Object3D, name: string, x: number, y: number, z: number,
      sx: number, sy: number, sz: number, material: THREE.Material, collider = false): THREE.Mesh => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
      mesh.position.set(x, y, z);
      mesh.name = name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      if (collider) this.interiorColliders.push({ x, z, halfX: sx / 2, halfZ: sz / 2 });
      this.cameraObstacles.push(mesh);
      return mesh;
    };

    // Exterior shell: a real gap is left in the front wall for the hinged door.
    addBox(this.scene, "training-building-left-wall", -6.8, 2, -15, 0.4, 4, 12, wallMaterial, true);
    addBox(this.scene, "training-building-right-wall", 6.8, 2, -15, 0.4, 4, 12, wallMaterial, true);
    addBox(this.scene, "training-building-back-wall", 0, 2, -20.8, 13.2, 4, 0.4, wallMaterial, true);
    addBox(this.scene, "training-building-front-left", -4.1, 2, -9.2, 5.4, 4, 0.4, wallMaterial, true);
    addBox(this.scene, "training-building-front-right", 4.1, 2, -9.2, 5.4, 4, 0.4, wallMaterial, true);
    addBox(this.scene, "training-building-floor", 0, -0.12, -15, 13.2, 0.24, 11.6, floorMaterial);
    addBox(this.scene, "training-building-roof", 0, 4.12, -15, 13.6, 0.24, 12.4, trimMaterial);
    const sign = addBox(this.scene, "training-building-sign", 0, 3.45, -8.94, 2.8, 0.42, 0.12, trimMaterial);
    sign.castShadow = false;

    // Door pivot is at its left edge; E opens/closes it, then enters.
    this.exteriorDoor.position.set(-1.1, 0, -9.05);
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.65, 0.16), trimMaterial);
    door.position.set(1.1, 1.325, 0);
    door.castShadow = true;
    this.exteriorDoor.add(door);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshStandardMaterial({ color: 0xe1c27b, metalness: 0.65 }));
    knob.position.set(2.0, 1.3, -0.1);
    this.exteriorDoor.add(knob);
    this.scene.add(this.exteriorDoor);

    // Interior geometry is built once and hidden until the player crosses the threshold.
    this.interiorRoot.visible = false;
    this.scene.add(this.interiorRoot);
    addBox(this.interiorRoot, "interior-floor", 0, 0, -15, 12.8, 0.18, 11.2, floorMaterial);
    const interiorCeiling = addBox(this.interiorRoot, "interior-ceiling", 0, 3.98, -15, 12.8, 0.16, 11.2, trimMaterial);
    interiorCeiling.castShadow = false;
    const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x8fc7d4, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.58 });
    const windowFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x52666a, roughness: 0.8 });
    for (const side of [-1, 1]) {
      for (const z of [-13.2, -17.1]) {
        addBox(this.interiorRoot, "interior-window-glass", side * 6.18, 2.45, z, 0.06, 1.35, 2.0, glassMaterial);
        addBox(this.interiorRoot, "interior-window-sill", side * 6.12, 1.72, z, 0.18, 0.12, 2.15, windowFrameMaterial);
        addBox(this.interiorRoot, "interior-window-header", side * 6.12, 3.18, z, 0.18, 0.12, 2.15, windowFrameMaterial);
      }
    }
    addBox(this.interiorRoot, "interior-left-wall", -6.35, 2, -15, 0.25, 4, 11.2, wallMaterial, true);
    addBox(this.interiorRoot, "interior-right-wall", 6.35, 2, -15, 0.25, 4, 11.2, wallMaterial, true);
    addBox(this.interiorRoot, "interior-back-wall", 0, 2, -20.55, 12.8, 4, 0.25, wallMaterial, true);
    addBox(this.interiorRoot, "interior-front-wall-left", -4.2, 2, -9.42, 4.2, 4, 0.25, wallMaterial, true);
    addBox(this.interiorRoot, "interior-front-wall-right", 4.2, 2, -9.42, 4.2, 4, 0.25, wallMaterial, true);

    // A clear corridor, furniture and two room partitions.
    addBox(this.interiorRoot, "interior-partition-a", -1.6, 1.45, -14.4, 0.18, 2.9, 5.4, wallMaterial, true);
    addBox(this.interiorRoot, "interior-partition-b", 1.8, 1.45, -18.0, 0.18, 2.9, 4.4, wallMaterial, true);
    addBox(this.interiorRoot, "interior-sofa", -3.8, 0.55, -12.2, 2.1, 1.1, 0.9, furnitureMaterial, true);
    addBox(this.interiorRoot, "interior-table", -3.8, 0.42, -16.2, 1.8, 0.84, 1.2, furnitureMaterial, true);
    addBox(this.interiorRoot, "interior-cabinet", 3.9, 1.0, -18.6, 1.2, 2.0, 0.65, furnitureMaterial, true);

    // Walkable staircase: visible individual steps plus a continuous hidden ramp
    // for stable character grounding, with a landing and upper-floor platform.
    const stairMaterial = new THREE.MeshStandardMaterial({ color: 0x9b896d, roughness: 0.9 });
    const steps = 12;
    for (let i = 0; i < steps; i += 1) {
      const y = ((i + 1) / steps) * 3.2;
      const z = -19.0 + (i + 0.5) * (7.0 / steps);
      addBox(this.interiorRoot, "interior-stair-step", 4.55, y / 2, z, 2.0, y, 7.0 / steps, stairMaterial);
    }
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 7.1), stairMaterial);
    ramp.position.set(4.55, 1.6, -15.5);
    ramp.rotation.x = -Math.atan2(3.2, 7.0);
    ramp.visible = false;
    this.interiorRoot.add(ramp);
    addBox(this.interiorRoot, "interior-upper-floor", 0, 3.28, -10.85, 12.5, 0.18, 3.0, floorMaterial);
    addBox(this.interiorRoot, "interior-upper-back-rail", 0, 3.8, -12.25, 12.4, 1.0, 0.12, trimMaterial);
    this.interactionPrompt.textContent = "Training building · E: open door";
  }

  private groundHeightAt(x: number, z: number): number {
    if (!this.insideDemoBuilding) return this.terrainHeightAt(x, z);
    return interiorGroundHeight(x, z, this.interiorFloor) ?? this.terrainHeightAt(x, z);
  }

  private updateInteraction(): void {
    if (this.insideDemoBuilding) {
      const atExit = Math.hypot(this.player.position.x, this.player.position.z + 9.0) < 2.1;
      const atStairs = this.player.position.x > 3.2 && this.player.position.z < -12.0;
      this.interactionPrompt.textContent = atExit
        ? "E · Leave building"
        : atStairs
          ? (this.interiorFloor === 1 ? "Stairs · E: return downstairs" : "Stairs · walk up to the upper floor")
          : "Fictional interior · E near the entrance to leave";
      return;
    }
    const nearDoor = Math.hypot(this.player.position.x, this.player.position.z + 8.6) < 2.2;
    this.interactionPrompt.textContent = nearDoor
      ? (this.demoDoorOpen ? "E · Enter training building" : "E · Open door")
      : "Explore the 3D area · approach the training building";
  }

  private interact(): void {
    if (!this.insideDemoBuilding) {
      const nearDoor = Math.hypot(this.player.position.x, this.player.position.z + 8.6) < 2.2;
      if (!nearDoor) return;
      if (!this.demoDoorOpen) {
        this.demoDoorOpen = true;
        this.exteriorDoor.rotation.y = -Math.PI / 2;
        this.interactionPrompt.textContent = "Door open · press E to enter";
        return;
      }
      this.exteriorReturnPosition.copy(this.player.position);
      this.insideDemoBuilding = true;
      this.interiorRoot.visible = true;
      const ceiling = this.interiorRoot.getObjectByName("interior-ceiling");
      if (ceiling) ceiling.visible = false;
      const roof = this.scene.getObjectByName("training-building-roof");
      if (roof) roof.visible = false;
      this.player.position.set(0, 0, -10.5);
      this.verticalVelocity = 0;
      this.interiorFloor = 0;
      this.yaw = 0;
      return;
    }

    const nearExit = Math.hypot(this.player.position.x, this.player.position.z + 9.0) < 2.1;
    if (nearExit) {
      this.insideDemoBuilding = false;
      this.interiorRoot.visible = false;
      const ceiling = this.interiorRoot.getObjectByName("interior-ceiling");
      if (ceiling) ceiling.visible = true;
      const roof = this.scene.getObjectByName("training-building-roof");
      if (roof) roof.visible = true;
      this.player.position.copy(this.exteriorReturnPosition);
      this.verticalVelocity = 0;
      this.demoDoorOpen = false;
      this.exteriorDoor.rotation.y = 0;
      this.interiorFloor = 0;
      return;
    }
    if (this.player.position.x > 3.2 && this.player.position.z > -12.8 && this.interiorFloor === 1) {
      this.interiorFloor = 0;
      this.player.position.y = 0;
    }
  }

  private geographicToLocal(lng: number, lat: number): [number, number] {
    return [(lng - this.worldData.origin[0]) * this.metersPerLongitude, -(lat - this.worldData.origin[1]) * this.metersPerLatitude];
  }

  private buildMappedBuildings(): void {
    const material = new THREE.MeshStandardMaterial({ color: 0xb7a995, roughness: 0.86 });
    for (const feature of this.worldData.buildings) {
      const geometry = feature.geometry;
      const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
      const properties = feature.properties ?? {};
      const rawHeight = Number(properties.render_height ?? properties.height ?? 8);
      const rawBase = Number(properties.render_min_height ?? properties.min_height ?? 0);
      const height = THREE.MathUtils.clamp(Number.isFinite(rawHeight) ? rawHeight : 8, 3, 120);
      const base = THREE.MathUtils.clamp(Number.isFinite(rawBase) ? rawBase : 0, 0, height - 1);
      for (const polygon of polygons) {
        const outer = polygon[0];
        if (!outer || outer.length < 4) continue;
        const points = outer.map(([lng, lat]) => this.geographicToLocal(lng, lat));
        const localRings = polygon.map((ring) => ring.map(([lng, lat]) => this.geographicToLocal(lng, lat)));
        const bounds = points.reduce((box, [x, z]) => ({
          minX: Math.min(box.minX, x), maxX: Math.max(box.maxX, x),
          minZ: Math.min(box.minZ, z), maxZ: Math.max(box.maxZ, z),
        }), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity });
        this.buildingCollisionShapes.push({ ...bounds, rings: localRings });
        const shape = new THREE.Shape();
        shape.moveTo(points[0][0], -points[0][1]);
        for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i][0], -points[i][1]);
        shape.closePath();
        const meshGeometry = new THREE.ExtrudeGeometry(shape, { depth: height - base, bevelEnabled: false, curveSegments: 1 });
        meshGeometry.rotateX(-Math.PI / 2);
        const building = new THREE.Mesh(meshGeometry, material);
        const centreX = points.reduce((sum, point) => sum + point[0], 0) / points.length;
        const centreZ = points.reduce((sum, point) => sum + point[1], 0) / points.length;
        building.position.y = base + this.terrainHeightAt(centreX, centreZ);
        building.castShadow = true;
        building.receiveShadow = true;
        building.name = "mapped-building";
        this.cameraObstacles.push(building);
        this.scene.add(building);
      }
    }
  }

  private buildMappedTerrain(): void {
    const { terrain, terrainSegments, terrainSize } = this.worldData;
    const expected = (terrainSegments + 1) * (terrainSegments + 1);
    if (terrain.length !== expected || terrainSegments < 1) return;
    const baseGround = this.scene.getObjectByName("procedural-ground");
    if (baseGround) {
      this.scene.remove(baseGround);
      if (baseGround instanceof THREE.Mesh) baseGround.geometry.dispose();
    }
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const step = terrainSize / terrainSegments;
    for (let row = 0; row <= terrainSegments; row += 1) {
      for (let column = 0; column <= terrainSegments; column += 1) {
        const sample = terrain[row * (terrainSegments + 1) + column];
        positions.push(sample.x, sample.elevation, sample.z);
        uvs.push(column / terrainSegments, row / terrainSegments);
      }
    }
    for (let row = 0; row < terrainSegments; row += 1) {
      for (let column = 0; column < terrainSegments; column += 1) {
        const a = row * (terrainSegments + 1) + column;
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
    const material = new THREE.MeshStandardMaterial({ color: 0x66765b, roughness: 1, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.name = "mapped-terrain";
    this.scene.add(mesh);
    // Keep the terrain mesh centred under the sampled local grid.
    if (Math.abs(step * terrainSegments - terrainSize) > 0.01) return;
  }

  private roadWidth(properties: Record<string, unknown>): number {
    const roadClass = String(properties.class ?? properties.subclass ?? "residential");
    const widths: Record<string, number> = {
      motorway: 10, trunk: 9, primary: 8, secondary: 7, tertiary: 6,
      minor: 5, residential: 5, unclassified: 4.5, service: 3.5,
      living_street: 4, pedestrian: 4, track: 3.5, path: 2,
      footway: 1.8, cycleway: 2.2, steps: 1.8,
    };
    return widths[roadClass] ?? 3.5;
  }

  private buildMappedRoads(): void {
    const material = new THREE.MeshStandardMaterial({ color: 0x42494d, roughness: 0.98, side: THREE.DoubleSide });
    const maxRoadFeatures = 700;
    for (const feature of this.worldData.roads.slice(0, maxRoadFeatures)) {
      const lines = feature.geometry.type === "LineString" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
      const width = this.roadWidth((feature.properties ?? {}) as Record<string, unknown>);
      for (const line of lines) {
        if (line.length < 2) continue;
        const points = line.map(([lng, lat]) => this.geographicToLocal(lng, lat));
        const vertices: number[] = [];
        const indices: number[] = [];
        for (let i = 0; i < points.length; i += 1) {
          const previous = points[Math.max(0, i - 1)];
          const next = points[Math.min(points.length - 1, i + 1)];
          const dx = next[0] - previous[0];
          const dz = next[1] - previous[1];
          const length = Math.hypot(dx, dz) || 1;
          const ox = (-dz / length) * width * 0.5;
          const oz = (dx / length) * width * 0.5;
          const roadY = this.terrainHeightAt(points[i][0], points[i][1]) + 0.075;
          vertices.push(points[i][0] + ox, roadY, points[i][1] + oz);
          vertices.push(points[i][0] - ox, roadY, points[i][1] - oz);
          if (i > 0) {
            const a = (i - 1) * 2;
            indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
          }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        const road = new THREE.Mesh(geometry, material);
        road.receiveShadow = true;
        road.name = "mapped-road";
        this.scene.add(road);
      }
    }
  }

  private isInsideLocalRing(x: number, z: number, ring: [number, number][]): boolean {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const a = ring[i], b = ring[j];
      if ((a[1] > z) !== (b[1] > z) &&
        x < ((b[0] - a[0]) * (z - a[1])) / ((b[1] - a[1]) || 1e-9) + a[0]) inside = !inside;
    }
    return inside;
  }

  private collidesWithEnvironment(x: number, z: number): boolean {
    const radius = 0.62;
    const offsets: [number, number][] = [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius],
      [radius * 0.7, radius * 0.7], [-radius * 0.7, radius * 0.7], [radius * 0.7, -radius * 0.7], [-radius * 0.7, -radius * 0.7]];
    for (const building of this.buildingCollisionShapes) {
      if (x + radius < building.minX || x - radius > building.maxX ||
        z + radius < building.minZ || z - radius > building.maxZ) continue;
      const touchesSolid = offsets.some(([ox, oz]) => {
        const sampleX = x + ox, sampleZ = z + oz;
        return this.isInsideLocalRing(sampleX, sampleZ, building.rings[0]) &&
          !building.rings.slice(1).some((hole) => this.isInsideLocalRing(sampleX, sampleZ, hole));
      });
      if (touchesSolid) return true;
    }
    for (const box of this.interiorColliders) {
      if (circleIntersectsInteriorBox(x, z, radius, box)) return true;
    }
    for (const obstacle of this.obstacleColliders) {
      const combined = radius + obstacle.radius;
      if (Math.abs(x - obstacle.x) > combined || Math.abs(z - obstacle.z) > combined) continue;
      if (Math.hypot(x - obstacle.x, z - obstacle.z) < combined) return true;
    }
    return false;
  }

  private terrainHeightAt(x: number, z: number): number {
    const { terrain, terrainSegments, terrainSize } = this.worldData;
    if (!terrain.length || terrainSegments < 1) return 0;
    const half = terrainSize / 2;
    const column = THREE.MathUtils.clamp(((x + half) / terrainSize) * terrainSegments, 0, terrainSegments);
    const row = THREE.MathUtils.clamp(((z + half) / terrainSize) * terrainSegments, 0, terrainSegments);
    const c0 = Math.floor(column), r0 = Math.floor(row);
    const c1 = Math.min(terrainSegments, c0 + 1), r1 = Math.min(terrainSegments, r0 + 1);
    const tx = column - c0, tz = row - r0;
    const stride = terrainSegments + 1;
    const a = terrain[r0 * stride + c0]?.elevation ?? 0;
    const b = terrain[r0 * stride + c1]?.elevation ?? a;
    const c = terrain[r1 * stride + c0]?.elevation ?? a;
    const d = terrain[r1 * stride + c1]?.elevation ?? a;
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, tx), THREE.MathUtils.lerp(c, d, tx), tz);
  }

  private addRoad(x: number, z: number, width: number, length: number, vertical: boolean): void {
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(vertical ? width : length, vertical ? length : width),
      new THREE.MeshStandardMaterial({ color: 0x343b42, roughness: 0.95 }),
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.025, z);
    road.receiveShadow = true;
    this.scene.add(road);

    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(vertical ? 0.18 : length, vertical ? length : 0.18),
      new THREE.MeshBasicMaterial({ color: 0xc9b77d }),
    );
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, 0.04, z);
    this.scene.add(line);
  }

  private addBuilding(x: number, z: number, width: number, depth: number): void {
    const height = 8 + Math.random() * 18;
    const colors = [0xb9b5aa, 0x9caaa9, 0xc4b39e, 0x858f96, 0xd0c8b7];
    const material = new THREE.MeshStandardMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      roughness: 0.82,
    });
    const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    building.position.set(x, height / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    this.scene.add(building);

    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x334b59,
      roughness: 0.3,
      metalness: 0.15,
    });
    const floors = Math.max(2, Math.floor(height / 3.2));
    const columns = Math.max(2, Math.floor(width / 3.2));
    for (let floor = 0; floor < floors; floor += 1) {
      for (let column = 0; column < columns; column += 1) {
        const windowMesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.15, 1.25, 0.08),
          windowMaterial,
        );
        windowMesh.position.set(
          x - width / 2 + ((column + 0.5) * width) / columns,
          2.1 + floor * 3.1,
          z + depth / 2 + 0.05,
        );
        this.scene.add(windowMesh);
      }
    }
  }

  private addRock(x: number, z: number): void {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.85 + ((Math.abs(x + z) % 5) * 0.12), 0),
      new THREE.MeshStandardMaterial({ color: 0x777b78, roughness: 1, flatShading: true }),
    );
    rock.position.set(x, 0.58, z);
    rock.rotation.set(0.12, (x - z) * 0.03, 0.08);
    rock.scale.set(1.25, 0.82, 1);
    rock.castShadow = true;
    rock.receiveShadow = true;
    rock.name = "environment-rock";
    this.obstacleColliders.push({ x, z, radius: 1.08 });
    this.cameraObstacles.push(rock);
    this.scene.add(rock);
  }

  private addTree(x: number, z: number): void {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.32, 2.8, 7),
      new THREE.MeshStandardMaterial({ color: 0x594331 }),
    );
    trunk.position.set(x, 1.4, z);
    trunk.castShadow = true;
    this.obstacleColliders.push({ x, z, radius: 0.78 });
    this.cameraObstacles.push(trunk);
    this.scene.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 8, 7),
      new THREE.MeshStandardMaterial({ color: 0x526e4d, roughness: 1 }),
    );
    leaves.position.set(x, 3.8, z);
    leaves.scale.y = 1.2;
    leaves.castShadow = true;
    this.scene.add(leaves);
  }

  private buildPlayer(): void {
    const skin = new THREE.MeshStandardMaterial({ color: 0xd69b68, roughness: 0.82 });
    const outfit = new THREE.MeshStandardMaterial({ color: 0x3d6470, roughness: 0.9 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.72, 4, 8), outfit);
    torso.position.y = 1.18;
    torso.castShadow = true;
    this.playerTorso = torso;
    this.player.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), skin);
    head.position.y = 1.92;
    head.castShadow = true;
    this.player.add(head);

    const makeLimb = (length: number, material: THREE.Material, x: number, y: number): THREE.Group => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, length, 3, 6), material);
      limb.position.y = -length * 0.42;
      limb.castShadow = true;
      pivot.add(limb);
      this.player.add(pivot);
      this.animatedLimbs.push(pivot);
      return pivot;
    };
    makeLimb(0.62, outfit, -0.48, 1.48);
    makeLimb(0.62, outfit, 0.48, 1.48);
    makeLimb(0.72, outfit, -0.2, 0.78);
    makeLimb(0.72, outfit, 0.2, 0.78);

    this.player.position.set(0, 0, 0);
    this.scene.add(this.player);
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.renderer.domElement.requestPointerLock?.();
    this.clock.start();
    this.animate();
  }

  private animate = (): void => {
    if (!this.isRunning) return;
    this.animationFrame = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.updatePlayer(delta);
    this.updateCamera(delta);
    this.renderer.render(this.scene, this.camera);
    const lng = this.worldData.origin[0] + this.player.position.x / this.metersPerLongitude;
    const lat = this.worldData.origin[1] - this.player.position.z / this.metersPerLatitude;
    this.onPosition(this.player.position.x, this.player.position.z, lng, lat);
  };

  private updatePlayer(delta: number): void {
    const grounded = this.player.position.y <= this.groundHeightAt(this.player.position.x, this.player.position.z) + 0.035;
    if (grounded) {
      this.player.position.y = this.groundHeightAt(this.player.position.x, this.player.position.z);
      this.verticalVelocity = 0;
      if (this.keys.has(" ") || this.keys.has("space")) {
        this.verticalVelocity = this.jumpImpulse;
        this.keys.delete(" ");
        this.keys.delete("space");
      }
    } else {
      this.verticalVelocity -= this.gravity * delta;
      this.player.position.y += this.verticalVelocity * delta;
      const groundY = this.groundHeightAt(this.player.position.x, this.player.position.z);
      if (this.player.position.y <= groundY) {
        this.player.position.y = groundY;
        this.verticalVelocity = 0;
      }
    }

    const speed = this.keys.has("shift") ? 9 : 5.2;
    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.direction.set(0, 0, 0);
    if (this.keys.has("w") || this.keys.has("z") || this.keys.has("arrowup")) this.direction.add(this.forward);
    if (this.keys.has("s") || this.keys.has("arrowdown")) this.direction.sub(this.forward);
    if (this.keys.has("d") || this.keys.has("arrowright")) this.direction.add(this.right);
    if (this.keys.has("a") || this.keys.has("q") || this.keys.has("arrowleft")) this.direction.sub(this.right);

    const isMoving = this.direction.lengthSq() > 0;
    if (isMoving) {
      this.direction.normalize();
      const dx = this.direction.x * speed * delta;
      const dz = this.direction.z * speed * delta;
      const currentGround = this.groundHeightAt(this.player.position.x, this.player.position.z);
      const canStepTo = (x: number, z: number): boolean => {
        if (this.collidesWithEnvironment(x, z)) return false;
        if (this.insideDemoBuilding && (x < -6.0 || x > 6.0 || z < -20.2 || z > -9.2)) return false;
        const nextGround = this.groundHeightAt(x, z);
        // Walk up gentle slopes and small steps; steep faces need a jump.
        return nextGround - currentGround <= this.maxStepHeight;
      };
      const nextX = this.player.position.x + dx;
      const nextZ = this.player.position.z + dz;
      // Axis-separated resolution allows sliding along building walls.
      if (canStepTo(nextX, this.player.position.z)) this.player.position.x = nextX;
      if (canStepTo(this.player.position.x, nextZ)) this.player.position.z = nextZ;
      if (grounded && this.verticalVelocity === 0) {
        const targetGround = this.groundHeightAt(this.player.position.x, this.player.position.z);
        this.player.position.y = Math.max(this.player.position.y, targetGround);
      }
    }
    this.player.position.x = THREE.MathUtils.clamp(this.player.position.x, -145, 145);
    this.player.position.z = THREE.MathUtils.clamp(this.player.position.z, -145, 145);
    const floor = this.groundHeightAt(this.player.position.x, this.player.position.z);
    if (this.player.position.y < floor) {
      this.player.position.y = floor;
      this.verticalVelocity = 0;
    }
    if (isMoving) {
      this.walkPhase += delta * (this.keys.has("shift") ? 13 : 8);
      this.player.rotation.y = Math.atan2(this.direction.x, this.direction.z);
    }
    if (this.insideDemoBuilding && this.player.position.z > -12.15 && this.player.position.x < 3.0) {
      this.interiorFloor = 1;
    } else if (this.insideDemoBuilding && this.player.position.z < -13.0) {
      this.interiorFloor = 0;
    }
    this.updateInteraction();
    const airborne = this.player.position.y > floor + 0.08;
    const swing = isMoving && !airborne ? Math.sin(this.walkPhase) * (this.keys.has("shift") ? 0.72 : 0.48) : 0;
    this.animatedLimbs.forEach((limb, index) => {
      limb.rotation.x = airborne ? (index >= 2 ? -0.42 : 0.35) : (index % 2 === 0 ? swing : -swing);
    });
    if (this.playerTorso) {
      this.playerTorso.position.y = 1.18 + (isMoving && !airborne ? Math.abs(Math.sin(this.walkPhase * 2)) * 0.045 : 0);
    }
  }

  private updateCamera(delta: number): void {
    const target = this.player.position.clone().add(new THREE.Vector3(0, 1.35, 0));
    const horizontal = this.cameraDistance * Math.cos(this.pitch);
    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * horizontal,
      1.9 - this.pitch * 2.2,
      Math.cos(this.yaw) * horizontal,
    );
    const desired = target.clone().add(offset);
    // Keep the third-person camera in front of nearby mapped walls.
    const rayDirection = desired.clone().sub(target);
    const desiredDistance = rayDirection.length();
    this.cameraRaycaster.set(target, rayDirection.normalize());
    this.cameraRaycaster.far = desiredDistance;
    const hit = this.cameraRaycaster.intersectObjects(this.cameraObstacles, false)[0];
    if (hit) desired.copy(target).addScaledVector(rayDirection.normalize(), Math.max(1.1, hit.distance - 0.35));
    this.camera.position.lerp(desired, 1 - Math.pow(0.001, delta));
    this.camera.lookAt(target);
  }

  private resize = (): void => {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
    if (key === "e" && !event.repeat) this.interact();
    this.keys.add(key);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key.toLowerCase());
  };

  private requestPointerLock = (): void => {
    if (this.isRunning) this.renderer.domElement.requestPointerLock?.();
  };

  private onPointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
  };

  private onCameraWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance + Math.sign(event.deltaY) * 0.8, 3.5, 11);
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.pointerLocked) return;
    this.yaw -= event.movementX * 0.0022;
    this.pitch = THREE.MathUtils.clamp(this.pitch - event.movementY * 0.0018, -0.55, 0.25);
  };

  dispose(): void {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrame);
    document.exitPointerLock?.();
    window.removeEventListener("resize", this.resize);
    this.renderer.domElement.removeEventListener("wheel", this.onCameraWheel);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    document.removeEventListener("mousemove", this.onMouseMove);
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    this.renderer.dispose();
    this.interactionPrompt.remove();
    this.renderer.domElement.remove();
  }
}