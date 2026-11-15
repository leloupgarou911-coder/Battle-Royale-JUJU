export interface PlayerProgress {
  xp: number;
  distanceMeters: number;
  remainder: number;
  zones: string[];
  cities: string[];
  achievements: string[];
}

export interface DailyMission {
  id: string;
  progress: number;
  target: number;
  rewardXp: number;
  completedAt: number | null;
}

export interface DailyMissionState {
  date: string;
  missions: DailyMission[];
}

export interface MissionHistoryEntry {
  id: string;
  date: string;
  completedAt: number;
  rewardXp: number;
}

export interface ProgressionSlot {
  progress: PlayerProgress;
  dailyMissions?: DailyMissionState;
  missionHistory?: MissionHistoryEntry[];
}

export function emptyProgress(): PlayerProgress {
  return { xp: 0, distanceMeters: 0, remainder: 0, zones: [], cities: [], achievements: [] };
}

export function normalizeProgress(value: unknown): PlayerProgress {
  if (!value || typeof value !== "object") return emptyProgress();
  const progress = value as Partial<PlayerProgress>;
  return {
    xp: Number.isFinite(progress.xp) ? Math.max(0, Math.floor(progress.xp!)) : 0,
    distanceMeters: Number.isFinite(progress.distanceMeters) ? Math.max(0, progress.distanceMeters!) : 0,
    remainder: Number.isFinite(progress.remainder) ? Math.max(0, Math.min(24.999, progress.remainder!)) : 0,
    zones: Array.isArray(progress.zones)
      ? progress.zones.filter((item): item is string => typeof item === "string").slice(-1000)
      : [],
    cities: Array.isArray(progress.cities)
      ? progress.cities.filter((item): item is string => typeof item === "string").slice(-200)
      : [],
    achievements: Array.isArray(progress.achievements)
      ? progress.achievements.filter((item): item is string => typeof item === "string")
      : [],
  };
}

export function createDailyMissionState(date: string): DailyMissionState {
  return {
    date,
    missions: [
      { id: "zones", progress: 0, target: 3, rewardXp: 75, completedAt: null },
      { id: "city", progress: 0, target: 1, rewardXp: 100, completedAt: null },
      { id: "distance", progress: 0, target: 1000, rewardXp: 100, completedAt: null },
    ],
  };
}

export function ensureDailyMissions(slot: ProgressionSlot, date: string): DailyMissionState {
  if (!slot.dailyMissions || slot.dailyMissions.date !== date) {
    slot.dailyMissions = createDailyMissionState(date);
  }
  return slot.dailyMissions;
}

export function applyDailyMissionProgress(
  slot: ProgressionSlot,
  id: string,
  amount: number,
  date: string,
  completedAt: number,
): { completed: boolean; rewardXp: number } {
  if (!Number.isFinite(amount) || amount <= 0) return { completed: false, rewardXp: 0 };
  const state = ensureDailyMissions(slot, date);
  const mission = state.missions.find((item) => item.id === id);
  if (!mission || mission.completedAt !== null) return { completed: false, rewardXp: 0 };
  mission.progress = Math.min(mission.target, mission.progress + amount);
  if (mission.progress < mission.target) return { completed: false, rewardXp: 0 };

  mission.completedAt = completedAt;
  slot.progress.xp += mission.rewardXp;
  slot.missionHistory = [
    ...(slot.missionHistory ?? []),
    { id, date: state.date, completedAt, rewardXp: mission.rewardXp },
  ].slice(-100);
  return { completed: true, rewardXp: mission.rewardXp };
}

export function recordDiscoveredZone(progress: PlayerProgress, x: number, y: number): boolean {
  const key = `${x}:${y}`;
  if (progress.zones.includes(key)) return false;
  progress.zones.push(key);
  if (progress.zones.length > 1000) progress.zones.shift();
  progress.xp += 25;
  return true;
}

export function recordDiscoveredCity(progress: PlayerProgress, name: string, country = ""): boolean {
  const normalizedName = name.trim().toLocaleLowerCase();
  if (!normalizedName) return false;
  const key = `${normalizedName}|${country.trim().toLocaleLowerCase()}`;
  if (progress.cities.includes(key)) return false;
  progress.cities.push(key);
  if (progress.cities.length > 200) progress.cities.shift();
  progress.xp += 50;
  return true;
}

export function recordTravelDistance(progress: PlayerProgress, meters: number): number {
  if (!Number.isFinite(meters) || meters <= 0 || meters > 100) return 0;
  progress.distanceMeters += meters;
  const total = progress.remainder + meters;
  const earnedXp = Math.floor(total / 25);
  progress.remainder = total - earnedXp * 25;
  progress.xp += earnedXp;
  return earnedXp;
}
