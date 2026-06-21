import ReportModule from "../../components/modules/ReportModule";

export default function FnoPage() {
  return <ReportModule endpoint="/api/reports/generate/fno" label="F&O report" />;
}