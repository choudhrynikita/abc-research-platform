"use client";

import { useEffect, useState } from "react";

const TITLES = {
  "/nifty500": "NIFTY 500 Dashboard",
  "/fiidii": "FII & DII Intelligence",
  "/research": "AI Research Mode",
  "/nifty-strategy": "NIFTY Strategy Center",
  "/fno": "Equity F&O Center",
  "/ipo": "IPO Intelligence Center",
  "/reports": "Downloadable Reports",
};

export default function TopBar({ pathname }) {
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

  return (
    <header className="topbar">
      <h1>{TITLES[pathname] || "ABC Research Platform"}</h1>
      <div className="topbar-actions">
        <button className="btn btn-ghost btn-sm" type="button" onClick={toggleTheme}>
          {theme === "dark" ? "Light" : "Dark"}
        </button>
        <div className="status-pill live">
          <span className="status-dot" />
          <span>Live</span>
        </div>
      </div>
    </header>
  );
}