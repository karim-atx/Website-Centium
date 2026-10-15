import { MyCourses } from "./MyCourses";

/**
 * /app/forum/courses/mine/:courseId (Release 3 · W6, MO28). The old
 * single-page builder (design screen 9) is replaced: a published or archived
 * course opens its Course stats, and any other course opens the Create
 * course sheet over Your courses. Both live in MyCourses, which loads the
 * author's courses once and decides by the course's status.
 */
export function CourseBuilder({ courseId, userId }: { courseId: string; userId: string }) {
  return <MyCourses userId={userId} canAuthor openCourseId={courseId} />;
}
