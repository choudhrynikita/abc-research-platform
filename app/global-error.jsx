"use client";

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body>
        <div className="error-panel" role="alert" style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
          <h2>Application error</h2>
          <p>{error?.message || "A critical error occurred."}</p>
          <button type="button" onClick={() => reset()}>
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}