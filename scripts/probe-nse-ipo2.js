const { fetchIpoDashboard, fetchIpoDetail } = require("../lib/nse-ipo");

async function main() {
  const dash = await fetchIpoDashboard();
  console.log("dashboard", {
    open: dash.open.length,
    upcoming: dash.upcoming.length,
    listed: dash.listed.length,
  });
  if (dash.open[0]) {
    console.log("open sample", JSON.stringify(dash.open[0]).slice(0, 500));
    const detail = await fetchIpoDetail(dash.open[0].symbol);
    console.log("detail keys", Object.keys(detail));
    console.log("detail sample", JSON.stringify(detail).slice(0, 800));
  }
}
main().catch(console.error);