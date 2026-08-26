import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4000";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function api(path) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const nifty = await api("/api/nifty-strategy/dashboard?refresh=1");
  const equity = await api("/api/equity-fno/dashboard?refresh=1");
  for (const [name, payload] of [["NIFTY", nifty], ["Equity F&O", equity]]) {
    const strategies = payload.top10 || [];
    assert(strategies.every((strategy) => strategy.eligibility?.gates?.length === 5), `${name} strategies require five decision gates`);
    assert(strategies.every((strategy) => !(strategy.eligibility?.expiryDays < 0)), `${name} must not expose expired contracts`);
    assert(strategies.every((strategy) => !/pre-market/i.test(strategy.name || "")), `${name} must not retain pre-market strategy names`);
  }
  assert((equity.top10 || []).every((strategy) => strategy.eligibility?.financial), "equity strategies require financial-context payloads");

  await page.goto(`${baseUrl}/nifty-strategy`, { waitUntil: "domcontentloaded" });
  await page.locator(".strategy-card").first().waitFor({ state: "visible", timeout: 90000 });
  assert(await page.getByText(/Pre-Market Strategy/i).count() === 0, "strategy UI must not use the obsolete pre-market strategy label");
  const nextSessionChip = page.getByRole("button", { name: "Next Session" });
  await nextSessionChip.click();
  if (await page.locator(".strategy-card").count() === 0) {
    await page.getByRole("button", { name: "All", exact: true }).click();
    await page.locator(".strategy-card").first().waitFor({ state: "visible" });
  }
  const detail = page.locator(".strategy-evidence").first();
  await detail.locator("summary").click();
  await detail.locator(".strategy-gate-list").waitFor({ state: "visible" });
  assert(await detail.getByText("Option contract").count() === 1, "strategy evidence must describe contract quality");
  await page.goto(`${baseUrl}/fno`, { waitUntil: "domcontentloaded" });
  await page.locator(".fno-card").first().waitFor({ state: "visible", timeout: 120000 });
  await page.getByRole("button", { name: "Week Ahead" }).click();
  if (await page.locator(".fno-card").count() === 0) {
    await page.getByRole("button", { name: "All", exact: true }).click();
    await page.locator(".fno-card").first().waitFor({ state: "visible" });
  }
  const equityDetail = page.locator(".strategy-evidence").first();
  await equityDetail.locator("summary").click();
  await equityDetail.locator(".strategy-gate-list").waitFor({ state: "visible" });
  assert(await equityDetail.getByText(/Decision checks/).count() === 1, "equity strategy evidence must expose decision checks");

  assert(errors.length === 0, `runtime errors: ${errors.join(" | ")}`);
  console.log(JSON.stringify({ ok: true, nifty: nifty.top10?.length || 0, equity: equity.top10?.length || 0 }, null, 2));
} finally {
  await browser.close();
}
