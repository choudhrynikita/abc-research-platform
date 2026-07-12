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

  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  useEffect(() => {
    document.body.classList.toggle("sidebar-open", sidebarOpen);
    return () => document.body.classList.remove("sidebar-open");
  }, [sidebarOpen]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && !copilotOpen) closeSidebar();
      // Global: Ctrl/Cmd + K opens Research Copilot
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCopilotOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeSidebar, copilotOpen]);

  return (
    <div className="app-shell">
      <div
        className={`overlay${sidebarOpen ? " visible" : ""}`}
        onClick={closeSidebar}
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
        <main className="content">{children}</main>
        <p className="global-disclaimer">
          <strong>Risk Disclaimer:</strong> Market data is sourced from approved providers (Yahoo Finance, NSE) and may be delayed.
          AI/model outputs are probabilistic opinions separated from factual data — not investment advice.
        </p>
      </div>
      <CopilotPanel variant="modal" open={copilotOpen} onClose={closeCopilot} />
    </div>
  );
}
