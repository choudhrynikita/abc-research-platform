"use client";

import { useState } from "react";
import AppIcon from "../AppIcon";
import { addBriefEntry, createBriefEntry, readBriefEntries } from "./brief-store";

export default function AddToBriefButton({ stock, asOf }) {
  const [saved, setSaved] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  function addToBrief() {
    const exists = readBriefEntries().some((entry) => entry.symbol === stock.symbol);
    addBriefEntry(createBriefEntry(stock, asOf));
    setSaved(true);
    setAnnouncement(exists ? "Research Brief snapshot updated." : "Saved to Research Brief.");
    window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <button
      className={`brief-add-btn${saved ? " saved" : ""}`}
      type="button"
      onClick={addToBrief}
      aria-label={`Add ${stock.name || stock.symbol} to Research Brief`}
      title="Save this source-linked screener snapshot to your browser Research Brief"
    >
      <AppIcon name="brief" size={14} />
      <span>{saved ? "Saved to Brief" : "Add to Brief"}</span>
      <span className="visually-hidden" aria-live="polite">{announcement}</span>
    </button>
  );
}
