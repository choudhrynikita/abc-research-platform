"use client";

/** Signal Glass navigation: cobalt analysis, mint verification, and precise line instruments. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";
import { NAV_GROUPS, isActivePath } from "../lib/nav-config";
import AppIcon from "./AppIcon";

/**
 * Primary product navigation.
 * Compact AI Copilot lives in the top bar + modal — not embedded here —
 * so menu items never fight for height or overlap.
 *
 * On mobile (≤900px), Shell applies a focus trap while the drawer is open.
 */
const Sidebar = forwardRef(function Sidebar(
  { open = false, onNavigate, onClose, onOpenCopilot, mobileDrawer = false },
  ref
) {
  const pathname = usePathname();
  // On desktop the drawer is always "open" visually; aria-hidden only when
  // mobile drawer is closed so assistive tech ignores off-canvas content.
  const ariaHidden = mobileDrawer && !open ? true : undefined;

  return (
    <aside
      ref={ref}
      id="app-sidebar"
      className={`sidebar${open ? " open" : ""}`}
      aria-label="Main navigation"
      aria-hidden={ariaHidden}
      data-open={open ? "true" : "false"}
      data-mobile-drawer={mobileDrawer ? "true" : "false"}
    >
      <div className="sidebar-header-row">
        <div className="sidebar-brand">
          <span className="logo-icon" aria-hidden="true">
            <AppIcon name="brand" size={20} strokeWidth={1.7} />
          </span>
          <div className="sidebar-brand-text">
            <strong className="sidebar-brand-name">ABC Research</strong>
            <p className="sidebar-brand-tagline">Evidence-Led Intelligence</p>
          </div>
        </div>
        <button
          type="button"
          className="sidebar-close-btn"
          aria-label="Close navigation menu"
          onClick={onClose}
          tabIndex={ariaHidden ? -1 : undefined}
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Primary modules">
        {NAV_GROUPS.map((group) => (
          <div
            key={group.label}
            className="nav-group"
            role="group"
            aria-labelledby={`nav-group-${group.label}`}
          >
            <p className="nav-group-label" id={`nav-group-${group.label}`}>
              {group.label}
            </p>
            <ul className="nav-group-list">
              {group.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <li key={item.href} className="nav-group-item">
                    <Link
                      href={item.href}
                      className={`nav-item${active ? " active" : ""}`}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={item.hint}
                      tabIndex={ariaHidden ? -1 : undefined}
                    >
                      <span className="nav-item-icon" aria-hidden="true">
                        <AppIcon name={item.icon} size={17} strokeWidth={1.8} />
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
          tabIndex={ariaHidden ? -1 : undefined}
        >
          <span className="sidebar-copilot-cta-icon" aria-hidden="true">
            <AppIcon name="sparkle" size={17} strokeWidth={1.8} />
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
});

export default Sidebar;
