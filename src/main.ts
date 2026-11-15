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
const ZONE_CACHE_LIMIT = 81;
const zoneObstacleCache = new Map<string, GeoJSON.FeatureCollection<GeoJSON.Point>>();

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
  // Keep nearby vector tiles available as the player crosses world zones.
  maxTileCacheSize: 256,
  minTileCacheSize: 64,
  dragRotate: false,
  pitchWithRotate: false,
  touchPitch: false,
});

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
  $("#language-toggle").textContent = next === "en" ? "FR" : "EN";
  $("#language-toggle").setAttribute("aria-label", next === "en" ? "Passer en français" : "Switch to English");
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
        ["has", "name"],
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
  while (zoneObstacleCache.size > ZONE_CACHE_LIMIT) {
    const oldestKey = zoneObstacleCache.keys().next().value;
    if (oldestKey === undefined) break;
    zoneObstacleCache.delete(oldestKey);
  }
  return collection;
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
}

function setGameWorldVisibility(visible: boolean): void {
  const visibility = visible ? "visible" : "none";
  [
    "juju-zone-fill", "juju-zone-outline", "juju-zone-rocks",
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
  const source = map.getSource("juju-active-zone") as maplibregl.GeoJSONSource | undefined;
  source?.setData(zonePolygon(zone.x, zone.y));
  const obstacles = map.getSource("juju-zone-obstacles") as maplibregl.GeoJSONSource | undefined;
  // Stream decorative props for the active zone and its eight neighbours.
  const nearbyFeatures: GeoJSON.Feature<GeoJSON.Point>[] = [];
  // Render the active zone plus its eight neighbours; warm a second ring for the next move.
  for (let offsetX = -2; offsetX <= 2; offsetX += 1) {
    for (let offsetY = -2; offsetY <= 2; offsetY += 1) {
      const zoneFeatures = createZoneObstacles(zone.x + offsetX, zone.y + offsetY).features;
      if (Math.abs(offsetX) <= 1 && Math.abs(offsetY) <= 1) nearbyFeatures.push(...zoneFeatures);
    }
  }
  obstacles?.setData({ type: "FeatureCollection", features: nearbyFeatures });
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
      const sourceReady = map.isSourceLoaded("openmaptiles") && map.areTilesLoaded();
      $("#game-zone-status").textContent = sourceReady
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

function startGameMode(): void {
  gameMode = true;
  heldDirections.clear();
  disableTerrain();
  map.setProjection({ type: "mercator" });
  map.setPitch(0);
  map.setBearing(0);
  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();
  const current = map.getCenter();
  const currentZone = zoneFor(current.lng, current.lat);
  const spawnCoordinates = spawnForZone(currentZone.x, currentZone.y);
  const spawn = new maplibregl.LngLat(spawnCoordinates[0], spawnCoordinates[1]);
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
  map.easeTo({ center: spawn, zoom: Math.max(16, map.getZoom()), pitch: 0, bearing: 0, duration: 850 });
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
  showToast(language === "en" ? "Game mode enabled. Move with WASD or arrow keys." : "Mode jeu activé. Déplacez-vous avec ZQSD ou les flèches.");
}

function stopGameMode(): void {
  gameMode = false;
  stopMovementLoop();
  setGameWorldVisibility(false);
  closeBuildingInterior();
  playerMarker?.remove();
  playerMarker = null;
  $("#app").classList.remove("game-mode");
  $("#game-mode-toggle").textContent = translations[language].enterGame;
  map.easeTo({ pitch: 0, bearing: 0, duration: 400 });
}

const heldDirections = new Set<string>();
let movementFrame = 0;
let previousMovementTime = 0;
let movementSpeed = 180;

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
    dx = (dx / length) * movementSpeed * delta;
    dy = (dy / length) * movementSpeed * delta;
    const center = map.getCenter();
    const point = map.project(center);
    const next = map.unproject([point.x + dx, point.y + dy]);
    if (isBuildingCollision(next.lng, next.lat)) {
      $("#game-player-status").textContent = language === "en" ? "BLOCKED" : "BLOQUÉ";
      heldDirections.clear();
      playerMarker.getElement().classList.remove("is-moving");
      previousMovementTime = 0;
      return;
    }
    const activeDirection = [...heldDirections].map((key) => directionKeys[key]).filter(Boolean).at(-1);
    const playerElement = playerMarker.getElement();
    if (activeDirection) playerElement.dataset.direction = activeDirection.direction;
    playerElement.classList.add("is-moving");
    $("#game-player-status").textContent = translations[language].playerReady;
    playerMarker.setLngLat(next);
    map.jumpTo({ center: next });
    updateGameHud();
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

map.on("moveend", () => { if (gameMode) updateGameHud(); });

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
});

map.on("style.load", () => {
  ensureGameLayers();
  add3DBuildings();
  addPointsOfInterest();
});

map.on("error", (event) => {
  if (event.error) console.warn("Map resource error:", event.error.message);
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
window.addEventListener("blur", stopMovementLoop);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopMovementLoop();
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
  speedValue.textContent = String(movementSpeed);
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

async function searchPlaces(query: string): Promise<void> {
  searchResults.replaceChildren();
  if (query.trim().length < 2) return;

  const loading = document.createElement("p");
  loading.className = "search-message";
  loading.textContent = translations[language].searching;
  searchResults.append(loading);

  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.search = new URLSearchParams({
      name: query.trim(),
      count: "6",
      language: language,
      format: "json",
    }).toString();

    const response = await fetch(url);
    if (!response.ok) throw new Error("Geocoding request failed");
    const data = (await response.json()) as { results?: PlaceResult[] };
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
  } catch {
    searchResults.replaceChildren();
    const error = document.createElement("p");
    error.className = "search-message";
    error.textContent = translations[language].searchError;
    searchResults.append(error);
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
