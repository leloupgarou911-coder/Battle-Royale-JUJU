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
- Adaptive world-streaming manager: selects a tile-cache budget and procedural-zone cache from browser connection/device hints, protects the active neighbourhood, and evicts older distant scenery with an LRU policy.
- Directional look-ahead: prepares procedural scenery ahead of the player and makes best-effort requests for a few real vector tiles through the map source TileJSON template; browser HTTP caching depends on the tile server response headers.

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
- While moving, the game predicts the heading and warms a short procedural corridor (one, two, or three zones according to the device/network profile).
- A small number of vector tiles ahead are requested best-effort from the OpenMapTiles source template. Browser caching depends on provider response headers; MapLibre still requests every tile required by the visible viewport normally.
- On slower connections or devices, non-essential map details appear at closer zoom levels, while roads and buildings retain priority over POI labels and decorative land cover.
- The vector-tile cache size is selected when the map starts. Network changes update procedural cache size, look-ahead depth, and detail thresholds; MapLibre manages eviction of its own tile cache.

## Deployment

The GitHub Actions workflow builds the Vite app and deploys the `dist/` directory to GitHub Pages. The Vite base path is configured for this repository: `/Battle-Royale-JUJU/`.

In GitHub, open **Settings → Pages** and select **GitHub Actions** as the build and deployment source.

## Roadmap

1. Global map and place search.
2. Better 3D city visualization and terrain.
3. Select a pilot area after testing the map.
4. Add game-ready zones and fictional interiors.
5. Add automated tests for TileJSON look-ahead, browser cache behavior, and adaptive streaming profiles; validate provider caching headers and tune for real devices/connections.
6. Add multiplayer architecture after the exploration prototype is stable.

## Attribution and privacy

Map data and map styles are provided by OpenFreeMap, OpenMapTiles, and OpenStreetMap contributors. Their attribution is displayed on the map. Geocoding is provided by Open-Meteo. See their respective terms and attribution requirements before changing providers or adding new datasets.

The project will not attempt to reproduce private home interiors. Any future geographic datasets must respect their licenses, privacy, and applicable terms.

## License

A project license will be selected before public redistribution of source assets or third-party resources.

## World map and game camera

JUJU World uses the OpenFreeMap Liberty vector style with OpenStreetMap-based geographic data. The initial view is a global 2D Mercator map with a top-down camera. Use **TOP-DOWN GAME CAMERA** to return to the full-world view and reset the camera for the planned 2D game layer. Map coverage varies by country, city, neighbourhood, and zoom level; building and point-of-interest data are community-maintained and are not complete everywhere. JUJU does not use an Algeria-only dataset: it reads the same global map sources wherever their data is available. MapLibre loads the vector tiles needed for the visible viewport and updates them while the player moves; the game layer keeps a bounded cache of nearby procedural scenery. This avoids downloading the entire planet at once. It still requires an internet connection for map tiles, and coverage/latency vary by region. This is a real-world map foundation, not yet a complete playable battle-royale mode.

## Local exploration history

- Visited 750 m game-zone coordinates are saved locally in the browser using `localStorage`; no account or server upload is involved.
- Up to 200 recently visited zones are retained. Revisiting a zone moves it to the newest position in the local history.
- Previously visited zone outlines are restored on the game map after a refresh, and the HUD shows the number of saved zones.
- The **Clear visited zones** control removes this local history. Clearing browser site data or using a different browser/device also removes or separates this history.
- This stores exploration metadata only, not OpenStreetMap vector tiles, buildings, roads, or terrain. It does not provide offline map play; an internet connection is still required for map data.
- Storage is best-effort: private browsing, browser settings, or a full/disabled storage quota may prevent saving.

## Local game-session recovery

- While game mode is active, the browser periodically saves the player's longitude/latitude, current 750 m zone, movement speed, zoom level, and save timestamp to `localStorage`.
- On the next page load, a resume panel offers **Resume** (restore the saved position and speed) or **New exploration** (discard the session and start from the current map area).
- Sessions older than 90 days or with invalid coordinates/settings are discarded. Saving is local to that browser and device; it is not synchronized between devices or uploaded to a server.
- The session contains location coordinates. Anyone with access to this browser profile may be able to inspect or clear its site data. The existing **Clear visited zones** button clears the exploration history, not the separate session save.
- This restores the player's session state only. It does not save downloaded map tiles or make the game playable offline.
