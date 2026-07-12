"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import CopilotPanel from "./CopilotPanel";

export default function Shell({ children }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const openCopilot = useCallback(() => {
    setCopilotOpen(true);
    setSidebarOpen(false);
  }, []);
  const closeCopilot = useCallback(() => setCopilotOpen(false), []);

  // Close mobile drawer on route change
  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  // Lock background scroll when mobile drawer is open
  useEffect(() => {
    document.body.classList.toggle("sidebar-open", sidebarOpen);
    return () => document.body.classList.remove("sidebar-open");
  }, [sidebarOpen]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        if (copilotOpen) return; // modal handles Escape
        if (sidebarOpen) {
          e.preventDefault();
          closeSidebar();
        }
      }
      // Global: Ctrl/Cmd + K opens Research Copilot
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCopilotOpen(true);
        setSidebarOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeSidebar, copilotOpen, sidebarOpen]);

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <div
        className={`overlay${sidebarOpen ? " visible" : ""}`}
        onClick={closeSidebar}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            closeSidebar();
          }
        }}
        role={sidebarOpen ? "button" : undefined}
        tabIndex={sidebarOpen ? 0 : -1}
        aria-label={sidebarOpen ? "Close navigation menu" : undefined}
        aria-hidden={!sidebarOpen}
      />
      <Sidebar
        open={sidebarOpen}
        onNavigate={closeSidebar}
        onClose={closeSidebar}
        onOpenCopilot={openCopilot}
      />
      <div className="main">
        <TopBar
          pathname={pathname}
          onMenuToggle={toggleSidebar}
          sidebarOpen={sidebarOpen}
          onOpenCopilot={openCopilot}
        />
        <main id="main-content" className="content" tabIndex={-1}>
          {children}
        </main>
        <p className="global-disclaimer">
          <strong>Risk Disclaimer:</strong> Market data is sourced from approved providers (Yahoo Finance, NSE) and may be delayed.
          AI/model outputs are probabilistic opinions separated from factual data — not investment advice.
        </p>
      </div>
      <CopilotPanel variant="modal" open={copilotOpen} onClose={closeCopilot} />
    </div>
  );
}
