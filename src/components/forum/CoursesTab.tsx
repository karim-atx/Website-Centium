import { useState } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { BottomSheet } from "../ui/BottomSheet";
import { GraduationCap, Clock, BarChart2 } from "lucide-react";

// The Community page's Courses tab, moved here unchanged from the old
// ForumTab when the shared forum replaced the device-only one. Phase 2
// rebuilds it.

type CourseCategory = "Nutrition" | "Workouts" | "Progress" | "Motivation";

// QA 11.0: "Rename the forum into something that includes forum in one
// tab while the other tab has courses related to fitness. Please
// populate the courses tab as you see fit." A small curated set, in the
// same spirit as the rest of this prototype's mocked content.
type CourseLevel = "Beginner" | "Intermediate" | "Advanced";
interface Course {
  id: string;
  title: string;
  category: CourseCategory;
  level: CourseLevel;
  durationMin: number;
  summary: string;
}
const courses: Course[] = [
  { id: "c1", title: "Strength Training Fundamentals", category: "Workouts", level: "Beginner", durationMin: 45, summary: "Bar path, bracing, and the big three lifts — build a foundation before you chase numbers." },
  { id: "c2", title: "Macros Made Simple", category: "Nutrition", level: "Beginner", durationMin: 30, summary: "What protein, carbs and fat actually do, and how to hit your targets without obsessing." },
  { id: "c3", title: "Progressive Overload Explained", category: "Workouts", level: "Intermediate", durationMin: 35, summary: "Why your lifts stall, and the handful of levers that reliably get you unstuck." },
  { id: "c4", title: "Eating Out in Lebanon, Made Easy", category: "Nutrition", level: "Beginner", durationMin: 25, summary: "Reading a mezze table, portioning manoushe, and ordering shawarma without guesswork." },
  { id: "c5", title: "Recovery & Sleep for Athletes", category: "Progress", level: "Intermediate", durationMin: 40, summary: "Why recovery is where the adaptation actually happens, and how to protect it." },
  { id: "c6", title: "Building a Sustainable Habit Loop", category: "Motivation", level: "Beginner", durationMin: 20, summary: "The mechanics behind habits that stick, applied to training and logging food." },
];
const levelColor: Record<CourseLevel, string> = {
  Beginner: "#3F9165",
  Intermediate: "#D9A441",
  Advanced: "#C0392B",
};

export function CoursesTab() {
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  return (
    <div className="space-y-2.5 animate-fade-slide-up">
      {courses.map((c) => (
        <Card key={c.id} interactive onClick={() => setActiveCourse(c)}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0">
              <GraduationCap size={17} className="text-primary-dark" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-charcoal mb-1">{c.title}</p>
              <p className="text-xs text-charcoal-soft leading-relaxed line-clamp-2 mb-2">{c.summary}</p>
              <div className="flex items-center gap-3 text-[11px] text-charcoal-faint">
                <span className="flex items-center gap-1">
                  <Clock size={11} /> {c.durationMin} min
                </span>
                <span className="flex items-center gap-1">
                  <BarChart2 size={11} style={{ color: levelColor[c.level] }} /> {c.level}
                </span>
                <span>{c.category}</span>
              </div>
            </div>
          </div>
        </Card>
      ))}

      <BottomSheet open={!!activeCourse} onClose={() => setActiveCourse(null)} title={activeCourse?.title}>
        {activeCourse && (
          <div className="animate-fade-slide-up">
            <div className="flex items-center gap-3 text-xs text-charcoal-faint mb-4">
              <span className="flex items-center gap-1">
                <Clock size={12} /> {activeCourse.durationMin} min
              </span>
              <span className="flex items-center gap-1 font-semibold" style={{ color: levelColor[activeCourse.level] }}>
                <BarChart2 size={12} /> {activeCourse.level}
              </span>
              <span>{activeCourse.category}</span>
            </div>
            <p className="text-sm text-charcoal-soft leading-relaxed mb-5">{activeCourse.summary}</p>
            <Button fullWidth size="lg" disabled>
              Start course — coming soon
            </Button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
