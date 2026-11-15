import * as THREE from "three";

type PositionCallback = (x: number, z: number, lng: number, lat: number) => void;
type MappedBuildingFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
type MappedRoadFeature = GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>;
interface TerrainSample { x: number; z: number; elevation: number; }
interface GameWorldData { origin: [number, number]; buildings: MappedBuildingFeature[]; roads: MappedRoadFeature[]; terrain: TerrainSample[]; terrainSize: number; terrainSegments: number; }

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

    const grid = new THREE.GridHelper(500, 100, 0x71816b, 0x71816b);
    grid.position.y = 0.015;
    (grid.material as THREE.Material).opacity = 0.12;
    (grid.material as THREE.Material).transparent = true;
    this.scene.add(grid);
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
        const shape = new THREE.Shape();
        shape.moveTo(points[0][0], -points[0][1]);
        for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i][0], -points[i][1]);
        shape.closePath();
        const meshGeometry = new THREE.ExtrudeGeometry(shape, { depth: height - base, bevelEnabled: false, curveSegments: 1 });
        meshGeometry.rotateX(-Math.PI / 2);
        const building = new THREE.Mesh(meshGeometry, material);
        building.position.y = base;
        building.castShadow = true;
        building.receiveShadow = true;
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
          vertices.push(points[i][0] + ox, 0.055, points[i][1] + oz);
          vertices.push(points[i][0] - ox, 0.055, points[i][1] - oz);
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

  private isInsideRing(x: number, z: number, ring: number[][]): boolean {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const a = this.geographicToLocal(ring[i][0], ring[i][1]);
      const b = this.geographicToLocal(ring[j][0], ring[j][1]);
      if ((a[1] > z) !== (b[1] > z) &&
        x < ((b[0] - a[0]) * (z - a[1])) / ((b[1] - a[1]) || 1e-9) + a[0]) inside = !inside;
    }
    return inside;
  }

  private collidesWithBuilding(x: number, z: number): boolean {
    const radius = 0.62;
    const offsets: [number, number][] = [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius],
      [radius * 0.7, radius * 0.7], [-radius * 0.7, radius * 0.7], [radius * 0.7, -radius * 0.7], [-radius * 0.7, -radius * 0.7]];
    for (const feature of this.worldData.buildings) {
      const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
      for (const polygon of polygons) {
        const outer = polygon[0];
        if (!outer || outer.length < 4) continue;
        if (offsets.some(([ox, oz]) => this.isInsideRing(x + ox, z + oz, outer))) return true;
      }
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

  private addTree(x: number, z: number): void {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.32, 2.8, 7),
      new THREE.MeshStandardMaterial({ color: 0x594331 }),
    );
    trunk.position.set(x, 1.4, z);
    trunk.castShadow = true;
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
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.48, 1.05, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xd69b68, roughness: 0.8 }),
    );
    body.position.y = 1.25;
    body.castShadow = true;
    this.player.add(body);
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
    const speed = this.keys.has("shift") ? 10 : 5.5;
    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.direction.set(0, 0, 0);

    if (this.keys.has("w") || this.keys.has("z") || this.keys.has("arrowup")) this.direction.add(this.forward);
    if (this.keys.has("s") || this.keys.has("arrowdown")) this.direction.sub(this.forward);
    if (this.keys.has("d") || this.keys.has("arrowright")) this.direction.add(this.right);
    if (this.keys.has("a") || this.keys.has("q") || this.keys.has("arrowleft")) this.direction.sub(this.right);

    if (this.direction.lengthSq() > 0) {
      this.direction.normalize();
      const nextX = this.player.position.x + this.direction.x * speed * delta;
      const nextZ = this.player.position.z + this.direction.z * speed * delta;
      // Resolve axes separately so the character can slide along mapped building walls.
      if (!this.collidesWithBuilding(nextX, this.player.position.z)) this.player.position.x = nextX;
      if (!this.collidesWithBuilding(this.player.position.x, nextZ)) this.player.position.z = nextZ;
    }
    this.player.position.x = THREE.MathUtils.clamp(this.player.position.x, -145, 145);
    this.player.position.z = THREE.MathUtils.clamp(this.player.position.z, -145, 145);
    this.player.position.y = this.terrainHeightAt(this.player.position.x, this.player.position.z);
  }

  private updateCamera(delta: number): void {
    const distance = 7;
    const target = this.player.position.clone().add(new THREE.Vector3(0, 1.6, 0));
    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * distance * Math.cos(this.pitch),
      2.8 - this.pitch * 2,
      Math.cos(this.yaw) * distance * Math.cos(this.pitch),
    );
    const desired = target.clone().add(offset);
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
    this.keys.add(event.key.toLowerCase());
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
    this.renderer.domElement.remove();
  }
}