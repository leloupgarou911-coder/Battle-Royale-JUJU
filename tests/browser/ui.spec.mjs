import { test, expect } from "@playwright/test";

test("unified Tactical 3D Earth Arena, localization, synced mini-map, arena modes and 2D switch work at this viewport", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("./");
  await expect(page.locator("#home-screen")).toBeVisible();
  await expect(page.locator("#home-play")).toBeVisible();
  await page.locator("#home-screen").screenshot({ path: testInfo.outputPath("home-screen.png"), animations: "disabled" });

  await page.locator("#home-language").click();
  await expect(page.locator(".home-copy h1")).toContainText("VOTRE MONDE");

  await page.locator("#home-settings").click();
  await expect(page.locator("#home-dialog")).toBeVisible();
  await expect(page.locator("#home-dialog-title")).toContainText("PARAMÈTRES");
  await page.locator("#home-dialog-close").click();
  await expect(page.locator("#home-dialog")).toBeHidden();

  await expect(page.locator("#map-status")).not.toContainText(/CONNECTING|CONNEXION/, { timeout: 30_000 });
  await page.locator("#home-play").click();
  await expect(page.locator("#home-screen")).toBeHidden({ timeout: 15_000 });
  await expect(page.locator("#spawn-picker")).toBeVisible();
  await expect(page.locator("#spawn-picker-confirm")).toBeDisabled();

  // Select instant real-world Paris Dense Urban biome preset
  const parisPreset = page.locator('[data-preset-id="paris-centre"]');
  await expect(parisPreset).toBeVisible();
  await parisPreset.click();
  await expect(page.locator("#spawn-picker-confirm")).toBeEnabled();
  await expect(page.locator("#spawn-picker-place")).toContainText("Paris");
  await page.locator("#spawn-picker-confirm").click();

  // Direct launch into Tactical 3D Earth Arena
  await expect(page.locator("#spawn-picker")).toBeHidden();
  await expect(page.locator("#game-3d-overlay")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#game-3d-canvas canvas")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#arena-hud-top-left")).toBeVisible();
  await expect(page.locator(".game-mini-map-panel")).toBeVisible();
  await expect(page.locator("#game-mini-map .maplibregl-canvas")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#game-mini-map")).toHaveAttribute("data-tiles-ready", "true", { timeout: 30_000 });
  await expect(page.locator("#game-3d-position")).not.toContainText(/CHARGEMENT|LOADING/, { timeout: 20_000 });

  // Verify movement, jump, zoom controls & synchronized mini-map readout update
  const initial3dPosition = await page.locator("#game-3d-position").textContent();
  const initialMiniCoords = await page.locator("#mini-map-coordinates").textContent();
  const forward3d = page.locator('[data-3d-move="w"]');
  await forward3d.dispatchEvent("pointerdown", { pointerId: 1 });
  await page.waitForTimeout(950);
  await forward3d.dispatchEvent("pointerup", { pointerId: 1 });
  await page.locator("#game-3d-jump").click();
  await page.locator("#arena-zoom-in").click();
  await page.waitForTimeout(250);
  await expect(page.locator("#game-3d-position")).not.toHaveText(initial3dPosition, { timeout: 8_000 });
  await expect(page.locator("#mini-map-coordinates")).not.toHaveText(initialMiniCoords, { timeout: 8_000 });
  await page.locator("#game-3d-overlay").screenshot({ path: testInfo.outputPath("arena-3d.png"), animations: "disabled" });

  // Open Tactical Pause Menu, switch to Zone Control Arena with explicit Local AI Simulation
  await page.locator("#arena-pause-btn").click();
  await expect(page.locator("#arena-pause-modal")).toBeVisible();
  await page.locator('[data-arena-mode="zone_control"]').click();
  const simBotsToggle = page.locator("#arena-sim-bots-toggle");
  if (!(await simBotsToggle.isChecked())) await simBotsToggle.check();
  await page.locator("#arena-pause-modal").screenshot({ path: testInfo.outputPath("arena-pause.png"), animations: "disabled" });
  await page.locator("#arena-resume-btn").click();
  await expect(page.locator("#arena-pause-modal")).toBeHidden();
  await expect(page.locator("#arena-objective-bar")).toBeVisible();
  await expect(page.locator("#arena-mode-chip")).toContainText(/IA LOCALE|LOCAL AI/);

  // Open Missions & Stats drawer
  await page.locator("#arena-missions-btn").click();
  await expect(page.locator("#arena-missions-modal")).toBeVisible();
  await expect(page.locator("#arena-missions-body")).toContainText("XP");
  await page.locator("#arena-missions-close").click();
  await expect(page.locator("#arena-missions-modal")).toBeHidden();

  // Switch cleanly to 2D World Atlas view & verify routing controls
  await page.locator("#game-3d-exit").click();
  await expect(page.locator("#game-3d-overlay")).toBeHidden();
  await expect(page.locator(".game-hud")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#game-navigation")).toBeVisible();
  await expect(page.locator(".juju-player")).toBeVisible();
  await page.locator(".game-hud").screenshot({ path: testInfo.outputPath("game-2d.png"), animations: "disabled" });

  // Return to Main Menu -> Saves -> verify two-step delete confirmation
  await page.locator("#game-main-menu").click();
  await expect(page.locator("#home-screen")).toBeVisible();
  await page.locator("#home-saves").click();
  await expect(page.locator("#resume-session")).toBeVisible();
  const deleteButton = page.locator(".save-slot-actions button").nth(1);
  await expect(deleteButton).toBeVisible();
  await deleteButton.click();
  await expect(deleteButton).toHaveClass(/is-confirming/);
  await deleteButton.click();
  await expect(page.locator(".save-slots-empty")).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
  expect(pageErrors).toEqual([]);
});

