const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  getFocusableElements,
  createFocusTrap,
  isMobileNavViewport,
  RESPONSIVE_VIEWPORTS,
  FOCUSABLE_SELECTOR,
} = require("../lib/focus-trap");

describe("isMobileNavViewport", () => {
  it("matches CSS max-width 900px drawer breakpoint", () => {
    assert.equal(isMobileNavViewport(320), true);
    assert.equal(isMobileNavViewport(900), true);
    assert.equal(isMobileNavViewport(901), false);
    assert.equal(isMobileNavViewport(1920), false);
  });
});

describe("RESPONSIVE_VIEWPORTS", () => {
  it("covers required mobile and desktop matrix", () => {
    const widths = RESPONSIVE_VIEWPORTS.map((v) => v.width);
    for (const w of [320, 360, 375, 390, 414, 430, 1366, 1440, 1536, 1600, 1920, 2560]) {
      assert.ok(widths.includes(w), `missing viewport width ${w}`);
    }
    assert.ok(RESPONSIVE_VIEWPORTS.length >= 12);
  });
});

describe("getFocusableElements", () => {
  it("returns empty for null root", () => {
    assert.deepEqual(getFocusableElements(null), []);
  });

  it("exports a usable selector string", () => {
    assert.ok(FOCUSABLE_SELECTOR.includes("button"));
    assert.ok(FOCUSABLE_SELECTOR.includes("a[href]"));
  });
});

describe("createFocusTrap", () => {
  it("returns a no-op dispose when root is null", () => {
    const dispose = createFocusTrap(null);
    assert.equal(typeof dispose, "function");
    dispose();
  });

  it("registers and removes keydown handler on a mock root", () => {
    const listeners = new Map();
    const root = {
      addEventListener(type, fn) {
        listeners.set(type, fn);
      },
      removeEventListener(type, fn) {
        if (listeners.get(type) === fn) listeners.delete(type);
      },
      querySelectorAll() {
        return [];
      },
      contains() {
        return false;
      },
    };
    const dispose = createFocusTrap(root, { onEscape: () => {} });
    assert.ok(listeners.has("keydown"));
    dispose();
    assert.equal(listeners.has("keydown"), false);
  });

  it("invokes onEscape for Escape key", () => {
    let escaped = 0;
    const listeners = new Map();
    const root = {
      addEventListener(type, fn) {
        listeners.set(type, fn);
      },
      removeEventListener() {},
      querySelectorAll() {
        return [];
      },
      contains() {
        return true;
      },
    };
    createFocusTrap(root, { onEscape: () => {
      escaped += 1;
    } });
    const e = {
      key: "Escape",
      preventDefault() {},
      stopPropagation() {},
    };
    listeners.get("keydown")(e);
    assert.equal(escaped, 1);
  });
});
