const PATHS = {
  brand: <path d="M4 15.5 8.5 6 12 13l2.2-4.2L20 18H4Z" />,
  menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
  close: <><path d="m7 7 10 10" /><path d="m17 7-10 10" /></>,
  stocks: <><path d="M4 17 9 12l3 3 7-8" /><path d="M15 7h4v4" /></>,
  news: <><path d="M5 5.5h14v13H5z" /><path d="M8 9h8" /><path d="M8 12h8" /><path d="M8 15h5" /></>,
  flows: <><path d="M5 8h11" /><path d="m13 5 3 3-3 3" /><path d="M19 16H8" /><path d="m11 13-3 3 3 3" /></>,
  ipo: <><circle cx="12" cy="12" r="7.5" /><path d="M12 7v10" /><path d="M15 9.5c-.7-.7-1.6-1-3-1-1.7 0-2.8.8-2.8 2 0 3 5.8 1.3 5.8 4 0 1.2-1.1 2-3 2-1.4 0-2.4-.4-3.1-1.1" /></>,
  funds: <><rect x="4.5" y="10" width="5" height="8.5" rx="0.8" /><rect x="10.5" y="6" width="5" height="12.5" rx="0.8" /><rect x="16.5" y="8" width="3.5" height="10.5" rx="0.8" /></>,
  commodities: <><circle cx="9" cy="10" r="3.2" /><circle cx="15.5" cy="13.5" r="3.2" /><path d="M6 18.5h12" /></>,
  research: <><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 4 4" /><path d="M10.5 8v5" /><path d="M8 10.5h5" /></>,
  strategy: <><path d="M5 17 12 5l7 12" /><path d="M8.2 12h7.6" /></>,
  fno: <><path d="M5 5h14v14H5z" /><path d="M8 15V9" /><path d="M12 15v-4" /><path d="M16 15V7" /></>,
  reports: <><path d="M6 4.5h9l3 3V19.5H6z" /><path d="M15 4.5v3h3" /><path d="M9 11h6" /><path d="M9 14h6" /><path d="M9 17h4" /></>,
  learn: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v15H6.5A2.5 2.5 0 0 0 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2Z" /><path d="M8 7h8" /><path d="M8 10.5h6" /></>,
  sparkle: <><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4Z" /><path d="m18 16 .6 2.4L21 19l-2.4.6L18 22l-.6-2.4L15 19l2.4-.6Z" /></>,
  sun: <><circle cx="12" cy="12" r="3.5" /><path d="M12 2.5v2" /><path d="M12 19.5v2" /><path d="m4.6 4.6 1.4 1.4" /><path d="m18 18 1.4 1.4" /><path d="M2.5 12h2" /><path d="M19.5 12h2" /><path d="m4.6 19.4 1.4-1.4" /><path d="m18 6 1.4-1.4" /></>,
  moon: <path d="M19 15.2A7.5 7.5 0 0 1 8.8 5a7.5 7.5 0 1 0 10.2 10.2Z" />,
};

export default function AppIcon({ name, size = 18, strokeWidth = 1.8, title, className = "" }) {
  const path = PATHS[name] || PATHS.sparkle;
  return (
    <svg
      className={`app-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      {path}
    </svg>
  );
}
