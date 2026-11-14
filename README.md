# Battle-Royale-JUJU

**JUJU World** is the first browser-based exploration layer for Battle-Royale-JUJU. The project aims to build a navigable virtual world inspired by real geography, starting with a global map and gradually adding selected 3D environments.

## Current version — Alpha 0.2

- Interactive global map powered by MapLibre GL JS.
- OpenFreeMap map style with OpenStreetMap-based geographic data.
- Globe and flat map projections.
- Search for cities and places using Open-Meteo Geocoding.
- Quick exploration shortcuts for a few example cities.
- 3D building extrusions where building data is available at close zoom levels.
- English interface by default, with a French language switch.
- Responsive desktop and mobile layout.

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

## Deployment

The GitHub Actions workflow builds the Vite app and deploys the `dist/` directory to GitHub Pages. The Vite base path is configured for this repository: `/Battle-Royale-JUJU/`.

In GitHub, open **Settings → Pages** and select **GitHub Actions** as the build and deployment source.

## Roadmap

1. Global map and place search.
2. Better 3D city visualization and terrain.
3. Select a pilot area after testing the map.
4. Add game-ready zones and fictional interiors.
5. Optimize streaming and performance for large areas.
6. Add multiplayer architecture after the exploration prototype is stable.

## Attribution and privacy

Map data and map styles are provided by OpenFreeMap and OpenStreetMap contributors. Their attribution is displayed on the map. Geocoding is provided by Open-Meteo. See their respective terms and attribution requirements before changing providers or adding new datasets.

The project will not attempt to reproduce private home interiors. Any future geographic datasets must respect their licenses, privacy, and applicable terms.

## License

A project license will be selected before public redistribution of source assets or third-party resources.