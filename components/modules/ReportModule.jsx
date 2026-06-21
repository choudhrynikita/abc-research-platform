"use client";

import { useEffect, useState } from "react";
import ReportViewer from "../ReportViewer";

export default function ReportModule({ endpoint, label }) {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(endpoint)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (cancelled) return;
        if (!ok) throw new Error(j.message || j.error || "Failed to load report");
        setPayload(j);
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [endpoint]);

  if (loading) return <p className="loading">Generating {label}...</p>;
  if (error) {
    return (
      <div className="error-panel">
        <p>{error}</p>
        <button className="btn btn-secondary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }
  return <ReportViewer payload={payload} />;
}