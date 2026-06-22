const { readJson, writeJson } = require("./json-store");

const ALERTS_FILE = "ipo-alerts.json";

async function readAlerts() {
  return readJson(ALERTS_FILE, { subscriptions: [], log: [] });
}

async function writeAlerts(data) {
  await writeJson(ALERTS_FILE, data);
}

async function updatePreferences(prefs) {
  const data = await readAlerts();
  data.preferences = { ...data.preferences, ...prefs };
  await writeAlerts(data);
  return data.preferences;
}

async function logAlert(alert, data) {
  const store = data || (await readAlerts());
  store.log = [{ ...alert, at: new Date().toISOString() }, ...(store.log || [])].slice(0, 100);
  await writeAlerts(store);
  return store;
}

function alertKey(alert) {
  return `${alert.type}|${alert.symbol}|${alert.message}`;
}

function isRecentDuplicate(log, alert, withinMs = 86_400_000) {
  const key = alertKey(alert);
  const cutoff = Date.now() - withinMs;
  return (log || []).some((entry) => alertKey(entry) === key && new Date(entry.at).getTime() > cutoff);
}

async function evaluateAlerts(dashboard) {
  const data = await readAlerts();
  const prev = data.lastSnapshot || {};
  const prefs = data.preferences || {
    newIpo: true,
    opening: true,
    closing: true,
    subscription: true,
    listing: true,
    gmp: false,
  };

  const alerts = [];
  const today = new Date().toISOString().slice(0, 10);

  const prevOpen = new Set(prev.openSymbols || []);
  const prevUpcoming = new Set(prev.upcomingSymbols || []);
  const prevSubs = prev.openSubscriptions || {};

  dashboard.open.forEach((ipo) => {
    if (prefs.opening && !prevOpen.has(ipo.symbol)) {
      alerts.push({
        type: "ipo_open",
        symbol: ipo.symbol,
        message: `${ipo.companyName} IPO opened for subscription`,
        source: "NSE ipo-current-issue",
      });
    }

    if (prefs.closing && ipo.issueEndDate === today) {
      alerts.push({
        type: "ipo_closing",
        symbol: ipo.symbol,
        message: `${ipo.companyName} IPO closes today`,
        source: "NSE ipo-current-issue",
      });
    }

    if (prefs.subscription && ipo.overallSubscription != null) {
      const prevSub = prevSubs[ipo.symbol];
      if (prevSub == null || prevSub !== ipo.overallSubscription) {
        alerts.push({
          type: "subscription_update",
          symbol: ipo.symbol,
          message: `${ipo.companyName}: overall subscription ${ipo.overallSubscription}x`,
          source: "NSE ipo-current-issue",
        });
      }
    }
  });

  dashboard.upcoming.forEach((ipo) => {
    if (prefs.newIpo && !prevUpcoming.has(ipo.symbol)) {
      alerts.push({
        type: "new_ipo",
        symbol: ipo.symbol,
        message: `New upcoming IPO: ${ipo.companyName}`,
        source: "NSE all-upcoming-issues",
      });
    }
  });

  if (prefs.listing) {
    dashboard.listed?.slice(0, 5).forEach((ipo) => {
      if (ipo.listingDate === today) {
        alerts.push({
          type: "listing_day",
          symbol: ipo.symbol,
          message: `${ipo.companyName} listing scheduled today`,
          source: "NSE public-past-issues",
        });
      }
    });
  }

  const freshAlerts = alerts.filter((a) => !isRecentDuplicate(data.log, a));
  if (freshAlerts.length) {
    const now = new Date().toISOString();
    data.log = [...freshAlerts.map((a) => ({ ...a, at: now })), ...(data.log || [])].slice(0, 100);
  }

  data.lastSnapshot = {
    openSymbols: dashboard.open.map((i) => i.symbol),
    openSubscriptions: Object.fromEntries(
      dashboard.open.map((i) => [i.symbol, i.overallSubscription ?? null])
    ),
    upcomingSymbols: dashboard.upcoming.map((i) => i.symbol),
    at: dashboard.fetchedAt || new Date().toISOString(),
  };
  await writeAlerts(data);

  return freshAlerts.slice(0, 20);
}

module.exports = { readAlerts, updatePreferences, evaluateAlerts, logAlert };