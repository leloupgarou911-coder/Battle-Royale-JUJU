import { test, expect } from "@playwright/test";

test("home screen, French localization and settings render at this viewport", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/Battle-Royale-JUJU/");
  await expect(page.locator("#home-screen")).toBeVisible();
  await expect(page.locator("#home-play")).toBeVisible();
  await page.locator("#home-screen").screenshot({ path: testInfo.outputPath("home-screen.png"), animations: "disabled" });

  await page.locator("#home-language").click();
  await expect(page.locator(".home-copy h1")).toContainText("VOTRE MONDE");
  await expect(page.locator(".daily-missions-heading")).toContainText("MISSIONS QUOTIDIENNES");

  await page.locator("#home-settings").click();
  await expect(page.locator("#home-dialog")).toBeVisible();
  await expect(page.locator("#home-dialog-title")).toContainText("PARAMÈTRES");
  await page.locator("#home-dialog").screenshot({ path: testInfo.outputPath("settings-panel.png"), animations: "disabled" });
  await page.locator("#home-dialog-close").click();
  await expect(page.locator("#home-dialog")).toBeHidden();

  await expect(page.locator("#map-status")).not.toContainText(/CONNECTING|CONNEXION/, { timeout: 30_000 });
  await page.locator("#home-play").click();
  await expect(page.locator("#home-screen")).toBeHidden({ timeout: 15_000 });
  await expect(page.locator("#spawn-picker")).toBeVisible();
  await expect(page.locator("#spawn-picker-confirm")).toBeDisabled();
  const viewport = page.viewportSize();
  await page.locator("#map").click({ position: { x: Math.round(viewport.width * 0.52), y: Math.round(viewport.height * 0.78) } });
  await expect(page.locator("#spawn-picker-confirm")).toBeEnabled();
  await expect(page.locator("#spawn-picker-coordinates")).not.toContainText("Click the map");
  await page.locator("#spawn-picker-confirm").click();
  await expect(page.locator("#spawn-picker")).toBeHidden();
  await expect(page.locator(".game-hud")).toBeVisible();
  await expect(page.locator(".game-mini-map-panel")).toBeVisible();
  await expect(page.locator("#game-navigation")).toBeVisible();
  await expect(page.locator("#game-set-destination")).toBeVisible();
  await expect(page.locator("#game-mini-map .maplibregl-canvas")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#game-mini-map")).toHaveAttribute("data-tiles-ready", "true", { timeout: 30_000 });
  await expect(page.locator("#game-zone-status")).not.toContainText(/CHARGEMENT|LOADING/, { timeout: 30_000 });
  await expect(page.locator(".juju-player")).toBeVisible();
  const initialCoordinates = await page.locator("#navigation-coordinates").textContent();
  if (testInfo.project.use.isMobile) {
    const moveButton = page.locator('[data-move="up"]');
    await moveButton.hover();
    await page.mouse.down();
    await page.waitForTimeout(1100);
    await page.mouse.up();
  } else {
    const mapCanvas = page.locator("#map .maplibregl-canvas").first();
    // The navigation HUD overlays the canvas; focus it without a pointer click.
    await mapCanvas.evaluate((canvas) => canvas.focus());
    await page.keyboard.down("w");
    await page.waitForTimeout(900);
    await page.keyboard.up("w");
  }
  await expect(page.locator("#navigation-coordinates")).not.toHaveText(initialCoordinates, { timeout: 8_000 });
  await expect(page.locator(".juju-player")).toHaveClass(/is-idle/);
  await page.locator(".game-hud").screenshot({ path: testInfo.outputPath("game-hud.png"), animations: "disabled" });
  await page.locator("#game-set-destination").click();
  await page.locator("#map").click({ position: { x: Math.round(viewport.width * 0.72), y: Math.round(viewport.height * 0.48) } });
  await expect(page.locator("#game-clear-destination")).toBeEnabled();
  await expect(page.locator("#navigation-distance")).not.toHaveText("—");

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
  expect(pageErrors).toEqual([]);
});
