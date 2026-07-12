"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import CopilotPanel from "./CopilotPanel";

const NAV = [
  { href: "/nifty500", label: "Top 50 Stocks to Buy" },
  { href: "/watchlist", label: "Watchlists" },
  { href: "/portfolio", label: "Portfolio Analysis" },
  { href: "/fiidii", label: "FII & DII Intelligence" },
  { href: "/research", label: "AI Research Engine" },
  { href: "/nifty-strategy", label: "NIFTY Strategy Center" },
  { href: "/fno", label: "Equity F&O Center" },
  { href: "/ipo", label: "IPO Intelligence Center" },
  { href: "/reports", label: "Report Archive" },
];

export default function Sidebar({ open = false, onNavigate, onClose, onOpenCopilot }) {
  const pathname = usePathname();

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
            className={`nav-item${
              pathname === item.href || (item.href !== "/" && pathname?.startsWith(`${item.href}/`))
                ? " active"
                : ""
            }`}
            onClick={onNavigate}
            aria-current={
              pathname === item.href || (item.href !== "/" && pathname?.startsWith(`${item.href}/`))
                ? "page"
                : undefined
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <button type="button" className="sidebar-open-copilot" onClick={onOpenCopilot}>
        <span aria-hidden>✦</span> Expand AI Copilot
      </button>
      <CopilotPanel compact />
    </aside>
  );
}
