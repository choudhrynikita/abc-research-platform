"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function Shell({ children }) {
  const pathname = usePathname();

  return (
    <>
      <Sidebar />
      <div className="main">
        <TopBar pathname={pathname} />
        <main className="content">{children}</main>
        <p className="global-disclaimer">
          <strong>Risk Disclaimer:</strong> Market data is sourced from approved providers (Yahoo Finance, NSE) and may be delayed.
          AI/model outputs are probabilistic opinions separated from factual data — not investment advice.
        </p>
      </div>
    </>
  );
}