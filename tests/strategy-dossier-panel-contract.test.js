const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

describe("Strategy dossier structured sizing rendering", () => {
  const panel = fs.readFileSync(path.join(__dirname, "..", "components", "StrategyDossierPanel.jsx"), "utf8");

  it("formats structured position-sizing payloads before they reach JSX", () => {
    assert.match(panel, /function formatPositionSizingGuidance/);
    assert.match(panel, /typeof value !== "object"/);
    assert.match(panel, /Premium per lot/);
    assert.match(panel, /positionSizingGuidance = formatPositionSizingGuidance/);
    assert.doesNotMatch(panel, /\{dossier\.positionSizingGuidance\}/);
  });
});
