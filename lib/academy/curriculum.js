/**
 * Knowledge Centre curriculum — original ABC course map.
 * Bodies live in lib/academy/content/*.js
 */

const TRACKS = [
  {
    id: "foundations",
    no: 1,
    title: "Foundations",
    level: "Foundation",
    color: "mint",
    blurb: "How markets work, who is on the other side, and why price is not value.",
    minutes: 95,
  },
  {
    id: "india",
    no: 2,
    title: "Indian Market Architecture",
    level: "Foundation",
    color: "cobalt",
    blurb: "SEBI, NSE, BSE, MCX, demat, T+1 settlement, and how an order is matched.",
    minutes: 110,
  },
  {
    id: "equity",
    no: 3,
    title: "Equity Investing",
    level: "Foundation",
    color: "gold",
    blurb: "Shares, quotes, indices, corporate actions, IPOs, and a process for not buying noise.",
    minutes: 100,
  },
  {
    id: "fundamentals",
    no: 4,
    title: "Fundamental Analysis",
    level: "Intermediate",
    color: "mint",
    blurb: "Statements, cash, ratios, valuation, moats, red flags, and the annual report.",
    minutes: 130,
  },
  {
    id: "technicals",
    no: 5,
    title: "Technical Analysis",
    level: "Intermediate",
    color: "cobalt",
    blurb: "Structure, volume, indicators, and an honest view of what charts can and cannot do.",
    minutes: 120,
  },
  {
    id: "futures",
    no: 6,
    title: "Futures & Leverage",
    level: "Intermediate",
    color: "terracotta",
    blurb: "Contract specs, mark-to-market, margins, basis, hedges, and the F&O ban list.",
    minutes: 115,
  },
  {
    id: "options",
    no: 7,
    title: "Options",
    level: "Advanced",
    color: "cobalt",
    blurb: "Calls, puts, premium, IV, Greeks, spreads, assignment, and sizing an options book.",
    minutes: 140,
  },
  {
    id: "commodities",
    no: 8,
    title: "Commodities & Currency",
    level: "Advanced",
    color: "gold",
    blurb: "MCX metals and energy, agri seasonality, USDINR, hedgers versus speculators.",
    minutes: 100,
  },
  {
    id: "psychology",
    no: 9,
    title: "Trading Psychology",
    level: "Desk",
    color: "terracotta",
    blurb: "Bias, FOMO, revenge trading, journaling, and rules that survive a bad day.",
    minutes: 110,
  },
  {
    id: "risk",
    no: 10,
    title: "Risk & Money Management",
    level: "Desk",
    color: "mint",
    blurb: "R-multiples, correlation, Kelly, expectancy, heat, and a one-page risk policy.",
    minutes: 115,
  },
  {
    id: "regulations",
    no: 11,
    title: "Regulation, Tax & Operations",
    level: "Desk",
    color: "cobalt",
    blurb: "Insider rules, STT, capital gains, F&O tax, pledge, SCORES, and NISM map.",
    minutes: 105,
  },
  {
    id: "desk",
    no: 12,
    title: "The Professional Desk",
    level: "Desk",
    color: "gold",
    blurb: "Playbooks, honest backtests, execution, flows, events, and a 90-day apprenticeship.",
    minutes: 120,
  },
  {
    id: "library",
    no: 13,
    title: "Library & Field Kit",
    level: "All levels",
    color: "mint",
    blurb: "Official classrooms, books to buy legally, worksheets, glossary — no pirated files.",
    minutes: 40,
  },
  {
    id: "strategies",
    no: 14,
    title: "Option Strategies",
    level: "Advanced",
    color: "terracotta",
    blurb: "Turn a market view into a defined structure: spreads, condors, calendars, and when not to adjust.",
    minutes: 180,
  },
  {
    id: "funds",
    no: 15,
    title: "Mutual Funds & ETFs",
    level: "Foundation",
    color: "mint",
    blurb: "NAV, TER, SIP, direct plans, index funds, factsheets, and how funds are taxed in India.",
    minutes: 140,
  },
  {
    id: "bonds",
    no: 16,
    title: "Bonds & Government Securities",
    level: "Intermediate",
    color: "gold",
    blurb: "Yield, duration, G-Secs, T-bills, SDLs, credit risk, and why bond prices move when rates move.",
    minutes: 120,
  },
  {
    id: "sectors",
    no: 17,
    title: "Sector Analysis",
    level: "Intermediate",
    color: "cobalt",
    blurb: "How banks, IT, energy, auto, pharma and consumer businesses actually make money in India.",
    minutes: 130,
  },
  {
    id: "modelling",
    no: 18,
    title: "Financial Modelling",
    level: "Advanced",
    color: "mint",
    blurb: "Link three statements, build revenue and working capital, run a DCF, and stress the assumptions.",
    minutes: 140,
  },
  {
    id: "insurance",
    no: 19,
    title: "Insurance",
    level: "Foundation",
    color: "gold",
    blurb: "Term, health, and why a ULIP is not a substitute for either investing or covering risk.",
    minutes: 80,
  },
  {
    id: "nps",
    no: 20,
    title: "NPS & Retirement",
    level: "Foundation",
    color: "cobalt",
    blurb: "National Pension System: tiers, asset classes, tax, annuity, and how it sits next to EPF and PPF.",
    minutes: 80,
  },
  {
    id: "sse",
    no: 21,
    title: "Social Stock Exchange",
    level: "Foundation",
    color: "mint",
    blurb: "How SSE lets non-profits and social enterprises raise funds, and what a retail investor should know.",
    minutes: 45,
  },
];

const LESSONS = [
  // Foundations
  ["foundations", "foundations-01", "How a market actually works", 12, ["article", "diagram", "quiz"]],
  ["foundations", "foundations-02", "Price, value and expected return", 12, ["article", "formula", "quiz"]],
  ["foundations", "foundations-03", "Risk is not just volatility", 12, ["article", "diagram", "quiz"]],
  ["foundations", "foundations-04", "Compounding and the long game", 10, ["article", "formula", "worksheet"]],
  ["foundations", "foundations-05", "Who is on the other side of your trade", 12, ["article", "quiz"]],
  ["foundations", "foundations-06", "Orders, liquidity and the bid–ask spread", 14, ["article", "diagram", "quiz"]],
  ["foundations", "foundations-07", "Investing, trading and hedging", 10, ["article", "quiz"]],
  ["foundations", "foundations-08", "Build your personal market map", 12, ["article", "worksheet"]],
  // India
  ["india", "india-01", "SEBI, exchanges and the Indian rulebook", 14, ["article", "source"]],
  ["india", "india-02", "Demat, trading account and KYC", 12, ["article", "quiz"]],
  ["india", "india-03", "Cash session hours and T+1 settlement", 12, ["article", "diagram"]],
  ["india", "india-04", "Indices: Nifty, Bank Nifty, Sensex", 12, ["article", "quiz"]],
  ["india", "india-05", "Circuit filters, ASM and GSM", 12, ["article", "caution"]],
  ["india", "india-06", "Corporate actions that change your position", 14, ["article", "table"]],
  ["india", "india-07", "Brokers, depositories and the fee stack", 12, ["article", "worksheet"]],
  ["india", "india-08", "From click to matching engine", 14, ["article", "diagram"]],
  // Equity
  ["equity", "equity-01", "What a share legally is", 10, ["article", "quiz"]],
  ["equity", "equity-02", "How to read an Indian stock quote", 12, ["article", "diagram"]],
  ["equity", "equity-03", "Market cap, free float and liquidity", 12, ["article", "formula"]],
  ["equity", "equity-04", "Dividends, bonus, splits and rights", 12, ["article", "table"]],
  ["equity", "equity-05", "Sectors, cycles and business models", 12, ["article"]],
  ["equity", "equity-06", "IPOs without the brochure language", 14, ["article", "caution"]],
  ["equity", "equity-07", "A process for building a watchlist", 12, ["article", "worksheet"]],
  ["equity", "equity-08", "When the correct action is not to buy", 10, ["article", "quiz"]],
  // Fundamentals
  ["fundamentals", "fundamentals-01", "The three financial statements", 16, ["article", "diagram"]],
  ["fundamentals", "fundamentals-02", "Revenue quality, margins and cash", 14, ["article", "formula"]],
  ["fundamentals", "fundamentals-03", "Balance-sheet quality and leverage", 14, ["article", "caution"]],
  ["fundamentals", "fundamentals-04", "Ratios that earn their keep", 14, ["article", "table"]],
  ["fundamentals", "fundamentals-05", "Valuation: multiples versus intrinsic", 16, ["article", "formula"]],
  ["fundamentals", "fundamentals-06", "Moats and capital allocation", 14, ["article"]],
  ["fundamentals", "fundamentals-07", "Red flags and forensic basics", 14, ["article", "caution"]],
  ["fundamentals", "fundamentals-08", "Reading an annual report in 90 minutes", 16, ["article", "worksheet"]],
  ["fundamentals", "fundamentals-09", "Working capital and the cash cycle", 14, ["article", "formula"]],
  ["fundamentals", "fundamentals-10", "A DCF you can actually defend", 16, ["article", "formula"]],
  ["fundamentals", "fundamentals-11", "Peer comparison without fooling yourself", 12, ["article", "table"]],
  ["fundamentals", "fundamentals-12", "Promoters, pledges and related parties", 14, ["article", "caution"]],
  // Technicals
  ["technicals", "technicals-01", "Charts are a language, not a forecast", 12, ["article", "caution"]],
  ["technicals", "technicals-02", "Candlesticks and market structure", 14, ["article", "diagram"]],
  ["technicals", "technicals-03", "Trend, range, support and resistance", 14, ["article", "diagram"]],
  ["technicals", "technicals-04", "Volume and participation", 12, ["article"]],
  ["technicals", "technicals-05", "Moving averages and VWAP", 14, ["article", "formula"]],
  ["technicals", "technicals-06", "RSI and MACD — what they measure", 14, ["article"]],
  ["technicals", "technicals-07", "Patterns and honest probabilities", 12, ["article", "caution"]],
  ["technicals", "technicals-08", "A technical checklist you can audit", 12, ["article", "worksheet"]],
  ["technicals", "technicals-09", "Gaps, news days and opening range", 12, ["article"]],
  ["technicals", "technicals-10", "Multiple timeframes without confusion", 12, ["article"]],
  ["technicals", "technicals-11", "Market breadth and internals", 12, ["article"]],
  ["technicals", "technicals-12", "Turning charts into a written playbook", 12, ["article", "worksheet"]],
  // Futures
  ["futures", "futures-01", "Why derivatives exist", 12, ["article"]],
  ["futures", "futures-02", "Futures specs, lots and tick value", 14, ["article", "table"]],
  ["futures", "futures-03", "Mark-to-market and margins", 14, ["article", "formula"]],
  ["futures", "futures-04", "Basis, roll and expiry week", 14, ["article"]],
  ["futures", "futures-05", "Index futures versus stock futures", 12, ["article"]],
  ["futures", "futures-06", "Hedging a cash portfolio with futures", 14, ["article", "formula"]],
  ["futures", "futures-07", "Leverage: the silent account killer", 12, ["article", "caution"]],
  ["futures", "futures-08", "Ban list, MWPL and position limits", 12, ["article", "source"]],
  // Options
  ["options", "options-01", "Call and put in plain language", 14, ["article", "diagram"]],
  ["options", "options-02", "Payoff diagrams you can draw by hand", 14, ["article", "diagram"]],
  ["options", "options-03", "Premium, moneyness and time decay", 14, ["article", "formula"]],
  ["options", "options-04", "Implied volatility and the smile", 16, ["article"]],
  ["options", "options-05", "Greeks: delta through vega", 16, ["article", "table"]],
  ["options", "options-06", "Spreads, condors and butterflies", 16, ["article", "diagram"]],
  ["options", "options-07", "Exercise, assignment and settlement", 12, ["article"]],
  ["options", "options-08", "Sizing an options book", 14, ["article", "worksheet"]],
  ["options", "options-09", "How to read an option chain", 14, ["article", "table"]],
  ["options", "options-10", "Weekly versus monthly options", 12, ["article"]],
  ["options", "options-11", "Put-call parity in plain language", 14, ["article", "formula"]],
  ["options", "options-12", "Trading volatility, not just direction", 14, ["article"]],
  // Commodities
  ["commodities", "commodities-01", "Why commodities are a different animal", 12, ["article"]],
  ["commodities", "commodities-02", "MCX gold, silver, crude and gas", 14, ["article", "table"]],
  ["commodities", "commodities-03", "Agri contracts and seasonality", 12, ["article"]],
  ["commodities", "commodities-04", "USDINR and currency futures", 12, ["article"]],
  ["commodities", "commodities-05", "Hedgers, inventory and the roll", 12, ["article"]],
  ["commodities", "commodities-06", "Commodity risk versus equity risk", 12, ["article"]],
  ["commodities", "commodities-07", "Margins, delivery and intent", 12, ["article", "caution"]],
  ["commodities", "commodities-08", "A commodity research notebook", 10, ["article", "worksheet"]],
  // Psychology
  ["psychology", "psychology-01", "The account is a mirror", 12, ["article"]],
  ["psychology", "psychology-02", "A working catalogue of biases", 14, ["article", "table"]],
  ["psychology", "psychology-03", "Process versus outcome", 12, ["article"]],
  ["psychology", "psychology-04", "Drawdown: math and mood", 12, ["article"]],
  ["psychology", "psychology-05", "Revenge trading and overtrading", 12, ["article", "caution"]],
  ["psychology", "psychology-06", "A journal that changes behaviour", 14, ["article", "worksheet"]],
  ["psychology", "psychology-07", "Sleep, routine and decision fatigue", 10, ["article"]],
  ["psychology", "psychology-08", "Rules that survive a bad Thursday", 12, ["article", "quiz"]],
  // Risk
  ["risk", "risk-01", "Define risk before you hunt edge", 12, ["article"]],
  ["risk", "risk-02", "Position sizing from R", 14, ["article", "formula", "worksheet"]],
  ["risk", "risk-03", "Correlation and hidden concentration", 12, ["article"]],
  ["risk", "risk-04", "Stops: price, time and thesis", 12, ["article"]],
  ["risk", "risk-05", "Kelly, half-Kelly and ruin", 14, ["article", "formula"]],
  ["risk", "risk-06", "Expectancy and sample size", 12, ["article", "formula"]],
  ["risk", "risk-07", "Portfolio heat and daily loss caps", 12, ["article"]],
  ["risk", "risk-08", "Write a one-page risk policy", 12, ["article", "worksheet"]],
  // Regulations
  ["regulations", "regulations-01", "Insider trading and market abuse", 14, ["article", "source"]],
  ["regulations", "regulations-02", "STT, stamp duty and brokerage GST", 12, ["article", "table"]],
  ["regulations", "regulations-03", "Equity taxation in India", 14, ["article"]],
  ["regulations", "regulations-04", "How F&O profits are taxed", 14, ["article", "caution"]],
  ["regulations", "regulations-05", "Pledge, MTF and funding risk", 12, ["article", "caution"]],
  ["regulations", "regulations-06", "Disclosures you are required to read", 12, ["article", "source"]],
  ["regulations", "regulations-07", "SCORES and investor grievance", 10, ["article", "source"]],
  ["regulations", "regulations-08", "NISM map: which exam for which seat", 12, ["article", "table"]],
  // Desk
  ["desk", "desk-01", "Write a playbook, not a wish", 12, ["article", "worksheet"]],
  ["desk", "desk-02", "Backtests that do not lie", 14, ["article", "caution"]],
  ["desk", "desk-03", "Execution, slippage and impact", 12, ["article"]],
  ["desk", "desk-04", "Reading FII/DII and options open interest", 14, ["article"]],
  ["desk", "desk-05", "Event risk: RBI, Budget, results", 12, ["article"]],
  ["desk", "desk-06", "A multi-timeframe desk workflow", 12, ["article"]],
  ["desk", "desk-07", "Costs, break-even and the professional P&L", 12, ["article", "formula"]],
  ["desk", "desk-08", "A 90-day apprenticeship plan", 14, ["article", "worksheet"]],
  // Library
  ["library", "library-01", "Official classrooms: NSE, SEBI, NISM, MCX", 10, ["source", "article"]],
  ["library", "library-02", "Books to buy legally — not pirate", 12, ["article"]],
  ["library", "library-03", "Worksheets: journal, sizing, risk policy", 10, ["worksheet"]],
  ["library", "library-04", "Field glossary: 80 terms you will actually use", 16, ["article"]],
  ["strategies", "strategies-01", "From a view to a structure", 12, ["article"]],
  ["strategies", "strategies-02", "Bull call and bear put spreads", 14, ["article", "example"]],
  ["strategies", "strategies-03", "Credit spreads: selling defined risk", 14, ["article", "example"]],
  ["strategies", "strategies-04", "Covered calls and cash-secured puts", 14, ["article"]],
  ["strategies", "strategies-05", "Straddles and strangles", 14, ["article", "lab"]],
  ["strategies", "strategies-06", "Iron condor, step by step", 16, ["article", "example"]],
  ["strategies", "strategies-07", "Butterflies and iron flies", 14, ["article"]],
  ["strategies", "strategies-08", "Calendars and diagonals", 14, ["article"]],
  ["strategies", "strategies-09", "Ratio spreads and why they bite", 12, ["article", "caution"]],
  ["strategies", "strategies-10", "Adjustments: when to stand down", 12, ["article"]],
  ["strategies", "strategies-11", "Match the strategy to the view", 14, ["article", "table"]],
  ["strategies", "strategies-12", "Write a one-page strategy card", 12, ["article", "worksheet"]],
  ["funds", "funds-01", "What a mutual fund actually is", 12, ["article"]],
  ["funds", "funds-02", "NAV, AUM and the expense ratio", 12, ["article", "formula"]],
  ["funds", "funds-03", "Equity, debt and hybrid funds", 12, ["article", "table"]],
  ["funds", "funds-04", "Index funds and ETFs", 14, ["article"]],
  ["funds", "funds-05", "SIP, STP and SWP", 12, ["article"]],
  ["funds", "funds-06", "Direct versus regular plans", 10, ["article"]],
  ["funds", "funds-07", "How to read a fund factsheet", 14, ["article", "worksheet"]],
  ["funds", "funds-08", "Riskometer and suitability", 10, ["article"]],
  ["funds", "funds-09", "How mutual funds are taxed", 14, ["article"]],
  ["funds", "funds-10", "A simple allocation you can live with", 12, ["article", "worksheet"]],
  ["bonds", "bonds-01", "What a bond promises to pay", 12, ["article"]],
  ["bonds", "bonds-02", "Price, yield and duration", 14, ["article", "formula"]],
  ["bonds", "bonds-03", "G-Secs and how India borrows", 12, ["article"]],
  ["bonds", "bonds-04", "T-bills, SDLs and corporate bonds", 12, ["article", "table"]],
  ["bonds", "bonds-05", "Credit risk and ratings", 12, ["article", "caution"]],
  ["bonds", "bonds-06", "What happens when RBI changes rates", 12, ["article"]],
  ["bonds", "bonds-07", "Debt funds versus holding bonds directly", 12, ["article"]],
  ["bonds", "bonds-08", "Building a rupee income ladder", 12, ["article", "worksheet"]],
  ["sectors", "sectors-01", "Why sector context comes first", 10, ["article"]],
  ["sectors", "sectors-02", "Banks and NBFCs", 14, ["article"]],
  ["sectors", "sectors-03", "IT services and global spending", 12, ["article"]],
  ["sectors", "sectors-04", "Energy, oil and metals", 12, ["article"]],
  ["sectors", "sectors-05", "Automobiles and ancillaries", 12, ["article"]],
  ["sectors", "sectors-06", "Pharma and healthcare", 12, ["article"]],
  ["sectors", "sectors-07", "Consumer, staples and discretionary", 12, ["article"]],
  ["sectors", "sectors-08", "Keep a sector notebook", 10, ["article", "worksheet"]],
  ["modelling", "modelling-01", "What a model is for — and not for", 12, ["article"]],
  ["modelling", "modelling-02", "Linking the three statements", 14, ["article", "diagram"]],
  ["modelling", "modelling-03", "Building a revenue forecast", 14, ["article"]],
  ["modelling", "modelling-04", "Working capital in the model", 12, ["article", "formula"]],
  ["modelling", "modelling-05", "Debt, interest and the cash sweep", 12, ["article"]],
  ["modelling", "modelling-06", "Discounted cash flow, piece by piece", 16, ["article", "formula"]],
  ["modelling", "modelling-07", "Scenarios and sensitivity tables", 12, ["article", "table"]],
  ["modelling", "modelling-08", "Model hygiene so you do not fool yourself", 12, ["article", "worksheet"]],
  ["insurance", "insurance-01", "Insurance buys a loss you cannot bear", 10, ["article"]],
  ["insurance", "insurance-02", "Term cover versus bundled products", 12, ["article", "table"]],
  ["insurance", "insurance-03", "Health insurance that actually pays", 12, ["article"]],
  ["insurance", "insurance-04", "How to read a policy document", 12, ["article"]],
  ["insurance", "insurance-05", "Claims: paperwork before the hospital", 10, ["article"]],
  ["insurance", "insurance-06", "How much cover is enough", 12, ["article", "worksheet"]],
  ["nps", "nps-01", "What the National Pension System is", 12, ["article"]],
  ["nps", "nps-02", "Tiers, asset classes and fund managers", 12, ["article", "table"]],
  ["nps", "nps-03", "Active choice versus auto choice", 10, ["article"]],
  ["nps", "nps-04", "Tax treatment of NPS", 12, ["article"]],
  ["nps", "nps-05", "Exit, lump sum and annuity", 12, ["article"]],
  ["nps", "nps-06", "NPS next to EPF, PPF and SIPs", 12, ["article"]],
  ["sse", "sse-01", "What the Social Stock Exchange is", 10, ["article"]],
  ["sse", "sse-02", "Instruments: grants, ZCZP and equity", 12, ["article"]],
  ["sse", "sse-03", "Who can list and who can invest", 10, ["article"]],
  ["sse", "sse-04", "How to think about social returns", 10, ["article"]],
];

const PATHS = [
  {
    id: "start",
    title: "Start here",
    blurb: "Zero to literate: how markets work in India.",
    lessons: ["foundations-01", "india-01", "india-02", "equity-01", "equity-02", "risk-01", "psychology-01"],
  },
  {
    id: "investor",
    title: "Investor path",
    blurb: "Own businesses, not tickers.",
    lessons: ["equity-01", "fundamentals-01", "fundamentals-05", "equity-07", "regulations-03", "risk-08"],
  },
  {
    id: "trader",
    title: "Trader path",
    blurb: "Process, risk, psychology, then setups.",
    lessons: ["technicals-01", "technicals-08", "psychology-03", "risk-02", "desk-01", "desk-08"],
  },
  {
    id: "derivatives",
    title: "Derivatives path",
    blurb: "Futures, options theory, then strategies.",
    lessons: ["futures-01", "futures-03", "options-01", "options-05", "options-09", "strategies-01", "strategies-06", "options-08"],
  },
  {
    id: "wealth",
    title: "Long-term wealth path",
    blurb: "Funds, bonds, insurance and NPS for a household book.",
    lessons: ["funds-01", "funds-04", "funds-10", "bonds-01", "insurance-01", "nps-01", "nps-06"],
  },
];

function lessonMeta() {
  return LESSONS.map(([trackId, id, title, minutes, formats], index) => ({
    id,
    trackId,
    title,
    minutes,
    formats,
    index,
    number: LESSONS.filter((row) => row[0] === trackId).findIndex((row) => row[1] === id) + 1,
  }));
}

const LESSON_LIST = lessonMeta();
const LESSON_BY_ID = Object.fromEntries(LESSON_LIST.map((l) => [l.id, l]));
const TRACK_BY_ID = Object.fromEntries(TRACKS.map((t) => [t.id, t]));

function lessonsForTrack(trackId) {
  return LESSON_LIST.filter((l) => l.trackId === trackId);
}

function getLesson(id) {
  return LESSON_BY_ID[id] || null;
}

function getTrack(id) {
  return TRACK_BY_ID[id] || null;
}

function neighbors(id) {
  const i = LESSON_LIST.findIndex((l) => l.id === id);
  return {
    prev: i > 0 ? LESSON_LIST[i - 1] : null,
    next: i >= 0 && i < LESSON_LIST.length - 1 ? LESSON_LIST[i + 1] : null,
  };
}

function searchLessons(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return LESSON_LIST;
  return LESSON_LIST.filter((l) => {
    const track = TRACK_BY_ID[l.trackId];
    return (
      l.title.toLowerCase().includes(q) ||
      l.id.includes(q) ||
      track?.title.toLowerCase().includes(q) ||
      l.formats.join(" ").includes(q)
    );
  });
}

module.exports = {
  TRACKS,
  PATHS,
  LESSON_LIST,
  lessonsForTrack,
  getLesson,
  getTrack,
  neighbors,
  searchLessons,
};
