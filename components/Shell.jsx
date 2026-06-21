"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function Shell({ children }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  useEffect(() => {
    document.body.classList.toggle("sidebar-open", sidebarOpen);
    return () => document.body.classList.remove("sidebar-open");
  }, [sidebarOpen]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") closeSidebar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeSidebar]);

  return (
    <div className="app-shell">
      <div
        className={`overlay${sidebarOpen ? " visible" : ""}`}
        onClick={closeSidebar}
        aria-hidden={!sidebarOpen}
      />
      <Sidebar open={sidebarOpen} onNavigate={closeSidebar} onClose={closeSidebar} />
      <div className="main">
        <TopBar pathname={pathname} onMenuToggle={toggleSidebar} sidebarOpen={sidebarOpen} />
        <main className="content">{children}</main>
        <p className="global-disclaimer">
          <strong>Risk Disclaimer:</strong> Market data is sourced from approved providers (Yahoo Finance, NSE) and may be delayed.
          AI/model outputs are probabilistic opinions separated from factual data — not investment advice.
        </p>
      </div>
    </div>
  );
}