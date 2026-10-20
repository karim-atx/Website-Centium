import React from "react";
import { CircleCheck, ShieldCheck } from "lucide-react";
import { courseStatusLook, submitBlockers, submitWarnings, type AuthoredCourse, type BuilderLesson, type BuilderModule } from "../../../services/courses/author";
import type { CourseCategory } from "../../../services/courses";
import { formatPrice, levelLabel } from "../../../services/courses/rules";
import type { DripMode } from "../../../services/pro/courses";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { Avatar, ListCard } from "../client/kit";
import { fmtDay } from "../client/clientFormat";
import { coverBackground } from "../../courses/courseCover";
import { FieldError, Note } from "./courseUi";
import { accessLine, sizeLine } from "./courseModel";

/**
 * Release 3 · W6 MO28 "Create course · 5 Review" (cReview18): the course
 * card (r18, 1px 10% border, m-bottom 10; cover 110 in the course colour;
 * pad 12 14; title 17 / 800; subtitle 12.5 text.soft m-top 2; the author
 * line 12 text.faint m-top 8 with a 20 avatar), the three checked rows
 * (listCard6, circle-check), and "Centium checks every new course before it
 * goes live, usually within 2 working days." (11.5 text.faint, shield-check
 * 13 teal.dark). Footer: Save as draft + Publish (submit_course_for_review).
 * The database refuses a course with no lesson (ATX67), so Publish waits
 * for one and says so; a week with no lesson is advice only.
 */
export const ReviewStep: React.FC<{
  course: AuthoredCourse;
  shown: AuthoredCourse;
  modules: BuilderModule[];
  lessons: BuilderLesson[];
  dripMode: DripMode;
  authorName: string;
  categories: CourseCategory[];
  onStep: (s: 0 | 1 | 3) => void;
  footer: React.ReactNode;
}> = ({ course, shown, modules, lessons, dripMode, authorName, onStep, footer }) => {
  const dark = useIsDark();
  const tree = { modules, lessons: lessons.map((l) => ({ moduleId: l.moduleId, kind: l.kind })) };
  const frozen = course.status === "submitted";
  const blockers = frozen ? [] : submitBlockers(tree);
  const warnings = frozen ? [] : submitWarnings(shown, tree);
  const look = courseStatusLook(course.status);
  const meta = [authorName, levelLabel(shown.level), sizeLine(modules.length, lessons.length)].filter(Boolean).join(" · ");
  return (
    <div>
      {course.status === "submitted" && (
        <Note mt={0}>
          <b style={{ color: INK.ch }}>In review{course.submittedAt ? ` · Submitted ${fmtDay(course.submittedAt)}` : ""}.</b> {look.detail}
        </Note>
      )}
      <div style={{ borderRadius: 18, border: `1px solid ${INK.b10}`, overflow: "hidden", marginBottom: 10, marginTop: course.status === "submitted" ? 10 : 0 }}>
        <div style={{ height: 110, background: coverBackground(shown.coverColour, dark) }} aria-hidden />
        <div style={{ padding: "12px 14px" }}>
          <p style={{ fontSize: textPx(17), fontWeight: 800, color: INK.ch, overflowWrap: "anywhere" }}>{shown.title}</p>
          {shown.subtitle && <p style={{ fontSize: textPx(12.5), color: INK.chS, marginTop: 2 }}>{shown.subtitle}</p>}
          <p className="flex items-center" style={{ gap: 6, fontSize: textPx(12), color: INK.chF, marginTop: 8 }}>
            {authorName && <Avatar name={authorName} size={20} tone="teal" />}
            {meta}
          </p>
        </div>
      </div>
      <ListCard
        rows={[
          { key: "b", icon: CircleCheck, title: "Basics", meta: `Title, subtitle, ${levelLabel(shown.level)}`, onClick: () => onStep(0) },
          { key: "s", icon: CircleCheck, title: "Structure", meta: sizeLine(modules.length, lessons.length).replace(" · ", ", "), onClick: () => onStep(1) },
          { key: "a", icon: CircleCheck, title: "Access", meta: accessLine(formatPrice(shown.priceCents), dripMode), onClick: () => onStep(3) },
        ]}
      />
      {blockers.map((b) => (
        <FieldError key={b} mt={0}>
          {b}
        </FieldError>
      ))}
      {warnings.map((w) => (
        <Note key={w} mt={4}>
          {w}
        </Note>
      ))}
      <Note icon={ShieldCheck} iconColour={INK.tealDark}>
        Centium checks every new course before it goes live, usually within 2 working days.
      </Note>
      {footer}
    </div>
  );
};
