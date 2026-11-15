import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";

type Language = "en" | "fr";

const translations = {
  en: {
    eyebrow: "THE WORLD IS YOUR PLAYGROUND",
    title: "Explore the<br /><span>real world.</span>",
    intro: "Discover places, zoom into cities and prepare to explore a world built from real geography.",
    search: "Search a city or a place...",
    discover: "DISCOVER",
    mapView: "MAP VIEW",
    flat: "2D MAP",
    gameCamera: "TOP-DOWN GAME CAMERA",
    enterGame: "ENTER GAME MODE",
    exitGame: "EXIT GAME MODE",
    loadZone: "RELOAD CURRENT ZONE",
    zoneReady: "ZONE READY",
    zoneLoading: "LOADING NEARBY MAP…",
    streamingLabel: "STREAMING",
    streamingEconomy: "ECONOMY",
    streamingBalanced: "BALANCED",
    streamingPerformance: "PERFORMANCE",
    streamingOffline: "OFFLINE",
    exploredZones: "VISITED",
    miniMapTitle: "MINI-MAP", miniMapPlayer: "YOU",
    clearExplored: "CLEAR VISITED ZONES",
    exploredCleared: "Local exploration history cleared.",
    resumeTitle: "RESUME YOUR SESSION?",
    resumeContinue: "RESUME",
    resumeNew: "NEW EXPLORATION",
    saveSlotsTitle: "SAVED EXPLORATIONS",
    saveSlotsDescription: "Choose a save to continue or create a new one.",
    saveSlotCreate: "SAVE CURRENT",
    saveLimit: "You have reached the 10-save limit. Delete a save before creating another.",
    progressTitle: "PLAYER PROGRESSION", progressLevel: "LEVEL", progressNext: "NEXT LEVEL",
    progressDistance: "DISTANCE", progressZones: "ZONES", progressCities: "CITIES",
    progressAchievements: "ACHIEVEMENTS", progressRewards: "UNLOCKED REWARDS",
    moveHelp: "WASD / ARROWS TO MOVE",
    playerReady: "PLAYER READY",
    globe: "3D GLOBE",
    buildings: "3D BUILDINGS",
    terrain: "3D TERRAIN",
    loading: "CONNECTING TO THE WORLD MAP…",
    ready: "WORLD MAP READY",
    hint: "Drag to move · Scroll to zoom · Right-click to tilt",
    searching: "Searching places…",
    noResults: "No places found. Try another search.",
    searchError: "Search is temporarily unavailable. Please try again.",
    mapError: "The map could not load. Check your connection and refresh.",
    selectedLocation: "SELECTED LOCATION",
    coordinates: "COORDINATES",
    streetZoom: "ZOOM TO STREETS",
    cityOverview: "CITY OVERVIEW",
    pointsOfInterest: "POINTS OF INTEREST",
    placesOn: "PLACES ON",
    placesOff: "PLACES OFF",
    poiPark: "Parks & green spaces",
    poiEducation: "Education",
    poiTransport: "Public transport",
    poiCommerce: "Shops & services",
    poiCulture: "Culture & landmarks",
    poiHealth: "Health services",
    poiCivic: "Public services",
    poiSports: "Sports & recreation",
    poiLegend: "MAP LEGEND",
    poiZoomNote: "Visible when you zoom into a city (zoom 13+).",
    poiUnnamed: "Unnamed place",
    poiDetails: "Mapped place · OpenStreetMap data",
    buildingFallback: "Mapped building",
    virtualEntrance: "VIRTUAL GAME ENTRANCE",
    enterBuilding: "ENTER",
    interiorTitle: "Explorable interior",
    interiorNote: "Fictional game interior. The real map provides only the building footprint.",
    interiorHall: "Entrance hall",
    interiorRoom: "Main room",
    interiorStorage: "Side room",
    closeInterior: "LEAVE BUILDING",
    interiorMove: "MOVE: WASD / ARROWS · INTERACT: E",
    interiorInteract: "Press E near furniture to inspect it.",
    interiorDoor: "Door",
    interiorDoorOpen: "Open doorway",
    interiorHallObject: "Hall chair",
    interiorSofa: "Sofa",
    interiorTable: "Table",
    interiorCabinet: "Cabinet",
    interiorCrate: "Storage crate",
    interiorObjectHint: "You inspected",
    interiorDoorHint: "You passed through a doorway",
    interiorWallHint: "A wall blocks the way",
    interiorHallName: "Entrance hall",
    interiorMainName: "Living room",
    interiorSideName: "Storage room",
    buildingTypeHouse: "House",
    buildingTypeApartment: "Apartment building",
    buildingTypeSchool: "School",
    buildingTypeShop: "Shop",
    buildingTypeOffice: "Office",
    buildingTypeIndustrial: "Industrial building",
    buildingTypeOther: "Unclassified building",
    interiorDataSource: "Mapped building footprint · OpenStreetMap tags",
    interiorGeneratedNote: "Interior layout is generated from the mapped building category; it is not a surveyed floor plan.",
    roomKitchen: "Kitchen",
    roomBedroom: "Bedroom",
    roomClassroom: "Classroom",
    roomCorridor: "Corridor",
    roomShopFloor: "Sales floor",
    roomStock: "Stock room",
    roomReception: "Reception",
    roomWorkspace: "Workspace",
    roomWorkshop: "Workshop",
    furnitureBed: "Bed",
    furnitureDesk: "Desk",
    furnitureShelf: "Shelf",
    furnitureCounter: "Counter",
    furnitureBoard: "Class board",
    furnitureLocker: "Locker",
    furnitureWorkstation: "Workstation",
    furnitureMachine: "Workshop equipment",
    furnitureKitchen: "Kitchen unit",
    furniturePlant: "Plant pot",
    natureTitle: "Outdoor area",
    treeInfo: "Decorative tree · blocks movement",
    rockInfo: "Decorative rock · blocks movement",
  },
  fr: {
    eyebrow: "LE MONDE EST VOTRE TERRAIN DE JEU",
    title: "Explorez le<br /><span>monde réel.</span>",
    intro: "Découvrez des lieux, zoomez sur les villes et préparez-vous à explorer un monde inspiré de la géographie réelle.",
    search: "Rechercher une ville ou un lieu...",
    discover: "DÉCOUVRIR",
    mapView: "VUE DE LA CARTE",
    flat: "CARTE 2D",
    gameCamera: "CAMÉRA AÉRIENNE DU JEU",
    enterGame: "ENTRER EN MODE JEU",
    exitGame: "QUITTER LE MODE JEU",
    loadZone: "RECHARGER LA ZONE",
    zoneReady: "ZONE CHARGÉE",
    zoneLoading: "CHARGEMENT DE LA CARTE PROCHE…",
    streamingLabel: "CHARGEMENT",
    streamingEconomy: "ÉCONOMIE",
    streamingBalanced: "ÉQUILIBRÉ",
    streamingPerformance: "PERFORMANCES",
    streamingOffline: "HORS LIGNE",
    exploredZones: "VISITÉES",
    miniMapTitle: "MINI-CARTE", miniMapPlayer: "VOUS",
    clearExplored: "EFFACER LES ZONES VISITÉES",
    exploredCleared: "Historique local des explorations effacé.",
    resumeTitle: "REPRENDRE VOTRE SESSION ?",
    resumeContinue: "REPRENDRE",
    resumeNew: "NOUVELLE EXPLORATION",
    saveSlotsTitle: "EXPLORATIONS SAUVEGARDÉES",
    saveSlotsDescription: "Choisissez une sauvegarde ou créez-en une nouvelle.",
    saveSlotCreate: "ENREGISTRER",
    saveLimit: "Vous avez atteint la limite de 10 sauvegardes. Supprimez-en une avant d’en créer une autre.",
    progressTitle: "PROGRESSION DU JOUEUR", progressLevel: "NIVEAU", progressNext: "NIVEAU SUIVANT",
    progressDistance: "DISTANCE", progressZones: "ZONES", progressCities: "VILLES",
    progressAchievements: "SUCCÈS", progressRewards: "RÉCOMPENSES DÉBLOQUÉES",
    moveHelp: "ZQSD / FLÈCHES POUR BOUGER",
    playerReady: "JOUEUR PRÊT",
    globe: "GLOBE 3D",
    buildings: "BÂTIMENTS 3D",
    terrain: "RELIEF 3D",
    loading: "CONNEXION À LA CARTE DU MONDE…",
    ready: "CARTE DU MONDE PRÊTE",
    hint: "Glisser pour bouger · Molette pour zoomer · Clic droit pour incliner",
    searching: "Recherche des lieux…",
    noResults: "Aucun lieu trouvé. Essayez une autre recherche.",
    searchError: "Recherche indisponible pour le moment. Réessayez.",
    mapError: "La carte n'a pas pu charger. Vérifiez votre connexion puis actualisez.",
    selectedLocation: "LIEU SÉLECTIONNÉ",
    coordinates: "COORDONNÉES",
    streetZoom: "ZOOMER SUR LES RUES",
    cityOverview: "VUE D’ENSEMBLE",
    pointsOfInterest: "LIEUX D’INTÉRÊT",
    placesOn: "LIEUX ACTIVÉS",
    placesOff: "LIEUX DÉSACTIVÉS",
    poiPark: "Parcs et espaces verts",
    poiEducation: "Éducation",
    poiTransport: "Transports publics",
    poiCommerce: "Commerces et services",
    poiCulture: "Culture et monuments",
    poiHealth: "Services de santé",
    poiCivic: "Services publics",
    poiSports: "Sports et loisirs",
    poiLegend: "LÉGENDE DE LA CARTE",
    poiZoomNote: "Visible en zoomant sur une ville (niveau 13+).",
    poiUnnamed: "Lieu sans nom",
    poiDetails: "Lieu cartographié · Données OpenStreetMap",
    buildingFallback: "Bâtiment cartographié",
    virtualEntrance: "ENTRÉE VIRTUELLE DU JEU",
    enterBuilding: "ENTRER",
    interiorTitle: "Intérieur explorable",
    interiorNote: "Intérieur fictif créé pour le jeu. La carte réelle fournit uniquement l’emprise du bâtiment.",
    interiorHall: "Hall d’entrée",
    interiorRoom: "Pièce principale",
    interiorStorage: "Pièce annexe",
    closeInterior: "SORTIR DU BÂTIMENT",
    interiorMove: "DÉPLACEMENT : ZQSD / FLÈCHES · INTERACTION : E",
    interiorInteract: "Appuyez sur E près d’un meuble pour l’examiner.",
    interiorDoor: "Porte",
    interiorDoorOpen: "Passage ouvert",
    interiorHallObject: "Chaise du hall",
    interiorSofa: "Canapé",
    interiorTable: "Table",
    interiorCabinet: "Armoire",
    interiorCrate: "Caisse de rangement",
    interiorObjectHint: "Vous examinez",
    interiorDoorHint: "Vous avez franchi une porte",
    interiorWallHint: "Un mur bloque le passage",
    interiorHallName: "Hall d’entrée",
    interiorMainName: "Salon",
    interiorSideName: "Réserve",
    buildingTypeHouse: "Maison",
    buildingTypeApartment: "Immeuble d’habitation",
    buildingTypeSchool: "École",
    buildingTypeShop: "Commerce",
    buildingTypeOffice: "Bureau",
    buildingTypeIndustrial: "Bâtiment industriel",
    buildingTypeOther: "Bâtiment non classé",
    interiorDataSource: "Emprise du bâtiment cartographiée · Balises OpenStreetMap",
    interiorGeneratedNote: "L’aménagement est généré selon la catégorie cartographiée ; ce n’est pas un plan intérieur relevé sur place.",
    roomKitchen: "Cuisine",
    roomBedroom: "Chambre",
    roomClassroom: "Salle de classe",
    roomCorridor: "Couloir",
    roomShopFloor: "Espace de vente",
    roomStock: "Réserve",
    roomReception: "Accueil",
    roomWorkspace: "Espace de travail",
    roomWorkshop: "Atelier",
    furnitureBed: "Lit",
    furnitureDesk: "Bureau",
    furnitureShelf: "Étagère",
    furnitureCounter: "Comptoir",
    furnitureBoard: "Tableau de classe",
    furnitureLocker: "Casier",
    furnitureWorkstation: "Poste de travail",
    furnitureMachine: "Équipement d’atelier",
    furnitureKitchen: "Meuble de cuisine",
    furniturePlant: "Pot de plante",
    natureTitle: "Espace extérieur",
    treeInfo: "Arbre décoratif · bloque le déplacement",
    rockInfo: "Rocher décoratif · bloque le déplacement",
  },
} as const;

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
let virtualEntranceMarker: maplibregl.Marker | null = null;
let selectedBuildingName = "";
let selectedBuildingType: BuildingKind = "other";
let selectedBuildingLevels: number | null = null;
let activeZoneKey = "";
let interiorPosition = { x: 2, y: 4 };
let interiorLastDirection = "down";
let interiorLastMessage = "";
const GAME_ZONE_METERS = 750;
const WORLD_METERS = 40075016.68557849;
type StreamingTier = "economy" | "balanced" | "performance";
interface NetworkInformationLike extends EventTarget {
  effectiveType?: string;
  downlink?: number;
  saveData?: boolean;
}
interface StreamingProfile {
  tier: StreamingTier;
  tileCacheSize: number;
  zoneCacheLimit: number;
  prefetchDepth: number;
}
function detectStreamingProfile(): StreamingProfile {
  const browser = navigator as Navigator & { connection?: NetworkInformationLike; deviceMemory?: number };
  const connection = browser.connection;
  const memory = browser.deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const slowConnection = connection?.saveData === true
    || ["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? "")
    || (connection?.downlink !== undefined && connection.downlink < 1.5);
  if (!navigator.onLine || slowConnection || memory <= 2 || cores <= 2) {
    return { tier: "economy", tileCacheSize: 48, zoneCacheLimit: 25, prefetchDepth: 1 };
  }
  if ((connection?.downlink ?? 0) >= 8 && memory >= 8 && cores >= 8) {
    return { tier: "performance", tileCacheSize: 256, zoneCacheLimit: 81, prefetchDepth: 3 };
  }
  return { tier: "balanced", tileCacheSize: 128, zoneCacheLimit: 49, prefetchDepth: 2 };
}
let streamingProfile = detectStreamingProfile();
let protectedZoneKeys = new Set<string>();
let lastPredictionSignature = "";
let lastVectorPrefetchSignature = "";
let vectorTileTemplatesPromise: Promise<string[]> | null = null;
const prefetchedVectorTiles = new Set<string>();
const pendingVectorTiles = new Set<string>();
const zoneObstacleCache = new Map<string, GeoJSON.FeatureCollection<GeoJSON.Point>>();
const EXPLORED_STORAGE_KEY = "juju-world-explored-zones-v1";
const SESSION_STORAGE_KEY = "juju-world-session-v1";
const SAVE_SLOTS_STORAGE_KEY = "juju-world-save-slots-v1";
const SESSION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const SAVE_SLOT_LIMIT = 10;
interface SavedGameSession {
  lng: number;
  lat: number;
  zoneX: number;
  zoneY: number;
  movementSpeed: number;
  zoom: number;
  savedAt: number;
}
interface PlayerProgress { xp:number; distanceMeters:number; remainder:number; zones:string[]; cities:string[]; achievements:string[] }
interface DailyMission { id:string; progress:number; target:number; rewardXp:number; completedAt:number | null }
interface DailyMissionState { date:string; missions:DailyMission[] }
interface MissionHistoryEntry { id:string; date:string; completedAt:number; rewardXp:number }
interface SavedGameSlot {
  id:string; name:string; session:SavedGameSession; progress:PlayerProgress;
  dailyMissions?:DailyMissionState; missionHistory?:MissionHistoryEntry[];
  createdAt:number; updatedAt:number;
}
const emptyProgress=():PlayerProgress=>({xp:0,distanceMeters:0,remainder:0,zones:[],cities:[],achievements:[]});
const localDateKey=():string=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");};
const createDailyMissionState=():DailyMissionState=>({date:localDateKey(),missions:[
 {id:"zones",progress:0,target:3,rewardXp:75,completedAt:null},
 {id:"city",progress:0,target:1,rewardXp:100,completedAt:null},
 {id:"distance",progress:0,target:1000,rewardXp:100,completedAt:null},
]});
function ensureDailyMissions(slot:SavedGameSlot):DailyMissionState {
 if(!slot.dailyMissions||slot.dailyMissions.date!==localDateKey())slot.dailyMissions=createDailyMissionState();
 return slot.dailyMissions;
}
function missionLabel(id:string):string {
 const labels:Record<string,[string,string]>={zones:["Explore 3 new zones","Explorer 3 nouvelles zones"],city:["Discover a new city","Découvrir une nouvelle ville"],distance:["Travel 1,000 metres","Parcourir 1 000 mètres"]};
 return labels[id]?.[language==="en"?0:1]??id;
}
function updateDailyMission(slot:SavedGameSlot,id:string,amount:number):boolean {
 const state=ensureDailyMissions(slot),mission=state.missions.find(item=>item.id===id);
 if(!mission||mission.completedAt||amount<=0)return false;
 mission.progress=Math.min(mission.target,mission.progress+amount);
 if(mission.progress<mission.target)return false;
 mission.completedAt=Date.now();slot.progress.xp+=mission.rewardXp;
 slot.missionHistory=[...(slot.missionHistory??[]),{id,date:state.date,completedAt:mission.completedAt,rewardXp:mission.rewardXp}].slice(-100);
 checkAchievements(slot.progress);
 showToast(language==="fr"?`Mission terminée : ${missionLabel(id)} · +${mission.rewardXp} XP`:`Mission complete: ${missionLabel(id)} · +${mission.rewardXp} XP`);
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
function normalizeProgress(v:unknown):PlayerProgress {
 if(!v||typeof v!=="object")return emptyProgress();const p=v as Partial<PlayerProgress>;
 return {xp:Number.isFinite(p.xp)?Math.max(0,Math.floor(p.xp!)):0,distanceMeters:Number.isFinite(p.distanceMeters)?Math.max(0,p.distanceMeters!):0,remainder:Number.isFinite(p.remainder)?Math.max(0,Math.min(24.999,p.remainder!)):0,zones:Array.isArray(p.zones)?p.zones.filter((x):x is string=>typeof x==="string").slice(-1000):[],cities:Array.isArray(p.cities)?p.cities.filter((x):x is string=>typeof x==="string").slice(-200):[],achievements:Array.isArray(p.achievements)?p.achievements.filter((x):x is string=>typeof x==="string"):[]};
}
function activeSlot():SavedGameSlot|undefined{return savedGameSlots.find(x=>x.id===activeSaveSlotId);}
function checkAchievements(p:PlayerProgress):void {
 achievementDefs.forEach(a=>{if(!p.achievements.includes(a.id)&&a.test(p)){p.achievements.push(a.id);showToast(language==="fr"?`Succès débloqué : ${a.fr} · ${a.rewardFr}`:`Achievement unlocked: ${a.en} · ${a.rewardEn}`);}});
}
function saveProgress():void {const slot=activeSlot();if(!slot)return;slot.updatedAt=Date.now();persistSavedGameSlots();renderSavedGameSlots();renderPlayerProgress();renderDailyMissions();}
function discoverProgressZone(x:number,y:number):void {
 const slot=activeSlot();if(!slot)return;const key=`${x}:${y}`;if(slot.progress.zones.includes(key))return;
 slot.progress.zones.push(key);if(slot.progress.zones.length>1000)slot.progress.zones.shift();slot.progress.xp+=25;updateDailyMission(slot,"zones",1);checkAchievements(slot.progress);saveProgress();
}
function discoverProgressCity(name:string,country?:string):void {
 const slot=activeSlot();if(!slot)return;const key=`${name.trim().toLocaleLowerCase()}|${(country??"").trim().toLocaleLowerCase()}`;if(!name.trim()||slot.progress.cities.includes(key))return;
 slot.progress.cities.push(key);if(slot.progress.cities.length>200)slot.progress.cities.shift();slot.progress.xp+=50;updateDailyMission(slot,"city",1);checkAchievements(slot.progress);saveProgress();
}
function addTravelDistance(from:maplibregl.LngLat,to:maplibregl.LngLat):void {
 const slot=activeSlot();if(!slot)return;const rad=Math.PI/180,lat1=from.lat*rad,lat2=to.lat*rad,dLat=(to.lat-from.lat)*rad,dLng=(to.lng-from.lng)*rad;
 const a=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
 const meters=6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));if(!Number.isFinite(meters)||meters<=0||meters>100)return;
 slot.progress.distanceMeters+=meters;const total=slot.progress.remainder+meters;const xp=Math.floor(total/25);slot.progress.remainder=total-xp*25;if(xp>0)slot.progress.xp+=xp;
 updateDailyMission(slot,"distance",meters);checkAchievements(slot.progress);if(xp>0)saveProgress();
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
function validGameSession(value: unknown): value is SavedGameSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<SavedGameSession>;
  return Number.isFinite(session.lng) && (session.lng as number) >= -180 && (session.lng as number) <= 180
    && Number.isFinite(session.lat) && (session.lat as number) >= -85.051129 && (session.lat as number) <= 85.051129
    && Number.isInteger(session.zoneX) && Number.isInteger(session.zoneY)
    && Number.isFinite(session.movementSpeed) && Number.isFinite(session.zoom)
    && Number.isFinite(session.savedAt) && (session.savedAt as number) <= Date.now()
    && Date.now() - (session.savedAt as number) <= SESSION_MAX_AGE_MS;
}
function loadSavedGameSlots(): void {
  try {
    const raw = localStorage.getItem(SAVE_SLOTS_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        savedGameSlots = parsed.filter((item): item is SavedGameSlot =>
          !!item && typeof item.id === "string" && typeof item.name === "string"
          && validGameSession(item.session) && Number.isFinite(item.createdAt)
          && Number.isFinite(item.updatedAt)
        ).map((item) => ({
          ...item,
          name: item.name.trim().slice(0, 32) || "Exploration",
          progress: normalizeProgress(item.progress),
          dailyMissions: item.dailyMissions && typeof item.dailyMissions.date === "string" && Array.isArray(item.dailyMissions.missions) ? item.dailyMissions : createDailyMissionState(),
          missionHistory: Array.isArray(item.missionHistory) ? item.missionHistory.filter((entry) => entry && typeof entry.id === "string" && typeof entry.date === "string" && Number.isFinite(entry.completedAt) && Number.isFinite(entry.rewardXp)).slice(-100) : [],
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
        if (validGameSession(legacy)) {
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
  speed.type = "range"; speed.min = "80"; speed.max = "360"; speed.step = "10"; speed.value = String(movementSpeed);
  speed.addEventListener("input", () => {
    movementSpeed = Number(speed.value);
    const control = document.querySelector<HTMLInputElement>("#game-speed");
    const value = document.querySelector<HTMLElement>("#game-speed-value");
    if (control) control.value = speed.value;
    if (value) value.textContent = speed.value;
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
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    for (const item of parsed) {
      if (!item || !Number.isInteger(item.x) || !Number.isInteger(item.y)
        || !Number.isFinite(item.visitedAt)) continue;
      const zone: ExploredZone = { x: item.x, y: item.y, visitedAt: item.visitedAt };
      exploredZones.set(`${zone.x}:${zone.y}`, zone);
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
    syncMiniMap(true);
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
  searchInput.placeholder = translations[next].search;
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
}


function selectPlace(place: PlaceResult): void {
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
          "park", "#79c58d",
          "school", "#72b7ed", "college", "#72b7ed", "library", "#72b7ed",
          "bus", "#e9bd69", "railway", "#e9bd69",
          "shop", "#d9a1e8", "grocery", "#d9a1e8", "cafe", "#d9a1e8", "fast_food", "#d9a1e8", "post", "#d9a1e8",
          "hospital", "#ed8585",
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

function mercatorPosition(lng: number, lat: number): { x: number; y: number } {
  const clampedLat = Math.max(-85.051129, Math.min(85.051129, lat));
  const radians = clampedLat * Math.PI / 180;
  return {
    x: (lng + 180) / 360,
    y: (1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2,
  };
}

function zoneFor(lng: number, lat: number): { x: number; y: number; key: string } {
  const size = GAME_ZONE_METERS / WORLD_METERS;
  const point = mercatorPosition(lng, lat);
  const x = Math.floor(point.x / size);
  const y = Math.floor(point.y / size);
  return { x, y, key: `${x}:${y}` };
}

function spawnForZone(zoneX: number, zoneY: number): [number, number] {
  const size = GAME_ZONE_METERS / WORLD_METERS;
  const x = (zoneX + 0.5) * size;
  const y = (zoneY + 0.5) * size;
  return [
    x * 360 - 180,
    Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI,
  ];
}

function zonePolygon(zoneX: number, zoneY: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const size = GAME_ZONE_METERS / WORLD_METERS;
  const west = zoneX * size;
  const east = west + size;
  const north = zoneY * size;
  const south = north + size;
  const toLngLat = (x: number, y: number): [number, number] => [
    x * 360 - 180,
    Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI,
  ];
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [[
      toLngLat(west, north), toLngLat(east, north),
      toLngLat(east, south), toLngLat(west, south),
      toLngLat(west, north),
    ]] },
  };
}

function createZoneObstacles(zoneX: number, zoneY: number): GeoJSON.FeatureCollection<GeoJSON.Point> {
  // Keep a small LRU cache so revisiting a streamed zone does not regenerate its scenery.
  const cacheKey = `${zoneX}:${zoneY}`;
  const cached = zoneObstacleCache.get(cacheKey);
  if (cached) {
    zoneObstacleCache.delete(cacheKey);
    zoneObstacleCache.set(cacheKey, cached);
    return cached;
  }
  // Deterministic decorative obstacles: the same zone always recreates the same layout.
  let seed = Math.abs((zoneX * 73856093) ^ (zoneY * 19349663)) || 1;
  const random = (): number => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const size = GAME_ZONE_METERS / WORLD_METERS;
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
  for (let i = 0; i < 28; i += 1) {
    const localX = 0.08 + random() * 0.84;
    const localY = 0.08 + random() * 0.84;
    // Keep the central spawn point clear.
    if (Math.hypot(localX - 0.5, localY - 0.5) < 0.13) continue;
    const x = (zoneX + localX) * size;
    const y = (zoneY + localY) * size;
    const lng = x * 360 - 180;
    const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI;
    features.push({
      type: "Feature",
      properties: { kind: random() > 0.28 ? "tree" : "rock", radius: random() > 0.5 ? 13 : 10 },
      geometry: { type: "Point", coordinates: [lng, lat] },
    });
  }
  const collection: GeoJSON.FeatureCollection<GeoJSON.Point> = { type: "FeatureCollection", features };
  zoneObstacleCache.set(cacheKey, collection);
  trimZoneObstacleCache();
  return collection;
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
    const centerX = origin.x + stepX * distance;
    const centerY = origin.y + stepY * distance;
    for (let side = -1; side <= 1; side += 1) {
      const zoneX = centerX + (stepY !== 0 ? side : 0);
      const zoneY = centerY + (stepX !== 0 ? side : 0);
      createZoneObstacles(zoneX, zoneY);
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
  $("#game-streaming-detail").textContent = language === "en"
    ? `Cache ${streamingProfile.zoneCacheLimit} · Ahead ${streamingProfile.prefetchDepth}`
    : `Cache ${streamingProfile.zoneCacheLimit} · Avance ${streamingProfile.prefetchDepth}`;
}

function applyStreamingProfile(): void {
  streamingProfile = detectStreamingProfile();
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
}

function updateGameZone(lng: number, lat: number): void {
  const zone = zoneFor(lng, lat);
  if (zone.key === activeZoneKey) return;
  activeZoneKey = zone.key;
  recordExploredZone(zone.x, zone.y);
  if (gameMode) discoverProgressZone(zone.x, zone.y);
  protectedZoneKeys = new Set<string>();
  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) protectedZoneKeys.add(`${zone.x + x}:${zone.y + y}`);
  }
  const source = map.getSource("juju-active-zone") as maplibregl.GeoJSONSource | undefined;
  source?.setData(zonePolygon(zone.x, zone.y));
  const obstacles = map.getSource("juju-zone-obstacles") as maplibregl.GeoJSONSource | undefined;
  // Keep the active 3x3 visible; prepare a wider ring only on capable devices.
  const nearbyFeatures: GeoJSON.Feature<GeoJSON.Point>[] = [];
  const warmRadius = streamingProfile.tier === "economy" ? 1 : 2;
  for (let offsetX = -warmRadius; offsetX <= warmRadius; offsetX += 1) {
    for (let offsetY = -warmRadius; offsetY <= warmRadius; offsetY += 1) {
      const zoneFeatures = createZoneObstacles(zone.x + offsetX, zone.y + offsetY).features;
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
    properties: { label: "ZONE SPAWN" },
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
  const center = map.getCenter();
  $("#game-zone-coordinates").textContent = `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`;
  updateGameZone(center.lng, center.lat);
}

function isBuildingCollision(lng: number, lat: number): boolean {
  const point = map.project([lng, lat]);
  if (map.getLayer("juju-collision-buildings") && map.getZoom() >= 15) {
    const radius = 7;
    const samples: [number, number][] = [
      [0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius],
    ];
    const buildingHit = samples.some(([dx, dy]) => map.queryRenderedFeatures(
      [point.x + dx, point.y + dy],
      { layers: ["juju-collision-buildings"] },
    ).length > 0);
    if (buildingHit) return true;
  }
  // Procedural trees and rocks must collide at every game zoom level.
  const zone = zoneFor(lng, lat);
  return createZoneObstacles(zone.x, zone.y).features.some((feature) => {
    const obstaclePoint = map.project(feature.geometry.coordinates as [number, number]);
    const radius = feature.properties?.kind === "tree" ? 17 : 13;
    return Math.hypot(obstaclePoint.x - point.x, obstaclePoint.y - point.y) < radius;
  });
}

type BuildingKind = "house" | "apartment" | "school" | "shop" | "office" | "industrial" | "other";
type InteriorObject = { id: string; x: number; y: number; label: string; glyph: string };
type InteriorDoor = { id: string; x: number; y: number; room: string };
let interiorObjects: InteriorObject[] = [];
let interiorDoors: InteriorDoor[] = [];

function classifyBuilding(tags: Record<string, unknown>): BuildingKind {
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

function buildingTypeLabel(kind: BuildingKind): string {
  const key = ({
    house: "buildingTypeHouse", apartment: "buildingTypeApartment", school: "buildingTypeSchool",
    shop: "buildingTypeShop", office: "buildingTypeOffice", industrial: "buildingTypeIndustrial",
    other: "buildingTypeOther",
  } as const)[kind];
  return translations[language][key];
}

function createInteriorForBuilding(kind: BuildingKind): void {
  const layouts: Record<BuildingKind, { objects: InteriorObject[]; doors: InteriorDoor[] }> = {
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
  interiorObjects = layouts[kind].objects;
  interiorDoors = layouts[kind].doors;
}

function interiorCellKey(x: number, y: number): string { return `${x},${y}`; }

function renderInterior(): void {
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

function startGameMode(resumeSession: SavedGameSession | null = null): void {
  if (!map.loaded()) {
    showToast(language === "en" ? "The world map is still loading. Please wait a moment." : "La carte du monde est en cours de chargement. Patientez un instant.");
    return;
  }
  if (!activeSlot() && savedGameSlots.length >= SAVE_SLOT_LIMIT) {
    showToast(translations[language].saveLimit);
    return;
  }
  gameMode = true;
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
  const spawnCoordinates = resumeSession
    ? [resumeSession.lng, resumeSession.lat] as [number, number]
    : spawnForZone(currentZone.x, currentZone.y);
  const spawn = new maplibregl.LngLat(spawnCoordinates[0], spawnCoordinates[1]);
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
  player.setAttribute("aria-label", "Player");
  playerMarker?.remove();
  playerMarker = new maplibregl.Marker({ element: player, anchor: "center" }).setLngLat(spawn).addTo(map);
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
  $("#app").classList.remove("game-mode");
  $("#game-mode-toggle").textContent = translations[language].enterGame;
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
}

function movementTick(time: number): void {
  movementFrame = 0;
  if (!gameMode || !playerMarker || heldDirections.size === 0) {
    previousMovementTime = 0;
    playerMarker?.getElement().classList.remove("is-moving");
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
    dx /= length;
    dy /= length;
    const center = map.getCenter();
    const distance = movementSpeed * delta;
    const bearing = Math.atan2(dx, -dy);
    const angularDistance = distance / 6371000;
    const latitude = center.lat * Math.PI / 180;
    const nextLatitude = Math.asin(
      Math.sin(latitude) * Math.cos(angularDistance)
      + Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const nextLongitude = center.lng * Math.PI / 180 + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
      Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(nextLatitude),
    );
    const next = new maplibregl.LngLat(
      ((nextLongitude * 180 / Math.PI + 540) % 360) - 180,
      nextLatitude * 180 / Math.PI,
    );
    if (isBuildingCollision(next.lng, next.lat)) {
      $("#game-player-status").textContent = language === "en" ? "BLOCKED" : "BLOQUÉ";
      heldDirections.clear();
      playerMarker.getElement().classList.remove("is-moving");
      previousMovementTime = 0;
      return;
    }
    const activeDirection = [...heldDirections].map((key) => directionKeys[key]).filter(Boolean).at(-1);
    addTravelDistance(center, next);
    // Warm deterministic scenery ahead of the current movement vector before entering it.
    warmPredictiveZones(next.lng, next.lat, dx, dy);
    void prefetchVectorTilesAhead(next.lng, next.lat, dx, dy);
    const playerElement = playerMarker.getElement();
    if (activeDirection) playerElement.dataset.direction = activeDirection.direction;
    playerElement.classList.add("is-moving");
    $("#game-player-status").textContent = translations[language].playerReady;
    playerMarker.setLngLat(next);
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
  }
}

function setGameCamera(): void {
  if (gameMode) {
    stopGameMode();
    return;
  }
  startGameMode();
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
  ensureGameLayers();
  add3DBuildings();
  addPointsOfInterest();
  applyStreamingProfile();
});

map.on("error", (event) => {
  if (event.error) console.warn("Map resource error:", event.error.message);
});



$("#home-play").addEventListener("click", () => {
  if (!map.loaded()) {
    showToast(language === "en" ? "The world map is still loading. Please wait a moment." : "La carte du monde est en cours de chargement. Patientez un instant.");
    return;
  }
  if (savedGameSlots.length > 0) openHomeSaves();
  else {
    startGameMode();
    if (gameMode) {
      const home = document.querySelector<HTMLElement>("#home-screen");
      if (home) home.hidden = true;
    }
  }
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
});

$("#game-clear-explored").addEventListener("click", clearExploredZones);
$("#save-slot-create").addEventListener("click", createNamedSaveSlot);
$("#resume-session-new").addEventListener("click", () => {
  clearActiveSaveSlot();
  const panel = document.querySelector<HTMLElement>("#resume-session");
  if (panel) panel.hidden = true;
  startGameMode();
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
map.on("error", () => {
  if (!map.loaded()) mapStatus.textContent = translations[language].loading;
});
