# Battle-Royale-JUJU

**JUJU World** is the first browser-based exploration layer for Battle-Royale-JUJU. The project aims to build a navigable virtual world inspired by real geography, starting with a global map and gradually adding selected 3D environments.

## Current version — Alpha 0.2

- Interactive global map powered by MapLibre GL JS.
- OpenFreeMap map style with OpenStreetMap-based geographic data.
- Globe and flat map projections.
- Search for cities and places using Open-Meteo Geocoding.
- Quick exploration shortcuts for a few example cities.
- 3D building extrusions where building data is available at close zoom levels.
- Worldwide points of interest from OpenMapTiles/OpenStreetMap: parks, schools, universities, libraries, public transport, shops, restaurants, banks, health facilities, public services, sports facilities, museums, monuments, and landmarks where mapped.
- Clickable POI markers with place names and category details; POI labels appear at closer zoom levels.
- Global map coverage: the same geographic layers and place categories are used in every country, not only Algeria.
- English interface by default, with a French language switch.
- Responsive desktop and mobile layout.
- Progressive world streaming: MapLibre requests vector tiles for the visible area as the camera moves, across all countries.
- Game-zone scenery cache: the active 750 m zone and eight neighbours are displayed, while a second ring is prepared and recent zone scenery is kept in a bounded cache.
- Game HUD reports nearby map-tile loading and readiness instead of assuming every new area is instantly available.

## Technology

- TypeScript
- Vite
- MapLibre GL JS
- OpenFreeMap and OpenStreetMap data
- Open-Meteo Geocoding API
- GitHub Pages

## Run locally

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Run the checks and production build:

```bash
npm run typecheck
npm run build
npm run preview
```

## Map controls

- Drag to pan.
- Scroll to zoom.
- Right-click and drag to change the camera angle.
- Use the 2D Map and 3D Globe buttons to change projection.
- Search for a city to fly to it.
- Zoom in to see available 3D building data.
- Zoom to level 13 or closer to see mapped points of interest.
- Toggle **Places of Interest** to show or hide POIs.
- Click a POI marker to view its mapped name and category.
- The same POI categories work worldwide; what appears depends on the local OpenStreetMap/OpenMapTiles coverage.
- In game mode, the map streams new vector tiles around the camera as the player moves. Nearby scenery is cached so revisiting recently explored zones is lighter.

## Deployment

The GitHub Actions workflow builds the Vite app and deploys the `dist/` directory to GitHub Pages. The Vite base path is configured for this repository: `/Battle-Royale-JUJU/`.

In GitHub, open **Settings → Pages** and select **GitHub Actions** as the build and deployment source.

## Roadmap

1. Global map and place search.
2. Better 3D city visualization and terrain.
3. Select a pilot area after testing the map.
4. Add game-ready zones and fictional interiors.
5. Expand streaming tests and tune tile/scenery cache limits for different devices and connection speeds.
6. Add multiplayer architecture after the exploration prototype is stable.

## Attribution and privacy

Map data and map styles are provided by OpenFreeMap, OpenMapTiles, and OpenStreetMap contributors. Their attribution is displayed on the map. Geocoding is provided by Open-Meteo. See their respective terms and attribution requirements before changing providers or adding new datasets.

The project will not attempt to reproduce private home interiors. Any future geographic datasets must respect their licenses, privacy, and applicable terms.

## License

A project license will be selected before public redistribution of source assets or third-party resources.

## World map and game camera

JUJU World uses the OpenFreeMap Liberty vector style with OpenStreetMap-based geographic data. The initial view is a global 2D Mercator map with a top-down camera. Use **TOP-DOWN GAME CAMERA** to return to the full-world view and reset the camera for the planned 2D game layer. Map coverage varies by country, city, neighbourhood, and zoom level; building and point-of-interest data are community-maintained and are not complete everywhere. JUJU does not use an Algeria-only dataset: it reads the same global map sources wherever their data is available. MapLibre loads the vector tiles needed for the visible viewport and updates them while the player moves; the game layer keeps a bounded cache of nearby procedural scenery. This avoids downloading the entire planet at once. It still requires an internet connection for map tiles, and coverage/latency vary by region. This is a real-world map foundation, not yet a complete playable battle-royale mode.
