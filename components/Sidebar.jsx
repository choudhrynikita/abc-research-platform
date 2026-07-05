"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/nifty500", label: "Top 50 Stocks to Buy" },
  { href: "/fiidii", label: "FII & DII Intelligence" },
  { href: "/research", label: "AI Research Engine" },
  { href: "/nifty-strategy", label: "NIFTY Strategy Center" },
  { href: "/fno", label: "Equity F&O Center" },
  { href: "/ipo", label: "IPO Intelligence Center" },
];

export default function Sidebar({ open = false, onNavigate, onClose }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [copilotOut, setCopilotOut] = useState("");
  const [loading, setLoading] = useState(false);

  async function askCopilot() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const json = await res.json();
      setCopilotOut(
        json.answer
        || json.error
        || json.message
        || "Verified data is currently unavailable."
      );
    } catch (e) {
      setCopilotOut(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className={`sidebar${open ? " open" : ""}`} aria-label="Main navigation">
      <div className="sidebar-header-row">
        <div className="sidebar-brand">
          <span className="logo-icon">◈</span>
          <div>
            <strong>ABC Research</strong>
            <p>Market Intelligence</p>
          </div>
        </div>
        <button
          type="button"
          className="sidebar-close-btn"
          aria-label="Close menu"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <nav className="sidebar-nav">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${pathname === item.href ? " active" : ""}`}
            onClick={onNavigate}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="copilot-panel">
        <h4>AI Copilot</h4>
        <input
          type="text"
          placeholder="Analyze Reliance, NIFTY outlook..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && askCopilot()}
        />
        <button className="btn btn-primary btn-sm" onClick={askCopilot} disabled={loading}>
          {loading ? "..." : "Ask"}
        </button>
        {copilotOut && <div className="copilot-output">{copilotOut}</div>}
      </div>
    </aside>
  );
}