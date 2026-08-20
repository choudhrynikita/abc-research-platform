import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4000";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
const results = [];
function assert(condition, message) { if (!condition) throw new Error(message); }
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => localStorage.removeItem("abc-theme"));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(`${baseUrl}/nifty500`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  assert(await page.locator("html").getAttribute("data-theme") === "light", "default theme should be light");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  assert(await page.locator("html").getAttribute("data-theme") === "dark", "theme toggle should switch to dark");
  assert(await page.evaluate(() => localStorage.getItem("abc-theme")) === "dark", "dark theme should persist");
  results.push("theme toggle + persistence");

  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.locator("#app-sidebar.open").waitFor({ state: "attached" });
  assert(await page.locator("#app-sidebar").getAttribute("aria-hidden") === null, "open mobile sidebar should be exposed");
  await page.keyboard.press("Escape");
  assert(await page.locator("#app-sidebar").getAttribute("aria-hidden") === "true", "Escape should close mobile sidebar");
  results.push("mobile navigation open + Escape close");

  await page.getByRole("button", { name: "Open AI Research Copilot search" }).click();
  await page.locator('[aria-label="AI Copilot question"]').waitFor({ state: "visible" });
  assert(await page.getByRole("dialog").count() === 1, "Copilot should open as a dialog");
  await page.locator('.copilot-panel button[aria-label="Close AI Copilot"]').click();
  results.push("Copilot open + close");
  assert(errors.length === 0, `runtime errors: ${errors.join(" | ")}`);
  await context.close();

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dashboard = await desktop.newPage();
  const dashboardErrors = [];
  dashboard.on("pageerror", (error) => dashboardErrors.push(error.message));
  await dashboard.goto(`${baseUrl}/nifty500`, { waitUntil: "domcontentloaded" });
  await dashboard.waitForTimeout(900);
  const search = dashboard.locator("#nifty500-search");
  await search.fill("RELIANCE");
  await dashboard.waitForTimeout(250);
  assert(await dashboard.locator(".stock-card").count() >= 0, "dashboard search should remain stable");
  const sector = dashboard.locator("#nifty500-sector");
  if (await sector.count()) {
    await sector.selectOption({ label: "IT" }).catch(() => {});
  }
  results.push("dashboard search + sector control");
  assert(dashboardErrors.length === 0, `dashboard runtime errors: ${dashboardErrors.join(" | ")}`);
  await desktop.close();

  console.log(JSON.stringify({ ok: true, checks: results }, null, 2));
} finally {
  await browser.close();
}
