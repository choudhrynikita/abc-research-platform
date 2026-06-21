const MODULES = {
  nifty500: { title: "NIFTY 500 Dashboard", init: "initNifty500Module" },
  fiidii: { title: "FII & DII Intelligence", init: "initFiiDiiModule" },
  research: { title: "AI Research Mode", init: "initResearchModule" },
  "nifty-strategy": { title: "NIFTY Strategy Center", init: "initNiftyStrategyModule" },
  fno: { title: "Equity F&O Strategy Center", init: "initFnoModule" },
  reports: { title: "Downloadable Reports", init: "initReportsModule" },
  ipo: { title: "IPO Intelligence Center", init: "initIpoModule" },
};

let currentModule = "nifty500";

function openSidebar(open) {
  document.getElementById("sidebar")?.classList.toggle("open", open);
  document.getElementById("overlay")?.classList.toggle("visible", open);
}

function navigate(moduleId) {
  if (!MODULES[moduleId]) return;
  currentModule = moduleId;

  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.module === moduleId);
  });
  document.querySelectorAll(".module-panel").forEach((el) => {
    el.classList.toggle("active", el.id === `module-${moduleId}`);
  });

  document.getElementById("pageTitle").textContent = MODULES[moduleId].title;
  const initFn = window[MODULES[moduleId].init];
  if (typeof initFn === "function") initFn();

  openSidebar(false);
  history.replaceState(null, "", `#${moduleId}`);
}

document.getElementById("menuBtn")?.addEventListener("click", () => {
  const sidebar = document.getElementById("sidebar");
  openSidebar(!sidebar?.classList.contains("open"));
});

document.getElementById("overlay")?.addEventListener("click", () => openSidebar(false));

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => navigate(item.dataset.module));
});

window.navigate = navigate;

const hash = location.hash.replace("#", "");
navigate(MODULES[hash] ? hash : "nifty500");
renderDisclaimer(document.getElementById("globalDisclaimer"));