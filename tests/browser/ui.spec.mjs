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

  await page.locator("#home-screen").evaluate((element) => { element.hidden = true; });
  await page.locator("#app").evaluate((element) => { element.classList.add("game-mode"); });
  await expect(page.locator(".game-hud")).toBeVisible();
  await expect(page.locator(".game-mini-map-panel")).toBeVisible();
  await page.locator(".game-hud").screenshot({ path: testInfo.outputPath("game-hud.png"), animations: "disabled" });

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
  expect(pageErrors).toEqual([]);
});
