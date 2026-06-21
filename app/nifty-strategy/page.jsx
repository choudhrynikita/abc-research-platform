import ReportModule from "../../components/modules/ReportModule";

export default function NiftyStrategyPage() {
  return <ReportModule endpoint="/api/reports/generate/nifty-strategy" label="NIFTY strategy report" />;
}