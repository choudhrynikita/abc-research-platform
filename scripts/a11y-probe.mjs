import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4000";
const routes = ["/nifty500", "/news", "/fiidii", "/ipo", "/research", "/nifty-strategy", "/fno", "/reports"];

function fail(message) { throw new Error(message); }
function parseRgb(value) {
  const m = String(value).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
  return parts.length >= 3 ? [parts[0], parts[1], parts[2], parts[3] ?? 1] : null;
}
function luminance(rgb) {
  const values = rgb.slice(0, 3).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}
function contrast(fg, bg) {
  const a = luminance(fg), b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
const findings = [];
try {
  for (const theme of ["light", "dark"]) {
    for (const route of routes) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.addInitScript((value) => localStorage.setItem("abc-theme", value), theme);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(1200);
      if (errors.length) fail(`${theme} ${route} page errors: ${errors.join(" | ")}`);

      const result = await page.evaluate(() => {
        const parseRgb = (value) => {
          const m = String(value).match(/rgba?\\(([^)]+)\\)/);
          if (!m) return null;
          const parts = m[1].split(/[\\s,\\/]+/).filter(Boolean).map(Number);
          return parts.length >= 3 ? [parts[0], parts[1], parts[2], parts[3] ?? 1] : null;
        };
        const luminance = (rgb) => {
          const values = rgb.slice(0, 3).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
          return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
        };
        const contrast = (fg, bg) => {
          const a = luminance(fg), b = luminance(bg);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        };
        const visible = (node) => {
          const s = getComputedStyle(node);
          const r = node.getBoundingClientRect();
          return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
        };
        const name = (node) => {
          const labelled = node.getAttribute("aria-label") || node.getAttribute("title");
          if (labelled?.trim()) return labelled.trim();
          const labelledBy = node.getAttribute("aria-labelledby");
          if (labelledBy) return labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent || "").join(" ").trim();
          if (node.labels?.length) return Array.from(node.labels).map((label) => label.textContent).join(" ").trim();
          return (node.textContent || node.getAttribute("placeholder") || "").replace(/\s+/g, " ").trim();
        };
        const controls = Array.from(document.querySelectorAll("button, a[href], input, select, textarea")).filter(visible);
        const unnamed = controls.filter((node) => !name(node)).map((node) => `${node.tagName.toLowerCase()}.${node.className || ""}`);
        const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).filter(visible).map((node) => Number(node.tagName.slice(1)));
        const jumps = [];
        for (let i = 1; i < headings.length; i += 1) if (headings[i] - headings[i - 1] > 1) jumps.push(`${headings[i - 1]}->${headings[i]}`);
        const contrastFailures = [];
        const textNodes = Array.from(document.querySelectorAll("body *")).filter((node) => visible(node) && node.children.length === 0 && (node.textContent || "").trim());
        for (const node of textNodes) {
          const s = getComputedStyle(node);
          let parent = node;
          let bg = null;
          while (parent && parent !== document.documentElement) {
            const candidate = parseRgb(getComputedStyle(parent).backgroundColor);
            if (candidate && candidate[3] > 0) { bg = candidate; break; }
            parent = parent.parentElement;
          }
          const fg = parseRgb(s.color);
          if (!fg || !bg || fg[3] === 0) continue;
          const ratio = contrast(fg, bg);
          const px = parseFloat(s.fontSize);
          const threshold = px >= 24 || (px >= 18.66 && s.fontWeight >= 400) ? 3 : 4.5;
          if (ratio < threshold) contrastFailures.push({ text: (node.textContent || "").trim().slice(0, 60), ratio: Number(ratio.toFixed(2)), threshold });
        }
        return {
          main: document.querySelectorAll("main").length,
          nav: document.querySelectorAll("nav").length,
          unnamed,
          jumps,
          contrastFailures: contrastFailures.slice(0, 20),
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          assistantInput: Boolean(document.querySelector('input[aria-label="Ask the derivatives strategist a question"]')),
        };
      });
      if (result.main !== 1) fail(`${theme} ${route}: expected one main landmark, found ${result.main}`);
      if (result.nav < 1) fail(`${theme} ${route}: navigation landmark missing`);
      if (result.unnamed.length) fail(`${theme} ${route}: unnamed controls ${result.unnamed.join(", ")}`);
      if (result.jumps.length) fail(`${theme} ${route}: heading jumps ${result.jumps.join(", ")}`);
      if (result.contrastFailures.length) fail(`${theme} ${route}: contrast failures ${JSON.stringify(result.contrastFailures)}`);
      if (result.overflow) fail(`${theme} ${route}: horizontal overflow detected`);
      findings.push({ theme, route, assistantInput: result.assistantInput });
      await context.close();
    }
  }
  console.log(JSON.stringify({ ok: true, routes: routes.length, themes: 2, findings }, null, 2));
} finally {
  await browser.close();
}
