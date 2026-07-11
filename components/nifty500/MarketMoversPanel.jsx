"use client";

import Link from "next/link";
import MetricValue from "./MetricValue";

/**
 * Institutional Top Gainers / Top Losers / Most Active.
 * Every row navigates to the full stock analysis page.
 * Displays only verified mover fields — never fabricates prices or % changes.
 */

function formatVolume(vol) {
  if (vol == null || !Number.isFinite(Number(vol))) return null;
  const n = Number(vol);
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(2)} L`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString("en-IN");
}

function MoverRow({ stock, rank, variant }) {
  const href = `/nifty500/stock/${encodeURIComponent(stock.symbol)}`;
  const chg = stock.changePercent;
  const chgCls =
    chg == null ? "neutral" : chg > 0 ? "up" : chg < 0 ? "down" : "neutral";
  const ticker = stock.symbol?.replace(/\.NS$/i, "") || stock.symbol;

  return (
    <li>
      <Link href={href} className={`mover-row mover-${variant}`} prefetch>
        <span className="mover-rank" aria-hidden>
          {rank}
        </span>
        <span className="mover-identity">
          <strong className="mover-name">{stock.name || ticker}</strong>
          <span className="mover-meta">
            <span className="mover-ticker">{ticker}</span>
            {stock.sector && <span className="mover-sector">{stock.sector}</span>}
          </span>
        </span>
        <span className="mover-stats">
          <span className="mover-price">
            <MetricValue value={stock.price} type="price" label="Price" />
          </span>
          {variant === "active" ? (
            <strong className="mover-chg neutral">
              {formatVolume(stock.volume) ?? "Data Unavailable"}
            </strong>
          ) : (
            <strong className={`mover-chg ${chgCls}`}>
              {chg != null && Number.isFinite(chg)
                ? `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%`
                : "Data Unavailable"}
            </strong>
          )}
        </span>
        <span className="mover-chevron" aria-hidden>
          →
        </span>
      </Link>
    </li>
  );
}

function MoverColumn({ title, subtitle, items, variant, emptyHint }) {
  return (
    <div className={`movers-panel glass-card movers-${variant}`}>
      <header className="movers-panel-head">
        <div>
          <h4>{title}</h4>
          <p className="panel-sub">{subtitle}</p>
        </div>
        <span className="movers-count">{items?.length || 0}</span>
      </header>
      {items?.length > 0 ? (
        <ul className="movers-list">
          {items.map((s, i) => (
            <MoverRow key={s.symbol} stock={s} rank={i + 1} variant={variant} />
          ))}
        </ul>
      ) : (
        <p className="empty-state movers-empty">
          {emptyHint || "Awaiting latest market data"}
        </p>
      )}
      <footer className="movers-panel-foot">
        Click any stock for full fundamental, technical &amp; chart analysis
      </footer>
    </div>
  );
}

export default function MarketMoversPanel({ movers }) {
  if (!movers) return null;

  return (
    <section className="movers-section" aria-label="Market movers">
      <div className="section-head movers-section-head">
        <div>
          <h3>Market Movers</h3>
          <p className="panel-sub">
            Verified session price moves from the screened universe · Yahoo Finance
          </p>
        </div>
      </div>
      <div className="movers-row">
        <MoverColumn
          title="Top Gainers"
          subtitle="Highest % advance · verified quotes"
          items={movers.gainers}
          variant="gainer"
          emptyHint="No verified gainers in the current session."
        />
        <MoverColumn
          title="Top Losers"
          subtitle="Largest % decline · verified quotes"
          items={movers.losers}
          variant="loser"
          emptyHint="No verified losers in the current session."
        />
        <MoverColumn
          title="Most Active"
          subtitle="Highest traded volume · verified"
          items={movers.mostActive}
          variant="active"
          emptyHint="Volume data currently unavailable."
        />
      </div>
    </section>
  );
}
