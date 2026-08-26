const fs = require("fs");
const path = require("path");
const { dataPath } = require("./data-path");

const TZ = "Asia/Kolkata";
const MARKET_OPEN = 9 * 60 + 15;
const MARKET_CLOSE = 15 * 60 + 30;

let holidayCache = null;

function getIstNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function loadHolidays() {
  if (holidayCache) return holidayCache;
  try {
    const file = dataPath("nse-holidays.json");
    const seed = path.join(process.cwd(), "data", "nse-holidays.json");
    const target = fs.existsSync(file) ? file : seed;
    holidayCache = JSON.parse(fs.readFileSync(target, "utf8"));
  } catch {
    holidayCache = [];
  }
  return holidayCache;
}

function isHoliday(dateKey) {
  return loadHolidays().includes(dateKey);
}

/**
 * Resolve NSE market status and operating mode for strategy centers.
 * @returns {{
 *   mode: 'live' | 'pre-open' | 'next-session' | 'week-ahead',
 *   status: 'open' | 'closed' | 'weekend' | 'holiday' | 'pre-open' | 'post-close',
 *   label: string,
 *   bannerTitle: string,
 *   bannerSubtitle: string,
 *   isLive: boolean,
 *   isTradingDay: boolean,
 *   isWeekend: boolean,
 *   isHoliday: boolean,
 *   timezone: string,
 *   sessionDate: string,
 *   checkedAt: string,
 *   dataContext: string,
 * }}
 */
function resolveMarketStatus(now = new Date()) {
  const ist = new Date(now.toLocaleString("en-US", { timeZone: TZ }));
  const day = ist.getDay();
  const sessionDate = formatDateKey(ist);
  const isWeekend = day === 0 || day === 6;
  const holiday = isHoliday(sessionDate);
  const isTradingDay = !isWeekend && !holiday;

  const timeVal = ist.getHours() * 60 + ist.getMinutes();
  const isLiveSession = isTradingDay && timeVal >= MARKET_OPEN && timeVal <= MARKET_CLOSE;

  let status = "closed";
  if (isWeekend) status = "weekend";
  else if (holiday) status = "holiday";
  else if (timeVal < MARKET_OPEN) status = "pre-open";
  else if (timeVal > MARKET_CLOSE) status = "post-close";
  else status = "open";

  const nextTradingSession = (() => {
    const cursor = new Date(ist);
    cursor.setHours(0, 0, 0, 0);
    for (let dayOffset = 1; dayOffset <= 14; dayOffset += 1) {
      cursor.setDate(cursor.getDate() + 1);
      const candidateDay = cursor.getDay();
      const candidateKey = formatDateKey(cursor);
      if (candidateDay !== 0 && candidateDay !== 6 && !isHoliday(candidateKey)) return new Date(cursor);
    }
    return null;
  })();
  const nextSessionDate = nextTradingSession ? formatDateKey(nextTradingSession) : null;
  const tomorrow = new Date(ist);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isExtendedPlanning = isWeekend || holiday || !nextTradingSession || formatDateKey(nextTradingSession) !== formatDateKey(tomorrow);
  const mode = isLiveSession
    ? "live"
    : status === "pre-open"
      ? "pre-open"
      : isExtendedPlanning
        ? "week-ahead"
        : "next-session";
  const isLive = isLiveSession;

  const statusLabels = {
    open: "Market Open",
    closed: "Market Closed",
    weekend: "Weekend",
    holiday: "Exchange Holiday",
    "pre-open": "Before Market Open",
    "post-close": "After Market Close",
  };

  const planningDateLabel = nextTradingSession
    ? nextTradingSession.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "the next trading session";
  const bannerTitle = isLive
    ? "LIVE MARKET"
    : mode === "pre-open"
      ? "BEFORE MARKET OPEN"
      : mode === "week-ahead"
        ? "WEEK-AHEAD PLAN"
        : "NEXT SESSION PLAN";
  const bannerSubtitle = isLive
    ? "Using real-time verified market data."
    : mode === "pre-open"
      ? "Use the latest verified close to prepare; confirm prices and triggers after trading begins."
      : mode === "week-ahead"
        ? `Use the latest verified close to plan for ${planningDateLabel}; prices and triggers require confirmation in the next session.`
        : `Use the latest verified close to plan for ${planningDateLabel}; prices and triggers require confirmation in the next session.`;

  const dataContext = isLive
    ? "Real-time verified NSE & Yahoo Finance feeds"
    : "Latest verified market close — NSE option chain, prices & institutional data";

  return {
    mode,
    status,
    label: statusLabels[status] || "Market Closed",
    bannerTitle,
    bannerSubtitle,
    isLive,
    isTradingDay,
    isWeekend,
    isHoliday: holiday,
    timezone: TZ,
    sessionDate,
    marketOpen: "09:15 IST",
    marketClose: "15:30 IST",
    checkedAt: now.toISOString(),
    dataContext,
    nextSessionDate,
    planningDateLabel,
    strategyStateLabel: isLive
      ? "Live Session"
      : mode === "pre-open"
        ? "Before Open"
        : mode === "week-ahead"
          ? "Week-Ahead Plan"
          : "Next Session",
    planningNote: isLive
      ? null
      : `Reference prices come from the latest verified close. Confirm premium and trigger when ${nextSessionDate ? `the ${nextSessionDate} session` : "trading resumes"} begins.`,
    modeLabel: isLive
      ? "Live Strategy Mode"
      : mode === "pre-open"
        ? "Before-Open Planning Mode"
        : mode === "week-ahead"
          ? "Week-Ahead Planning Mode"
          : "Next-Session Planning Mode",
  };
}

function expectsLiveChain(marketStatus) {
  return marketStatus?.isLive === true;
}

module.exports = {
  getIstNow,
  formatDateKey,
  loadHolidays,
  isHoliday,
  resolveMarketStatus,
  expectsLiveChain,
  TZ,
};
