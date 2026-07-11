"use client";

import MetricValue, { extractValue, DATA_UNAVAILABLE } from "./MetricValue";

function interpretRsi(rsi) {
  if (rsi == null) return null;
  if (rsi > 70) return { text: "Overbought", cls: "bearish" };
  if (rsi < 30) return { text: "Oversold", cls: "bullish" };
  if (rsi >= 50) return { text: "Bullish momentum", cls: "bullish" };
  return { text: "Neutral / range", cls: "neutral" };
}

function Tile({ label, value, type = "number", decimals = 2, note, definition }) {
  const v = extractValue(value);
  return (
    <div className="tech-tile" title={definition || undefined}>
      <small>{label}</small>
      <strong className={v == null ? "metric-na" : undefined}>
        {v == null ? (
          DATA_UNAVAILABLE
        ) : type === "text" ? (
          String(v)
        ) : (
          <MetricValue value={value} type={type} decimals={decimals} label={label} />
        )}
      </strong>
      {note && <span className={`tech-note ${note.cls || ""}`}>{note.text}</span>}
    </div>
  );
}

/**
 * Full technical analysis panel from verified OHLCV-derived indicators.
 * Explicitly marks Supertrend / Ichimoku / Delivery % as unavailable when not supported.
 */
export default function TechnicalAnalysisPanel({ technical = {}, priceMetrics = null }) {
  const t = technical || {};
  const rsiNote = interpretRsi(extractValue(t.rsi) ?? (typeof t.rsi === "number" ? t.rsi : null));
  const rating = t.technicalRating || t.trend;

  return (
    <section className="tech-panel glass-card detail-section">
      <header className="fund-panel-head">
        <div>
          <h3>Technical Analysis</h3>
          <p className="panel-sub">
            Computed from verified Yahoo Finance OHLCV · never estimated or fabricated
          </p>
        </div>
        <span className={`fund-status ${rating ? "fund-status-ok" : "fund-status-na"}`}>
          {rating || "Awaiting Data"}
        </span>
      </header>

      <div className="tech-rating-banner">
        <div>
          <small>Trend / Technical Rating</small>
          <strong className={`trend-${String(rating || "").toLowerCase()}`}>
            {rating || DATA_UNAVAILABLE}
          </strong>
        </div>
        <p className="panel-sub">
          {t.ratingMethodology ||
            "Documented ensemble of RSI, MACD histogram, SMA20/50, EMA12/26 from verified series"}
        </p>
      </div>

      <div className="tech-group">
        <h4>Momentum</h4>
        <div className="tech-grid">
          <Tile label="RSI (14)" value={t.rsi} decimals={1} note={rsiNote} definition="14-period RSI" />
          <Tile label="MACD Line" value={t.macdLine} decimals={3} />
          <Tile label="Signal Line" value={t.macdSignal} decimals={3} />
          <Tile label="MACD Histogram" value={t.macdHistogram} decimals={3} />
          <Tile label="Stochastic %K" value={t.stochasticK} decimals={1} />
          <Tile label="Stochastic %D" value={t.stochasticD} decimals={1} />
          <Tile label="CMO (14)" value={t.cmo} decimals={1} />
          <Tile label="ADX (14)" value={t.adx} decimals={1} definition="Trend strength" />
          <Tile label="Momentum 10d %" value={t.momentum10} type="pct" decimals={2} />
          <Tile label="Momentum 20d %" value={t.momentum20} type="pct" decimals={2} />
          <Tile
            label="Rel. Strength vs SMA50"
            value={t.relativeStrength}
            type="pct"
            decimals={2}
            definition="Close relative to SMA50 (own history, not index RS)"
          />
        </div>
      </div>

      <div className="tech-group">
        <h4>Moving Averages &amp; Bands</h4>
        <div className="tech-grid">
          <Tile label="SMA 20" value={t.sma20} type="price" />
          <Tile label="SMA 50" value={t.sma50} type="price" />
          <Tile label="SMA 100" value={t.sma100} type="price" />
          <Tile label="SMA 200" value={t.sma200} type="price" />
          <Tile label="EMA 12" value={t.ema12} type="price" />
          <Tile label="EMA 20" value={t.ema20} type="price" />
          <Tile label="EMA 26" value={t.ema26} type="price" />
          <Tile label="EMA 50" value={t.ema50} type="price" />
          <Tile label="BB Upper" value={t.bollingerUpper} type="price" />
          <Tile label="BB Middle" value={t.bollingerMiddle} type="price" />
          <Tile label="BB Lower" value={t.bollingerLower} type="price" />
          <Tile label="VWAP (window)" value={t.vwap} type="price" definition="Cumulative typical-price VWAP over available volume" />
        </div>
      </div>

      <div className="tech-group">
        <h4>Levels, Volatility &amp; Volume</h4>
        <div className="tech-grid">
          <Tile label="Support (20-bar)" value={t.support} type="price" />
          <Tile label="Resistance (20-bar)" value={t.resistance} type="price" />
          <Tile label="Pivot" value={t.pivot} type="price" />
          <Tile label="R1" value={t.pivotR1} type="price" />
          <Tile label="R2" value={t.pivotR2} type="price" />
          <Tile label="R3" value={t.pivotR3} type="price" />
          <Tile label="S1" value={t.pivotS1} type="price" />
          <Tile label="S2" value={t.pivotS2} type="price" />
          <Tile label="S3" value={t.pivotS3} type="price" />
          <Tile label="ATR (14)" value={t.atr} decimals={2} />
          <Tile label="Volume Trend" value={t.volumeTrend} type="text" />
          <Tile label="Volume / 20d Avg" value={t.volumeRatio} decimals={2} />
          <Tile label="Session Volume" value={t.volume ?? priceMetrics?.regularMarketVolume} />
        </div>
      </div>

      <div className="tech-group">
        <h4>Not provided by current model / feed</h4>
        <div className="tech-grid">
          <Tile
            label="Supertrend"
            value={null}
            definition="Supertrend is not implemented — never estimated"
          />
          <Tile
            label="Ichimoku Cloud"
            value={null}
            definition="Ichimoku is not implemented — never estimated"
          />
          <Tile
            label="Delivery %"
            value={null}
            definition="Requires NSE delivery statistics feed"
          />
        </div>
        <p className="panel-sub tech-disclaimer">
          Model 20-day technical target (trend-slope heuristic):{" "}
          <MetricValue value={t.modelTarget20d} type="price" label="Model target" /> — opinion
          derived from verified MAs, not a price guarantee.
        </p>
      </div>
    </section>
  );
}
