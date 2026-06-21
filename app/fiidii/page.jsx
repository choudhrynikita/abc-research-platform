import ReportModule from "../../components/modules/ReportModule";

export default function FiiDiiPage() {
  return <ReportModule endpoint="/api/reports/generate/fiidii" label="FII/DII report" />;
}