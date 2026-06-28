"use client";

import { useEffect, useRef, useState } from "react";

export default function TerminalExport({ module, symbol, label = "Export" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";

  return (
    <div className="terminal-export" ref={ref}>
      <button
        type="button"
        className="btn btn-secondary btn-sm export-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {label} {open ? "▴" : "▾"}
      </button>
      {open && (
        <div className="export-menu" role="menu">
          <a
            role="menuitem"
            className="export-menu-item"
            href={`/api/export/${module}/pdf${q}`}
            download
            onClick={() => setOpen(false)}
          >
            Export as PDF
          </a>
          <a
            role="menuitem"
            className="export-menu-item"
            href={`/api/export/${module}/xlsx${q}`}
            download
            onClick={() => setOpen(false)}
          >
            Export as Excel
          </a>
        </div>
      )}
    </div>
  );
}