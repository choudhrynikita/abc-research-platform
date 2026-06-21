const THEME_KEY = "abc-theme";

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = theme === "light" ? "Dark" : "Light";
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(saved);
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    applyTheme(next);
  });
}

document.addEventListener("DOMContentLoaded", initTheme);
window.applyTheme = applyTheme;