"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import CopilotPanel from "./CopilotPanel";
import { createFocusTrap, isMobileNavViewport } from "../lib/focus-trap";
import { SIDEBAR_LAYOUT } from "../lib/nav-config";

export default function Shell({ children }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef(null);
  const menuBtnRestoreRef = useRef(null);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const openCopilot = useCallback(() => {
    setCopilotOpen(true);
    setSidebarOpen(false);
  }, []);
  const closeCopilot = useCallback(() => setCopilotOpen(false), []);

  // Track drawer breakpoint (matches CSS max-width: 900px)
  useEffect(() => {
    function update() {
      setIsMobile(isMobileNavViewport(window.innerWidth));
    }
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  // Lock background scroll when mobile drawer is open
  useEffect(() => {
    const lock = sidebarOpen && isMobile;
    document.body.classList.toggle("sidebar-open", lock);
    return () => document.body.classList.remove("sidebar-open");
  }, [sidebarOpen, isMobile]);

  // Focus trap while mobile drawer is open
  useEffect(() => {
    if (!sidebarOpen || !isMobile) return undefined;
    const root = sidebarRef.current;
    if (!root) return undefined;

    menuBtnRestoreRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dispose = createFocusTrap(root, {
      onEscape: closeSidebar,
      initialFocus: root.querySelector(".sidebar-close-btn"),
    });

    // Inert main content for assistive tech (progressive enhancement)
    const main = document.querySelector(".main");
    if (main) {
      main.setAttribute("inert", "");
      main.setAttribute("aria-hidden", "true");
    }

    return () => {
      dispose();
      if (main) {
        main.removeAttribute("inert");
        main.removeAttribute("aria-hidden");
      }
      const restore = menuBtnRestoreRef.current;
      if (restore && typeof restore.focus === "function") {
        try {
          restore.focus({ preventScroll: true });
        } catch {
          /* ignore */
        }
      }
    };
  }, [sidebarOpen, isMobile, closeSidebar]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        if (copilotOpen) return; // modal handles Escape
        if (sidebarOpen && isMobile) {
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
  }, [closeSidebar, copilotOpen, sidebarOpen, isMobile]);

  return (
    <div
      className="app-shell"
      data-mobile-nav={isMobile ? "true" : "false"}
      data-sidebar-breakpoint={SIDEBAR_LAYOUT.mobileBreakpointPx}
    >
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <div
        className={`overlay${sidebarOpen && isMobile ? " visible" : ""}`}
        onClick={closeSidebar}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            closeSidebar();
          }
        }}
        role={sidebarOpen && isMobile ? "button" : undefined}
        tabIndex={sidebarOpen && isMobile ? 0 : -1}
        aria-label={sidebarOpen && isMobile ? "Close navigation menu" : undefined}
        aria-hidden={!(sidebarOpen && isMobile)}
      />
      <Sidebar
        ref={sidebarRef}
        open={sidebarOpen}
        mobileDrawer={isMobile}
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
