"use client";

import { useMemo, useState } from "react";
import MetricValue, { extractValue, MetricTile, DATA_UNAVAILABLE } from "./MetricValue";

/**
 * Metric catalog for Top 50 / stock detail / research.
 * Only metrics with a reliable Yahoo (or computed) source appear in primary groups.
 * Fields without a feed are listed under "Not provided by data source" if referenced.
 */
const GROUPS = [
  {
    id: "valuation",
    title: "Valuation",
    description: "Market pricing multiples from Yahoo Finance quoteSummary",
    metrics: [
      { key: "peRatio", label: "P/E (TTM)", type: "x", decimals: 1, definition: "Trailing twelve-month price-to-earnings ratio" },
      { key: "forwardPe", label: "Forward P/E", type: "x", decimals: 1, definition: "Price divided by consensus forward earnings" },
      { key: "pbRatio", label: "P/B", type: "x", decimals: 2, definition: "Price-to-book value" },
      { key: "pegRatio", label: "PEG", type: "x", decimals: 2, definition: "P/E-to-growth ratio when provided by Yahoo" },
      { key: "evEbitda", label: "EV/EBITDA", type: "x", decimals: 2, definition: "Enterprise value to EBITDA" },
      { key: "marketCap", label: "Market Cap", type: "cr", definition: "Total market capitalization (₹ Cr)" },
      { key: "enterpriseValue", label: "Enterprise Value", type: "cr", definition: "Market cap + net debt (when provided)" },
      { key: "dividendYield", label: "Dividend Yield", type: "yield", decimals: 2, definition: "Trailing / indicated dividend yield" },
      { key: "bookValue", label: "Book Value / Share", type: "price", decimals: 2, definition: "Book value per share from Yahoo" },
      { key: "currentPrice", label: "Current Share Price", type: "price", decimals: 2, definition: "Last price from Yahoo financials when provided" },
      { key: "fiftyTwoWeekHigh", label: "52-Week High", type: "price", decimals: 2, definition: "52-week high from Yahoo summaryDetail" },
      { key: "fiftyTwoWeekLow", label: "52-Week Low", type: "price", decimals: 2, definition: "52-week low from Yahoo summaryDetail" },
      { key: "intrinsicValue", label: "Intrinsic Value", type: "price", definition: "Only if documented DCF exists — never estimated" },
      { key: "faceValue", label: "Face Value", type: "price", definition: "Requires exchange master data" },
    ],
  },
  {
    id: "profitability",
    title: "Profitability & Returns",
    description: "Margins and return ratios from Yahoo financial data",
    metrics: [
      { key: "roe", label: "ROE", type: "ratio", decimals: 1, definition: "Return on equity" },
      { key: "roa", label: "ROA", type: "ratio", decimals: 1, definition: "Return on assets" },
      { key: "roce", label: "ROCE", type: "ratio", decimals: 1, definition: "EBIT ÷ Capital Employed when Yahoo statements provide both — never invented" },
      { key: "grossMargin", label: "Gross Margin", type: "ratio", decimals: 1, definition: "Gross profit margin" },
      { key: "operatingMargin", label: "Operating Margin", type: "ratio", decimals: 1, definition: "Operating profit margin" },
      { key: "netMargin", label: "Net Profit Margin", type: "ratio", decimals: 1, definition: "Net profit margin" },
      { key: "trailingEps", label: "EPS (TTM)", type: "eps", decimals: 2, definition: "Trailing twelve-month earnings per share" },
      { key: "ebitda", label: "EBITDA", type: "cr", definition: "EBITDA from Yahoo financialData" },
    ],
  },
  {
    id: "growth",
    title: "Growth",
    description: "Year-over-year growth rates from Yahoo (not estimated)",
    metrics: [
      { key: "revenueGrowth", label: "Revenue Growth", type: "ratio", decimals: 1, definition: "Year-over-year revenue growth" },
      { key: "profitGrowth", label: "Profit / Earnings Growth", type: "ratio", decimals: 1, definition: "Year-over-year earnings growth" },
    ],
  },
  {
    id: "ownership",
    title: "Shareholding (NSE filings)",
    description: "Promoter / FII / DII / public from NSE SHP when available — never estimated",
    metrics: [
      { key: "promoterHolding", label: "Promoter %", type: "ratio", decimals: 1, definition: "Promoter & promoter group from NSE SHP" },
      { key: "fiiChange", label: "FII / FPI %", type: "ratio", decimals: 1, definition: "Foreign institutions from NSE SHP XBRL" },
      { key: "diiChange", label: "DII %", type: "ratio", decimals: 1, definition: "Domestic institutions from NSE SHP XBRL" },
      { key: "mutualFundHolding", label: "Mutual Funds %", type: "ratio", decimals: 1, definition: "Mutual funds / UTI from NSE SHP or Yahoo" },
      { key: "institutionalHolding", label: "Institutional %", type: "ratio", decimals: 1, definition: "Domestic + foreign institutions when disclosed" },
      { key: "publicHolding", label: "Public %", type: "ratio", decimals: 1, definition: "Public shareholding from NSE SHP" },
    ],
  },
  {
    id: "balance",
    title: "Balance Sheet & Cash",
    description: "Leverage and cash-flow strength from Yahoo",
    metrics: [
      { key: "debtToEquity", label: "Debt / Equity", type: "number", decimals: 2, definition: "Yahoo debt-to-equity figure (as reported)" },
      { key: "currentRatio", label: "Current Ratio", type: "number", decimals: 2, definition: "Current assets / current liabilities" },
      { key: "quickRatio", label: "Quick Ratio", type: "number", decimals: 2, definition: "Quick ratio from Yahoo financialData" },
      { key: "freeCashFlow", label: "Free Cash Flow", type: "cr", definition: "Free cash flow (₹ Cr)" },
      { key: "operatingCashFlow", label: "Operating CF", type: "cr", definition: "Operating cash flow (₹ Cr)" },
      { key: "totalCash", label: "Total Cash", type: "cr", definition: "Total cash from Yahoo" },
      { key: "totalDebt", label: "Total Debt", type: "cr", definition: "Total debt from Yahoo" },
      { key: "totalRevenue", label: "Total Revenue", type: "cr", definition: "Total revenue (TTM) from Yahoo" },
      { key: "beta", label: "Beta", type: "number", decimals: 2, definition: "Equity beta vs market" },
      { key: "sharesOutstanding", label: "Shares Outstanding", type: "number", decimals: 0, definition: "Shares outstanding from Yahoo" },
    ],
  },
];

/** Fields we intentionally call out (no reliable source). */
const UNSUPPORTED = [
  { key: "deliveryPercent", label: "Delivery %", reason: "Requires NSE exchange delivery feed." },
  { key: "intrinsicValue", label: "Intrinsic Value", reason: "Requires documented DCF with verified inputs — never estimated." },
  { key: "faceValue", label: "Face Value", reason: "Requires exchange master / ISIN feed." },
];

function pickField(source, key) {
  if (!source) return null;
  if (source[key] != null) return source[key];
  // Nested valuation / fundamentalAnalysis shapes from research API
  if (source.valuation?.[key] != null) return source.valuation[key];
  if (source.fundamentalAnalysis?.[key] != null) return source.fundamentalAnalysis[key];
  if (source.valuationAnalysis?.[key] != null) return source.valuationAnalysis[key];
  return null;
}

function mergeSources(...sources) {
  const out = {};
  const assignLayer = (layer) => {
    if (!layer || typeof layer !== "object") return;
    for (const [k, v] of Object.entries(layer)) {
      if (out[k] == null && v != null) out[k] = v;
    }
  };
  for (const src of sources) {
    if (!src || typeof src !== "object") continue;
    assignLayer(src);
    assignLayer(src.valuation);
    assignLayer(src.fundamentalAnalysis);
    assignLayer(src.valuationAnalysis);
    assignLayer(src.fundamentals?.valuation);
    assignLayer(src.fundamentals?.fundamentalAnalysis);
  }
  return out;
}

export default function FundamentalsPanel({
  stock = null,
  fundamentals = null,
  valuation = null,
  available = null,
  source = null,
  compact = false,
  title = "Fundamental Data",
}) {
  const [showUnsupported, setShowUnsupported] = useState(false);

  const bag = useMemo(
    () => mergeSources(stock, fundamentals, valuation, fundamentals?.fundamentalAnalysis, fundamentals?.valuation),
    [stock, fundamentals, valuation]
  );

  const isAvailable =
    available != null
      ? available
      : stock?.fundamentalsAvailable === true ||
        fundamentals?.available === true ||
        GROUPS.some((g) => g.metrics.some((m) => extractValue(pickField(bag, m.key)) != null));

  const sourceLabel = source || stock?.fundamentalsSource || fundamentals?.source || "Yahoo Finance quoteSummary API";

  const groupsWithStats = useMemo(() => {
    return GROUPS.map((g) => {
      const items = g.metrics.map((m) => ({
        ...m,
        value: pickField(bag, m.key),
        hasValue: extractValue(pickField(bag, m.key)) != null,
      }));
      const availableCount = items.filter((i) => i.hasValue).length;
      return { ...g, items, availableCount };
    });
  }, [bag]);

  const totalAvailable = groupsWithStats.reduce((a, g) => a + g.availableCount, 0);

  if (!isAvailable && totalAvailable === 0) {
    return (
      <section className={`fundamentals-panel glass-card${compact ? " compact" : ""}`}>
        <header className="fund-panel-head">
          <div>
            <h3>{title}</h3>
            <p className="panel-sub">Verified fundamental metrics from approved market data feeds</p>
          </div>
          <span className="fund-status fund-status-na">Unavailable</span>
        </header>
        <div className="fund-empty">
          <p className="metric-na fund-empty-msg">{DATA_UNAVAILABLE}</p>
          <p className="panel-sub">
            {stock?.fundamentalsMessage ||
              fundamentals?.message ||
              "Source does not provide this information at the moment. Awaiting latest market data — values are never estimated."}
          </p>
          <p className="fund-source">Expected source: {sourceLabel}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`fundamentals-panel glass-card${compact ? " compact" : ""}`}>
      <header className="fund-panel-head">
        <div>
          <h3>{title}</h3>
          <p className="panel-sub">
            {totalAvailable} verified metric{totalAvailable === 1 ? "" : "s"} · {sourceLabel}
          </p>
        </div>
        <span className="fund-status fund-status-ok">Verified</span>
      </header>

      <div className="fund-groups">
        {groupsWithStats.map((group) => (
          <div key={group.id} className="fund-group">
            <div className="fund-group-head">
              <h4>{group.title}</h4>
              <span>
                {group.availableCount}/{group.items.length}
              </span>
            </div>
            <p className="fund-group-desc">{group.description}</p>
            <div className={`fund-metric-grid${compact ? " compact" : ""}`}>
              {group.items.map((m) => (
                <MetricTile
                  key={m.key}
                  label={m.label}
                  value={m.value}
                  type={m.type}
                  decimals={m.decimals}
                  definition={m.definition}
                  hideIfUnavailable={false}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <footer className="fund-panel-foot">
        <button
          type="button"
          className="linkish"
          onClick={() => setShowUnsupported((v) => !v)}
          aria-expanded={showUnsupported}
        >
          {showUnsupported ? "Hide" : "Why some metrics are missing"}
        </button>
        {showUnsupported && (
          <ul className="fund-unsupported">
            {UNSUPPORTED.map((u) => (
              <li key={u.key}>
                <strong>{u.label}</strong>
                <span>{u.reason}</span>
              </li>
            ))}
            <li>
              <strong>Policy</strong>
              <span>
                Missing values show as &quot;{DATA_UNAVAILABLE}&quot; — never 0, null, or estimated figures.
              </span>
            </li>
          </ul>
        )}
      </footer>
    </section>
  );
}

/** Compact strip for stock cards — only primary verified fields. */
export function FundamentalsStrip({ stock }) {
  const tiles = [
    { key: "roe", label: "ROE", type: "ratio", decimals: 1 },
    { key: "peRatio", label: "P/E", type: "x", decimals: 1 },
    { key: "monthlyChangePercent", label: "1M", type: "pct", decimals: 2 },
    { key: "ytdReturn", label: "YTD", type: "pct", decimals: 2 },
  ];

  return (
    <div className="metric-strip fund-strip">
      {tiles.map((t) => (
        <div key={t.key}>
          <small>{t.label}</small>
          <MetricValue value={stock?.[t.key]} type={t.type} decimals={t.decimals} label={t.label} />
        </div>
      ))}
    </div>
  );
}
