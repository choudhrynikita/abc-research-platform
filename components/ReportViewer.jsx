"use client";

import MetaBar from "./MetaBar";
import FiiDiiDashboard from "./charts/FiiDiiDashboard";
import ProChart from "./charts/ProChart";
import SubscriptionChart from "./charts/SubscriptionChart";

function fmt(n, d = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: d });
}

function DataTypeTag({ type }) {
  const map = {
    verified: <span className="tag factual">Verified Data</span>,
    "model-opinion": <span className="tag opinion">AI / Model Opinion</span>,
    unavailable: <span className="tag unavailable">Data Unavailable</span>,
  };
  return map[type] || null;
}

function ExportButtons({ reportId }) {
  if (!reportId) return null;
  return (
    <div className="export-toolbar">
      <a href={`/api/report-center/${reportId}/export/pdf`} className="btn btn-secondary btn-sm">PDF</a>
      <a href={`/api/report-center/${reportId}/export/xlsx`} className="btn btn-secondary btn-sm">Excel</a>
    </div>
  );
}

function resolveChartSymbol(report) {
  if (report?.chartSymbol) return report.chartSymbol;
  if (report?.type === "nifty500") return report.dashboard?.marketOverview?.indexSymbol;
  if (report?.type === "nifty-strategy") return "^NSEI";
  if (report?.type === "fno") return "^NSEI";
  return null;
}

function SampleUniverseBanner({ report }) {
  const breadth = report?.dashboard?.marketBreadth;
  if (report?.type !== "nifty500" || !breadth) return null;
  return (
    <p className="hint-block sample-universe-banner">
      Sample universe: {breadth.sampleSize} of {breadth.totalTracked} reference constituents quoted live.
      Full NIFTY 500 coverage requires a licensed constituent feed — never estimated here.
    </p>
  );
}

function StrategyCards({ strategies }) {
  if (!strategies?.length) return null;

  return (
    <section className="report-section">
      <h3>Strategy Specifications</h3>
      {strategies.map((s, i) => (
        <div key={i} className="strategy-detail-card">
          <h4>
            {s.strategyName}{" "}
            <span
              className={`tag ${
                s.marketBias === "Bullish" ? "factual" : s.marketBias === "Bearish" ? "unavailable" : "opinion"
              }`}
            >
              {s.marketBias}
            </span>
          </h4>
          <div className="strategy-metrics">
            <span>Entry: <strong>{fmt(s.entryLevel)}</strong></span>
            <span>Exit: <strong>{fmt(s.exitLevel)}</strong></span>
            <span>Stop: <strong>{fmt(s.stopLoss)}</strong></span>
            <span>Target: <strong>{fmt(s.targetLevels)}</strong></span>
            <span>R:R: <strong>{fmt(s.riskRewardRatio)}</strong></span>
            <span>
              Exp. Profit:{" "}
              <strong>{s.expectedProfitPotentialPct != null ? `${fmt(s.expectedProfitPotentialPct)}%` : "—"}</strong>
            </span>
            <span>
              Max DD Est:{" "}
              <strong>{s.maxDrawdownEstimatePct != null ? `${fmt(s.maxDrawdownEstimatePct)}%` : "—"}</strong>
            </span>
            <span>Horizon: <strong>{s.timeHorizon || "—"}</strong></span>
          </div>
          {s.backtest && (
            <p className="hint-block">
              Backtest: {s.backtest.sampleSize} samples, win rate {s.backtest.historicalWinRate ?? "N/A"}%,
              avg return {s.backtest.averageReturn ?? "N/A"}%. Source: {s.backtest.source}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}

export default function ReportViewer({ payload, meta }) {
  if (!payload?.report) {
    return <p className="loading">No report data.</p>;
  }

  const { reportId, report, _meta } = payload;
  const metaInfo = _meta || meta;

  return (
    <div>
      <MetaBar meta={metaInfo} report={report} />
      <div className="report-header">
        <h2>{report.title}</h2>
        <p className="report-ts">
          Generated: {new Date(report.generatedAt).toLocaleString()}
          {report.dataFreshness?.fetchedAt && (
            <span className="tag factual"> Data: {new Date(report.dataFreshness.fetchedAt).toLocaleString()}</span>
          )}
        </p>
        {report.confidence != null && (
          <span className="confidence-badge">Confidence: {report.confidence}% (computed from data completeness)</span>
        )}
        <ExportButtons reportId={reportId} />
      </div>
      <SampleUniverseBanner report={report} />
      {(report.sections || []).map((s, i) => (
        <section key={i} className="report-section">
          <h3>{s.title} <DataTypeTag type={s.dataType} /></h3>
          {s.content && <p>{s.content}</p>}
          {s.bullets?.length > 0 && (
            <ul>{s.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
          )}
          {s.table && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>{s.table.headers.map((h) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {s.table.rows.map((row, ri) => (
                    <tr key={ri}>{row.map((c, ci) => <td key={ci}>{c ?? "Unavailable"}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
      {resolveChartSymbol(report) && (
        <ProChart symbol={resolveChartSymbol(report)} />
      )}
      {report.type === "fiidii" && (
        <FiiDiiDashboard
          history={report.history || []}
          summary={
            typeof report.summary === "string"
              ? report.summary
              : report.sections?.[0]?.content || null
          }
        />
      )}
      {report.type === "ipo" && report.subscriptionHistory?.length > 0 && (
        <SubscriptionChart history={report.subscriptionHistory} />
      )}
      <StrategyCards strategies={report.strategies} />
      {report.disclaimer && <p className="hint-block">{report.disclaimer}</p>}
    </div>
  );
}