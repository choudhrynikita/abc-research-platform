"use client";

import { useState } from "react";
import ReportViewer from "../ReportViewer";
import ProChart from "../charts/ProChart";

export default function ResearchModule() {
  const [symbol, setSymbol] = useState("RELIANCE");
  const [chartSymbol, setChartSymbol] = useState("");
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!symbol.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/generate/research/${encodeURIComponent(symbol.trim())}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error);
      setPayload(json);
      const sym = symbol.trim().toUpperCase();
      setChartSymbol(sym.includes(".") ? sym : `${sym}.NS`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="research-controls">
        <input
          type="text"
          placeholder="Enter symbol: RELIANCE, TCS, INFY..."
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
        />
        <button className="btn btn-primary" onClick={generate} disabled={loading}>
          {loading ? "Generating..." : "Generate Report"}
        </button>
      </div>
      {error && <div className="error-panel"><p>{error}</p></div>}
      {chartSymbol && <ProChart symbol={chartSymbol} />}
      {payload && <ReportViewer payload={payload} />}
    </div>
  );
}