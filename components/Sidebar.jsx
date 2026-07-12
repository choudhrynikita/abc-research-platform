"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import CopilotPanel from "./CopilotPanel";

const NAV_GROUPS = [
  {
    label: "Markets",
    items: [
      { href: "/nifty500", label: "Top 50 Stocks", hint: "Multi-factor screen" },
      { href: "/fiidii", label: "FII & DII Flows", hint: "Institutional money" },
      { href: "/ipo", label: "IPO Intelligence", hint: "Primary market" },
    ],
  },
  {
    label: "Research",
    items: [
      { href: "/research", label: "AI Research Engine", hint: "Stock deep-dive" },
      { href: "/nifty-strategy", label: "NIFTY Strategy", hint: "Index options" },
      { href: "/fno", label: "Equity F&O Center", hint: "Derivatives desk" },
    ],
  },
  {
    label: "Archive",
    items: [
      { href: "/reports", label: "Report Archive", hint: "Exports & history" },
    ],
  },
];

function isActive(pathname, href) {
  return pathname === href || (href !== "/" && pathname?.startsWith(`${href}/`));
}

export default function Sidebar({ open = false, onNavigate, onClose, onOpenCopilot }) {
  const pathname = usePathname();

  return (
    <aside className={`sidebar${open ? " open" : ""}`} aria-label="Main navigation">
      <div className="sidebar-header-row">
        <div className="sidebar-brand">
          <span className="logo-icon" aria-hidden>
            ◈
          </span>
          <div>
            <strong>ABC Research</strong>
            <p>Institutional Market Intelligence</p>
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
      <nav className="sidebar-nav" aria-label="Primary modules">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="nav-group">
            <p className="nav-group-label">{group.label}</p>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${isActive(pathname, item.href) ? " active" : ""}`}
                onClick={onNavigate}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                title={item.hint}
              >
                <span className="nav-item-label">{item.label}</span>
                {item.hint ? <span className="nav-item-hint">{item.hint}</span> : null}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <button type="button" className="sidebar-open-copilot" onClick={onOpenCopilot}>
        <span aria-hidden>✦</span> Expand AI Copilot
      </button>
      <CopilotPanel compact />
    </aside>
  );
}
