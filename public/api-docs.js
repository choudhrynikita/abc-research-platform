async function loadApiDocs() {
  const baseEl = document.getElementById("apiBaseUrl");
  const routesEl = document.getElementById("apiRoutes");
  const healthEl = document.getElementById("healthResponse");

  if (baseEl) baseEl.textContent = window.location.origin;

  try {
    const [apiRes, healthRes] = await Promise.all([fetch("/api"), fetch("/api/health")]);
    const apiData = await apiRes.json();
    const healthData = await healthRes.json();

    if (routesEl) {
      routesEl.innerHTML = apiData.routes
        .map(
          (route) => `
          <div class="api-route">
            <span class="api-method">${route.method}</span>
            <code class="api-path">${route.path}</code>
            <span class="api-desc">${route.description}</span>
          </div>
        `
        )
        .join("");
    }

    if (healthEl) {
      healthEl.textContent = JSON.stringify(healthData, null, 2);
    }
  } catch (error) {
    if (healthEl) healthEl.textContent = error.message;
  }
}

loadApiDocs();