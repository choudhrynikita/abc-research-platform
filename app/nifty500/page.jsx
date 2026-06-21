import ReportModule from "../../components/modules/ReportModule";

export default function Nifty500Page() {
  return <ReportModule endpoint="/api/reports/generate/nifty500" label="NIFTY 500 report" />;
}