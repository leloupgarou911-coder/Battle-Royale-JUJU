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
let toastTimeout = 0;

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

$("#language-toggle").addEventListener("click", () => {
  setLanguage(language === "en" ? "fr" : "en");
});

$("#flat-view").addEventListener("click", () => {
  map.setProjection({ type: "mercator" });
  map.easeTo({ pitch: 0, bearing: 0, duration: 900 });
  $("#flat-view").classList.add("active");
  $("#globe-view").classList.remove("active");
});

$("#globe-view").addEventListener("click", () => {
  map.setProjection({ type: "globe" });
  map.easeTo({ pitch: 18, bearing: -8, duration: 900 });
  $("#globe-view").classList.add("active");
  $("#flat-view").classList.remove("active");
});

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
      map.setTerrain(null);
      map.easeTo({ pitch: 18, bearing: -8, duration: 900 });
      map.setProjection({ type: "globe" });
      terrainEnabled = false;
      terrainButton.classList.remove("active");
      $("#flat-view").classList.remove("active");
      $("#globe-view").classList.add("active");
    }
  } catch (error) {
    console.warn("Terrain could not be enabled:", error);
    showToast(language === "en" ? "3D terrain is temporarily unavailable." : "Le relief 3D est temporairement indisponible.");
  }
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
      button.addEventListener("click", () => {
        map.flyTo({
          center: [place.longitude, place.latitude],
          zoom: 14,
          pitch: 52,
          bearing: -18,
          duration: 1800,
          essential: true,
        });
        searchResults.replaceChildren();
        searchInput.value = place.name;
      });
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
