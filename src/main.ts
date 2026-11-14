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
    poiUnnamed: "Unnamed place",
    poiDetails: "Mapped place · OpenStreetMap data",
  },
  fr: {
    eyebrow: "LE MONDE EST VOTRE TERRAIN DE JEU",
    title: "Explorez le<br /><span>monde réel.</span>",
    intro: "Découvrez des lieux, zoomez sur les villes et préparez-vous à explorer un monde inspiré de la géographie réelle.",
    search: "Rechercher une ville ou un lieu...",
    discover: "DÉCOUVRIR",
    mapView: "VUE DE LA CARTE",
    flat: "CARTE 2D",
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
    poiUnnamed: "Lieu sans nom",
    poiDetails: "Lieu cartographié · Données OpenStreetMap",
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
let terrainEnabled = false;\nlet placesVisible = true;
let toastTimeout = 0;
let selectedPlaceMarker: maplibregl.Marker | null = null;

const map: MapLibreMap = new maplibregl.Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/liberty",
  center: [2.5, 28],
  zoom: 3.7,
  minZoom: 1.5,
  maxZoom: 19,
  pitch: 18,
  bearing: -8,
  maxPitch: 75,
  attributionControl: false,
  renderWorldCopies: false,
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
    pitch: 58,
    bearing: -18,
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
          "park", "school", "college", "library", "bus", "railway",
          "shop", "grocery", "cafe", "fast_food", "attraction",
          "art_gallery", "castle", "town_hall", "stadium", "zoo",
          "hospital", "post"
        ]]],
        ["!", ["in", ["get", "subclass"], ["literal", ["alcohol", "beverages", "wine", "tobacco"]]]],
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
          "park", "school", "college", "library", "bus", "railway",
          "shop", "grocery", "cafe", "fast_food", "attraction",
          "art_gallery", "castle", "town_hall", "stadium", "zoo",
          "hospital", "post"
        ]]],
        ["!", ["in", ["get", "subclass"], ["literal", ["alcohol", "beverages", "wine", "tobacco"]]]],
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
  if (className === "park") return translations[language].poiPark;
  if (["school", "college", "library"].includes(className)) return translations[language].poiEducation;
  if (["bus", "railway"].includes(className)) return translations[language].poiTransport;
  if (["shop", "grocery", "cafe", "fast_food", "post"].includes(className)) return translations[language].poiCommerce;
  if (className === "hospital") return translations[language].poiHealth;
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
  $("#globe-view").classList.toggle("active", !isFlat);
}

map.on("load", () => {
  mapStatus.textContent = translations[language].ready;
  try {
    map.setProjection({ type: "globe" });
  } catch {
    // Older browser/GPU combinations can still use the standard 2D map.
  }
  add3DBuildings();
});

map.on("style.load", () => {
  add3DBuildings();
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
  map.easeTo({ zoom: 17, pitch: 62, duration: 900 });
});

$("#place-card-overview").addEventListener("click", () => {
  map.easeTo({ zoom: 12, pitch: 35, duration: 900 });
});

$("#language-toggle").addEventListener("click", () => {
  setLanguage(language === "en" ? "fr" : "en");
});

$("#flat-view").addEventListener("click", () => setMapView("flat"));
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
    .setLngLat(event.lngLat)
    .setDOMContent(content)
    .addTo(map);
});

map.on("mouseenter", "juju-poi-points", () => { map.getCanvas().style.cursor = "pointer"; });
map.on("mouseleave", "juju-poi-points", () => { map.getCanvas().style.cursor = ""; });

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
