import { spawn } from "node:child_process";
import process from "node:process";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4000";
const routes = ["/nifty500", "/news", "/fiidii", "/ipo", "/research", "/nifty-strategy", "/fno", "/reports"];
const selectors = [
  [".news-hero", "surface"], [".news-card:not(.selected)", "surface"], [".news-card.selected", "selected"], [".news-search", "surface"], [".chip:not(.active)", "chip"], [".chip.active", "selected"],
  [".sidebar", "surface"], [".topbar", "surface"], [".glass-card", "surface"], [".card", "surface"],
  [".panel", "surface"], [".metric-card", "surface"], [".strategy-card", "surface"], [".fno-strategy-card", "surface"],
  [".fno-card", "surface"], [".chart-card", "surface"], [".report-section", "surface"], [".data-table-wrap", "surface"],
  [".theme-toggle", "control"], [".theme-toggle-light", "control"], [".theme-toggle-dark", "control"],
  [".btn", "control"], [".btn-ghost", "control"], [".status-pill", "surface"], [".status-dot", "status"],
  ["table", "table"], ["th", "table-cell"], ["td", "table-cell"],
];

const expected = {
  light: { bg: "rgb(244, 248, 244)", surface: "rgb(255, 255, 255)", ink: "rgb(29, 42, 38)", muted: "rgb(109, 123, 115)", border: "rgb(216, 227, 218)", accent: "rgb(53, 103, 199)", accentSoft: "rgba(53, 103, 199, 0.12)", green: "rgb(32, 128, 77)", red: "rgb(189, 92, 74)", yellow: "rgb(187, 122, 37)", onAccent: "rgb(255, 255, 255)" },
  dark: { bg: "rgb(15, 21, 24)", surface: "rgb(24, 33, 38)", ink: "rgb(237, 240, 235)", muted: "rgb(154, 169, 169)", border: "rgb(52, 75, 74)", accent: "rgb(230, 178, 90)", accentSoft: "rgba(230, 178, 90, 0.16)", green: "rgb(105, 196, 134)", red: "rgb(239, 139, 131)", yellow: "rgb(230, 178, 90)", onAccent: "rgb(255, 255, 255)" },
};

function fail(message) {
  throw new Error(message);
}

async function waitForServer() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  fail(`Production server did not become ready at ${baseUrl}`);
}

const shouldStart = !process.env.BASE_URL;
const server = shouldStart ? spawn("npm", ["start"], { cwd: process.cwd(), stdio: "inherit", env: { ...process.env, NODE_ENV: "production" } }) : null;
try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
  const results = [];
  for (const theme of ["light", "dark"]) {
    for (const route of routes) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.addInitScript((value) => localStorage.setItem("abc-theme", value), theme);
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(`${message.text()} @ ${message.location().url || "unknown"}`); });
      page.on("response", (response) => { if (response.status() >= 400) consoleErrors.push(`${response.status()} ${response.url()}`); });
      await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(250);
      const rootTheme = await page.locator("html").getAttribute("data-theme");
      if (rootTheme !== theme) fail(`${route} resolved data-theme=${rootTheme}, expected ${theme}`);
      for (const [selector, kind] of selectors) {
        const locator = page.locator(selector).first();
        if ((await locator.count()) === 0) continue;
        const style = await locator.evaluate((node) => {
          const s = getComputedStyle(node);
          return { backgroundColor: s.backgroundColor, color: s.color, borderColor: s.borderColor };
        });
        const e = expected[theme];
        if (kind === "surface" && style.backgroundColor !== e.surface) fail(`${theme} ${route} ${selector} background ${style.backgroundColor} != ${e.surface}`);
        if (kind === "selected" && style.backgroundColor !== e.accentSoft) fail(`${theme} ${route} ${selector} background ${style.backgroundColor} != ${e.accentSoft}`);
        if (["surface", "table", "table-cell"].includes(kind) && style.borderColor !== e.border) fail(`${theme} ${route} ${selector} border ${style.borderColor} != ${e.border}`);
        if (["control", "table", "table-cell"].includes(kind) && selector !== ".btn" && style.borderColor !== e.border) fail(`${theme} ${route} ${selector} border ${style.borderColor} != ${e.border}`);
        if (["surface", "control", "table", "table-cell"].includes(kind) && style.color !== e.ink && style.color !== e.muted && style.color !== e.accent && style.color !== e.green && style.color !== e.red && style.color !== e.yellow && style.color !== e.onAccent) fail(`${theme} ${route} ${selector} text ${style.color} is outside contract`);
        results.push({ theme, route, selector, style });
      }
      if (consoleErrors.length) fail(`${theme} ${route} console errors: ${consoleErrors.join(" | ")}`);
      await context.close();
    }
  }
  await browser.close();
  console.log(JSON.stringify({ ok: true, routes: routes.length, themes: 2, assertions: results.length }, null, 2));
} finally {
  if (server) server.kill("SIGTERM");
}
