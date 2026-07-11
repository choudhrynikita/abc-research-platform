const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { raw, fetchFundamentals } = require("../lib/fundamentals");

describe("fundamentals raw unwrap", () => {
  it("unwraps Yahoo { raw, fmt } objects", () => {
    assert.equal(raw({ raw: 0.09139, fmt: "9.14%" }), 0.09139);
    assert.equal(raw({ raw: 21.92, fmt: "21.92" }), 21.92);
    assert.equal(raw(15), 15);
    assert.equal(raw(null), null);
    assert.equal(raw({ fmt: "n/a" }), null);
    assert.equal(raw(Number.NaN), null);
  });
});

describe("fetchFundamentals live smoke", () => {
  it("returns structured payload without fabricating numbers", async () => {
    const data = await fetchFundamentals("RELIANCE.NS");
    assert.ok(data);
    assert.ok(data.source);
    assert.ok(data.fundamentalAnalysis);
    assert.ok(data.valuation);

    const pe = data.valuation.peRatio;
    if (data.available) {
      assert.equal(typeof pe.available, "boolean");
      if (pe.available) {
        assert.equal(typeof pe.value, "number");
        assert.ok(Number.isFinite(pe.value));
        assert.ok(pe.value > 0 && pe.value < 500);
      } else {
        assert.equal(pe.value, null);
        assert.ok(pe.display);
      }
    } else {
      assert.equal(data.valuation.marketCap.available, false);
      assert.equal(data.valuation.marketCap.value, null);
    }
  });
});
