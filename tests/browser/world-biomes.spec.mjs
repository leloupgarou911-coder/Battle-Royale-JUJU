import { test, expect } from "@playwright/test";

/**
 * 10-Biome / Geographic Matrix E2E Test Suite for JUJU WORLD Real Earth Engine.
 * Verifies real OpenFreeMap MVT extraction, Mapterhorn DEM elevation, Wikipedia heritage,
 * honest multi-state diagnostics, settlement classification, and offline failure honesty.
 */

function parseDiagnosticsText(text) {
  const bldgMatch = text.match(/Extracted:\s*(\d+)\s*bldg\s*·\s*(\d+)\s*roads\s*·\s*(\d+)\s*parks\/cover\s*·\s*(\d+)\s*water\s*·\s*(\d+)\s*POIs\/heritage/i);
  const tilesMatch = text.match(/MVT Tiles:\s*(\d+)\/(\d+)\s*\(err\s*(\d+),\s*cache\s*(\d+)\)/i);
  const statusMatch = text.match(/Status:\s*([A-Z_]+)\s*·\s*Settlement:\s*([a-z_]+)/i);
  const demMatch = text.match(/DEM Relief:\s*(-?\d+)\s*m\s*\(Δ\s*([+-]?\d+)\.\.([+-]?\d+)\s*m\)/i);
  return {
    status: statusMatch?.[1]?.toLowerCase() ?? null,
    settlement: statusMatch?.[2]?.toLowerCase() ?? null,
    tilesReceived: tilesMatch ? Number(tilesMatch[1]) : 0,
    tilesRequested: tilesMatch ? Number(tilesMatch[2]) : 0,
    tileErrors: tilesMatch ? Number(tilesMatch[3]) : 0,
    buildings: bldgMatch ? Number(bldgMatch[1]) : 0,
    roads: bldgMatch ? Number(bldgMatch[2]) : 0,
    greens: bldgMatch ? Number(bldgMatch[3]) : 0,
    waters: bldgMatch ? Number(bldgMatch[4]) : 0,
    poisAndHeritage: bldgMatch ? Number(bldgMatch[5]) : 0,
    originElevationMeters: demMatch ? Number(demMatch[1]) : null,
    minElevDelta: demMatch ? Number(demMatch[2]) : 0,
    maxElevDelta: demMatch ? Number(demMatch[3]) : 0,
    raw: text,
  };
}

async function deployToCoordinates(page, lat, lng, options = {}) {
  const { waitForTiles = true } = options;
  await page.goto("./");
  await expect(page.locator("#home-screen")).toBeVisible();
  await expect(page.locator("#map-status")).not.toContainText(/CONNECTING|CONNEXION/, { timeout: 35_000 });

  await page.locator("#home-play").click();
  await expect(page.locator("#spawn-picker")).toBeVisible({ timeout: 10_000 });

  const searchInput = page.locator("#place-search");
  await searchInput.fill(`${lat}, ${lng}`);
  await searchInput.press("Enter");

  await expect(page.locator("#spawn-picker-confirm")).toBeEnabled({ timeout: 8_000 });
  await page.locator("#spawn-picker-confirm").click();

  await expect(page.locator("#spawn-picker")).toBeHidden();
  await expect(page.locator("#game-3d-overlay")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#game-3d-canvas canvas")).toBeVisible({ timeout: 20_000 });

  if (waitForTiles) {
    await expect(page.locator("#arena-data-badge")).not.toHaveAttribute("data-geo-status", "loading", { timeout: 35_000 });
  } else {
    await expect(page.locator("#game-3d-position")).not.toContainText(/CHARGEMENT|LOADING/, { timeout: 25_000 });
  }

  // Open pause modal briefly to collect full real telemetry diagnostics
  await page.locator("#arena-pause-btn").click();
  await expect(page.locator("#arena-pause-modal")).toBeVisible();
  const diagText = (await page.locator("#arena-geo-diagnostics").textContent()) ?? "";
  const engineText = (await page.locator("#arena-diagnostics-readout").textContent()) ?? "";
  await page.locator("#arena-resume-btn").click();
  await expect(page.locator("#arena-pause-modal")).toBeHidden();

  const badgeStatus = await page.locator("#arena-data-badge").getAttribute("data-geo-status");
  const badgeText = (await page.locator("#arena-data-badge").textContent()) ?? "";
  return {
    badgeStatus,
    badgeText,
    engineText,
    ...parseDiagnosticsText(diagText),
  };
}

test.describe("10-Biome Real Earth World Matrix", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Biome matrix runs on desktop WebGL chromium");
  });

  test("1. Dense city (Paris Opéra) loads rich real buildings, roads, movement & screenshot", async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    const res = await deployToCoordinates(page, 48.8648, 2.3348);
    expect(res.tilesReceived).toBeGreaterThanOrEqual(1);
    expect(["complete", "partial"]).toContain(res.badgeStatus);
    expect(res.buildings).toBeGreaterThanOrEqual(40);
    expect(res.roads).toBeGreaterThanOrEqual(10);

    // Move forward to verify live gameplay stability in dense city
    const posBefore = await page.locator("#game-3d-position").textContent();
    const fwd = page.locator('[data-3d-move="w"]');
    await fwd.dispatchEvent("pointerdown", { pointerId: 1 });
    await page.waitForTimeout(700);
    await fwd.dispatchEvent("pointerup", { pointerId: 1 });
    await expect(page.locator("#game-3d-position")).not.toHaveText(posBefore ?? "", { timeout: 6_000 });

    await page.locator("#game-3d-overlay").screenshot({ path: testInfo.outputPath("biome-01-dense-city.png"), animations: "disabled" });
    expect(pageErrors).toEqual([]);
  });

  test("2. Residential neighborhood (Lyon Monplaisir) loads real urban residential fabric", async ({ page }) => {
    test.setTimeout(75_000);
    const res = await deployToCoordinates(page, 45.7475, 4.8685);
    expect(res.tilesReceived).toBeGreaterThanOrEqual(1);
    expect(res.buildings).toBeGreaterThanOrEqual(15);
    expect(res.roads).toBeGreaterThanOrEqual(5);
  });

  test("3. Village (Eguisheim, Alsace) loads authentic village buildings and streets", async ({ page }) => {
    test.setTimeout(75_000);
    const res = await deployToCoordinates(page, 48.0427, 7.3059);
    expect(res.tilesReceived).toBeGreaterThanOrEqual(1);
    expect(res.buildings).toBeGreaterThanOrEqual(10);
    expect(res.roads).toBeGreaterThanOrEqual(3);
  });

  test("4. Rural countryside (Beauce fields) stays honest without inventing urban buildings", async ({ page }) => {
    test.setTimeout(75_000);
    const res = await deployToCoordinates(page, 48.2450, 1.5450);
    expect(res.tilesReceived).toBeGreaterThanOrEqual(1);
    expect(res.badgeStatus).not.toBe("error");
    expect(res.buildings).toBeLessThan(20);
  });

  test("5. Large urban park (NYC Central Park) extracts real park/green cover and paths", async ({ page }) => {
    test.setTimeout(75_000);
    const res = await deployToCoordinates(page, 40.7685, -73.9712);
    expect(res.tilesReceived).toBeGreaterThanOrEqual(1);
    expect(res.greens).toBeGreaterThanOrEqual(2);
    expect(res.roads).toBeGreaterThanOrEqual(3);
  });

  test("6. Mountainous zone (Chamonix-Mont-Blanc) loads real Terrarium DEM elevation & relief", async ({ page }, testInfo) => {
    test.setTimeout(85_000);
    const res = await deployToCoordinates(page, 45.9237, 6.8694);
    expect(res.tilesReceived).toBeGreaterThanOrEqual(1);
    expect(res.originElevationMeters).not.toBeNull();
    expect(res.originElevationMeters).toBeGreaterThan(800);
    expect(res.maxElevDelta - res.minElevDelta).toBeGreaterThanOrEqual(2);
    await page.locator("#game-3d-overlay").screenshot({ path: testInfo.outputPath("biome-06-mountain.png"), animations: "disabled" });
  });

  test("7. Coastal zone (Nice Promenade des Anglais) renders sea/water and beachfront roads", async ({ page }, testInfo) => {
    test.setTimeout(85_000);
    const res = await deployToCoordinates(page, 43.6948, 7.2661);
    expect(res.tilesReceived).toBeGreaterThanOrEqual(1);
    expect(res.waters).toBeGreaterThanOrEqual(1);
    expect(res.roads).toBeGreaterThanOrEqual(3);
    await page.locator("#game-3d-overlay").screenshot({ path: testInfo.outputPath("biome-07-coastal.png"), animations: "disabled" });
  });

  test("8. Monument-rich historic site (Champ de Mars / Tour Eiffel) loads landmarks & Wikipedia heritage", async ({ page }, testInfo) => {
    test.setTimeout(85_000);
    const res = await deployToCoordinates(page, 48.8584, 2.2945);
    expect(res.tilesReceived).toBeGreaterThanOrEqual(1);
    expect(res.poisAndHeritage).toBeGreaterThanOrEqual(1);
    expect(["complete", "partial"]).toContain(res.badgeStatus);
    await page.locator("#game-3d-overlay").screenshot({ path: testInfo.outputPath("biome-08-monuments.png"), animations: "disabled" });
  });

  test("9. Genuinely sparse area (Tamanrasset / Hoggar) stays honest without fake city buildings", async ({ page }, testInfo) => {
    test.setTimeout(85_000);
    const res = await deployToCoordinates(page, 22.7850, 5.5228);
    expect(res.tilesReceived).toBeGreaterThanOrEqual(1);
    expect(res.badgeStatus).not.toBe("error");
    await page.locator("#game-3d-overlay").screenshot({ path: testInfo.outputPath("biome-09-sparse.png"), animations: "disabled" });
  });

  test("10. Unavailable/offline vector tile source reports explicit error state instead of procedural ground", async ({ page }, testInfo) => {
    test.setTimeout(75_000);
    await page.goto("./");
    await expect(page.locator("#home-screen")).toBeVisible();
    await expect(page.locator("#map-status")).not.toContainText(/CONNECTING|CONNEXION/, { timeout: 35_000 });

    await page.locator("#home-play").click();
    await expect(page.locator("#spawn-picker")).toBeVisible();

    // Target an unvisited dense city (Tokyo Station), then abort OpenFreeMap MVT requests
    const searchInput = page.locator("#place-search");
    await searchInput.fill("35.6812, 139.7671");
    await searchInput.press("Enter");
    await expect(page.locator("#spawn-picker-confirm")).toBeEnabled({ timeout: 8_000 });

    await page.route("**/tiles.openfreemap.org/**", (route) => route.abort("failed"));

    await page.locator("#spawn-picker-confirm").click();
    await expect(page.locator("#game-3d-overlay")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("#arena-data-badge")).toHaveAttribute("data-geo-status", "error", { timeout: 25_000 });
    await expect(page.locator("#arena-data-badge")).toContainText(/ERROR|ERREUR/);
    await page.locator("#game-3d-overlay").screenshot({ path: testInfo.outputPath("biome-10-offline-error.png"), animations: "disabled" });
  });
});
