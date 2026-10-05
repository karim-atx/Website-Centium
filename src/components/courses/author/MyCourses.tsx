import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  courseStatusLook,
  createCourse,
  fetchMyCourses,
  formatCents,
  COURSE_LEVELS,
  LIMITS,
  type AuthoredCourse,
} from "../../../services/courses/author";
import { fetchCourseCategories, type CourseCategory } from "../../../services/courses";
import { levelLabel } from "../../../services/courses/rules";
import { fv } from "../../forum/forumColor";
import { ForumPlaceholder } from "../../forum/parts";
import { AuthorCard, ErrorNote, FieldLabel, PrimaryButton, QuietButton, StatusPill, TextField } from "./authorParts";

// Design screen 9, the way in: a professional's own courses.
//
// ONLY A VERIFIED PROFESSIONAL GETS HERE, and the screen says so rather than
// offering a button that cannot work: create_course refuses anyone else with
// ATX66, using the same licence check the Professional badge uses, so the two
// cannot disagree about who is verified.

export function MyCourses({ userId, canAuthor }: { userId: string; canAuthor: boolean }) {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<AuthoredCourse[] | null>(null);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    let live = true;
    void Promise.all([fetchMyCourses(userId), fetchCourseCategories()]).then(([mine, cats]) => {
      if (!live) return;
      if (!mine.ok) setError(mine.message);
      else setCourses(mine.value);
      if (cats.ok) setCategories(cats.value);
    });
    return () => {
      live = false;
    };
  }, [userId]);

  if (!canAuthor) {
    return (
      <AuthorCard>
        <span className="text-sm font-extrabold">Courses are written by verified professionals</span>
        <p className="text-[13px] leading-[1.55]" style={{ color: fv("muted") }}>
          Add your licence in Profile and we'll verify it. Once it's verified you can write and publish courses here.
        </p>
        <Link
          to="/app/profile"
          className="tap h-11 rounded-[14px] px-4 text-sm font-extrabold no-underline inline-flex items-center justify-center"
          style={{ background: fv("accent"), color: fv("on-accent") }}
        >
          Go to Profile
        </Link>
      </AuthorCard>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-6" style={{ color: fv("text") }}>
      {error && <ErrorNote>{error}</ErrorNote>}

      {composing ? (
        <NewCourseForm
          categories={categories}
          onCancel={() => setComposing(false)}
          onCreated={(id) => navigate(`/app/forum/courses/mine/${id}`)}
        />
      ) : (
        <PrimaryButton onClick={() => setComposing(true)}>New course</PrimaryButton>
      )}

      {!courses ? (
        <div className="flex flex-col gap-2.5" aria-busy="true">
          <ForumPlaceholder height={92} />
          <ForumPlaceholder height={92} />
        </div>
      ) : courses.length === 0 ? (
        <AuthorCard>
          <span className="text-sm font-extrabold">No courses yet</span>
          <p className="text-[13px] leading-[1.55]" style={{ color: fv("muted") }}>
            A course is weeks of lessons: videos, readings, quizzes and downloadable plans. Start one and it stays a
            draft until you submit it.
          </p>
        </AuthorCard>
      ) : (
        <div className="flex flex-col gap-2.5">
          {courses.map((c) => {
            const look = courseStatusLook(c.status);
            return (
              <Link
                key={c.id}
                to={`/app/forum/courses/mine/${c.id}`}
                className="rounded-[18px] overflow-hidden flex no-underline"
                style={{ background: fv("card"), border: `1px solid ${fv("border")}`, color: fv("text") }}
              >
                <span className="w-[6px] shrink-0" style={{ background: c.coverColour }} aria-hidden="true" />
                <span className="px-[14px] py-3 flex flex-col gap-1.5 grow min-w-0">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-[15px] font-extrabold leading-[1.3] [overflow-wrap:anywhere]">{c.title}</span>
                    <StatusPill look={look} />
                  </span>
                  <span className="text-xs" style={{ color: fv("muted") }}>
                    {levelLabel(c.level)} · {c.priceCents > 0 ? formatCents(c.priceCents) : "Free"}
                  </span>
                  {/* The reviewer's reason gets a line here too, because it is
                      the reason this course is in the list rather than live. */}
                  {c.status === "changes_requested" && c.reviewReason && (
                    <span className="text-xs leading-[1.5] [overflow-wrap:anywhere]" style={{ color: fv("amber-ink") }}>
                      {c.reviewReason}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * The three things create_course takes. Everything else is edited afterwards,
 * because a course is a draft the moment it exists and there is nothing to be
 * gained from asking for a subtitle before the author has written a lesson.
 */
function NewCourseForm({
  categories,
  onCancel,
  onCreated,
}: {
  categories: CourseCategory[];
  onCancel: () => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [categoryKey, setCategoryKey] = useState("");
  const [level, setLevel] = useState<string>("beginner");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryKey && categories.length > 0) setCategoryKey(categories[0].key);
  }, [categories, categoryKey]);

  const tooShort = title.trim().length < LIMITS.title.min;

  const submit = async () => {
    if (busy || tooShort || !categoryKey) return;
    setBusy(true);
    setError(null);
    const r = await createCourse(title.trim(), categoryKey, level);
    if (!r.ok) {
      setError(r.message);
      setBusy(false);
      return;
    }
    onCreated(r.value);
  };

  return (
    <AuthorCard>
      <FieldLabel hint={`At least ${LIMITS.title.min} characters. You can change it later.`}>Course title</FieldLabel>
      <TextField
        value={title}
        onChange={setTitle}
        placeholder="Strength training after 50"
        maxLength={LIMITS.title.max}
        label="Course title"
      />

      <FieldLabel>Category</FieldLabel>
      <select
        value={categoryKey}
        onChange={(e) => setCategoryKey(e.target.value)}
        aria-label="Category"
        className="h-11 rounded-[14px] px-3 text-sm outline-none w-full"
        style={{ background: fv("card"), border: `1px solid ${fv("border")}`, color: fv("text") }}
      >
        {categories.map((c) => (
          <option key={c.key} value={c.key}>
            {c.name}
          </option>
        ))}
      </select>

      <FieldLabel>Level</FieldLabel>
      <div className="flex gap-1.5 flex-wrap">
        {COURSE_LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLevel(l)}
            className="tap text-[13px] font-bold rounded-full px-3 py-1.5"
            style={
              level === l
                ? { background: fv("accent"), color: fv("on-accent") }
                : { background: fv("track"), color: fv("muted") }
            }
          >
            {levelLabel(l)}
          </button>
        ))}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex gap-2">
        <span className="grow">
          <PrimaryButton onClick={() => void submit()} disabled={busy || tooShort || !categoryKey}>
            {busy ? "Creating…" : "Create draft"}
          </PrimaryButton>
        </span>
        <QuietButton onClick={onCancel} disabled={busy}>
          Cancel
        </QuietButton>
      </div>
    </AuthorCard>
  );
}
