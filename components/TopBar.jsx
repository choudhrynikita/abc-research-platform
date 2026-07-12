"use client";

import { useEffect, useState } from "react";

const TITLES = {
  "/nifty500": "Top 50 Stocks to Buy",
  "/fiidii": "FII & DII Intelligence",
  "/research": "AI Research Engine",
  "/nifty-strategy": "NIFTY Strategy Center",
  "/fno": "Equity F&O Center",
  "/ipo": "IPO Intelligence Center",
  "/reports": "Report Archive",
};

const SHORT_TITLES = {
  "/nifty500": "Top 50",
  "/fiidii": "FII / DII",
  "/research": "Research",
  "/nifty-strategy": "Strategy",
  "/fno": "F&O",
  "/ipo": "IPO",
  "/reports": "Reports",
};

function resolveTitle(pathname) {
  if (TITLES[pathname]) return { full: TITLES[pathname], short: SHORT_TITLES[pathname] };
  if (pathname?.startsWith("/nifty500/stock/")) {
    const raw = decodeURIComponent(pathname.split("/").pop() || "");
    const sym = raw.replace(/\.NS$/i, "");
    return { full: `${sym} · Stock Research`, short: sym || "Stock" };
  }
  if (pathname?.startsWith("/nifty500")) return { full: TITLES["/nifty500"], short: SHORT_TITLES["/nifty500"] };
  return { full: "ABC Research Platform", short: "ABC Research" };
}

/** India market session heuristic (IST) — no invented quote status. */
function computeMarketSession() {
  try {
    const ist = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const day = ist.getDay(); // 0 Sun
    const mins = ist.getHours() * 60 + ist.getMinutes();
    if (day === 0 || day === 6) return { mode: "closed", label: "Weekend" };
    // Regular cash session ~ 9:15–15:30 IST
    if (mins >= 9 * 60 + 15 && mins < 15 * 60 + 30) return { mode: "live", label: "Session Open" };
    if (mins >= 9 * 60 && mins < 9 * 60 + 15) return { mode: "pre", label: "Pre-Open" };
    return { mode: "closed", label: "Session Closed" };
  } catch {
    return { mode: "unknown", label: "Status Unknown" };
  }
}

export default function TopBar({ pathname, onMenuToggle, sidebarOpen, onOpenCopilot }) {
  const [theme, setTheme] = useState("dark");
  const [modKey, setModKey] = useState("Ctrl");
  const [session, setSession] = useState({ mode: "unknown", label: "…" });
  const [apiOk, setApiOk] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("abc-theme") || "dark";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
    const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "");
    setModKey(isMac ? "⌘" : "Ctrl");
    setSession(computeMarketSession());
    const t = setInterval(() => setSession(computeMarketSession()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (cancelled) return;
        setApiOk(ok && j?.status === "ok");
      })
      .catch(() => {
        if (!cancelled) setApiOk(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("abc-theme", next);
    document.documentElement.dataset.theme = next;
  }

  const { full: title, short: shortTitle } = resolveTitle(pathname);

  const pillClass =
    apiOk === false
      ? "error"
      : session.mode === "live"
        ? "live"
        : session.mode === "pre"
          ? ""
          : "";
  const statusLabel =
    apiOk === false ? "API Issue" : session.label;

  return (
    <header className="topbar" role="banner">
      <button
        type="button"
        className="menu-btn"
        aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={sidebarOpen}
        aria-controls="app-sidebar"
        onClick={onMenuToggle}
      >
        <span className="menu-btn-icon" aria-hidden="true">
          {sidebarOpen ? "✕" : "☰"}
        </span>
      </button>
      <h1 className="topbar-title">
        <span className="topbar-title-full">{title}</span>
        <span className="topbar-title-short">{shortTitle}</span>
      </h1>

      <button
        type="button"
        className="topbar-copilot-search"
        onClick={onOpenCopilot}
        aria-label="Open AI Research Copilot search"
      >
        <span className="topbar-copilot-icon" aria-hidden="true">
          ✦
        </span>
        <span className="topbar-copilot-placeholder">
          Ask AI Copilot — stocks, NIFTY, FII/DII…
        </span>
        <kbd className="topbar-copilot-kbd">{modKey}+K</kbd>
      </button>

      <div className="topbar-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm topbar-copilot-btn"
          onClick={onOpenCopilot}
          aria-label="Open AI Research Copilot"
        >
          <span className="theme-label-full">AI Copilot</span>
          <span className="theme-label-short">AI</span>
        </button>
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          <span className="theme-label-full">{theme === "dark" ? "Light" : "Dark"}</span>
          <span className="theme-label-short" aria-hidden="true">
            {theme === "dark" ? "☀" : "☾"}
          </span>
        </button>
        <div
          className={`status-pill ${pillClass}`}
          title={apiOk === false ? "API health check failed" : `India cash session (IST): ${session.label}`}
          role="status"
          aria-live="polite"
        >
          <span className="status-dot" aria-hidden="true" />
          <span className="status-label">{statusLabel}</span>
        </div>
      </div>
    </header>
  );
}
