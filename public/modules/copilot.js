async function askCopilot() {
  const input = document.getElementById("copilotInput");
  const output = document.getElementById("copilotOutput");
  const query = input?.value?.trim();
  if (!query || !output) return;

  output.innerHTML = `<p class="loading">Fetching verified data…</p>`;

  try {
    const res = await fetch("/api/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const json = await res.json();
    if (!res.ok) {
      const msg =
        json.message ||
        (res.status === 503
          ? "AI service is temporarily unavailable. Please try again later."
          : "Live financial data could not be retrieved at this time.");
      throw new Error(msg);
    }

    const answer = json.answer || "Data Unavailable";
    const conf = json.confidence ?? json._meta?.confidence ?? "—";
    const dtype = json.dataType || json._meta?.dataType || "—";
    const sources = (json.sources || []).join(" · ");

    output.innerHTML = `
      <div class="copilot-response">
        <pre class="copilot-pre">${escapeHtml(answer)}</pre>
        <div class="compliance-bar inline">
          <span>Confidence: ${escapeHtml(String(conf))}%</span>
          <span>Type: ${escapeHtml(String(dtype))}</span>
        </div>
        ${sources ? `<p class="panel-sub">Sources: ${escapeHtml(sources)}</p>` : ""}
      </div>
    `;
  } catch (e) {
    output.innerHTML = `<p class="error">${escapeHtml(e.message)}</p>`;
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

document.getElementById("copilotBtn")?.addEventListener("click", askCopilot);
document.getElementById("copilotInput")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") askCopilot();
});
