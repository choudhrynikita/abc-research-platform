document.querySelectorAll(".nav-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;

    document.querySelectorAll(".nav-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(`panel-${target}`).classList.add("active");
  });
});