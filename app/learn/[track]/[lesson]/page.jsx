import AcademyLesson from "../../../../components/learn/AcademyLesson";

export default async function LessonPage({ params }) {
  const { track, lesson } = await params;
  return <AcademyLesson trackId={track} lessonId={lesson} />;
}
