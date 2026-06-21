async function askCopilot() {
  const input = document.getElementById("copilotInput");
  const output = document.getElementById("copilotOutput");
  const query = input.value.trim();
  if (!query) return;

  output.innerHTML = `<p class="loading">Analyzing...</p>`;

  try {
    const res = await fetch("/api/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Failed");

    output.innerHTML = `
      <div class="copilot-response">
        <p>${json.answer}</p>
        <div class="compliance-bar inline">
          <span>Confidence: ${json.confidence ?? json._meta?.confidence ?? "—"}%</span>
          <span>Type: ${json.dataType || json._meta?.dataType}</span>
        </div>
      </div>
    `;
  } catch (e) {
    output.innerHTML = `<p class="error">${e.message}</p>`;
  }
}

document.getElementById("copilotBtn")?.addEventListener("click", askCopilot);
document.getElementById("copilotInput")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") askCopilot();
});