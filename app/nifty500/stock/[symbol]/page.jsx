import StockDetail from "../../../../components/nifty500/StockDetail";

export default async function StockPage({ params }) {
  const { symbol } = await params;
  const decoded = decodeURIComponent(symbol);
  return <StockDetail symbol={decoded} />;
}