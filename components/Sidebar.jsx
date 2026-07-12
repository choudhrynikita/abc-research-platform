"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Primary product navigation.
 * Compact AI Copilot lives in the top bar + modal — not embedded here —
 * so menu items never fight for height or overlap.
 */
const NAV_GROUPS = [
  {
    label: "Markets",
    items: [
      { href: "/nifty500", label: "Top 50 Stocks", hint: "Multi-factor equity screen", icon: "◆" },
      { href: "/fiidii", label: "FII & DII Flows", hint: "Institutional money flow", icon: "⇄" },
      { href: "/ipo", label: "IPO Intelligence", hint: "Primary market research", icon: "◎" },
    ],
  },
  {
    label: "Research",
    items: [
      { href: "/research", label: "AI Research Engine", hint: "Stock deep-dive terminal", icon: "✦" },
      { href: "/nifty-strategy", label: "NIFTY Strategy", hint: "Index options strategies", icon: "△" },
      { href: "/fno", label: "Equity F&O Center", hint: "Derivatives desk", icon: "▣" },
    ],
  },
  {
    label: "Archive",
    items: [
      { href: "/reports", label: "Report Archive", hint: "Exports and history", icon: "☰" },
    ],
  },
];

function isActive(pathname, href) {
  if (!pathname || !href) return false;
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export default function Sidebar({ open = false, onNavigate, onClose, onOpenCopilot }) {
  const pathname = usePathname();

  return (
    <aside
      id="app-sidebar"
      className={`sidebar${open ? " open" : ""}`}
      aria-label="Main navigation"
      aria-hidden={open ? undefined : undefined}
      data-open={open ? "true" : "false"}
    >
      <div className="sidebar-header-row">
        <div className="sidebar-brand">
          <span className="logo-icon" aria-hidden="true">
            ◈
          </span>
          <div className="sidebar-brand-text">
            <strong className="sidebar-brand-name">ABC Research</strong>
            <p className="sidebar-brand-tagline">Market Intelligence</p>
          </div>
        </div>
        <button
          type="button"
          className="sidebar-close-btn"
          aria-label="Close navigation menu"
          onClick={onClose}
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Primary modules">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="nav-group" role="group" aria-labelledby={`nav-group-${group.label}`}>
            <p className="nav-group-label" id={`nav-group-${group.label}`}>
              {group.label}
            </p>
            <ul className="nav-group-list">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href} className="nav-group-item">
                    <Link
                      href={item.href}
                      className={`nav-item${active ? " active" : ""}`}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={item.hint}
                    >
                      <span className="nav-item-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className="nav-item-text">
                        <span className="nav-item-label">{item.label}</span>
                        <span className="nav-item-hint">{item.hint}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-copilot-cta"
          onClick={onOpenCopilot}
          aria-label="Open AI Research Copilot"
        >
          <span className="sidebar-copilot-cta-icon" aria-hidden="true">
            ✦
          </span>
          <span className="sidebar-copilot-cta-text">
            <span className="sidebar-copilot-cta-title">AI Research Copilot</span>
            <span className="sidebar-copilot-cta-sub">Ask about stocks, NIFTY, FII/DII</span>
          </span>
        </button>
        <p className="sidebar-footer-note">Verified data only · Never invents figures</p>
      </div>
    </aside>
  );
}
