/**
 * Lightweight focus trap for modal drawers (no external dependency).
 * Pure helpers — unit-tested; used by the Shell mobile sidebar.
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * @param {ParentNode | null | undefined} root
 * @returns {HTMLElement[]}
 */
function getFocusableElements(root) {
  if (!root || typeof root.querySelectorAll !== "function") return [];
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    if (el.hasAttribute("disabled") || el.getAttribute("aria-hidden") === "true") return false;
    // offsetParent null can mean fixed/sticky still visible — also check size
    const style = typeof window !== "undefined" ? window.getComputedStyle(el) : null;
    if (style && (style.visibility === "hidden" || style.display === "none")) return false;
    return true;
  });
}

/**
 * Attach a focus trap to `root`. Returns a dispose function.
 * @param {HTMLElement} root
 * @param {{ initialFocus?: HTMLElement | null, onEscape?: () => void }} [options]
 * @returns {() => void}
 */
function createFocusTrap(root, options = {}) {
  if (!root) return () => {};

  const previouslyFocused =
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  const focusFirst = () => {
    const nodes = getFocusableElements(root);
    const target = options.initialFocus && nodes.includes(options.initialFocus)
      ? options.initialFocus
      : nodes[0];
    if (target) {
      try {
        target.focus({ preventScroll: true });
      } catch {
        target.focus();
      }
    }
  };

  // Defer so DOM (e.g. open class / visibility) settles
  const raf =
    typeof requestAnimationFrame === "function"
      ? requestAnimationFrame
      : (fn) => setTimeout(fn, 0);
  const rafId = raf(() => focusFirst());

  function onKeyDown(e) {
    if (e.key === "Escape") {
      if (typeof options.onEscape === "function") {
        e.preventDefault();
        e.stopPropagation();
        options.onEscape();
      }
      return;
    }
    if (e.key !== "Tab") return;

    const nodes = getFocusableElements(root);
    if (nodes.length === 0) {
      e.preventDefault();
      return;
    }

    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || !root.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last || !root.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  }

  root.addEventListener("keydown", onKeyDown);

  return function dispose() {
    if (typeof cancelAnimationFrame === "function" && typeof rafId === "number") {
      cancelAnimationFrame(rafId);
    }
    root.removeEventListener("keydown", onKeyDown);
    if (previouslyFocused && typeof previouslyFocused.focus === "function") {
      try {
        previouslyFocused.focus({ preventScroll: true });
      } catch {
        try {
          previouslyFocused.focus();
        } catch {
          /* element may be gone */
        }
      }
    }
  };
}

/**
 * Whether the viewport uses the mobile off-canvas drawer.
 * Mirrors CSS breakpoint max-width: 900px.
 * @param {number} [width]
 * @returns {boolean}
 */
function isMobileNavViewport(width) {
  const w =
    typeof width === "number" && Number.isFinite(width)
      ? width
      : typeof window !== "undefined"
        ? window.innerWidth
        : 1024;
  return w <= 900;
}

/** Canonical viewports for responsive QA (CSS px). */
const RESPONSIVE_VIEWPORTS = [
  { name: "iphone-se", width: 320, height: 568 },
  { name: "android-sm", width: 360, height: 740 },
  { name: "iphone-x", width: 375, height: 812 },
  { name: "iphone-12", width: 390, height: 844 },
  { name: "iphone-plus", width: 414, height: 896 },
  { name: "iphone-14-pro-max", width: 430, height: 932 },
  { name: "ipad-portrait", width: 768, height: 1024 },
  { name: "ipad-landscape", width: 1024, height: 768 },
  { name: "laptop-1366", width: 1366, height: 768 },
  { name: "laptop-1440", width: 1440, height: 900 },
  { name: "laptop-1536", width: 1536, height: 864 },
  { name: "desktop-1600", width: 1600, height: 900 },
  { name: "desktop-1920", width: 1920, height: 1080 },
  { name: "desktop-2560", width: 2560, height: 1440 },
];

module.exports = {
  FOCUSABLE_SELECTOR,
  getFocusableElements,
  createFocusTrap,
  isMobileNavViewport,
  RESPONSIVE_VIEWPORTS,
};
