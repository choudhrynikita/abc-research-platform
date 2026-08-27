const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { periodChange } = require("../lib/fii-history");

describe("FII/DII flow semantics", () => {
  it("describes prior-window deltas as a change in net flow, not a gross-flow percentage", () => {
    const moreNetBuying = periodChange([{ fiiNet: 500 }], [{ fiiNet: -200 }], "fiiNet");
    assert.equal(moreNetBuying.available, true);
    assert.equal(moreNetBuying.value, 700);
    assert.equal(moreNetBuying.interpretation, "More net buying / less net selling");
    assert.equal(Object.hasOwn(moreNetBuying, "pctDisplay"), false);

    const moreNetSelling = periodChange([{ fiiNet: -350 }], [{ fiiNet: 150 }], "fiiNet");
    assert.equal(moreNetSelling.interpretation, "Less net buying / more net selling");
  });
});
