"use client";

import { useEffect, useState } from "react";

const TITLES = {
  "/nifty500": "NIFTY 500 Dashboard (Sample Universe)",
  "/fiidii": "FII & DII Intelligence",
  "/research": "AI Research Mode",
  "/nifty-strategy": "NIFTY Strategy Center",
  "/fno": "Equity F&O Center",
  "/ipo": "IPO Intelligence Center",
  "/reports": "Downloadable Reports",
};

const SHORT_TITLES = {
  "/nifty500": "NIFTY 500 Sample",
  "/fiidii": "FII / DII",
  "/research": "Research",
  "/nifty-strategy": "Strategy",
  "/fno": "F&O",
  "/ipo": "IPO",
  "/reports": "Reports",
};

export default function TopBar({ pathname, onMenuToggle, sidebarOpen }) {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const saved = localStorage.getItem("abc-theme") || "dark";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("abc-theme", next);
    document.documentElement.dataset.theme = next;
  }

  const title = TITLES[pathname] || "ABC Research Platform";
  const shortTitle = SHORT_TITLES[pathname] || "ABC Research";

  return (
    <header className="topbar">
      <button
        type="button"
        className="menu-btn"
        aria-label={sidebarOpen ? "Close menu" : "Open menu"}
        aria-expanded={sidebarOpen}
        onClick={onMenuToggle}
      >
        {sidebarOpen ? "✕" : "☰"}
      </button>
      <h1>
        <span className="topbar-title-full">{title}</span>
        <span className="topbar-title-short">{shortTitle}</span>
      </h1>
      <div className="topbar-actions">
        <button className="btn btn-ghost btn-sm" type="button" onClick={toggleTheme}>
          <span className="theme-label-full">{theme === "dark" ? "Light" : "Dark"}</span>
          <span className="theme-label-short">{theme === "dark" ? "☀" : "☾"}</span>
        </button>
        <div className="status-pill live">
          <span className="status-dot" />
          <span className="status-label">Live</span>
        </div>
      </div>
    </header>
  );
}