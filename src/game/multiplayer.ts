import type { OsmWorldSnapshot } from "./osmWorld.ts";

export type ArenaGameMode = "free_roam" | "zone_control" | "discovery_challenge";

export interface ArenaParticipant {
  id: string;
  name: string;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  team: "alpha" | "bravo";
  score: number;
  isLocal: boolean;
  isSimulated: boolean;
  connected: boolean;
  lastSeenAt: number;
}

export interface TacticalObjective {
  id: string;
  title: string;
  category: "landmark" | "park" | "intersection";
  x: number;
  z: number;
  radius: number;
  owner: "neutral" | "alpha" | "bravo";
  progress: number;
  captured: boolean;
  points: number;
}

export interface ArenaZoneCircle {
  active: boolean;
  centerX: number;
  centerZ: number;
  radius: number;
  targetRadius: number;
  phase: number;
}

export interface ArenaMatchState {
  mode: ArenaGameMode;
  roomCode: string;
  inLobby: boolean;
  networkKind: "solo" | "local-broadcast" | "simulation";
  simulationBotsEnabled: boolean;
  matchStartedAt: number;
  elapsedSeconds: number;
  alphaScore: number;
  bravoScore: number;
  zone: ArenaZoneCircle;
  objectives: TacticalObjective[];
  participants: ArenaParticipant[];
  eventMessage: string;
}

export function generateRoomCode(seed = Math.random()): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "JUJU-";
  let value = Math.floor(Math.abs(seed) * 1_000_000) + Date.now();
  for (let i = 0; i < 4; i += 1) {
    code += chars[value % chars.length];
    value = Math.floor(value / chars.length) + (i + 7) * 13;
  }
  return code;
}

export function buildObjectivesFromOsmWorld(
  world: OsmWorldSnapshot,
  mode: ArenaGameMode,
): TacticalObjective[] {
  if (mode === "free_roam") return [];
  const objectives: TacticalObjective[] = [];
  const candidates: Array<{
    id: string;
    title: string;
    category: TacticalObjective["category"];
    x: number;
    z: number;
    points: number;
  }> = [];

  for (const lm of world.landmarks) {
    if (Math.hypot(lm.x, lm.z) < 12 || Math.hypot(lm.x, lm.z) > 175) continue;
    candidates.push({
      id: `obj-${lm.id}`,
      title: lm.name || lm.poiClass,
      category: "landmark",
      x: lm.x,
      z: lm.z,
      points: lm.category === "monument" ? 150 : 100,
    });
  }

  for (const green of world.greens) {
    const cx = (green.bounds.minX + green.bounds.maxX) * 0.5;
    const cz = (green.bounds.minZ + green.bounds.maxZ) * 0.5;
    if (Math.hypot(cx, cz) < 14 || Math.hypot(cx, cz) > 170) continue;
    candidates.push({
      id: `obj-${green.id}`,
      title: green.category === "park" ? "Parc / Zone verte" : "Espace vert",
      category: "park",
      x: cx,
      z: cz,
      points: 110,
    });
  }

  if (candidates.length < 3) {
    for (const road of world.roads) {
      if (road.points.length < 2) continue;
      const mid = road.points[Math.floor(road.points.length / 2)];
      if (Math.hypot(mid.x, mid.z) < 18 || Math.hypot(mid.x, mid.z) > 165) continue;
      candidates.push({
        id: `obj-road-${road.id}`,
        title: `Carrefour (${road.roadClass})`,
        category: "intersection",
        x: mid.x,
        z: mid.z,
        points: 80,
      });
    }
  }

  // Fallback cardinal sectors ONLY if world truly has <2 OSM points (e.g., sparse desert)
  if (candidates.length === 0) {
    candidates.push(
      { id: "obj-sector-n", title: "Balise Nord (Procédural)", category: "intersection", x: 0, z: -55, points: 90 },
      { id: "obj-sector-e", title: "Balise Est (Procédural)", category: "intersection", x: 58, z: 12, points: 90 },
      { id: "obj-sector-w", title: "Balise Ouest (Procédural)", category: "intersection", x: -55, z: 24, points: 90 },
    );
  }

  for (const cand of candidates) {
    if (objectives.length >= 4) break;
    const tooClose = objectives.some((o) => Math.hypot(o.x - cand.x, o.z - cand.z) < 34);
    if (tooClose) continue;
    objectives.push({
      ...cand,
      radius: 7.5,
      owner: "neutral",
      progress: 0,
      captured: false,
    });
  }
  return objectives;
}

interface BroadcastPacket {
  type: "player_state" | "player_leave" | "room_ping";
  roomCode: string;
  senderId: string;
  name?: string;
  x?: number;
  z?: number;
  yaw?: number;
  speed?: number;
  team?: "alpha" | "bravo";
  score?: number;
  timestamp: number;
}

export class ArenaSessionManager {
  private readonly localId = `p-${Math.random().toString(36).slice(2, 8)}`;
  private localName = "EXPLORER-1";
  private roomCode = generateRoomCode();
  private mode: ArenaGameMode = "free_roam";
  private simulationBotsEnabled = false;
  private matchStartedAt = Date.now();
  private alphaScore = 0;
  private bravoScore = 0;
  private objectives: TacticalObjective[] = [];
  private participants = new Map<string, ArenaParticipant>();
  private zone: ArenaZoneCircle = {
    active: false,
    centerX: 0,
    centerZ: 0,
    radius: 175,
    targetRadius: 65,
    phase: 1,
  };
  private channel: BroadcastChannel | null = null;
  private lastBroadcastAt = 0;
  private eventMessage = "";
  private bots: Array<{
    id: string;
    name: string;
    team: "alpha" | "bravo";
    x: number;
    z: number;
    yaw: number;
    targetObjIndex: number;
    score: number;
  }> = [];

  constructor() {
    this.participants.set(this.localId, {
      id: this.localId,
      name: this.localName,
      x: 0,
      z: 0,
      yaw: 0,
      speed: 0,
      team: "alpha",
      score: 0,
      isLocal: true,
      isSimulated: false,
      connected: true,
      lastSeenAt: Date.now(),
    });
    this.openBroadcastChannel();
  }

  private openBroadcastChannel(): void {
    if (typeof BroadcastChannel === "undefined") return;
    try {
      this.channel = new BroadcastChannel("juju-world-arena-v1");
      this.channel.onmessage = (event: MessageEvent<BroadcastPacket>) => {
        const msg = event.data;
        if (!msg || msg.senderId === this.localId || msg.roomCode !== this.roomCode) return;
        if (msg.type === "player_leave") {
          this.participants.delete(msg.senderId);
          return;
        }
        if (msg.type === "player_state" && Number.isFinite(msg.x) && Number.isFinite(msg.z)) {
          this.participants.set(msg.senderId, {
            id: msg.senderId,
            name: String(msg.name ?? "JOUEUR").slice(0, 18),
            x: Number(msg.x),
            z: Number(msg.z),
            yaw: Number(msg.yaw ?? 0),
            speed: Number(msg.speed ?? 0),
            team: msg.team === "bravo" ? "bravo" : "alpha",
            score: Number(msg.score ?? 0),
            isLocal: false,
            isSimulated: false,
            connected: true,
            lastSeenAt: Date.now(),
          });
        }
      };
    } catch {
      this.channel = null;
    }
  }

  configureMode(
    mode: ArenaGameMode,
    world: OsmWorldSnapshot,
    options?: { simulationBots?: boolean },
  ): void {
    this.mode = mode;
    this.matchStartedAt = Date.now();
    this.alphaScore = 0;
    this.bravoScore = 0;
    this.eventMessage = "";
    if (options?.simulationBots !== undefined) {
      this.simulationBotsEnabled = options.simulationBots;
    } else {
      this.simulationBotsEnabled = mode === "zone_control";
    }
    this.objectives = buildObjectivesFromOsmWorld(world, mode);
    this.zone = {
      active: mode === "zone_control",
      centerX: 0,
      centerZ: 0,
      radius: 175,
      targetRadius: 55,
      phase: 1,
    };
    this.rebuildBots();
  }

  private rebuildBots(): void {
    for (const key of [...this.participants.keys()]) {
      if (this.participants.get(key)?.isSimulated) this.participants.delete(key);
    }
    this.bots = [];
    if (!this.simulationBotsEnabled || this.mode === "free_roam") return;
    const offsets: Array<{ x: number; z: number; team: "alpha" | "bravo"; name: string }> = [
      { x: 38, z: -28, team: "bravo", name: "BOT-IA-01" },
      { x: -42, z: 32, team: "bravo", name: "BOT-IA-02" },
      { x: -24, z: -26, team: "alpha", name: "BOT-ALLY" },
    ];
    offsets.forEach((b, idx) => {
      const id = `bot-${idx + 1}`;
      this.bots.push({
        id,
        name: b.name,
        team: b.team,
        x: b.x,
        z: b.z,
        yaw: 0,
        targetObjIndex: idx % Math.max(1, this.objectives.length),
        score: 0,
      });
      this.participants.set(id, {
        id,
        name: b.name,
        x: b.x,
        z: b.z,
        yaw: 0,
        speed: 4.1,
        team: b.team,
        score: 0,
        isLocal: false,
        isSimulated: true,
        connected: true,
        lastSeenAt: Date.now(),
      });
    });
  }

  setRoomCode(code: string, playerName?: string): void {
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12);
    if (clean.length >= 4) {
      this.postPacket({ type: "player_leave", roomCode: this.roomCode, senderId: this.localId, timestamp: Date.now() });
      for (const [id, p] of this.participants) {
        if (!p.isLocal && !p.isSimulated) this.participants.delete(id);
      }
      this.roomCode = clean;
    }
    if (playerName?.trim()) {
      this.localName = playerName.trim().slice(0, 18);
      const local = this.participants.get(this.localId);
      if (local) local.name = this.localName;
    }
    this.postPacket({ type: "room_ping", roomCode: this.roomCode, senderId: this.localId, timestamp: Date.now() });
  }

  setSimulationBots(enabled: boolean): void {
    this.simulationBotsEnabled = enabled;
    this.rebuildBots();
  }

  getLocalParticipantId(): string {
    return this.localId;
  }

  update(
    deltaSeconds: number,
    localPos: { x: number; z: number; yaw: number; speed: number },
    isBlocked?: (x: number, z: number) => boolean,
  ): ArenaMatchState {
    const now = Date.now();
    const local = this.participants.get(this.localId);
    if (local) {
      local.x = localPos.x;
      local.z = localPos.z;
      local.yaw = localPos.yaw;
      local.speed = localPos.speed;
      local.lastSeenAt = now;
    }

    // Expire disconnected browser-tab peers cleanly
    for (const [id, p] of this.participants) {
      if (!p.isLocal && !p.isSimulated && now - p.lastSeenAt > 6000) {
        this.participants.delete(id);
      }
    }

    // Step local simulation bots if enabled
    if (this.simulationBotsEnabled && this.objectives.length > 0 && deltaSeconds > 0) {
      for (const bot of this.bots) {
        const target = this.objectives[bot.targetObjIndex % this.objectives.length];
        const dx = target.x - bot.x;
        const dz = target.z - bot.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 2.4) {
          const botSpeed = 3.8;
          const step = Math.min(dist, botSpeed * deltaSeconds);
          const nx = dx / dist;
          const nz = dz / dist;
          const nextX = bot.x + nx * step;
          const nextZ = bot.z + nz * step;
          if (!isBlocked || !isBlocked(nextX, nextZ)) {
            bot.x = nextX;
            bot.z = nextZ;
          } else {
            // Simple tangent steer around building corner
            const altX = bot.x - nz * step;
            const altZ = bot.z + nx * step;
            if (!isBlocked(altX, altZ)) {
              bot.x = altX;
              bot.z = altZ;
            }
          }
          bot.yaw = Math.atan2(nx, nz);
        } else if (target.owner === bot.team) {
          bot.targetObjIndex = (bot.targetObjIndex + 1) % this.objectives.length;
        }
        const p = this.participants.get(bot.id);
        if (p) {
          p.x = bot.x;
          p.z = bot.z;
          p.yaw = bot.yaw;
          p.speed = dist > 2.4 ? 3.8 : 0;
          p.score = bot.score;
          p.lastSeenAt = now;
        }
      }
    }

    // Step zone shrink & objective captures
    this.eventMessage = "";
    if (this.zone.active) {
      const shrinkRate = 1.15;
      this.zone.radius = Math.max(this.zone.targetRadius, this.zone.radius - shrinkRate * deltaSeconds);
      this.zone.phase = this.zone.radius > 130 ? 1 : this.zone.radius > 85 ? 2 : 3;
    }

    for (const obj of this.objectives) {
      const insideAlpha = [...this.participants.values()].some(
        (p) => p.team === "alpha" && Math.hypot(p.x - obj.x, p.z - obj.z) <= obj.radius,
      );
      const insideBravo = [...this.participants.values()].some(
        (p) => p.team === "bravo" && Math.hypot(p.x - obj.x, p.z - obj.z) <= obj.radius,
      );
      if (insideAlpha && !insideBravo && obj.owner !== "alpha") {
        obj.progress = Math.min(100, obj.progress + 34 * deltaSeconds);
        if (obj.progress >= 100) {
          obj.owner = "alpha";
          obj.captured = true;
          this.alphaScore += obj.points;
          if (local) local.score += obj.points;
          this.eventMessage = `+${obj.points} · ${obj.title}`;
        }
      } else if (insideBravo && !insideAlpha && obj.owner !== "bravo") {
        obj.progress = Math.min(100, obj.progress + 26 * deltaSeconds);
        if (obj.progress >= 100) {
          obj.owner = "bravo";
          obj.captured = true;
          this.bravoScore += obj.points;
          this.eventMessage = `BRAVO · ${obj.title}`;
        }
      }
    }

    if (now - this.lastBroadcastAt >= 120) {
      this.lastBroadcastAt = now;
      this.postPacket({
        type: "player_state",
        roomCode: this.roomCode,
        senderId: this.localId,
        name: this.localName,
        x: localPos.x,
        z: localPos.z,
        yaw: localPos.yaw,
        speed: localPos.speed,
        team: "alpha",
        score: local?.score ?? 0,
        timestamp: now,
      });
    }

    return this.getState();
  }

  getState(): ArenaMatchState {
    const all = [...this.participants.values()];
    const hasHumanPeers = all.some((p) => !p.isLocal && !p.isSimulated);
    const networkKind: ArenaMatchState["networkKind"] = hasHumanPeers
      ? "local-broadcast"
      : this.simulationBotsEnabled && this.mode !== "free_roam"
        ? "simulation"
        : "solo";
    return {
      mode: this.mode,
      roomCode: this.roomCode,
      inLobby: false,
      networkKind,
      simulationBotsEnabled: this.simulationBotsEnabled,
      matchStartedAt: this.matchStartedAt,
      elapsedSeconds: Math.floor((Date.now() - this.matchStartedAt) / 1000),
      alphaScore: this.alphaScore,
      bravoScore: this.bravoScore,
      zone: { ...this.zone },
      objectives: this.objectives.map((o) => ({ ...o })),
      participants: all.map((p) => ({ ...p })),
      eventMessage: this.eventMessage,
    };
  }

  private postPacket(packet: BroadcastPacket): void {
    try {
      this.channel?.postMessage(packet);
    } catch {
      // Ignore closed/unsupported BroadcastChannel
    }
  }

  dispose(): void {
    this.postPacket({ type: "player_leave", roomCode: this.roomCode, senderId: this.localId, timestamp: Date.now() });
    this.channel?.close();
    this.channel = null;
  }
}
