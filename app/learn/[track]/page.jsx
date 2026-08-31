import AcademyTrack from "../../../components/learn/AcademyTrack";

export default async function TrackPage({ params }) {
  const { track } = await params;
  return <AcademyTrack trackId={track} />;
}
