/**
 * Single source of truth for primary navigation.
 * Shared by Sidebar UI and automated layout/responsive tests.
 */

const NAV_GROUPS = [
  {
    label: "Markets",
    items: [
      { href: "/nifty500", label: "Top 50 Stocks", hint: "Multi-factor equity screen", icon: "stocks" },
      { href: "/news", label: "Market News", hint: "Latest share-market headlines", icon: "news" },
      { href: "/fiidii", label: "FII & DII Flows", hint: "Institutional money flow", icon: "flows" },
      { href: "/ipo", label: "IPO Intelligence", hint: "Primary market research", icon: "ipo" },
    ],
  },
  {
    label: "Research",
    items: [
      { href: "/research", label: "AI Research Engine", hint: "Stock deep-dive terminal", icon: "research" },
      { href: "/nifty-strategy", label: "NIFTY Strategy", hint: "Index options strategies", icon: "strategy" },
      { href: "/fno", label: "Equity F&O Center", hint: "Derivatives desk", icon: "fno" },
    ],
  },
  {
    label: "Learn",
    items: [
      { href: "/learn", label: "Knowledge Centre", hint: "Markets course, basics to desk", icon: "learn" },
    ],
  },
  {
    label: "Archive",
    items: [
      { href: "/reports", label: "Report Archive", hint: "Exports and history", icon: "reports" },
    ],
  },
];

/** Flat list of primary module hrefs (order preserved). */
const NAV_HREFS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));

/** Desktop sidebar width tokens (must match globals.css). */
const SIDEBAR_LAYOUT = {
  mobileBreakpointPx: 900,
  defaultWidthPx: 264,
  wideWidthPx: 280,
  compactWidthPx: 244,
  minTouchTargetPx: 44,
};

function isActivePath(pathname, href) {
  if (!pathname || !href) return false;
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

module.exports = {
  NAV_GROUPS,
  NAV_HREFS,
  SIDEBAR_LAYOUT,
  isActivePath,
};
