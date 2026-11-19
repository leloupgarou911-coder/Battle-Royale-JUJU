# JUJU WORLD — Unreal Engine prototype

This directory starts a **separate native Unreal Engine prototype** while the existing browser game remains intact.

## Prototype target

- Engine target: Unreal Engine 5.5 (adjust EngineAssociation to the locally installed UE version).
- First test region: Chamonix, France (WGS84: 45.9237, 6.8694).
- Geographic foundation: Cesium for Unreal + georeferencing; use real terrain/elevation and stream only the area around the player.
- Prototype priorities: ground-level camera, recognizable real terrain, natural materials, nearby mapped roads/buildings where data is available, and measured performance.

## Setup (local machine required)

1. Install Unreal Engine 5.5 through Epic Games Launcher.
2. Install the Cesium for Unreal plugin compatible with that engine version. The plugin is not vendored in this repository.
3. Open `JUJUWorldUE/JUJUWorldUE.uproject`, allow project files to be generated, and enable/configure Cesium.
4. Create a CesiumGeoreference and terrain/imagery source in the editor; select Chamonix coordinates from `PROTOTYPE_CONFIG.json`.
5. Configure a playable ground-level pawn and test movement in a small area before expanding streaming.
6. Capture screenshots and record machine specs, average FPS, frame-time, memory, load time and visual observations.

## Important limitations

This is **not yet a completed Unreal game or a photorealistic scene**. The repository contains a project descriptor and testable prototype specification only. Unreal Editor, plugin installation, source data credentials/terms, assets, scene creation and visual validation require a machine with Unreal installed. GitHub Actions runners do not have Unreal Engine installed and cannot produce a valid UE editor build without an appropriately provisioned licensed runner.

No private property interiors or sensitive location detail should be reproduced. Respect source data licenses and attribution requirements.

## Acceptance criteria

See `PROTOTYPE_CONFIG.json`. A successful CI check validates only the scaffold/configuration; it does not prove the rendered terrain looks realistic or that Unreal builds/runs.
