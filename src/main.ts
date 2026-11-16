import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";

maplibregl.setWorkerUrl(workerUrl);
import "./style.css";
import { createZoneObstacles, legacyMercatorZoneCenter, spawnForZone, zoneAtOffset, zoneFor, zonePolygon } from "./game/zones.ts";
import { destinationFromDirection, haversineDistance, normalizeDirection } from "./game/movement.ts";
import { adjacentInteriorFloor, classifyBuilding, createInteriorLayout, type BuildingKind, type InteriorDoor, type InteriorObject } from "./game/interiors.ts";
import { isValidSavedInterior, type SavedInteriorProgress } from "./game/buildingGenerator.ts";
import { applyDailyMissionProgress, createDailyMissionState as createProgressDailyMissionState, emptyProgress, ensureDailyMissions as ensureProgressDailyMissions, normalizeProgress, recordDiscoveredCity, recordDiscoveredZone, recordTravelDistance, type DailyMissionState, type MissionHistoryEntry, type PlayerProgress } from "./game/progression.ts";
import { isValidGameSession, type SavedGameSession } from "./game/saves.ts";
import { detectStreamingProfile, type NetworkInformationLike, type StreamingProfile } from "./game/streaming.ts";
import { circlesOverlap, collisionSampleOffsets } from "./game/collisions.ts";

import { translations, type Language } from "./i18n/translations.ts";
import { Game } from "./game/Game.ts";
import { findRoadRoute } from "./game/routing.ts";

const $ = <T extends HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing interface element: ${selector}`);
  return element;
};

const mapStatus = $("#map-status");
const searchInput = $("#place-search") as HTMLInputElement;
const searchResults = $("#search-results");
const toast = $("#toast");
let language: Language = "en";
let buildingsVisible = true;
let terrainEnabled = false;
let placesVisible = true;
let toastTimeout = 0;
let selectedPlaceMarker: maplibregl.Marker | null = null;
let gameMode = false;
let playerMarker: maplibregl.Marker | null = null;
let destinationMarker: maplibregl.Marker | null = null;
let destinationCoordinates: [number, number] | null = null;
let navigationRouteCoordinates: [number, number][] = [];
let destinationSelectionMode = false;
let lastNearbyPoiUpdateAt = 0;
let travelledRouteCoordinates: [number, number][] = [];
let lastRoutePoint: [number, number] | null = null;
let virtualEntranceMarker: maplibregl.Marker | null = null;
let selectedBuildingName = "";
let selectedBuildingType: BuildingKind = "other";
let selectedBuildingLevels: number | null = null;
let currentInteriorFloor = 0;
let activeZoneKey = "";
let interiorPosition = { x: 2, y: 4 };
let interiorLastDirection = "down";
let interiorLastMessage = "";
const browserCapabilities = navigator as Navigator & { connection?: NetworkInformationLike; deviceMemory?: number };
function currentStreamingProfile(): StreamingProfile {
  return detectStreamingProfile({
    online: navigator.onLine,
    memory: browserCapabilities.deviceMemory,
    cores: navigator.hardwareConcurrency,
    connection: browserCapabilities.connection,
  });
}
let streamingProfile = currentStreamingProfile();
let protectedZoneKeys = new Set<string>();
let lastPredictionSignature = "";
let lastVectorPrefetchSignature = "";
let vectorTileTemplatesPromise: Promise<string[]> | null = null;
const prefetchedVectorTiles = new Set<string>();
const pendingVectorTiles = new Set<string>();
const zoneObstacleCache = new Map<string, GeoJSON.FeatureCollection<GeoJSON.Point>>();
const EXPLORED_STORAGE_KEY = "juju-world-explored-zones-v2";
const LEGACY_EXPLORED_STORAGE_KEY = "juju-world-explored-zones-v1";
const SESSION_STORAGE_KEY = "juju-world-session-v1";
const SAVE_SLOTS_STORAGE_KEY = "juju-world-save-slots-v1";
const SAVE_SLOT_LIMIT = 10;
interface SavedGameSlot {
  id:string; name:string; session:SavedGameSession; progress:PlayerProgress;
  dailyMissions?:DailyMissionState; missionHistory?:MissionHistoryEntry[]; interior?:SavedInteriorProgress;
  createdAt:number; updatedAt:number;
}
const localDateKey=():string=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");};
function ensureDailyMissions(slot:SavedGameSlot):DailyMissionState {
 return ensureProgressDailyMissions(slot, localDateKey());
}
function missionLabel(id:string):string {
 const labels:Record<string,[string,string]>={zones:["Explore 3 new zones","Explorer 3 nouvelles zones"],city:["Discover a new city","Découvrir une nouvelle ville"],distance:["Travel 1,000 metres","Parcourir 1 000 mètres"]};
 return labels[id]?.[language==="en"?0:1]??id;
}
function updateDailyMission(slot:SavedGameSlot,id:string,amount:number):boolean {
 const result=applyDailyMissionProgress(slot,id,amount,localDateKey(),Date.now());
 if(!result.completed)return false;
 checkAchievements(slot.progress);
 showToast(language==="fr"?`Mission terminée : ${missionLabel(id)} · +${result.rewardXp} XP`:`Mission complete: ${missionLabel(id)} · +${result.rewardXp} XP`);
 return true;
}
const achievementDefs=[
 {id:"zone1",en:"First Steps",fr:"Premiers pas",rewardEn:"Explorer badge",rewardFr:"Badge explorateur",test:(p:PlayerProgress)=>p.zones.length>=1},
 {id:"zone5",en:"Pathfinder",fr:"Éclaireur",rewardEn:"Pathfinder badge",rewardFr:"Badge éclaireur",test:(p:PlayerProgress)=>p.zones.length>=5},
 {id:"city1",en:"City Scout",fr:"Repéreur urbain",rewardEn:"City Scout title",rewardFr:"Titre repéreur urbain",test:(p:PlayerProgress)=>p.cities.length>=1},
 {id:"city5",en:"Globe Trotter",fr:"Globe-trotteur",rewardEn:"Globe Trotter title",rewardFr:"Titre globe-trotteur",test:(p:PlayerProgress)=>p.cities.length>=5},
 {id:"km1",en:"First Kilometer",fr:"Premier kilomètre",rewardEn:"Traveler badge",rewardFr:"Badge voyageur",test:(p:PlayerProgress)=>p.distanceMeters>=1000},
 {id:"km10",en:"Long-Distance Explorer",fr:"Grand explorateur",rewardEn:"Veteran badge",rewardFr:"Badge vétéran",test:(p:PlayerProgress)=>p.distanceMeters>=10000},
 {id:"xp500",en:"Rising Explorer",fr:"Explorateur confirmé",rewardEn:"500 XP milestone",rewardFr:"Palier des 500 XP",test:(p:PlayerProgress)=>p.xp>=500},
];

function activeSlot():SavedGameSlot|undefined{return savedGameSlots.find(x=>x.id===activeSaveSlotId);}
function checkAchievements(p:PlayerProgress):void {
 achievementDefs.forEach(a=>{if(!p.achievements.includes(a.id)&&a.test(p)){p.achievements.push(a.id);showToast(language==="fr"?`Succès débloqué : ${a.fr} · ${a.rewardFr}`:`Achievement unlocked: ${a.en} · ${a.rewardEn}`);}});
}
function saveProgress():void {const slot=activeSlot();if(!slot)return;slot.updatedAt=Date.now();persistSavedGameSlots();renderSavedGameSlots();renderPlayerProgress();renderDailyMissions();}
function discoverProgressZone(x:number,y:number):void {
 const slot=activeSlot();if(!slot||!recordDiscoveredZone(slot.progress,x,y))return;
 updateDailyMission(slot,"zones",1);checkAchievements(slot.progress);saveProgress();
}
function discoverProgressCity(name:string,country?:string):void {
 const slot=activeSlot();if(!slot||!recordDiscoveredCity(slot.progress,name,country))return;
 updateDailyMission(slot,"city",1);checkAchievements(slot.progress);saveProgress();
}
function addTravelDistance(from:maplibregl.LngLat,to:maplibregl.LngLat):void {
 const slot=activeSlot();if(!slot)return;const meters=haversineDistance(from,to);const earnedXp=recordTravelDistance(slot.progress,meters);
 if(earnedXp===0&&(!Number.isFinite(meters)||meters<=0||meters>100))return;
 updateDailyMission(slot,"distance",meters);checkAchievements(slot.progress);if(earnedXp>0)saveProgress();
}
function renderDailyMissions():void {
 const slot=activeSlot(),list=document.querySelector<HTMLElement>("#daily-missions-list"),history=document.querySelector<HTMLElement>("#mission-history");
 if(!list||!history)return;list.replaceChildren();history.replaceChildren();
 if(!slot){const empty=document.createElement("p");empty.textContent=language==="fr"?"Créez une partie pour recevoir vos missions.":"Create a save to receive missions.";list.append(empty);return;}
 const state=ensureDailyMissions(slot);
 state.missions.forEach(mission=>{
  const card=document.createElement("article");card.className="daily-mission-card";
  const top=document.createElement("div");top.className="daily-mission-top";
  const name=document.createElement("strong");name.textContent=missionLabel(mission.id);
  const reward=document.createElement("span");reward.textContent=mission.completedAt?(language==="fr"?"TERMINÉE":"COMPLETE"):`+${mission.rewardXp} XP`;
  top.append(name,reward);const track=document.createElement("div");track.className="mission-progress-track";
  const fill=document.createElement("span");fill.style.width=`${Math.min(100,mission.progress/mission.target*100)}%`;track.append(fill);
  const detail=document.createElement("small");detail.textContent=mission.id==="distance"?`${Math.floor(mission.progress)} / ${mission.target} m`:`${mission.progress} / ${mission.target}`;
  card.append(top,track,detail);list.append(card);
 });
 const entries=(slot.missionHistory??[]).slice().reverse().slice(0,5);
 if(!entries.length){const empty=document.createElement("p");empty.textContent=language==="fr"?"Aucune mission terminée.":"No completed missions yet.";history.append(empty);}
 entries.forEach(entry=>{const item=document.createElement("p");item.className="mission-history-item";const name=document.createElement("strong");name.textContent=missionLabel(entry.id);const meta=document.createElement("span");meta.textContent=`${new Date(entry.completedAt).toLocaleDateString(language==="fr"?"fr-FR":"en-GB")} · +${entry.rewardXp} XP`;item.append(name,meta);history.append(item);});
}
function renderPlayerProgress():void {
 const p=activeSlot()?.progress??emptyProgress(),level=Math.floor(p.xp/100)+1,within=p.xp%100;
 const set=(id:string,value:string)=>{const el=document.querySelector<HTMLElement>(id);if(el)el.textContent=value;};
 set("#progress-level",String(level));set("#progress-xp",`${within} / 100 XP · ${p.xp} total`);
 const bar=document.querySelector<HTMLElement>("#progress-xp-bar");if(bar)bar.style.width=`${within}%`;
 set("#progress-distance",p.distanceMeters>=1000?`${(p.distanceMeters/1000).toFixed(2)} km`:`${Math.floor(p.distanceMeters)} m`);
 set("#progress-zones",String(p.zones.length));set("#progress-cities",String(p.cities.length));set("#progress-achievements",`${p.achievements.length} / ${achievementDefs.length}`);
 const rewards=document.querySelector<HTMLElement>("#progress-rewards");if(rewards){rewards.replaceChildren();const unlocked=achievementDefs.filter(a=>p.achievements.includes(a.id));if(!unlocked.length){const empty=document.createElement("span");empty.textContent=language==="fr"?"Aucun succès pour le moment":"No achievements yet";rewards.append(empty);}unlocked.forEach(a=>{const badge=document.createElement("span");badge.className="progress-reward";badge.textContent=language==="fr"?a.rewardFr:a.rewardEn;rewards.append(badge);});}
}
let savedGameSlots: SavedGameSlot[] = [];
let activeSaveSlotId: string | null = null;
let lastSessionSaveAt = 0;
function loadSavedGameSlots(): void {
  try {
    const raw = localStorage.getItem(SAVE_SLOTS_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        savedGameSlots = parsed.filter((item): item is SavedGameSlot =>
          !!item && typeof item.id === "string" && typeof item.name === "string"
          && isValidGameSession(item.session) && Number.isFinite(item.createdAt)
          && Number.isFinite(item.updatedAt)
        ).map((item) => ({
          ...item,
          name: item.name.trim().slice(0, 32) || "Exploration",
          progress: normalizeProgress(item.progress),
          dailyMissions: item.dailyMissions && typeof item.dailyMissions.date === "string" && Array.isArray(item.dailyMissions.missions) ? item.dailyMissions : createProgressDailyMissionState(localDateKey()),
          missionHistory: Array.isArray(item.missionHistory) ? item.missionHistory.filter((entry) => entry && typeof entry.id === "string" && typeof entry.date === "string" && Number.isFinite(entry.completedAt) && Number.isFinite(entry.rewardXp)).slice(-100) : [],
          interior: isValidSavedInterior(item.interior) ? item.interior : undefined,
          session: {
            ...item.session,
            movementSpeed: item.session.movementSpeed > 12 ? 4.5 : Math.max(1, Math.min(12, item.session.movementSpeed)),
            zoom: Math.max(15, Math.min(19, item.session.zoom)),
          },
        })).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, SAVE_SLOT_LIMIT);
      }
    } else {
      const legacyRaw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (legacyRaw) {
        const legacy: unknown = JSON.parse(legacyRaw);
        if (isValidGameSession(legacy)) {
          const now = Date.now();
          savedGameSlots = [{
            id: "legacy-" + now,
            name: "Exploration 1",
            session: legacy,
            progress: emptyProgress(),
            createdAt: legacy.savedAt,
            updatedAt: legacy.savedAt,
          }];
          persistSavedGameSlots();
        }
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
  } catch (error) {
    console.warn("Could not load local save slots:", error);
    savedGameSlots = [];
  }
}
function persistSavedGameSlots(): void {
  try {
    localStorage.setItem(SAVE_SLOTS_STORAGE_KEY, JSON.stringify(savedGameSlots));
  } catch (error) {
    console.warn("Could not persist local save slots:", error);
    showToast(language === "en" ? "Local save storage is unavailable." : "Stockage local indisponible.");
  }
}
function currentSessionSnapshot(): SavedGameSession {
  const position = playerMarker?.getLngLat() ?? map.getCenter();
  const zone = zoneFor(position.lng, position.lat);
  return {
    lng: position.lng,
    lat: position.lat,
    zoneX: zone.x,
    zoneY: zone.y,
    movementSpeed,
    zoom: Math.max(15, Math.min(19, map.getZoom())),
    savedAt: Date.now(),
    destination: destinationCoordinates ? [...destinationCoordinates] as [number, number] : null,
    travelledRoute: travelledRouteCoordinates.slice(-1800),
  };
}
function saveGameSession(force = false): void {
  if (!gameMode || !playerMarker) return;
  const now = Date.now();
  if (!force && now - lastSessionSaveAt < 1800) return;
  const session = currentSessionSnapshot();
  let slot = savedGameSlots.find((item) => item.id === activeSaveSlotId);
  if (!slot) {
    slot = {
      id: `save-${now}-${Math.random().toString(36).slice(2, 7)}`,
      name: `${language === "fr" ? "Exploration" : "Exploration"} ${savedGameSlots.length + 1}`,
      session,
      progress: emptyProgress(),
      createdAt: now,
      updatedAt: now,
    };
    savedGameSlots.unshift(slot);
    activeSaveSlotId = slot.id;
  } else {
    slot.session = session;
    slot.updatedAt = now;
    savedGameSlots = [slot, ...savedGameSlots.filter((item) => item.id !== slot!.id)];
  }
  savedGameSlots = savedGameSlots.slice(0, SAVE_SLOT_LIMIT);
  persistSavedGameSlots();
  lastSessionSaveAt = now;
  renderSavedGameSlots();
}
function createNamedSaveSlot(): void {
  const input = document.querySelector<HTMLInputElement>("#save-slot-name");
  const name = input?.value.trim().slice(0, 32);
  if (savedGameSlots.length >= SAVE_SLOT_LIMIT) {
    showToast(translations[language].saveLimit);
    input?.focus();
    return;
  }
  if (!name) {
    showToast(language === "en" ? "Enter a name for this save." : "Donnez un nom à cette sauvegarde.");
    input?.focus();
    return;
  }
  const now = Date.now();
  const session = currentSessionSnapshot();
  const slot: SavedGameSlot = {
    id: `save-${now}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    session,
    progress: emptyProgress(),
    createdAt: now,
    updatedAt: now,
  };
  savedGameSlots.unshift(slot);
  savedGameSlots = savedGameSlots.slice(0, SAVE_SLOT_LIMIT);
  activeSaveSlotId = slot.id;
  persistSavedGameSlots();
  if (input) input.value = "";
  renderSavedGameSlots();
  showToast(language === "en" ? "New save created." : "Nouvelle sauvegarde créée.");
}
function resumeSavedSlot(slotId: string): void {
  const slot = savedGameSlots.find((item) => item.id === slotId);
  if (!slot) return;
  activeSaveSlotId = slot.id;
  startGameMode(slot.session);
}
function deleteSavedSlot(slotId: string): void {
  savedGameSlots = savedGameSlots.filter((item) => item.id !== slotId);
  if (activeSaveSlotId === slotId) {
    activeSaveSlotId = null;
  }
  persistSavedGameSlots();
  renderSavedGameSlots();
}
function renderSavedGameSlots(): void {
  const list = document.querySelector<HTMLElement>("#save-slots-list");
  const panel = document.querySelector<HTMLElement>("#resume-session");
  if (!list || !panel) return;
  list.replaceChildren();
  savedGameSlots.forEach((slot) => {
    const item = document.createElement("article");
    item.className = "save-slot-card";
    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = slot.name;
    const meta = document.createElement("span");
    const date = new Date(slot.updatedAt).toLocaleString(language === "fr" ? "fr-FR" : "en-GB");
    meta.textContent = `${language === "fr" ? "Zone" : "Zone"} ${slot.session.zoneX}, ${slot.session.zoneY} · ${date}`;
    const progress = document.createElement("small");
    progress.textContent = `${language === "fr" ? "Niveau" : "Level"} ${Math.floor(slot.progress.xp / 100) + 1} · ${slot.progress.xp} XP · ${slot.progress.zones.length} zones`;
    info.append(title, meta, progress);
    const actions = document.createElement("div");
    actions.className = "save-slot-actions";
    const resume = document.createElement("button");
    resume.type = "button";
    resume.textContent = language === "fr" ? "REPRENDRE" : "RESUME";
    resume.addEventListener("click", () => resumeSavedSlot(slot.id));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = language === "fr" ? "SUPPRIMER" : "DELETE";
    remove.setAttribute("aria-label", `${language === "fr" ? "Supprimer" : "Delete"} ${slot.name}`);
    remove.addEventListener("click", () => deleteSavedSlot(slot.id));
    actions.append(resume, remove);
    item.append(info, actions);
    list.append(item);
  });
  const empty = document.createElement("p");
  empty.className = "save-slots-empty";
  empty.textContent = language === "fr" ? "Aucune sauvegarde pour le moment." : "No saved games yet.";
  empty.hidden = savedGameSlots.length > 0;
  list.append(empty);
}
function clearActiveSaveSlot(): void {
  activeSaveSlotId = null;
}

function openHomeDialog(title: string, content: HTMLElement): void {
  const overlay = document.querySelector<HTMLElement>("#home-dialog");
  const heading = document.querySelector<HTMLElement>("#home-dialog-title");
  const body = document.querySelector<HTMLElement>("#home-dialog-content");
  if (!overlay || !heading || !body) return;
  heading.textContent = title;
  body.replaceChildren(content);
  overlay.hidden = false;
}
function closeHomeDialog(): void {
  const overlay = document.querySelector<HTMLElement>("#home-dialog");
  if (overlay) overlay.hidden = true;
}
function openHomeSaves(): void {
  renderSavedGameSlots();
  const panel = document.querySelector<HTMLElement>("#resume-session");
  const home = document.querySelector<HTMLElement>("#home-screen");
  if (home) home.hidden = true;
  if (panel) panel.hidden = false;
}
function openHomeProfile(): void {
  const slot = savedGameSlots.find((item) => item.id === activeSaveSlotId) ?? savedGameSlots[0];
  const progress = slot?.progress ?? emptyProgress();
  const wrap = document.createElement("div");
  wrap.className = "home-profile-content";
  const level = document.createElement("div");
  level.className = "home-profile-level";
  level.innerHTML = '<span>LEVEL</span><strong>' + (Math.floor(progress.xp / 100) + 1) + '</strong><small>' + progress.xp + ' XP TOTAL</small>';
  const stats = document.createElement("div");
  stats.className = "home-profile-stats";
  const entries = [
    [language === "fr" ? "DISTANCE" : "DISTANCE", (progress.distanceMeters / 1000).toFixed(1) + " km"],
    [language === "fr" ? "ZONES VISITÉES" : "ZONES VISITED", String(progress.zones.length)],
    [language === "fr" ? "VILLES DÉCOUVERTES" : "CITIES DISCOVERED", String(progress.cities.length)],
    [language === "fr" ? "SUCCÈS" : "ACHIEVEMENTS", String(progress.achievements.length) + " / 7"]
  ];
  entries.forEach(([label, value]) => {
    const item = document.createElement("div");
    const small = document.createElement("small"); small.textContent = label;
    const strong = document.createElement("strong"); strong.textContent = value;
    item.append(small, strong); stats.append(item);
  });
  const note = document.createElement("p");
  note.className = "home-dialog-note";
  note.textContent = slot
    ? (language === "fr" ? "Profil basé sur la sauvegarde : " : "Profile based on save: ") + slot.name
    : (language === "fr" ? "Créez une exploration pour commencer votre progression." : "Create an exploration to start tracking your progress.");
  wrap.append(level, stats, note);
  openHomeDialog(language === "fr" ? "PROFIL & PROGRESSION" : "PROFILE & PROGRESSION", wrap);
}
function openHomeSettings(): void {
  const wrap = document.createElement("div");
  wrap.className = "home-settings-content";
  const languageRow = document.createElement("div");
  languageRow.className = "home-setting-row";
  const languageText = document.createElement("div");
  languageText.innerHTML = '<strong>LANGUAGE / LANGUE</strong><small>English · Français</small>';
  const languageButton = document.createElement("button");
  languageButton.type = "button"; languageButton.textContent = language.toUpperCase();
  languageButton.addEventListener("click", () => { setLanguage(language === "en" ? "fr" : "en"); languageButton.textContent = language.toUpperCase(); });
  languageRow.append(languageText, languageButton);
  const speedRow = document.createElement("div");
  speedRow.className = "home-setting-row";
  const speedText = document.createElement("div");
  speedText.innerHTML = '<strong>' + (language === "fr" ? "VITESSE DE DÉPLACEMENT" : "MOVEMENT SPEED") + '</strong><small>' + (language === "fr" ? "Ajustable à tout moment" : "Can be adjusted anytime") + '</small>';
  const speed = document.createElement("input");
  speed.type = "range"; speed.min = "1"; speed.max = "12"; speed.step = "0.5"; speed.value = String(movementSpeed);
  speed.addEventListener("input", () => {
    movementSpeed = Number(speed.value);
    const control = document.querySelector<HTMLInputElement>("#game-speed");
    const value = document.querySelector<HTMLElement>("#game-speed-value");
    if (control) control.value = speed.value;
    if (value) value.textContent = Number(speed.value).toFixed(1);
  });
  speedRow.append(speedText, speed);
  const poiRow = document.createElement("div");
  poiRow.className = "home-setting-row";
  const poiText = document.createElement("div");
  poiText.innerHTML = '<strong>' + (language === "fr" ? "POINTS D’INTÉRÊT" : "POINTS OF INTEREST") + '</strong><small>' + (language === "fr" ? "Afficher les lieux sur la carte" : "Show mapped places") + '</small>';
  const poiButton = document.createElement("button");
  poiButton.type = "button";
  const poiControl = document.querySelector<HTMLButtonElement>("#places-view");
  const syncPoi = () => { poiButton.textContent = poiControl?.getAttribute("aria-pressed") === "true" ? "ON" : "OFF"; };
  syncPoi();
  poiButton.addEventListener("click", () => { poiControl?.click(); syncPoi(); });
  poiRow.append(poiText, poiButton);
  wrap.append(languageRow, speedRow, poiRow);
  openHomeDialog(language === "fr" ? "PARAMÈTRES" : "SETTINGS", wrap);
}

function showSessionResumePrompt(): void {
  loadSavedGameSlots();
  renderSavedGameSlots();
  renderPlayerProgress();
  const panel = document.querySelector<HTMLElement>("#resume-session");
  if (panel) panel.hidden = true;
}
const EXPLORED_ZONE_LIMIT = 200;
interface ExploredZone { x: number; y: number; visitedAt: number }
const exploredZones = new Map<string, ExploredZone>();
function loadExploredZones(): void {
  try {
    const raw = localStorage.getItem(EXPLORED_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (!item || !Number.isInteger(item.x) || !Number.isInteger(item.y)
          || !Number.isFinite(item.visitedAt)) continue;
        const zone: ExploredZone = { x: item.x, y: item.y, visitedAt: item.visitedAt };
        exploredZones.set(`${zone.x}:${zone.y}`, zone);
      }
    } else {
      // Migrate v1 Web-Mercator tile indices to the latitude-aware geographic grid.
      const legacyRaw = localStorage.getItem(LEGACY_EXPLORED_STORAGE_KEY);
      const legacy: unknown = legacyRaw ? JSON.parse(legacyRaw) : null;
      if (Array.isArray(legacy)) {
        for (const item of legacy) {
          if (!item || !Number.isInteger(item.x) || !Number.isInteger(item.y)
            || !Number.isFinite(item.visitedAt)) continue;
          const [lng, lat] = legacyMercatorZoneCenter(item.x, item.y);
          const migrated = zoneFor(lng, lat);
          exploredZones.set(migrated.key, { x: migrated.x, y: migrated.y, visitedAt: item.visitedAt });
        }
        saveExploredZones();
      }
    }
    while (exploredZones.size > EXPLORED_ZONE_LIMIT) {
      const oldest = exploredZones.keys().next().value;
      if (oldest === undefined) break;
      exploredZones.delete(oldest);
    }
  } catch (error) {
    console.warn("Could not read local exploration history:", error);
  }
}
function saveExploredZones(): void {
  try {
    localStorage.setItem(EXPLORED_STORAGE_KEY, JSON.stringify([...exploredZones.values()]));
  } catch (error) {
    console.warn("Could not save local exploration history:", error);
    showToast(language === "en"
      ? "Local save is unavailable. Check browser storage settings."
      : "Sauvegarde locale indisponible. Vérifiez le stockage du navigateur.");
  }
}
function updateExploredZonesLayer(): void {
  const source = map.getSource("juju-visited-zones") as maplibregl.GeoJSONSource | undefined;
  if (!source) return;
  const features = [...exploredZones.values()].map((zone) => ({
    ...zonePolygon(zone.x, zone.y),
    properties: { visitedAt: zone.visitedAt },
  }));
  source.setData({ type: "FeatureCollection", features });
  const count = document.querySelector<HTMLElement>("#game-explored-count");
  if (count) count.textContent = String(exploredZones.size);
  const miniMarker = document.querySelector<HTMLElement>(".mini-map-player-marker");
  if (miniMarker) miniMarker.dataset.heading = playerHeading;
  updateMiniMapOverlays();
}
function recordExploredZone(zoneX: number, zoneY: number): void {
  const key = `${zoneX}:${zoneY}`;
  if (exploredZones.has(key)) exploredZones.delete(key);
  exploredZones.set(key, { x: zoneX, y: zoneY, visitedAt: Date.now() });
  while (exploredZones.size > EXPLORED_ZONE_LIMIT) {
    const oldest = exploredZones.keys().next().value;
    if (oldest === undefined) break;
    exploredZones.delete(oldest);
  }
  saveExploredZones();
  updateExploredZonesLayer();
}
function clearExploredZones(): void {
  exploredZones.clear();
  try {
    localStorage.removeItem(EXPLORED_STORAGE_KEY);
  } catch (error) {
    console.warn("Could not clear local exploration history:", error);
  }
  updateExploredZonesLayer();
  showToast(translations[language].exploredCleared);
}
loadExploredZones();

const map: MapLibreMap = new maplibregl.Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/liberty",
  center: [0, 20],
  zoom: 2.1,
  minZoom: 1.5,
  maxZoom: 19,
  pitch: 0,
  bearing: 0,
  maxPitch: 75,
  attributionControl: false,
  renderWorldCopies: true,
  // Select the initial vector-tile cache budget from device and network hints.
  maxTileCacheSize: streamingProfile.tileCacheSize,
  maxTileCacheZoomLevels: streamingProfile.tier === "economy" ? 3 : streamingProfile.tier === "balanced" ? 4 : 5,
  dragRotate: false,
  pitchWithRotate: false,
  touchPitch: false,
});


let miniMap: MapLibreMap | null = null;
let miniMapReady = false;
let lastMiniMapSyncAt = 0;
let miniMapOverlaySignature = "";
let spawnSelectionMode = false;
let spawnSelectionMarker: maplibregl.Marker | null = null;
let selectedSpawnCoordinates: [number, number] | null = null;

function updateSpawnSelection(lng: number, lat: number): void {
  selectedSpawnCoordinates = [lng, lat];
  if (!spawnSelectionMarker) {
    const marker = document.createElement("div");
    marker.className = "spawn-preview-marker";
    marker.setAttribute("aria-hidden", "true");
    spawnSelectionMarker = new maplibregl.Marker({ element: marker, anchor: "center" }).setLngLat([lng, lat]).addTo(map);
  } else {
    spawnSelectionMarker.setLngLat([lng, lat]);
  }
  const label = document.querySelector<HTMLElement>("#spawn-picker-coordinates");
  const confirm = document.querySelector<HTMLButtonElement>("#spawn-picker-confirm");
  if (label) label.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  if (confirm) confirm.disabled = false;
}

function openSpawnPicker(): void {
  if (!map.isStyleLoaded()) {
    showToast(language === "en" ? "The world map is still loading. Please wait a moment." : "La carte du monde est en cours de chargement. Patientez un instant.");
    return;
  }
  const home = document.querySelector<HTMLElement>("#home-screen");
  const saves = document.querySelector<HTMLElement>("#resume-session");
  if (home) home.hidden = true;
  if (saves) saves.hidden = true;
  spawnSelectionMode = true;
  document.querySelector<HTMLElement>("#app")?.classList.add("spawn-selecting");
  selectedSpawnCoordinates = null;
  spawnSelectionMarker?.remove();
  spawnSelectionMarker = null;
  const label = document.querySelector<HTMLElement>("#spawn-picker-coordinates");
  const confirm = document.querySelector<HTMLButtonElement>("#spawn-picker-confirm");
  if (label) label.textContent = language === "fr" ? "Cliquez sur la carte pour choisir" : "Click the map to choose";
  if (confirm) {
    confirm.disabled = true;
    confirm.textContent = language === "fr" ? "COMMENCER ICI" : "START HERE";
  }
  const title = document.querySelector<HTMLElement>("#spawn-picker-title");
  const help = document.querySelector<HTMLElement>("#spawn-picker-help");
  const cancel = document.querySelector<HTMLButtonElement>("#spawn-picker-cancel");
  if (title) title.textContent = language === "fr" ? "Choisissez votre point de départ" : "Choose your starting point";
  if (help) help.textContent = language === "fr" ? "Recherchez une ville dans le panneau ou cliquez directement sur la carte pour placer votre point de départ." : "Search for a city in the map panel, or click anywhere on the map to place your starting marker.";
  if (cancel) cancel.textContent = language === "fr" ? "ANNULER" : "CANCEL";
  document.querySelector<HTMLElement>("#spawn-picker")!.hidden = false;
  map.dragPan.enable();
  map.easeTo({ pitch: 0, bearing: 0, duration: 350 });
}

function closeSpawnPicker(): void {
  spawnSelectionMode = false;
  document.querySelector<HTMLElement>("#app")?.classList.remove("spawn-selecting");
  selectedSpawnCoordinates = null;
  spawnSelectionMarker?.remove();
  spawnSelectionMarker = null;
  document.querySelector<HTMLElement>("#spawn-picker")!.hidden = true;
}


function updateMiniMapOverlays(): void {
  if (!miniMap || !miniMapReady) return;
  const active = zoneFor(map.getCenter().lng, map.getCenter().lat);
  const signature = `${active.key}|${[...exploredZones.keys()].join(",")}`;
  if (signature === miniMapOverlaySignature) return;
  miniMapOverlaySignature = signature;
  const activeSource = miniMap.getSource("juju-mini-active-zone") as maplibregl.GeoJSONSource | undefined;
  activeSource?.setData(zonePolygon(active.x, active.y));
  const visitedSource = miniMap.getSource("juju-mini-visited-zones") as maplibregl.GeoJSONSource | undefined;
  visitedSource?.setData({
    type: "FeatureCollection",
    features: [...exploredZones.values()].map((zone) => ({
      ...zonePolygon(zone.x, zone.y),
      properties: { visitedAt: zone.visitedAt },
    })),
  });
}

function syncMiniMap(force = false): void {
  if (!gameMode || !miniMap) return;
  const now = performance.now();
  if (!force && now - lastMiniMapSyncAt < 140) return;
  lastMiniMapSyncAt = now;
  const center = map.getCenter();
  miniMap.jumpTo({
    center,
    zoom: Math.max(10, Math.min(16, map.getZoom() - 2.5)),
    bearing: 0,
    pitch: 0,
  });
  const coordinates = document.querySelector<HTMLElement>("#mini-map-coordinates");
  if (coordinates) coordinates.textContent = `${center.lat.toFixed(3)}, ${center.lng.toFixed(3)}`;
  updateMiniMapOverlays();
}

function createMiniMap(): void {
  if (miniMap) {
    requestAnimationFrame(() => miniMap?.resize());
    syncMiniMap(true);
    return;
  }
  miniMap = new maplibregl.Map({
    container: "game-mini-map",
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: map.getCenter(),
    zoom: Math.max(10, Math.min(16, map.getZoom() - 2.5)),
    minZoom: 9,
    maxZoom: 17,
    attributionControl: false,
    interactive: false,
    renderWorldCopies: false,
    maxTileCacheSize: 48,
    maxTileCacheZoomLevels: 3,
    pitch: 0,
    bearing: 0,
  });
  miniMap.on("load", () => {
    if (!miniMap) return;
    miniMap.addSource("juju-mini-active-zone", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    miniMap.addLayer({
      id: "juju-mini-active-fill",
      type: "fill",
      source: "juju-mini-active-zone",
      paint: { "fill-color": "#79d9d0", "fill-opacity": 0.14 },
    });
    miniMap.addLayer({
      id: "juju-mini-active-outline",
      type: "line",
      source: "juju-mini-active-zone",
      paint: { "line-color": "#9af1e6", "line-width": 2.2, "line-opacity": 0.98 },
    });
    miniMap.addSource("juju-mini-travelled-route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    miniMap.addLayer({ id: "juju-mini-travelled-route-line", type: "line", source: "juju-mini-travelled-route", paint: { "line-color": "#70d8cb", "line-width": 2.5, "line-opacity": 0.95 } });
    miniMap.addSource("juju-mini-destination", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    miniMap.addLayer({ id: "juju-mini-destination-point", type: "circle", source: "juju-mini-destination", paint: { "circle-radius": 6, "circle-color": "#efbd58", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
    miniMap.addSource("juju-mini-navigation-route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    miniMap.addLayer({ id: "juju-mini-navigation-route-line", type: "line", source: "juju-mini-navigation-route", paint: { "line-color": "#f0bd58", "line-width": 2.8, "line-dasharray": [1.5, 1] } });
    miniMap.addSource("juju-mini-nearby-pois", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    miniMap.addLayer({ id: "juju-mini-nearby-pois-points", type: "circle", source: "juju-mini-nearby-pois", paint: { "circle-radius": 3.5, "circle-color": "#f4d27a", "circle-stroke-color": "#152a34", "circle-stroke-width": 1 } });
    miniMap.addSource("juju-mini-visited-zones", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    miniMap.addLayer({
      id: "juju-mini-visited-outline",
      type: "line",
      source: "juju-mini-visited-zones",
      paint: {
        "line-color": "#79d9a8",
        "line-width": 1.3,
        "line-opacity": 0.85,
        "line-dasharray": [2, 2],
      },
    });
    miniMapReady = true;
    miniMapOverlaySignature = "";
    updateTravelledRoute();
    syncMiniMap(true);
  });
  miniMap.on("idle", () => {
    if (miniMapReady) document.querySelector<HTMLElement>("#game-mini-map")?.setAttribute("data-tiles-ready", "true");
  });
  miniMap.on("error", (event) => {
    if (event.error) console.warn("Mini-map resource error:", event.error.message);
  });
}



map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
map.addControl(
  new maplibregl.AttributionControl({
    compact: true,
    customAttribution: "© OpenStreetMap contributors · OpenFreeMap",
  }),
  "bottom-left",
);

function showToast(message: string): void {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 4200);
}

function setLanguage(next: Language): void {
  language = next;
  document.documentElement.lang = next;
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n ?? "";
    if (key === "title") element.innerHTML = translations[next].title;
    else if (key === "map-view") element.textContent = translations[next].mapView;
    else if (key in translations[next]) {
      element.textContent = translations[next][key as keyof typeof translations.en];
    }
  });
  mapStatus.textContent = map.isStyleLoaded() ? translations[next].ready : translations[next].loading;
  searchInput.placeholder = translations[next].search;
  const saveNameInput = document.querySelector<HTMLInputElement>("#save-slot-name");
  if (saveNameInput) {
    saveNameInput.placeholder = translations[next].saveNamePlaceholder;
    saveNameInput.setAttribute("aria-label", translations[next].saveNameAria);
  }
  document.querySelectorAll<HTMLElement>("[data-i18n-aria]").forEach((element) => {
    const key = element.dataset.i18nAria ?? "";
    if (key in translations[next]) element.setAttribute("aria-label", translations[next][key as keyof typeof translations.en]);
  });
  $("#game-player-status").textContent = translations[next].playerReady;
  $("#navigation-destination-label").textContent = next === "fr" ? "DESTINATION" : "DESTINATION";
  $("#game-clear-destination").textContent = next === "fr" ? "EFFACER" : "CLEAR";
  $("#game-set-destination").textContent = next === "fr"
    ? (destinationCoordinates ? "MODIFIER LA DESTINATION" : "DÉFINIR UNE DESTINATION")
    : (destinationCoordinates ? "CHANGE DESTINATION" : "SET DESTINATION");
  $("#navigation-nearby-label").textContent = next === "fr" ? "POINT D’INTÉRÊT À PROXIMITÉ" : "NEARBY POINT OF INTEREST";
  if (!destinationCoordinates) $("#navigation-destination").textContent = next === "fr" ? "Aucune destination" : "No destination set";
  if (!lastNearbyPoiUpdateAt) $("#navigation-nearby-place").textContent = next === "fr" ? "Recherche des lieux proches…" : "Looking for nearby places…";
  playerMarker?.getElement().setAttribute("aria-label", translations[next].playerAriaLabel);
  renderPlayerProgress();
  renderDailyMissions();
  $("#language-toggle").textContent = next === "en" ? "FR" : "EN";
  $("#language-toggle").setAttribute("aria-label", next === "en" ? "Passer en français" : "Switch to English");
  const homeText = next === "fr" ? {
    kicker: "LE MONDE VOUS ATTEND", title: "VOTRE MONDE.<br><em>VOTRE AVENTURE.</em>",
    description: "Explorez des lieux réels, découvrez de nouvelles villes et créez votre propre parcours sur une carte du monde vivante.",
    play: '<span>▶</span> JOUER <small>COMMENCER À EXPLORER</small>',
    saves: '<span>▤</span> MES SAUVEGARDES', settings: "⚙ PARAMÈTRES",
    profile: "◉ PROFIL & PROGRESSION", world: "EXPLORATION DU MONDE",
    worldCaption: "UNE PLANÈTE<br><strong>UNE INFINITÉ DE LIEUX</strong>",
    global: "CARTE MONDIALE", footer: "UNE EXPÉRIENCE EN MONDE OUVERT",
    bottom: "CONÇU POUR L'EXPLORATION"
  } : {
    kicker: "THE WORLD IS WAITING", title: "YOUR WORLD.<br><em>YOUR ADVENTURE.</em>",
    description: "Explore real places, discover new cities and create your own journey across a living world map.",
    play: '<span>▶</span> PLAY <small>START EXPLORING</small>',
    saves: '<span>▤</span> MY SAVES', settings: "⚙ SETTINGS",
    profile: "◉ PROFILE & PROGRESSION", world: "WORLD EXPLORER",
    worldCaption: "ONE PLANET<br><strong>ENDLESS PLACES</strong>",
    global: "GLOBAL MAP", footer: "OPEN WORLD EXPERIENCE",
    bottom: "BUILT FOR EXPLORATION"
  };
  const setHomeText = (selector: string, value: string, html = false) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) html ? element.innerHTML = value : element.textContent = value;
  };
  setHomeText(".home-copy .home-kicker", '<span></span>' + homeText.kicker, true);
  setHomeText(".home-copy h1", homeText.title, true);
  setHomeText(".home-description", homeText.description);
  setHomeText("#home-play", homeText.play, true);
  setHomeText("#home-saves", homeText.saves, true);
  setHomeText("#home-settings", homeText.settings);
  setHomeText("#home-profile", homeText.profile);
  setHomeText(".home-world-label-title", homeText.world);
  setHomeText(".home-world-caption", homeText.worldCaption, true);
  setHomeText(".home-world-footer span:first-child", homeText.global);
  setHomeText(".home-world-footer span:last-child", homeText.footer);
  setHomeText(".home-bottom span:last-child", homeText.bottom);
  setHomeText("#save-slots-back", next === "fr" ? "← MENU PRINCIPAL" : "← MAIN MENU");
  setHomeText("#home-dialog-close", "×");
  updatePlayerNavigationHud();
}


function selectPlace(place: PlaceResult): void {
  if (spawnSelectionMode) {
    updateSpawnSelection(place.longitude, place.latitude);
    map.flyTo({ center: [place.longitude, place.latitude], zoom: 15.5, pitch: 0, bearing: 0, duration: 1200, essential: true });
    return;
  }
  selectedPlaceMarker?.remove();
  const markerElement = document.createElement("div");
  markerElement.className = "place-marker";
  markerElement.setAttribute("aria-hidden", "true");
  selectedPlaceMarker = new maplibregl.Marker({ element: markerElement, anchor: "bottom" })
    .setLngLat([place.longitude, place.latitude])
    .addTo(map);

  $("#place-card-name").textContent = place.name;
  $("#place-card-detail").textContent = [place.admin1, place.country].filter(Boolean).join(", ");
  $("#place-card-coordinates").textContent = place.latitude.toFixed(4) + ", " + place.longitude.toFixed(4);
  $("#place-card").hidden = false;
  map.flyTo({
    center: [place.longitude, place.latitude],
    zoom: 16,
    pitch: 0,
    bearing: 0,
    duration: 1900,
    essential: true,
  });
  searchResults.replaceChildren();
  searchInput.value = place.name;
  if (gameMode) discoverProgressCity(place.name, place.country);
}

function add3DBuildings(): void {
  if (!map.getSource("openmaptiles") || map.getLayer("juju-3d-buildings")) return;
  const firstSymbol = map.getStyle().layers?.find((layer) => layer.type === "symbol")?.id;
  map.addLayer(
    {
      id: "juju-3d-buildings",
      type: "fill-extrusion",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 13,
      filter: ["all", ["==", ["geometry-type"], "Polygon"]],
      paint: {
        "fill-extrusion-color": [
          "interpolate",
          ["linear"],
          ["coalesce", ["get", "render_height"], ["get", "height"], 10],
          0, "#d7d4cc",
          30, "#a9b5bd",
          80, "#748b9c",
        ],
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], ["get", "height"], 10],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], ["get", "min_height"], 0],
        "fill-extrusion-opacity": 0.88,
      },
      layout: { visibility: buildingsVisible ? "visible" : "none" },
    },
    firstSymbol,
  );
}


function addPointsOfInterest(): void {
  if (!map.getSource("openmaptiles")) return;

  if (!map.getLayer("juju-park-areas")) {
    map.addLayer({
      id: "juju-park-areas",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "park",
      minzoom: 11,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-color": "#70a985",
        "fill-opacity": 0.16,
        "fill-outline-color": "#82c99a",
      },
      layout: { visibility: placesVisible ? "visible" : "none" },
    });
  }

  if (!map.getLayer("juju-poi-points")) {
    map.addLayer({
      id: "juju-poi-points",
      type: "circle",
      source: "openmaptiles",
      "source-layer": "poi",
      minzoom: 13,
      filter: [
        "all",
        ["in", ["get", "class"], ["literal", [
          "park", "garden", "nature_reserve", "school", "college", "university", "kindergarten", "library",
          "bus", "railway", "subway", "tram", "ferry", "airport",
          "shop", "grocery", "supermarket", "clothes", "bakery", "cafe", "restaurant", "fast_food", "bank", "atm", "post",
          "attraction", "art_gallery", "museum", "castle", "monument", "memorial", "town_hall", "courthouse", "zoo", "viewpoint",
          "stadium", "sports_centre", "pitch", "playground", "swimming_pool",
          "hospital", "clinic", "doctors", "pharmacy", "police", "fire_station", "government", "place_of_worship", "theatre", "cinema"
        ]]],
        ["!", ["in", ["get", "subclass"], ["literal", ["alcohol", "beverages", "wine", "tobacco", "weapons", "bookmaker", "lottery", "gambling"]]]],
      ],
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 3.2, 17, 6],
                "circle-color": [
          "match", ["get", "class"],
          "park", "#79c58d", "garden", "#79c58d", "nature_reserve", "#79c58d",
          "school", "#72b7ed", "college", "#72b7ed", "university", "#72b7ed", "kindergarten", "#72b7ed", "library", "#72b7ed",
          "bus", "#e9bd69", "railway", "#e9bd69", "subway", "#e9bd69", "tram", "#e9bd69", "ferry", "#e9bd69", "airport", "#e9bd69",
          "shop", "#d9a1e8", "grocery", "#d9a1e8", "supermarket", "#d9a1e8", "clothes", "#d9a1e8", "bakery", "#d9a1e8", "cafe", "#d9a1e8", "restaurant", "#d9a1e8", "fast_food", "#d9a1e8", "bank", "#d9a1e8", "atm", "#d9a1e8", "post", "#d9a1e8",
          "hospital", "#ed8585", "clinic", "#ed8585", "doctors", "#ed8585", "pharmacy", "#ed8585",
          "police", "#e9a56d", "fire_station", "#e9a56d", "government", "#e9a56d", "town_hall", "#e9a56d", "courthouse", "#e9a56d",
          "stadium", "#82c9b2", "sports_centre", "#82c9b2", "pitch", "#82c9b2", "playground", "#82c9b2", "swimming_pool", "#82c9b2",
          "#e4b77f"
        ],
        "circle-stroke-color": "#14212a",
        "circle-stroke-width": 1.5,
        "circle-opacity": 0.96,
      },
      layout: { visibility: placesVisible ? "visible" : "none" },
    });
  }

  if (!map.getLayer("juju-poi-labels")) {
    map.addLayer({
      id: "juju-poi-labels",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "poi",
      minzoom: 15,
      filter: [
        "all",
        ["any", ["has", "name"], ["has", "name_en"]],
        ["in", ["get", "class"], ["literal", [
          "park", "garden", "nature_reserve", "school", "college", "university", "kindergarten", "library",
          "bus", "railway", "subway", "tram", "ferry", "airport",
          "shop", "grocery", "supermarket", "clothes", "bakery", "cafe", "restaurant", "fast_food", "bank", "atm", "post",
          "attraction", "art_gallery", "museum", "castle", "monument", "memorial", "town_hall", "courthouse", "zoo", "viewpoint",
          "stadium", "sports_centre", "pitch", "playground", "swimming_pool",
          "hospital", "clinic", "doctors", "pharmacy", "police", "fire_station", "government", "place_of_worship", "theatre", "cinema"
        ]]],
        ["!", ["in", ["get", "subclass"], ["literal", ["alcohol", "beverages", "wine", "tobacco", "weapons", "bookmaker", "lottery", "gambling"]]]],
      ],
      layout: {
        "text-field": ["coalesce", ["get", "name"], ["get", "name_en"]],
        "text-font": ["Open Sans Regular"],
        "text-size": 10,
        "text-offset": [0, 1.1],
        "text-anchor": "top",
        "text-max-width": 9,
        "text-allow-overlap": false,
        visibility: placesVisible ? "visible" : "none",
      },
      paint: {
        "text-color": "#f5f0e8",
        "text-halo-color": "#17232c",
        "text-halo-width": 1.3,
      },
    });
  }
}

function poiCategory(className: string): string {
  if (["park", "garden", "nature_reserve"].includes(className)) return translations[language].poiPark;
  if (["school", "college", "university", "kindergarten", "library"].includes(className)) return translations[language].poiEducation;
  if (["bus", "railway", "subway", "tram", "ferry", "airport"].includes(className)) return translations[language].poiTransport;
  if (["shop", "grocery", "supermarket", "clothes", "bakery", "cafe", "restaurant", "fast_food", "bank", "atm", "post"].includes(className)) return translations[language].poiCommerce;
  if (["hospital", "clinic", "doctors", "pharmacy"].includes(className)) return translations[language].poiHealth;
  if (["police", "fire_station", "government", "town_hall", "courthouse"].includes(className)) return translations[language].poiCivic;
  if (["stadium", "sports_centre", "pitch", "playground", "swimming_pool"].includes(className)) return translations[language].poiSports;
  return translations[language].poiCulture;
}

function togglePointsOfInterest(): void {
  placesVisible = !placesVisible;
  ["juju-park-areas", "juju-poi-points", "juju-poi-labels"].forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", placesVisible ? "visible" : "none");
    }
  });
  const button = $("#places-view");
  button.classList.toggle("active", placesVisible);
  button.setAttribute("aria-pressed", String(placesVisible));
  button.querySelector("b")!.textContent = placesVisible ? translations[language].placesOn : translations[language].placesOff;
}

function disableTerrain(): void {
  if (!terrainEnabled) return;
  map.setTerrain(null);
  if (map.getLayer("juju-hillshade")) map.removeLayer("juju-hillshade");
  if (map.getSource("juju-hillshade-source")) map.removeSource("juju-hillshade-source");
  if (map.getSource("juju-terrain")) map.removeSource("juju-terrain");
  terrainEnabled = false;
  $("#terrain-view").classList.remove("active");
}

function trimZoneObstacleCache(): void {
  while (zoneObstacleCache.size > streamingProfile.zoneCacheLimit) {
    const oldestUnprotected = [...zoneObstacleCache.keys()].find((key) => !protectedZoneKeys.has(key));
    const oldestKey = oldestUnprotected ?? zoneObstacleCache.keys().next().value;
    if (oldestKey === undefined) break;
    zoneObstacleCache.delete(oldestKey);
  }
}

function warmPredictiveZones(lng: number, lat: number, directionX: number, directionY: number): void {
  const magnitude = Math.hypot(directionX, directionY);
  if (magnitude < 0.01) return;
  const origin = zoneFor(lng, lat);
  const stepX = Math.sign(directionX);
  const stepY = Math.sign(directionY);
  const depth = streamingProfile.prefetchDepth;
  const signature = `${origin.key}:${stepX}:${stepY}:${depth}`;
  if (signature === lastPredictionSignature) return;
  lastPredictionSignature = signature;
  for (let distance = 1; distance <= depth; distance += 1) {
    const center = zoneAtOffset(origin.x, origin.y, stepX * distance, stepY * distance);
    for (let side = -1; side <= 1; side += 1) {
      const neighbour = zoneAtOffset(
        center.x,
        center.y,
        stepY !== 0 ? side : 0,
        stepX !== 0 ? side : 0,
      );
      createZoneObstacles(neighbour.x, neighbour.y);
    }
  }
  trimZoneObstacleCache();
}

async function getVectorTileTemplates(): Promise<string[]> {
  if (vectorTileTemplatesPromise) return vectorTileTemplatesPromise;
  vectorTileTemplatesPromise = (async () => {
    try {
      const source = map.getStyle().sources.openmaptiles as { tiles?: string[]; url?: string } | undefined;
      if (!source) return [];
      if (source.tiles?.length) return source.tiles;
      if (!source.url) return [];
      const response = await fetch(source.url, { cache: "force-cache", mode: "cors" });
      if (!response.ok) return [];
      const tileJson = await response.json() as { tiles?: string[] };
      return tileJson.tiles ?? [];
    } catch {
      return [];
    }
  })();
  return vectorTileTemplatesPromise;
}

function tileCoordinate(lng: number, lat: number, zoom: number): { x: number; y: number } {
  const scale = 2 ** zoom;
  const clampedLat = Math.max(-85.051129, Math.min(85.051129, lat));
  const radians = clampedLat * Math.PI / 180;
  return {
    x: Math.floor(((lng + 180) / 360) * scale),
    y: Math.max(0, Math.min(scale - 1, Math.floor((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2 * scale))),
  };
}

async function prefetchVectorTilesAhead(lng: number, lat: number, directionX: number, directionY: number): Promise<void> {
  if (!gameMode || !navigator.onLine) return;
  const magnitude = Math.hypot(directionX, directionY);
  if (magnitude < 0.01) return;
  const zoom = Math.max(12, Math.min(17, Math.floor(map.getZoom())));
  const current = tileCoordinate(lng, lat, zoom);
  const stepX = Math.sign(directionX);
  const stepY = Math.sign(directionY);
  const signature = `${zoom}:${current.x}:${current.y}:${stepX}:${stepY}:${streamingProfile.tier}`;
  if (signature === lastVectorPrefetchSignature) return;
  lastVectorPrefetchSignature = signature;
  const templates = await getVectorTileTemplates();
  if (!templates.length || !gameMode || !navigator.onLine) return;
  const template = templates[0];
  const count = streamingProfile.tier === "economy" ? 1 : streamingProfile.tier === "balanced" ? 2 : 3;
  for (let distance = 1; distance <= Math.min(streamingProfile.prefetchDepth, count); distance += 1) {
    const n = 2 ** zoom;
    const x = ((current.x + stepX * distance) % n + n) % n;
    const y = Math.max(0, Math.min(n - 1, current.y + stepY * distance));
    const key = `${zoom}/${x}/${y}`;
    if (prefetchedVectorTiles.has(key) || pendingVectorTiles.has(key)) continue;
    const url = template.replaceAll("{z}", String(zoom)).replaceAll("{x}", String(x))
      .replaceAll("{y}", String(y)).replaceAll("{ratio}", "");
    if (url.includes("{")) continue;
    pendingVectorTiles.add(key);
    void fetch(url, { mode: "cors", credentials: "omit", cache: "default" })
      .then(async (response) => {
        if (response.ok) {
          await response.arrayBuffer();
          prefetchedVectorTiles.add(key);
          while (prefetchedVectorTiles.size > streamingProfile.zoneCacheLimit) {
            const oldest = prefetchedVectorTiles.values().next().value;
            if (oldest === undefined) break;
            prefetchedVectorTiles.delete(oldest);
          }
        }
      })
      .catch(() => { /* Visible tiles are still requested by MapLibre. */ })
      .finally(() => pendingVectorTiles.delete(key));
  }
}

function updateStreamingHud(): void {
  const label = streamingProfile.tier === "economy"
    ? translations[language].streamingEconomy
    : streamingProfile.tier === "performance"
      ? translations[language].streamingPerformance
      : translations[language].streamingBalanced;
  $("#game-streaming-status").textContent = navigator.onLine ? label : translations[language].streamingOffline;
  $("#game-streaming-detail").textContent = `${translations[language].cacheLabel} ${streamingProfile.zoneCacheLimit} · ${translations[language].prefetchAheadLabel} ${streamingProfile.prefetchDepth}`;
}

function applyStreamingProfile(): void {
  streamingProfile = currentStreamingProfile();
  trimZoneObstacleCache();
  lastPredictionSignature = "";
  lastVectorPrefetchSignature = "";
  const economy = streamingProfile.tier === "economy";
  const ranges: Array<[string, number]> = [
    ["juju-game-roads-casing", economy ? 13 : 12],
    ["juju-game-roads", economy ? 13 : 12],
    ["juju-game-greenery", economy ? 12 : 10],
    ["juju-game-buildings", economy ? 15 : 14],
    ["juju-poi-points", economy ? 14 : 13],
    ["juju-poi-labels", economy ? 17 : streamingProfile.tier === "balanced" ? 15 : 14],
    ["juju-park-areas", economy ? 13 : 11],
    ["juju-3d-buildings", economy ? 14 : 13],
  ];
  for (const [layerId, minZoom] of ranges) {
    if (map.getLayer(layerId)) map.setLayerZoomRange(layerId, minZoom, 24);
  }
  updateStreamingHud();
}

function ensureGameLayers(): void {
  if (!map.getSource("openmaptiles")) return;
  if (!map.getSource("juju-travelled-route")) map.addSource("juju-travelled-route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  if (!map.getLayer("juju-travelled-route-line")) map.addLayer({ id: "juju-travelled-route-line", type: "line", source: "juju-travelled-route", paint: { "line-color": "#70d8cb", "line-width": 4, "line-opacity": 0.92 } });
  if (!map.getSource("juju-navigation-route")) map.addSource("juju-navigation-route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  if (!map.getLayer("juju-navigation-route-line")) map.addLayer({ id: "juju-navigation-route-line", type: "line", source: "juju-navigation-route", paint: { "line-color": "#f0bd58", "line-width": 4, "line-dasharray": [1.5, 1], "line-opacity": 0.95 } });

  // Real-world land cover from OpenMapTiles, shown only in game mode.
  if (!map.getLayer("juju-game-greenery")) {
    map.addLayer({
      id: "juju-game-greenery",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      minzoom: 10,
      filter: ["in", ["get", "class"], ["literal", ["wood", "grass", "scrub", "farmland", "orchard"]]],
      paint: {
        "fill-color": ["match", ["get", "class"], "wood", "#315f43", "grass", "#628b54", "scrub", "#58734a", "farmland", "#8b9861", "orchard", "#66834c", "#58734a"],
        "fill-opacity": 0.38,
      },
      layout: { visibility: "none" },
    });
  }

  // Real mapped buildings are drawn as solid game obstacles.
  if (!map.getLayer("juju-game-buildings")) {
    map.addLayer({
      id: "juju-game-buildings",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 14,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-color": "#b7a995",
        "fill-opacity": 0.72,
        "fill-outline-color": "#554d43",
      },
      layout: { visibility: "none" },
    });
  }

  // OpenStreetMap road classes remain passable; separate casing and surface lines
  // make streets, paths and tracks readable at the fixed overhead camera.
  const playableRoadClasses = [
    "motorway", "trunk", "primary", "secondary", "tertiary",
    "minor", "residential", "unclassified", "service", "living_street",
    "pedestrian", "track", "path", "footway", "cycleway", "steps",
  ];
  if (!map.getLayer("juju-game-roads-casing")) {
    map.addLayer({
      id: "juju-game-roads-casing",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 12,
      filter: ["in", ["get", "class"], ["literal", playableRoadClasses]],
      paint: {
        "line-color": "#293a3a",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.8, 16, 5.5, 19, 10],
        "line-opacity": 0.88,
      },
      layout: { visibility: "none", "line-cap": "round", "line-join": "round" },
    });
  }
  if (!map.getLayer("juju-game-roads")) {
    map.addLayer({
      id: "juju-game-roads",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 12,
      filter: ["in", ["get", "class"], ["literal", playableRoadClasses]],
      paint: {
        "line-color": [
          "match", ["get", "class"],
          "motorway", "#d6a36e", "trunk", "#d6a36e",
          "primary", "#e0c18d", "secondary", "#d4c39e",
          "tertiary", "#c6bda9", "residential", "#b8b5a8",
          "service", "#9eaa9e", "track", "#a18c68",
          "path", "#b9a77d", "footway", "#c8b58a",
          "cycleway", "#8fb7a2", "#b8b5a8",
        ],
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.35, 16, 3.2, 19, 7],
        "line-opacity": 0.98,
      },
      layout: { visibility: "none", "line-cap": "round", "line-join": "round" },
    });
  }
  if (!map.getLayer("juju-collision-buildings")) {
    map.addLayer({
      id: "juju-collision-buildings",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 15,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: { "fill-color": "#ffffff", "fill-opacity": 0.015 },
    });
  }
  if (!map.getSource("juju-zone-spawn")) {
    map.addSource("juju-zone-spawn", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: "juju-zone-spawn-marker",
      type: "circle",
      source: "juju-zone-spawn",
      paint: {
        "circle-radius": 8,
        "circle-color": "#f4d27c",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });
  }
  if (!map.getSource("juju-zone-obstacles")) {
    map.addSource("juju-zone-obstacles", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: "juju-zone-rocks",
      type: "circle",
      source: "juju-zone-obstacles",
      filter: ["==", ["get", "kind"], "rock"],
      paint: {
        "circle-radius": 6,
        "circle-color": "#89949a",
        "circle-stroke-color": "#35434a",
        "circle-stroke-width": 2,
      },
    });
    map.addLayer({
      id: "juju-zone-trees",
      type: "circle",
      source: "juju-zone-obstacles",
      filter: ["==", ["get", "kind"], "tree"],
      paint: {
        "circle-radius": 9,
        "circle-color": "#4f9b68",
        "circle-stroke-color": "#1e5639",
        "circle-stroke-width": 3,
      },
    });
  }
  if (!map.getSource("juju-active-zone")) {
    map.addSource("juju-active-zone", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: "juju-zone-fill",
      type: "fill",
      source: "juju-active-zone",
      paint: { "fill-color": "#e4b77f", "fill-opacity": 0.045 },
    });
    map.addLayer({
      id: "juju-zone-outline",
      type: "line",
      source: "juju-active-zone",
      paint: { "line-color": "#e4b77f", "line-width": 2, "line-dasharray": [3, 2], "line-opacity": 0.9 },
    });
  }
  if (!map.getSource("juju-visited-zones")) {
    map.addSource("juju-visited-zones", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: "juju-visited-zone-outlines",
      type: "line",
      source: "juju-visited-zones",
      paint: {
        "line-color": "#78d6b0",
        "line-width": 1.5,
        "line-opacity": 0.72,
        "line-dasharray": [2, 2],
      },
    });
  }
  updateExploredZonesLayer();
}

function setGameWorldVisibility(visible: boolean): void {
  const visibility = visible ? "visible" : "none";
  [
    "juju-zone-fill", "juju-zone-outline", "juju-visited-zone-outlines", "juju-zone-rocks",
    "juju-zone-trees", "juju-zone-spawn-marker", "juju-game-greenery",
    "juju-game-buildings", "juju-game-roads-casing", "juju-game-roads",
  ].forEach((id) => {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibility);
  });
  if (map.getLayer("juju-travelled-route-line")) map.moveLayer("juju-travelled-route-line");
  if (map.getLayer("juju-navigation-route-line")) map.moveLayer("juju-navigation-route-line");
}

function updateGameZone(lng: number, lat: number): void {
  const zone = zoneFor(lng, lat);
  if (zone.key === activeZoneKey) return;
  activeZoneKey = zone.key;
  recordExploredZone(zone.x, zone.y);
  if (gameMode) discoverProgressZone(zone.x, zone.y);
  protectedZoneKeys = new Set<string>();
  for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      protectedZoneKeys.add(zoneAtOffset(zone.x, zone.y, offsetX, offsetY).key);
    }
  }
  const source = map.getSource("juju-active-zone") as maplibregl.GeoJSONSource | undefined;
  source?.setData(zonePolygon(zone.x, zone.y));
  const obstacles = map.getSource("juju-zone-obstacles") as maplibregl.GeoJSONSource | undefined;
  // Keep the active 3x3 visible; prepare a wider ring only on capable devices.
  const nearbyFeatures: GeoJSON.Feature<GeoJSON.Point>[] = [];
  const warmRadius = streamingProfile.tier === "economy" ? 1 : 2;
  for (let offsetX = -warmRadius; offsetX <= warmRadius; offsetX += 1) {
    for (let offsetY = -warmRadius; offsetY <= warmRadius; offsetY += 1) {
      const neighbour = zoneAtOffset(zone.x, zone.y, offsetX, offsetY);
      const zoneFeatures = createZoneObstacles(neighbour.x, neighbour.y).features;
      if (Math.abs(offsetX) <= 1 && Math.abs(offsetY) <= 1) nearbyFeatures.push(...zoneFeatures);
    }
  }
  trimZoneObstacleCache();
  obstacles?.setData({ type: "FeatureCollection", features: nearbyFeatures });
  updateStreamingHud();
  const spawnSource = map.getSource("juju-zone-spawn") as maplibregl.GeoJSONSource | undefined;
  const spawnPoint = spawnForZone(zone.x, zone.y);
  spawnSource?.setData({
    type: "Feature",
    properties: { label: translations[language].zoneSpawnLabel },
    geometry: { type: "Point", coordinates: spawnPoint },
  });
  $("#game-zone-status").textContent = `${translations[language].zoneLoading} · ${zone.x}:${zone.y}`;
  map.once("idle", () => {
    if (gameMode && activeZoneKey === zone.key) {
      const sourceReady = navigator.onLine && map.isSourceLoaded("openmaptiles") && map.areTilesLoaded();
      $("#game-zone-status").textContent = !navigator.onLine
        ? `${translations[language].streamingOffline} · ${zone.x}:${zone.y}`
        : sourceReady
          ? `ZONE ${zone.x} · ${zone.y} · ${translations[language].zoneReady}`
          : `${translations[language].zoneLoading} · ${zone.x}:${zone.y}`;
    }
  });
}

function updateGameHud(): void {
  const center = playerMarker?.getLngLat() ?? map.getCenter();
  $("#game-zone-coordinates").textContent = `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`;
  updatePlayerNavigationHud();
  updateGameZone(center.lng, center.lat);
}

function setPlayerDestination(lng: number, lat: number): void {
  destinationCoordinates = [lng, lat];
  const roadFeatures = map.getSource("openmaptiles") ? map.querySourceFeatures("openmaptiles", { sourceLayer: "transportation" }) : [];
  const position = playerMarker?.getLngLat() ?? map.getCenter();
  navigationRouteCoordinates = findRoadRoute(roadFeatures as unknown as Parameters<typeof findRoadRoute>[0], [position.lng, position.lat], destinationCoordinates) ?? [];
  if (!destinationMarker) { const element = document.createElement("div"); element.className = "game-destination-marker"; destinationMarker = new maplibregl.Marker({ element, anchor: "center" }).setLngLat(destinationCoordinates).addTo(map); }
  else destinationMarker.setLngLat(destinationCoordinates);
  destinationSelectionMode = false;
  const button = document.querySelector<HTMLButtonElement>("#game-set-destination");
  const clear = document.querySelector<HTMLButtonElement>("#game-clear-destination");
  if (button) button.textContent = language === "fr" ? "MODIFIER LA DESTINATION" : "CHANGE DESTINATION";
  if (clear) clear.disabled = false;
  updateTravelledRoute();
  updatePlayerNavigationHud();
  showToast(language === "fr" ? "Destination définie." : "Destination set.");
}
function clearPlayerDestination(): void {
  destinationCoordinates = null; navigationRouteCoordinates = []; destinationMarker?.remove(); destinationMarker = null; destinationSelectionMode = false;
  const label = document.querySelector<HTMLElement>("#navigation-destination");
  const distance = document.querySelector<HTMLElement>("#navigation-distance");
  const button = document.querySelector<HTMLButtonElement>("#game-set-destination");
  const clear = document.querySelector<HTMLButtonElement>("#game-clear-destination");
  if (label) label.textContent = language === "fr" ? "Aucune destination" : "No destination set";
  if (distance) distance.textContent = "—";
  if (button) button.textContent = language === "fr" ? "DÉFINIR UNE DESTINATION" : "SET DESTINATION";
  if (clear) clear.disabled = true;
  updateTravelledRoute();
  updatePlayerNavigationHud();
}
function updateTravelledRoute(): void {
  const data: GeoJSON.FeatureCollection<GeoJSON.LineString> = { type: "FeatureCollection", features: travelledRouteCoordinates.length > 1 ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: travelledRouteCoordinates } }] : [] };
  (map.getSource("juju-travelled-route") as maplibregl.GeoJSONSource | undefined)?.setData(data);
  (miniMap?.getSource("juju-mini-travelled-route") as maplibregl.GeoJSONSource | undefined)?.setData(data);
  const destinationData: GeoJSON.FeatureCollection<GeoJSON.Point> = { type: "FeatureCollection", features: destinationCoordinates ? [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: destinationCoordinates } }] : [] };
  (miniMap?.getSource("juju-mini-destination") as maplibregl.GeoJSONSource | undefined)?.setData(destinationData);
  const routeData: GeoJSON.FeatureCollection<GeoJSON.LineString> = { type: "FeatureCollection", features: navigationRouteCoordinates.length > 1 ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: navigationRouteCoordinates } }] : [] };
  (map.getSource("juju-navigation-route") as maplibregl.GeoJSONSource | undefined)?.setData(routeData);
  (miniMap?.getSource("juju-mini-navigation-route") as maplibregl.GeoJSONSource | undefined)?.setData(routeData);
}

function updatePlayerNavigationHud(): void {
  const position = playerMarker?.getLngLat() ?? map.getCenter();
  const coordinates = document.querySelector<HTMLElement>("#navigation-coordinates");
  const heading = document.querySelector<HTMLElement>("#navigation-heading");
  const speed = document.querySelector<HTMLElement>("#navigation-speed");
  const zoom = document.querySelector<HTMLElement>("#navigation-zoom");
  if (coordinates) coordinates.textContent = `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`;
  const miniMarker = document.querySelector<HTMLElement>(".mini-map-player-marker");
  if (miniMarker) miniMarker.dataset.heading = playerHeading;
  if (heading) heading.textContent = playerHeading;
  if (speed) speed.textContent = movementSpeed.toFixed(1);
  if (zoom) zoom.textContent = `${map.getZoom().toFixed(1)}×`;
  const destinationLabel = document.querySelector<HTMLElement>("#navigation-destination");
  const distanceLabel = document.querySelector<HTMLElement>("#navigation-distance");
  if (language === "fr") {
    const button = document.querySelector<HTMLButtonElement>("#game-set-destination");
    if (button) button.textContent = destinationCoordinates ? "MODIFIER LA DESTINATION" : "DÉFINIR UNE DESTINATION";
    const label = document.querySelector<HTMLElement>("#navigation-destination");
    if (!destinationCoordinates && label) label.textContent = "Aucune destination";
  }
  const nearby = document.querySelector<HTMLElement>("#navigation-nearby-place");
  if (nearby && Date.now() - lastNearbyPoiUpdateAt >= 1500) {
    lastNearbyPoiUpdateAt = Date.now();
    const poiLayerReady = map.getLayer("juju-poi-points");
    const candidates = poiLayerReady ? map.queryRenderedFeatures([[0, 0], [map.getCanvas().width, map.getCanvas().height]], { layers: ["juju-poi-points"] }) : [];
    const miniPoiFeatures: GeoJSON.Feature<GeoJSON.Point>[] = [];
    const nearest = candidates.map((feature) => {
      if (feature.geometry.type !== "Point") return null;
      const coords = feature.geometry.coordinates as [number, number];
      const props = feature.properties ?? {};
      const distance = haversineDistance(position, { lng: coords[0], lat: coords[1] });
      if (distance <= 1800 && miniPoiFeatures.length < 100) miniPoiFeatures.push({ type: "Feature", properties: { name: String(props.name ?? props.name_en ?? "") }, geometry: { type: "Point", coordinates: coords } });
      return { name: String(props.name ?? props.name_en ?? (language === "fr" ? "Lieu à proximité" : "Nearby place")), distance };
    }).filter((item): item is { name: string; distance: number } => !!item && item.distance <= 1500).sort((a, b) => a.distance - b.distance)[0];
    nearby.textContent = nearest ? `${nearest.name} · ${nearest.distance >= 1000 ? (nearest.distance / 1000).toFixed(1) + " km" : Math.round(nearest.distance) + " m"}` : (language === "fr" ? "Aucun lieu proche affiché" : "No nearby place in view");
    (miniMap?.getSource("juju-mini-nearby-pois") as maplibregl.GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: miniPoiFeatures });
  }
  if (destinationCoordinates && destinationLabel && distanceLabel) {
    const [lng, lat] = destinationCoordinates;
    let meters = haversineDistance(position, { lng, lat });
    if (navigationRouteCoordinates.length > 1) {
      let nearestIndex = 0, nearestDistance = Infinity;
      navigationRouteCoordinates.forEach((point, index) => {
        const distance = haversineDistance(position, { lng: point[0], lat: point[1] });
        if (distance < nearestDistance) { nearestDistance = distance; nearestIndex = index; }
      });
      meters = nearestDistance + navigationRouteCoordinates.slice(nearestIndex + 1).reduce((total, point, index) => {
        const previous = navigationRouteCoordinates[nearestIndex + index];
        return total + haversineDistance({ lng: previous[0], lat: previous[1] }, { lng: point[0], lat: point[1] });
      }, 0);
    }
    destinationLabel.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    distanceLabel.textContent = navigationRouteCoordinates.length > 1
      ? `${meters >= 1000 ? (meters / 1000).toFixed(2) + " km" : Math.round(meters) + " m"} · ${language === "fr" ? "par route" : "by road"}`
      : `${meters >= 1000 ? (meters / 1000).toFixed(2) + " km" : Math.round(meters) + " m"} · ${language === "fr" ? "direct" : "direct"}`;
  }
}

function metersToScreenPixels(lng: number, lat: number, meters: number): number {
  const origin = map.project([lng, lat]);
  const east = destinationFromDirection({ lng, lat }, { x: 1, y: 0 }, meters);
  const projectedEast = map.project([east.lng, east.lat]);
  return Math.hypot(projectedEast.x - origin.x, projectedEast.y - origin.y);
}

function isBuildingCollision(lng: number, lat: number): boolean {
  const point = map.project([lng, lat]);
  const playerRadius = Math.max(2, Math.min(12, metersToScreenPixels(lng, lat, 5)));
  if (map.getLayer("juju-collision-buildings") && map.getZoom() >= 14) {
    const samples = collisionSampleOffsets(playerRadius);
    const candidates = map.queryRenderedFeatures(
      [[point.x - playerRadius, point.y - playerRadius], [point.x + playerRadius, point.y + playerRadius]],
      { layers: ["juju-collision-buildings"] },
    );
    const pointInRing = (sampleX: number, sampleY: number, ring: unknown[]): boolean => {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[i] as [number, number], b = ring[j] as [number, number];
        if (!Array.isArray(a) || !Array.isArray(b)) continue;
        const pa = map.project(a), pb = map.project(b);
        if ((pa.y > sampleY) !== (pb.y > sampleY)
          && sampleX < ((pb.x - pa.x) * (sampleY - pa.y)) / ((pb.y - pa.y) || 0.000001) + pa.x) inside = !inside;
      }
      return inside;
    };
    for (const feature of candidates) {
      const geometry = feature.geometry;
      const polygons: unknown[][][] = geometry.type === "Polygon"
        ? [geometry.coordinates as unknown[][]]
        : geometry.type === "MultiPolygon" ? (geometry.coordinates as unknown[][][]) : [];
      for (const polygon of polygons) {
        const outer = polygon[0] as unknown[];
        if (!Array.isArray(outer)) continue;
        for (const [dx, dy] of samples) {
          const sx = point.x + dx, sy = point.y + dy;
          if (pointInRing(sx, sy, outer) && !polygon.slice(1).some((hole) => pointInRing(sx, sy, hole as unknown[]))) return true;
        }
      }
    }
  }

  // Check neighbouring procedural zones too, so an obstacle on a zone edge cannot be crossed.
  const zone = zoneFor(lng, lat);
  const checkedZones = new Set<string>();
  for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      const neighbour = zoneAtOffset(zone.x, zone.y, offsetX, offsetY);
      if (checkedZones.has(neighbour.key)) continue;
      checkedZones.add(neighbour.key);
      for (const feature of createZoneObstacles(neighbour.x, neighbour.y).features) {
        const obstacleCoordinates = feature.geometry.coordinates as [number, number];
        const obstaclePoint = map.project(obstacleCoordinates);
        const obstacleRadiusMeters = Number(feature.properties?.radius) || 10;
        const obstacleRadius = metersToScreenPixels(obstacleCoordinates[0], obstacleCoordinates[1], obstacleRadiusMeters);
        if (circlesOverlap(point, obstaclePoint, playerRadius, obstacleRadius)) return true;
      }
    }
  }
  return false;
}

let interiorObjects: InteriorObject[] = [];
let interiorDoors: InteriorDoor[] = [];

function buildingTypeLabel(kind: BuildingKind): string {
  const key = ({
    house: "buildingTypeHouse", apartment: "buildingTypeApartment", school: "buildingTypeSchool",
    shop: "buildingTypeShop", office: "buildingTypeOffice", industrial: "buildingTypeIndustrial",
    other: "buildingTypeOther",
  } as const)[kind];
  return translations[language][key];
}

function createInteriorForBuilding(kind: BuildingKind): void {
  const layout = createInteriorLayout(kind);
  interiorObjects = layout.objects;
  interiorDoors = layout.doors;
  refreshInteriorStairs();
}

function refreshInteriorStairs(): void {
  interiorObjects = interiorObjects.filter((item) => !item.id.startsWith("stairs-"));
  if (!selectedBuildingLevels || selectedBuildingLevels <= 1) return;
  if (currentInteriorFloor < selectedBuildingLevels - 1) {
    interiorObjects.push({ id: "stairs-up", x: 10, y: 2, label: "interiorStairsUp", glyph: "↗" });
  }
  if (currentInteriorFloor > 0) {
    interiorObjects.push({ id: "stairs-down", x: 10, y: 5, label: "interiorStairsDown", glyph: "↙" });
  }
}

function changeInteriorFloor(direction: -1 | 1): void {
  if (!selectedBuildingLevels || selectedBuildingLevels <= 1) return;
  const nextFloor = adjacentInteriorFloor(currentInteriorFloor, selectedBuildingLevels, direction);
  if (nextFloor === null) {
    $("#interior-message").textContent = translations[language].floorBoundaryHint;
    return;
  }
  currentInteriorFloor = nextFloor;
  interiorPosition = direction > 0 ? { x: 9, y: 2 } : { x: 9, y: 5 };
  refreshInteriorStairs();
  renderInterior();
  $("#interior-message").textContent = `${translations[language].floorLabel} ${currentInteriorFloor + 1} / ${selectedBuildingLevels}`;
}

function interiorCellKey(x: number, y: number): string { return `${x},${y}`; }

function renderInterior(): void {
  const floorControls = $("#interior-floor-controls");
  floorControls.hidden = !selectedBuildingLevels || selectedBuildingLevels <= 1;
  $("#interior-floor-label").textContent = selectedBuildingLevels && selectedBuildingLevels > 1
    ? `${translations[language].floorLabel} ${currentInteriorFloor + 1} / ${selectedBuildingLevels}`
    : translations[language].floorLabel;
  $("#interior-floor-down").toggleAttribute("disabled", currentInteriorFloor <= 0);
  $("#interior-floor-up").toggleAttribute("disabled", !selectedBuildingLevels || currentInteriorFloor >= selectedBuildingLevels - 1);
  const board = $("#interior-board");
  board.replaceChildren();
  const objectAt = new Map(interiorObjects.map((item) => [interiorCellKey(item.x, item.y), item]));
  const doorAt = new Map(interiorDoors.map((door) => [interiorCellKey(door.x, door.y), door]));
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 12; x += 1) {
      const cell = document.createElement("div");
      cell.className = "interior-cell";
      cell.style.gridColumn = String(x + 1);
      cell.style.gridRow = String(y + 1);
      const boundary = x === 0 || x === 11 || y === 0 || y === 7;
      const partition = (x === 4 && y !== 3 && y > 0 && y < 7)
        || (y === 4 && x >= 5 && x <= 10 && x !== 7);
      if (boundary || partition) {
        cell.classList.add("interior-wall");
      } else {
        cell.classList.add("interior-floor");
        if ((x + y) % 2 === 0) cell.classList.add("floor-alt");
      }
      const door = doorAt.get(interiorCellKey(x, y));
      if (door) {
        cell.className = "interior-cell interior-door";
        cell.textContent = "↔";
        cell.title = translations[language].interiorDoor;
      }
      const item = objectAt.get(interiorCellKey(x, y));
      if (item) {
        cell.classList.add("interior-furniture");
        cell.textContent = item.glyph;
        cell.setAttribute("aria-label", translations[language][item.label as keyof typeof translations.en]);
        cell.title = translations[language][item.label as keyof typeof translations.en];
        cell.dataset.object = item.id;
        cell.addEventListener("click", () => inspectInteriorObject(item.id));
      }
      if (x === interiorPosition.x && y === interiorPosition.y) {
        const player = document.createElement("span");
        player.className = "interior-player";
        player.dataset.direction = interiorLastDirection;
        player.textContent = "●";
        cell.append(player);
        cell.classList.add("interior-player-cell");
      }
      board.append(cell);
    }
  }
  $("#interior-room-status").textContent = interiorRoomForPosition();
}

function interiorRoomForPosition(): string {
  const labels: Record<BuildingKind, [string, string, string]> = {
    house: ["interiorHallName", "interiorMainName", "roomBedroom"],
    apartment: ["interiorHallName", "interiorMainName", "roomBedroom"],
    school: ["roomCorridor", "roomClassroom", "roomClassroom"],
    shop: ["roomShopFloor", "roomShopFloor", "roomStock"],
    office: ["roomReception", "roomWorkspace", "roomWorkspace"],
    industrial: ["roomWorkshop", "roomWorkshop", "roomStock"],
    other: ["interiorHallName", "interiorMainName", "interiorSideName"],
  };
  const [left, mainRoom, side] = labels[selectedBuildingType];
  if (interiorPosition.x <= 3) return translations[language][left as keyof typeof translations.en];
  if (interiorPosition.y >= 5) return translations[language][side as keyof typeof translations.en];
  return translations[language][mainRoom as keyof typeof translations.en];
}

function inspectInteriorObject(id: string): void {
  if (id === "stairs-up") { changeInteriorFloor(1); return; }
  if (id === "stairs-down") { changeInteriorFloor(-1); return; }
  const item = interiorObjects.find((object) => object.id === id);
  if (!item) return;
  interiorLastMessage = `${translations[language].interiorObjectHint} : ${translations[language][item.label as keyof typeof translations.en]}`;
  $("#interior-message").textContent = interiorLastMessage;
}

function moveInterior(dx: number, dy: number): void {
  const next = { x: interiorPosition.x + dx, y: interiorPosition.y + dy };
  if (next.x < 1 || next.x > 10 || next.y < 1 || next.y > 6) {
    $("#interior-message").textContent = translations[language].interiorWallHint;
    return;
  }
  const blocked = interiorObjects.some((item) => item.x === next.x && item.y === next.y);
  const wall = (next.x === 4 && next.y !== 3) || (next.y === 4 && next.x >= 5 && next.x <= 10 && next.x !== 7);
  if (blocked || wall) {
    $("#interior-message").textContent = translations[language].interiorWallHint;
    return;
  }
  const crossedDoor = interiorDoors.some((door) => door.x === next.x && door.y === next.y);
  interiorPosition = next;
  if (crossedDoor) $("#interior-message").textContent = translations[language].interiorDoorHint;
  else $("#interior-message").textContent = translations[language].interiorInteract;
  renderInterior();
}

function interactWithInterior(): void {
  const nearby = interiorObjects.find((item) => Math.abs(item.x - interiorPosition.x) + Math.abs(item.y - interiorPosition.y) <= 1);
  if (nearby) {
    inspectInteriorObject(nearby.id);
    return;
  }
  const nearDoor = interiorDoors.some((door) => Math.abs(door.x - interiorPosition.x) + Math.abs(door.y - interiorPosition.y) <= 1);
  $("#interior-message").textContent = nearDoor ? translations[language].interiorDoorHint : translations[language].interiorInteract;
}

function openBuildingInterior(): void {
  if (!gameMode) return;
  stopMovementLoop();
  heldDirections.clear();
  interiorPosition = { x: 2, y: 4 };
  currentInteriorFloor = 0;
  interiorLastDirection = "down";
  $("#interior-building-name").textContent = selectedBuildingName || buildingTypeLabel(selectedBuildingType);
  $("#interior-title").textContent = `${buildingTypeLabel(selectedBuildingType)} · ${translations[language].interiorTitle}`;
  $("#interior-note").textContent = translations[language].interiorGeneratedNote;
  $("#interior-data-source").textContent = translations[language].interiorDataSource;
  $("#interior-levels").textContent = selectedBuildingLevels
    ? `${selectedBuildingLevels} ${language === "fr" ? "niveau(x) indiqué(s) sur la carte" : "level(s) recorded in map data"}`
    : (language === "fr" ? "Nombre de niveaux non renseigné" : "Number of levels not mapped");
  createInteriorForBuilding(selectedBuildingType);
  $("#interior-controls").textContent = translations[language].interiorMove;
  $("#interior-message").textContent = translations[language].interiorInteract;
  $("#interior-exit").textContent = translations[language].closeInterior;
  renderInterior();
  $("#building-interior").hidden = false;
}

function closeBuildingInterior(): void {
  $("#building-interior").hidden = true;
}

function findSafeSpawn(lng: number, lat: number): [number, number, boolean] {
  if (!isBuildingCollision(lng, lat)) return [lng, lat, false];
  const bearings = [{ x: 1, y: 0 }, { x: 0.707, y: 0.707 }, { x: 0, y: 1 }, { x: -0.707, y: 0.707 }, { x: -1, y: 0 }, { x: -0.707, y: -0.707 }, { x: 0, y: -1 }, { x: 0.707, y: -0.707 }];
  for (const distance of [8, 14, 22, 32, 44, 58, 74]) for (const direction of bearings) {
    const candidate = destinationFromDirection({ lng, lat }, direction, distance);
    if (!isBuildingCollision(candidate.lng, candidate.lat)) return [candidate.lng, candidate.lat, true];
  }
  return [lng, lat, false];
}

function startGameMode(resumeSession: SavedGameSession | null = null, requestedSpawn?: [number, number]): void {
  if (!map.isStyleLoaded()) {
    showToast(language === "en" ? "The world map is still loading. Please wait a moment." : "La carte du monde est en cours de chargement. Patientez un instant.");
    return;
  }
  if (!activeSlot() && savedGameSlots.length >= SAVE_SLOT_LIMIT) {
    showToast(translations[language].saveLimit);
    return;
  }
  gameMode = true;
  clearPlayerDestination();
  travelledRouteCoordinates = [];
  lastRoutePoint = null;
  playerHeading = "N";
  createMiniMap();
  heldDirections.clear();
  disableTerrain();
  map.setProjection({ type: "mercator" });
  map.setPitch(0);
  map.setBearing(0);
  map.dragRotate.disable();
  map.dragPan.disable();
  map.scrollZoom.disable();
  map.doubleClickZoom.disable();
  map.keyboard.disable();
  map.touchZoomRotate.disable();
  const current = map.getCenter();
  const currentZone = zoneFor(current.lng, current.lat);
  const spawnCoordinates = requestedSpawn
    ? requestedSpawn
    : resumeSession
      ? [resumeSession.lng, resumeSession.lat] as [number, number]
      : spawnForZone(currentZone.x, currentZone.y);
  const adjustedSpawn = findSafeSpawn(spawnCoordinates[0], spawnCoordinates[1]);
  const spawn = new maplibregl.LngLat(adjustedSpawn[0], adjustedSpawn[1]);
  if (adjustedSpawn[2]) showToast(language === "fr" ? "Point de départ déplacé vers un espace libre." : "Spawn moved to the nearest clear space.");
  if (resumeSession) {
    movementSpeed = resumeSession.movementSpeed > 12 ? 4.5 : Math.max(1, Math.min(12, resumeSession.movementSpeed));
    const speedControl = document.querySelector<HTMLInputElement>("#game-speed");
    const speedValue = document.querySelector<HTMLElement>("#game-speed-value");
    if (speedControl) speedControl.value = String(movementSpeed);
    if (speedValue) speedValue.textContent = movementSpeed.toFixed(1);
  }
  ensureGameLayers();
  setGameWorldVisibility(true);
  updateGameZone(spawn.lng, spawn.lat);
  const player = document.createElement("div");
  player.className = "juju-player";
  player.dataset.direction = "down";
  player.setAttribute("role", "img");
  player.setAttribute("aria-label", translations[language].playerAriaLabel);
  playerMarker?.remove();
  playerMarker = new maplibregl.Marker({ element: player, anchor: "center" }).setLngLat(spawn).addTo(map);
  travelledRouteCoordinates = resumeSession?.travelledRoute?.length ? resumeSession.travelledRoute.slice(-1800) : [[spawn.lng, spawn.lat]];
  if (!travelledRouteCoordinates.length) travelledRouteCoordinates = [[spawn.lng, spawn.lat]];
  lastRoutePoint = [spawn.lng, spawn.lat];
  if (resumeSession?.destination) {
    destinationCoordinates = [...resumeSession.destination];
    const destinationElement = document.createElement("div"); destinationElement.className = "game-destination-marker";
    destinationMarker?.remove(); destinationMarker = new maplibregl.Marker({ element: destinationElement, anchor: "center" }).setLngLat(destinationCoordinates).addTo(map);
    const roads = map.querySourceFeatures("openmaptiles", { sourceLayer: "transportation" });
    navigationRouteCoordinates = findRoadRoute(roads as unknown as Parameters<typeof findRoadRoute>[0], [spawn.lng, spawn.lat], destinationCoordinates) ?? [];
  }
  updateTravelledRoute();
  map.easeTo({ center: spawn, zoom: resumeSession?.zoom ?? Math.max(16, map.getZoom()), pitch: 0, bearing: 0, duration: 850 });
  $("#app").classList.add("game-mode");
  $("#game-mode-toggle").textContent = translations[language].exitGame;
  $("#game-zone-status").textContent = translations[language].zoneLoading;
  $("#game-player-status").textContent = translations[language].playerReady;
  $("#game-camera").classList.add("active");
  $("#flat-view").classList.add("active");
  $("#globe-view").classList.remove("active");
  $("#place-card").hidden = true;
  selectedPlaceMarker?.remove();
  selectedPlaceMarker = null;
  updateGameHud();
  lastSessionSaveAt = 0;
  saveGameSession();
  const spawnZone = zoneFor(spawn.lng, spawn.lat);
  discoverProgressZone(spawnZone.x, spawnZone.y);
  renderPlayerProgress();
  renderSavedGameSlots();
  const savePanel = document.querySelector<HTMLElement>("#resume-session");
  if (savePanel) savePanel.hidden = true;
  renderPlayerProgress();
  renderDailyMissions();
  showToast(resumeSession
    ? (language === "en" ? "Previous session restored." : "Session précédente restaurée.")
    : (language === "en" ? "Game mode enabled. Move with WASD or arrow keys." : "Mode jeu activé. Déplacez-vous avec ZQSD ou les flèches."));
}

function stopGameMode(): void {
  saveGameSession(true);
  gameMode = false;
  stopMovementLoop();
  setGameWorldVisibility(false);
  closeBuildingInterior();
  playerMarker?.remove();
  playerMarker = null;
  clearPlayerDestination();
  travelledRouteCoordinates = [];
  lastRoutePoint = null;
  updateTravelledRoute();
  $("#app").classList.remove("game-mode");
  $("#game-mode-toggle").textContent = translations[language].enterGame;
  $("#game-camera").classList.remove("active");
  $("#flat-view").classList.add("active");
  $("#globe-view").classList.remove("active");
  virtualEntranceMarker?.remove();
  virtualEntranceMarker = null;
  map.dragPan.enable();
  map.scrollZoom.enable();
  map.doubleClickZoom.enable();
  map.keyboard.enable();
  map.touchZoomRotate.enable();
  map.touchZoomRotate.disableRotation();
  map.easeTo({ pitch: 0, bearing: 0, duration: 400 });
}

const heldDirections = new Set<string>();
let movementFrame = 0;
let previousMovementTime = 0;
let movementSpeed = 4.5;
let playerHeading = "N";

const directionKeys: Record<string, { x: number; y: number; direction: string }> = {
  arrowup: { x: 0, y: -1, direction: "up" }, w: { x: 0, y: -1, direction: "up" }, z: { x: 0, y: -1, direction: "up" },
  arrowdown: { x: 0, y: 1, direction: "down" }, s: { x: 0, y: 1, direction: "down" },
  arrowleft: { x: -1, y: 0, direction: "left" }, a: { x: -1, y: 0, direction: "left" }, q: { x: -1, y: 0, direction: "left" },
  arrowright: { x: 1, y: 0, direction: "right" }, d: { x: 1, y: 0, direction: "right" },
};

function stopMovementLoop(): void {
  if (movementFrame) window.cancelAnimationFrame(movementFrame);
  movementFrame = 0;
  previousMovementTime = 0;
  heldDirections.clear();
  playerMarker?.getElement().classList.remove("is-moving");
  playerMarker?.getElement().classList.add("is-idle");
}

function movementTick(time: number): void {
  movementFrame = 0;
  if (!gameMode || !playerMarker || heldDirections.size === 0) {
    previousMovementTime = 0;
    playerMarker?.getElement().classList.remove("is-moving");
    playerMarker?.getElement().classList.add("is-idle");
    return;
  }
  const delta = previousMovementTime ? Math.min((time - previousMovementTime) / 1000, 0.05) : 0;
  previousMovementTime = time;
  let dx = 0;
  let dy = 0;
  for (const key of heldDirections) {
    const direction = directionKeys[key];
    if (direction) { dx += direction.x; dy += direction.y; }
  }
  const length = Math.hypot(dx, dy);
  if (length > 0 && delta > 0) {
    const direction = normalizeDirection({ x: dx, y: dy });
    if (!direction) return;
    const center = map.getCenter();
    const destination = destinationFromDirection(center, direction, movementSpeed * delta);
    const next = new maplibregl.LngLat(destination.lng, destination.lat);
    if (isBuildingCollision(next.lng, next.lat)) {
      $("#game-player-status").textContent = translations[language].blocked;
      heldDirections.clear();
      playerMarker.getElement().classList.remove("is-moving");
      previousMovementTime = 0;
      return;
    }
    const activeDirection = [...heldDirections].map((key) => directionKeys[key]).filter(Boolean).at(-1);
    const headingX = direction.x;
    const headingY = direction.y;
    playerHeading = headingY < -0.35 ? (headingX > 0.35 ? "NE" : headingX < -0.35 ? "NW" : "N")
      : headingY > 0.35 ? (headingX > 0.35 ? "SE" : headingX < -0.35 ? "SW" : "S")
      : headingX > 0 ? "E" : "W";
    addTravelDistance(center, next);
    // Warm deterministic scenery ahead of the current movement vector before entering it.
    warmPredictiveZones(next.lng, next.lat, dx, dy);
    void prefetchVectorTilesAhead(next.lng, next.lat, dx, dy);
    const playerElement = playerMarker.getElement();
    if (activeDirection) playerElement.dataset.direction = activeDirection.direction;
    playerElement.dataset.heading = playerHeading;
    playerElement.classList.remove("is-idle");
    playerElement.classList.add("is-moving");
    $("#game-player-status").textContent = translations[language].playerReady;
    playerMarker.setLngLat(next);
    if (!lastRoutePoint || haversineDistance({ lng: lastRoutePoint[0], lat: lastRoutePoint[1] }, next) >= 5) {
      travelledRouteCoordinates.push([next.lng, next.lat]);
      if (travelledRouteCoordinates.length > 1800) travelledRouteCoordinates.splice(1, 1);
      lastRoutePoint = [next.lng, next.lat];
      updateTravelledRoute();
    }
    // The player is the camera anchor: keep the live map center locked to the same coordinates.
    map.jumpTo({ center: next });
    updateGameHud();
    saveGameSession();
  }
  movementFrame = window.requestAnimationFrame(movementTick);
}

function startMovementLoop(): void {
  if (!movementFrame && gameMode && heldDirections.size) {
    previousMovementTime = 0;
    movementFrame = window.requestAnimationFrame(movementTick);
  }
}

function setMovementKey(key: string, pressed: boolean): void {
  const normalized = key.toLowerCase();
  if (!directionKeys[normalized] || !gameMode) return;
  if (pressed) heldDirections.add(normalized);
  else heldDirections.delete(normalized);
  if (pressed) startMovementLoop();
  if (!heldDirections.size) {
    if (movementFrame) window.cancelAnimationFrame(movementFrame);
    movementFrame = 0;
    previousMovementTime = 0;
    playerMarker?.getElement().classList.remove("is-moving");
    playerMarker?.getElement().classList.add("is-idle");
  }
}

function setGameCamera(): void {
  if (gameMode) {
    stopGameMode();
    return;
  }
  startGameMode();
  if (!gameMode) return;
  map.setProjection({ type: "mercator" });
  $("#flat-view").classList.add("active");
  $("#globe-view").classList.remove("active");
  $("#game-camera").classList.add("active");
  $("#place-card").hidden = true;
  selectedPlaceMarker?.remove();
  selectedPlaceMarker = null;
  showToast(language === "en" ? "Top-down game camera enabled." : "Caméra aérienne du jeu activée.");
}

function setMapView(view: "flat" | "globe"): void {
  disableTerrain();
  const isFlat = view === "flat";
  map.setProjection({ type: isFlat ? "mercator" : "globe" });
  map.easeTo({
    pitch: isFlat ? 0 : 18,
    bearing: isFlat ? 0 : -8,
    duration: 900,
  });
  $("#flat-view").classList.toggle("active", isFlat);
  $("#game-camera").classList.remove("active");
  $("#globe-view").classList.toggle("active", !isFlat);
}

map.on("move", () => { if (gameMode) syncMiniMap(); });
map.on("moveend", () => { if (gameMode) updateGameHud(); });

$("#game-map-zoom-in").addEventListener("click", () => {
  if (!gameMode) return;
  map.easeTo({ zoom: Math.min(19, map.getZoom() + 1), duration: 220 });
});
$("#game-map-zoom-out").addEventListener("click", () => {
  if (!gameMode) return;
  map.easeTo({ zoom: Math.max(15, map.getZoom() - 1), duration: 220 });
});
$("#game-map-recenter").addEventListener("click", () => {
  if (!gameMode) return;
  const player = playerMarker?.getLngLat() ?? map.getCenter();
  map.easeTo({ center: player, pitch: 0, bearing: 0, duration: 420 });
  updatePlayerNavigationHud();
});
$("#game-set-destination").addEventListener("click", () => {
  if (!gameMode) return;
  destinationSelectionMode = true;
  showToast(language === "fr" ? "Cliquez sur la carte pour choisir la destination." : "Click the map to choose your destination.");
});
$("#game-clear-destination").addEventListener("click", clearPlayerDestination);

const networkInfo = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
window.addEventListener("online", applyStreamingProfile);
window.addEventListener("offline", applyStreamingProfile);
networkInfo?.addEventListener("change", applyStreamingProfile);

// MapLibre streams vector tiles for the visible viewport as the camera moves.
map.on("sourcedata", (event) => {
  if (!gameMode || event.sourceId !== "openmaptiles" || !event.isSourceLoaded) return;
  if (map.areTilesLoaded()) {
    const zone = zoneFor(map.getCenter().lng, map.getCenter().lat);
    if (activeZoneKey === zone.key) {
      $("#game-zone-status").textContent = `ZONE ${zone.x} · ${zone.y} · ${translations[language].zoneReady}`;
    }
  }
});

map.on("load", () => {
  ensureGameLayers();
  mapStatus.textContent = translations[language].ready;
  map.setProjection({ type: "mercator" });
  map.easeTo({ pitch: 0, bearing: 0, duration: 0 });
  $("#flat-view").classList.add("active");
  $("#globe-view").classList.remove("active");
  add3DBuildings();
  addPointsOfInterest();
  applyStreamingProfile();
  showSessionResumePrompt();
});

map.on("style.load", () => {
  mapStatus.textContent = translations[language].ready;
  ensureGameLayers();
  add3DBuildings();
  addPointsOfInterest();
  applyStreamingProfile();
});

map.on("error", (event) => {
  if (event.error) console.warn("Map resource error:", event.error.message);
});



$("#home-play").addEventListener("click", () => {
  if (savedGameSlots.length > 0) openHomeSaves();
  else openSpawnPicker();
});
$("#spawn-picker-cancel").addEventListener("click", () => {
  closeSpawnPicker();
  const home = document.querySelector<HTMLElement>("#home-screen");
  if (home && savedGameSlots.length === 0) home.hidden = false;
  else if (savedGameSlots.length > 0) openHomeSaves();
});
$("#spawn-picker-confirm").addEventListener("click", () => {
  if (!selectedSpawnCoordinates) return;
  const spawn = [...selectedSpawnCoordinates] as [number, number];
  closeSpawnPicker();
  startGameMode(null, spawn);
  if (gameMode) document.querySelector<HTMLElement>("#home-screen")!.hidden = true;
});
$("#home-saves").addEventListener("click", openHomeSaves);
$("#home-settings").addEventListener("click", openHomeSettings);
$("#home-profile").addEventListener("click", openHomeProfile);
$("#home-language").addEventListener("click", () => setLanguage(language === "en" ? "fr" : "en"));
$("#home-dialog-close").addEventListener("click", closeHomeDialog);
$("#home-dialog").addEventListener("click", (event) => { if (event.target === $("#home-dialog")) closeHomeDialog(); });
$("#save-slots-back").addEventListener("click", () => {
  const panel = document.querySelector<HTMLElement>("#resume-session");
  const home = document.querySelector<HTMLElement>("#home-screen");
  if (panel) panel.hidden = true;
  if (home) home.hidden = false;
});

$("#place-card-close").addEventListener("click", () => {
  $("#place-card").hidden = true;
  selectedPlaceMarker?.remove();
  selectedPlaceMarker = null;
});

$("#place-card-streets").addEventListener("click", () => {
  map.easeTo({ zoom: 17, pitch: 0, bearing: 0, duration: 900 });
});

$("#place-card-overview").addEventListener("click", () => {
  map.easeTo({ zoom: 12, pitch: 0, bearing: 0, duration: 900 });
});

$("#language-toggle").addEventListener("click", () => {
  setLanguage(language === "en" ? "fr" : "en");
});

$("#flat-view").addEventListener("click", () => setMapView("flat"));
$("#game-camera").addEventListener("click", setGameCamera);
$("#game-mode-toggle").addEventListener("click", () => gameMode ? stopGameMode() : startGameMode());
$("#game-main-menu").addEventListener("click", () => {
  if (gameMode) stopGameMode();
  const home = document.querySelector<HTMLElement>("#home-screen");
  const saves = document.querySelector<HTMLElement>("#resume-session");
  if (saves) saves.hidden = true;
  if (home) home.hidden = false;
});
$("#interior-exit").addEventListener("click", closeBuildingInterior);
$("#interior-floor-up").addEventListener("click", () => changeInteriorFloor(1));
$("#interior-floor-down").addEventListener("click", () => changeInteriorFloor(-1));
$("#building-interior").addEventListener("click", (event) => {
  if (event.target === $("#building-interior")) closeBuildingInterior();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#building-interior").hidden) closeBuildingInterior();
});
$("#game-zone-reload").addEventListener("click", () => {
  if (!gameMode) return;
  map.resize();
  ensureGameLayers();
  updateGameZone(map.getCenter().lng, map.getCenter().lat);
  map.triggerRepaint();
  updateGameHud();
  $("#game-zone-status").textContent = translations[language].zoneReady;
  showToast(language === "en" ? "Visible map zone refreshed." : "Zone cartographique visible actualisée.");
});
window.addEventListener("keydown", (event) => {
  if (!$("#building-interior").hidden) {
    const key = event.key.toLowerCase();
    const moves: Record<string, [number, number, string]> = {
      arrowup: [0, -1, "up"], w: [0, -1, "up"], z: [0, -1, "up"],
      arrowdown: [0, 1, "down"], s: [0, 1, "down"],
      arrowleft: [-1, 0, "left"], a: [-1, 0, "left"], q: [-1, 0, "left"],
      arrowright: [1, 0, "right"], d: [1, 0, "right"],
    };
    if (moves[key]) {
      event.preventDefault();
      const [dx, dy, direction] = moves[key];
      interiorLastDirection = direction;
      moveInterior(dx, dy);
    } else if (key === "e") {
      event.preventDefault();
      interactWithInterior();
    }
    return;
  }
  const target = event.target as HTMLElement | null;
  if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
  if (!directionKeys[event.key.toLowerCase()] || !gameMode) return;
  event.preventDefault();
  setMovementKey(event.key, true);
});
window.addEventListener("keyup", (event) => setMovementKey(event.key, false));
window.addEventListener("blur", () => { stopMovementLoop(); saveGameSession(true); });
window.addEventListener("pagehide", () => saveGameSession(true));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { stopMovementLoop(); saveGameSession(true); }
});
document.querySelectorAll<HTMLButtonElement>("[data-move]").forEach((button) => {
  const keyByDirection: Record<string, string> = { up: "arrowup", down: "arrowdown", left: "arrowleft", right: "arrowright" };
  const key = keyByDirection[button.dataset.move ?? ""];
  if (!key) return;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    setMovementKey(key, true);
  });
  const release = () => setMovementKey(key, false);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});
const speedControl = $("#game-speed") as HTMLInputElement;
const speedValue = $("#game-speed-value");
speedControl.addEventListener("input", () => {
  movementSpeed = Number(speedControl.value);
  speedValue.textContent = movementSpeed.toFixed(1);
  updatePlayerNavigationHud();
});

$("#game-clear-explored").addEventListener("click", clearExploredZones);
$("#save-slot-create").addEventListener("click", createNamedSaveSlot);
$("#resume-session-new").addEventListener("click", () => {
  if (savedGameSlots.length >= SAVE_SLOT_LIMIT) {
    showToast(translations[language].saveLimit);
    return;
  }
  clearActiveSaveSlot();
  openSpawnPicker();
});

$("#globe-view").addEventListener("click", () => setMapView("globe"));

$("#terrain-view").addEventListener("click", () => {
  const terrainButton = $("#terrain-view");
  try {
    if (!terrainEnabled) {
      if (!map.getSource("juju-terrain")) {
        map.addSource("juju-terrain", {
          type: "raster-dem",
          url: "https://tiles.mapterhorn.com/tilejson.json",
        });
        map.addSource("juju-hillshade-source", {
          type: "raster-dem",
          url: "https://tiles.mapterhorn.com/tilejson.json",
        });
      }
      if (!map.getLayer("juju-hillshade")) {
        const firstSymbol = map.getStyle().layers?.find((layer) => layer.type === "symbol")?.id;
        map.addLayer({
          id: "juju-hillshade",
          type: "hillshade",
          source: "juju-hillshade-source",
          paint: { "hillshade-exaggeration": 0.35 },
        }, firstSymbol);
      }
      map.setProjection({ type: "mercator" });
      map.setTerrain({ source: "juju-terrain", exaggeration: 1.15 });
      map.easeTo({ pitch: 62, bearing: -12, duration: 1100 });
      terrainEnabled = true;
      terrainButton.classList.add("active");
      $("#flat-view").classList.add("active");
      $("#globe-view").classList.remove("active");
      showToast(language === "en" ? "3D terrain enabled. Zoom in to explore the relief." : "Relief 3D activé. Zoomez pour explorer le terrain.");
    } else {
      disableTerrain();
      map.easeTo({ pitch: 0, bearing: 0, duration: 900 });
      $("#flat-view").classList.add("active");
      $("#globe-view").classList.remove("active");
    }
  } catch (error) {
    console.warn("Terrain could not be enabled:", error);
    terrainEnabled = false;
    terrainButton.classList.remove("active");
    showToast(language === "en" ? "3D terrain is temporarily unavailable." : "Le relief 3D est temporairement indisponible.");
  }
});

$("#places-view").addEventListener("click", togglePointsOfInterest);

map.on("click", (event) => {
  if (spawnSelectionMode) {
    updateSpawnSelection(event.lngLat.lng, event.lngLat.lat);
    return;
  }
  if (gameMode && destinationSelectionMode) {
    setPlayerDestination(event.lngLat.lng, event.lngLat.lat);
    return;
  }
  if (gameMode) {
    const building = map.getLayer("juju-game-buildings")
      ? map.queryRenderedFeatures(event.point, { layers: ["juju-game-buildings"] })[0]
      : undefined;
    if (building) {
      const props = (building.properties ?? {}) as Record<string, unknown>;
      selectedBuildingType = classifyBuilding(props);
      const mappedLevels = Number(props.levels ?? props["building:levels"]);
      selectedBuildingLevels = Number.isFinite(mappedLevels) && mappedLevels > 0
        ? Math.min(20, Math.round(mappedLevels))
        : null;
      selectedBuildingName = String(props.name ?? props.name_en ?? buildingTypeLabel(selectedBuildingType));
      virtualEntranceMarker?.remove();
      const entrance = document.createElement("button");
      entrance.type = "button";
      entrance.className = "virtual-entrance-marker";
      entrance.textContent = translations[language].enterBuilding;
      entrance.setAttribute("aria-label", translations[language].virtualEntrance);
      entrance.addEventListener("click", (clickEvent) => {
        clickEvent.stopPropagation();
        openBuildingInterior();
      });
      virtualEntranceMarker = new maplibregl.Marker({ element: entrance, anchor: "bottom" })
        .setLngLat(event.lngLat)
        .addTo(map);
      showToast(translations[language].virtualEntrance + " · " + selectedBuildingName);
      return;
    }

    const greenArea = map.getLayer("juju-game-greenery")
      ? map.queryRenderedFeatures(event.point, { layers: ["juju-game-greenery"] })[0]
      : undefined;
    if (greenArea) {
      const landClass = String(greenArea.properties?.class ?? "green space");
      const content = document.createElement("div");
      content.className = "poi-popup";
      const title = document.createElement("strong");
      title.textContent = translations[language].natureTitle;
      const detail = document.createElement("span");
      detail.textContent = landClass;
      const source = document.createElement("small");
      source.textContent = language === "en" ? "Mapped land cover · OpenStreetMap data" : "Occupation du sol cartographiée · Données OpenStreetMap";
      content.append(title, detail, source);
      new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "250px" })
        .setLngLat(event.lngLat).setDOMContent(content).addTo(map);
      return;
    }

    const obstacleLayers = ["juju-zone-trees", "juju-zone-rocks"].filter((id) => map.getLayer(id));
    const obstacle = obstacleLayers.length
      ? map.queryRenderedFeatures(event.point, { layers: obstacleLayers })[0]
      : undefined;
    if (obstacle) {
      const kind = String(obstacle.properties?.kind ?? "tree");
      const content = document.createElement("div");
      content.className = "poi-popup";
      const title = document.createElement("strong");
      title.textContent = translations[language].natureTitle;
      const detail = document.createElement("span");
      detail.textContent = kind === "rock" ? translations[language].rockInfo : translations[language].treeInfo;
      content.append(title, detail);
      new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "250px" })
        .setLngLat(event.lngLat).setDOMContent(content).addTo(map);
      return;
    }
  }

  if (!placesVisible || !map.getLayer("juju-poi-points")) return;
  const features = map.queryRenderedFeatures(event.point, { layers: ["juju-poi-points"] });
  const feature = features[0];
  if (!feature) return;
  const properties = feature.properties ?? {};
  const className = String(properties.class ?? "");
  const placeName = String(properties.name ?? properties.name_en ?? translations[language].poiUnnamed);
  const category = poiCategory(className);
  const content = document.createElement("div");
  content.className = "poi-popup";
  const title = document.createElement("strong");
  title.textContent = placeName;
  const type = document.createElement("span");
  type.textContent = category;
  const source = document.createElement("small");
  source.textContent = translations[language].poiDetails;
  content.append(title, type, source);
  new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "260px" })
    .setLngLat(event.lngLat).setDOMContent(content).addTo(map);
});

map.on("mousemove", (event) => {
  if (gameMode) {
    const gameLayers = ["juju-game-buildings", "juju-game-greenery", "juju-zone-trees", "juju-zone-rocks"].filter((id) => map.getLayer(id));
    const overGameObject = gameLayers.length && map.queryRenderedFeatures(event.point, { layers: gameLayers }).length > 0;
    map.getCanvas().style.cursor = overGameObject ? "pointer" : "";
    return;
  }
  const hasPoiLayer = map.getLayer("juju-poi-points");
  const overPoi = placesVisible && hasPoiLayer
    ? map.queryRenderedFeatures(event.point, { layers: ["juju-poi-points"] }).length > 0
    : false;
  map.getCanvas().style.cursor = overPoi ? "pointer" : "";
});

$("#buildings-view").addEventListener("click", () => {
  buildingsVisible = !buildingsVisible;
  const layer = map.getLayer("juju-3d-buildings");
  if (layer) map.setLayoutProperty("juju-3d-buildings", "visibility", buildingsVisible ? "visible" : "none");
  $("#buildings-view").classList.toggle("active", buildingsVisible);
  if (buildingsVisible && map.getZoom() < 13) {
    showToast(language === "en" ? "Zoom into a city to see 3D buildings." : "Zoomez sur une ville pour voir les bâtiments 3D.");
  }
});

interface PlaceResult {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

let searchRequestId = 0;
let activeSearchController: AbortController | null = null;

async function searchPlaces(query: string): Promise<void> {
  const requestId = ++searchRequestId;
  activeSearchController?.abort();
  activeSearchController = null;
  searchResults.replaceChildren();
  if (query.trim().length < 2) return;

  const loading = document.createElement("p");
  loading.className = "search-message";
  loading.textContent = translations[language].searching;
  searchResults.append(loading);

  const controller = new AbortController();
  activeSearchController = controller;
  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.search = new URLSearchParams({
      name: query.trim(),
      count: "6",
      language: language,
      format: "json",
    }).toString();

    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("Geocoding request failed");
    const data = (await response.json()) as { results?: PlaceResult[] };
    if (requestId !== searchRequestId) return;
    const places = data.results ?? [];
    searchResults.replaceChildren();

    if (places.length === 0) {
      const empty = document.createElement("p");
      empty.className = "search-message";
      empty.textContent = translations[language].noResults;
      searchResults.append(empty);
      return;
    }

    places.forEach((place) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-result";
      const name = document.createElement("strong");
      name.textContent = place.name;
      const detail = document.createElement("small");
      detail.textContent = [place.admin1, place.country].filter(Boolean).join(", ");
      button.append(name, detail);
      button.addEventListener("click", () => selectPlace(place));
      searchResults.append(button);
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    if (requestId !== searchRequestId) return;
    searchResults.replaceChildren();
    const errorMessage = document.createElement("p");
    errorMessage.className = "search-message";
    errorMessage.textContent = translations[language].searchError;
    searchResults.append(errorMessage);
  } finally {
    if (requestId === searchRequestId) activeSearchController = null;
  }
}

$("#search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  void searchPlaces(searchInput.value);
});

document.querySelectorAll<HTMLButtonElement>("[data-place]").forEach((button) => {
  button.addEventListener("click", () => {
    searchInput.value = button.dataset.place ?? "";
    void searchPlaces(searchInput.value);
  });
});

setLanguage("en");
map.on("load", () => $("#map-live-dot").classList.add("is-ready"));
map.on("error", (event) => {
  if (event.error) console.warn("World map loading error:", event.error.message);
  if (!map.isStyleLoaded()) mapStatus.textContent = translations[language].mapError;
});


// Three.js is currently an isolated prototype scene. It deliberately does not pretend
// that its fictional buildings are extracted from the real OpenStreetMap geometry.
let activeThreeGame: Game | null = null;
const game3dButton = document.querySelector<HTMLButtonElement>("#game-3d-toggle");
const game3dOverlay = document.querySelector<HTMLElement>("#game-3d-overlay");
const game3dContainer = document.querySelector<HTMLElement>("#game-3d-canvas");
const game3dExit = document.querySelector<HTMLButtonElement>("#game-3d-exit");

let lastThreeDimensionalPosition: [number, number] | null = null;

function leaveThreeDimensionalPrototype(): void {
  activeThreeGame?.dispose();
  activeThreeGame = null;
  if (game3dOverlay) game3dOverlay.hidden = true;
  if (gameMode) return;
  const slot = activeSlot();
  if (slot && lastThreeDimensionalPosition) {
    const [lng, lat] = lastThreeDimensionalPosition;
    const zone = zoneFor(lng, lat);
    slot.session = { ...slot.session, lng, lat, zoneX: zone.x, zoneY: zone.y, savedAt: Date.now() };
    slot.updatedAt = Date.now();
    persistSavedGameSlots();
    renderSavedGameSlots();
  }
  lastThreeDimensionalPosition = null;
  startGameMode(activeSlot()?.session ?? null);
}

game3dButton?.addEventListener("click", () => {
  if (!gameMode || !game3dOverlay || !game3dContainer) return;
  const origin = map.getCenter();
  const mappedBuildings = map.querySourceFeatures("openmaptiles", { sourceLayer: "building" })
    .filter((feature) => feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")
    .slice(0, 350) as unknown as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[];
  const uniqueBuildings = new Map<string, GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>>();
  mappedBuildings.forEach((feature) => {
    const key = String(feature.id ?? JSON.stringify(feature.geometry.coordinates));
    if (!uniqueBuildings.has(key)) uniqueBuildings.set(key, feature);
  });
  const roadClasses = new Set(["motorway", "trunk", "primary", "secondary", "tertiary", "minor",
    "residential", "unclassified", "service", "living_street", "pedestrian", "track", "path", "footway", "cycleway", "steps"]);
  const mappedRoads = map.querySourceFeatures("openmaptiles", { sourceLayer: "transportation" })
    .filter((feature) => (feature.geometry.type === "LineString" || feature.geometry.type === "MultiLineString")
      && roadClasses.has(String(feature.properties?.class ?? "")))
    .slice(0, 700) as unknown as GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>[];
  // Sample the active DEM only when the map's terrain layer is enabled. Otherwise
  // the 3D prototype clearly remains at sea-level rather than inventing elevations.
  const terrainSegments = 16;
  const terrainSize = 300;
  const terrainSamples: { x: number; z: number; elevation: number }[] = [];
  const metersPerLongitude = 111320 * Math.cos(origin.lat * Math.PI / 180);
  if (terrainEnabled && metersPerLongitude > 1) {
    for (let row = 0; row <= terrainSegments; row += 1) {
      for (let column = 0; column <= terrainSegments; column += 1) {
        const x = -terrainSize / 2 + (column / terrainSegments) * terrainSize;
        const z = -terrainSize / 2 + (row / terrainSegments) * terrainSize;
        const lng = origin.lng + x / metersPerLongitude;
        const lat = origin.lat - z / 111320;
        const elevation = map.queryTerrainElevation([lng, lat]);
        terrainSamples.push({ x, z, elevation: Number.isFinite(elevation) ? Number(elevation) : 0 });
      }
    }
  }
  stopGameMode();
  game3dOverlay.hidden = false;
  const t = translations[language];
  const title = game3dOverlay.querySelector<HTMLElement>('[data-i18n="game3dTitle"]');
  const description = game3dOverlay.querySelector<HTMLElement>('[data-i18n="game3dDescription"]');
  const exit = game3dOverlay.querySelector<HTMLElement>('[data-i18n="game3dExit"]');
  const help = game3dOverlay.querySelector<HTMLElement>('[data-i18n="game3dHelp"]');
  if (title) title.textContent = t.game3dTitle;
  if (description) description.textContent = t.game3dDescription;
  if (exit) exit.textContent = t.game3dExit;
  if (help) help.textContent = t.game3dHelp;
  try {
    activeThreeGame?.dispose();
    lastThreeDimensionalPosition = [origin.lng, origin.lat];
    activeThreeGame = new Game(game3dContainer, (x, z, lng, lat) => {
      lastThreeDimensionalPosition = [lng, lat];
      const readout = document.querySelector<HTMLElement>("#game-3d-position");
      if (readout) readout.textContent = `3D · ${x.toFixed(1)} / ${z.toFixed(1)} m · ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }, {
      origin: [origin.lng, origin.lat],
      buildings: [...uniqueBuildings.values()],
      roads: mappedRoads,
      terrain: terrainSamples,
      terrainSize,
      terrainSegments,
      saveSlotId: activeSlot()?.id ?? "local",
      initialInterior: activeSlot()?.interior,
      onInteriorSave: (state) => {
        const slot = activeSlot();
        if (!slot) return;
        slot.interior = state;
        slot.updatedAt = Date.now();
        persistSavedGameSlots();
      },
    });
    activeThreeGame.start();
    const count = uniqueBuildings.size;
    const roadCount = mappedRoads.length;
    const terrainReady = terrainSamples.length > 0;
    showToast(language === "fr"
      ? `${count} bâtiments · ${roadCount} routes cartographiques · relief ${terrainReady ? "DEM actif" : "plat (activez le relief sur la carte avant le mode 3D)"}.`
      : `${count} buildings · ${roadCount} mapped road features · terrain ${terrainReady ? "DEM active" : "flat (enable map terrain before entering 3D)"}.`);
  } catch (error) {
    console.error("Could not start the Three.js world:", error);
    game3dOverlay.hidden = true;
    showToast(language === "fr" ? "Le monde 3D n'a pas pu démarrer sur cet appareil." : "The 3D world could not start on this device.");
    startGameMode(activeSlot()?.session ?? null);
  }
});
game3dExit?.addEventListener("click", leaveThreeDimensionalPrototype);
window.addEventListener("pagehide", () => {
  activeThreeGame?.dispose();
  activeThreeGame = null;
});
