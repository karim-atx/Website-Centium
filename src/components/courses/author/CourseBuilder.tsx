import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  addModule,
  canEditNow,
  courseStatusLook,
  editingRevisionId,
  fetchBuilderTree,
  fetchCommissionPercent,
  fetchMyCourse,
  fetchMyRevision,
  fetchNetEarnings,
  needsRevisionToEdit,
  openRevision,
  removeModule,
  renameModule,
  reorderModules,
  revisionStatusLook,
  submitBlockers,
  submitForReview,
  submitRevision,
  submitWarnings,
  withdrawRevision,
  LIMITS,
  RENAME_RESETS_PROGRESS,
  REVISION_EXPLAINER,
  WITHDRAW_EXPLAINER,
  type AuthoredCourse,
  type BuilderLesson,
  type BuilderModule,
  type CourseRevision,
  type NetEarnings,
} from "../../../services/courses/author";
import { fetchCourseCategories, type CourseCategory } from "../../../services/courses";
import { fv } from "../../forum/forumColor";
import { ForumPlaceholder } from "../../forum/parts";
import { AuthorCard, ErrorNote, Hint, PrimaryButton, QuietButton, ReviewReason, StatusPill, TextField } from "./authorParts";
import { CourseDetailsEditor } from "./CourseDetailsEditor";
import { WeekEditor } from "./WeekEditor";

// Design screen 9: the builder.
//
// WHICH TREE AM I EDITING is the question this screen exists to answer, and it
// answers it once, at the top, and then threads the answer through everything
// below. A course in draft or changes_requested is edited DIRECTLY. A PUBLISHED
// course's live tree is editable by nobody — not by this screen, not by any
// verb — so it is edited through a revision: a copy of the whole tree that the
// author works on while learners carry on with the live one.
//
// THE FIELDS ARE DISABLED WHEN THE DATABASE WOULD REFUSE THE SAVE, rather than
// accepting typing that cannot land. canEditNow() asks exactly what
// course_content_is_editable asks, so a submitted course or revision is frozen
// here because it is frozen there.

type Loaded = {
  course: AuthoredCourse;
  revision: CourseRevision | null;
  modules: BuilderModule[];
  lessons: BuilderLesson[];
  categories: CourseCategory[];
  earnings: NetEarnings | null;
  commission: number | null;
};

export function CourseBuilder({ courseId }: { courseId: string }) {
  const navigate = useNavigate();
  const [state, setState] = useState<Loaded | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const course = await fetchMyCourse(courseId);
    if (!course.ok) {
      setError(course.message);
      return;
    }
    if (!course.value) {
      setMissing(true);
      return;
    }
    const revision = await fetchMyRevision(courseId);
    const rev = revision.ok ? revision.value : null;
    // THE TREE THAT IS BEING EDITED, not both. While a revision is open BOTH
    // trees exist against the same course id, and showing them together is a
    // screen nobody could read.
    const editing = editingRevisionId(rev);
    const [tree, cats, earnings, commission] = await Promise.all([
      fetchBuilderTree(courseId, editing),
      fetchCourseCategories(),
      fetchNetEarnings(courseId),
      fetchCommissionPercent(),
    ]);
    setState({
      course: course.value,
      revision: rev,
      modules: tree.ok ? tree.value.modules : [],
      lessons: tree.ok ? tree.value.lessons : [],
      categories: cats.ok ? cats.value : [],
      earnings: earnings.ok ? earnings.value : null,
      commission,
    });
    if (!tree.ok) setError(tree.message);
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (missing) {
    return (
      <AuthorCard>
        <span className="text-sm font-extrabold">That course no longer exists</span>
        <Link to="/app/forum/courses/mine" className="text-[13px] font-bold no-underline" style={{ color: fv("link") }}>
          Back to my courses
        </Link>
      </AuthorCard>
    );
  }

  if (!state) {
    return (
      <div className="flex flex-col gap-2.5" aria-busy="true">
        {error && <ErrorNote>{error}</ErrorNote>}
        <ForumPlaceholder height={120} />
        <ForumPlaceholder height={180} />
      </div>
    );
  }

  const { course, revision, modules, lessons, categories } = state;
  const editingRev = editingRevisionId(revision);
  const editable = canEditNow(course.status, revision);
  const offerRevision = needsRevisionToEdit(course.status, revision);
  const courseLook = courseStatusLook(course.status);
  const revisionLook = revision ? revisionStatusLook(revision.status) : null;

  // Header fields come from the revision where it overrides them, and from the
  // live course where it does not — my_course_revision returns null for every
  // field the revision does not change.
  const shown: AuthoredCourse = editingRev && revision
    ? {
        ...course,
        title: revision.title ?? course.title,
        subtitle: revision.subtitle ?? course.subtitle,
        categoryKey: revision.categoryKey ?? course.categoryKey,
        level: revision.level ?? course.level,
        weeklyHours: revision.weeklyHours ?? course.weeklyHours,
        learnPoints: revision.learnPoints ?? course.learnPoints,
        coverColour: revision.coverColour ?? course.coverColour,
        priceCents: revision.priceCents ?? course.priceCents,
      }
    : course;

  const tree = { modules, lessons: lessons.map((l) => ({ moduleId: l.moduleId, kind: l.kind })) };
  const blockers = submitBlockers(tree);
  const warnings = submitWarnings(shown, tree);

  const run = async (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await fn();
    if (!r.ok) setError(r.message ?? "Something went wrong. Try again.");
    else await load();
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-3 pb-6" style={{ color: fv("text") }}>
      {error && <ErrorNote>{error}</ErrorNote>}

      {/* ---- status ---------------------------------------------------- */}
      <AuthorCard>
        <span className="flex items-start justify-between gap-2">
          <span className="text-[15px] font-extrabold leading-[1.3] [overflow-wrap:anywhere]">{shown.title}</span>
          <StatusPill look={revisionLook && editingRev ? revisionLook : courseLook} />
        </span>
        <Hint>{revisionLook && editingRev ? revisionLook.detail : courseLook.detail}</Hint>

        {/* The reviewer's words, from whichever of the two was sent back. */}
        {course.status === "changes_requested" && course.reviewReason && <ReviewReason reason={course.reviewReason} />}
        {revision?.status === "changes_requested" && revision.reviewReason && <ReviewReason reason={revision.reviewReason} />}

        {course.status === "published" && (
          <Link
            to={`/app/forum/courses/${course.id}`}
            className="text-[13px] font-bold no-underline"
            style={{ color: fv("link") }}
          >
            View it as a learner
          </Link>
        )}

        {offerRevision && (
          <>
            <Hint>{REVISION_EXPLAINER}</Hint>
            <PrimaryButton onClick={() => void run(() => openRevision(course.id))} disabled={busy}>
              {busy ? "Opening…" : "Edit this course"}
            </PrimaryButton>
          </>
        )}
      </AuthorCard>

      {/* ---- details --------------------------------------------------- */}
      <CourseDetailsEditor
        course={shown}
        categories={categories}
        revisionId={editingRev}
        editable={editable}
        commission={state.commission}
        earnings={state.earnings}
        lockedReason={editable ? null : offerRevision ? "published" : "review"}
        onSaved={() => void load()}
      />

      {/* ---- weeks ----------------------------------------------------- */}
      <Weeks
        courseId={course.id}
        revisionId={editingRev}
        modules={modules}
        lessons={lessons}
        editable={editable}
        busy={busy}
        onChanged={() => void load()}
        run={run}
      />

      {/* ---- submit ---------------------------------------------------- */}
      {editable && (
        <AuthorCard>
          {blockers.map((b) => (
            <Hint key={b}>{b}</Hint>
          ))}
          {warnings.map((w) => (
            <Hint key={w}>{w}</Hint>
          ))}
          <PrimaryButton
            onClick={() =>
              void run(() => (editingRev ? submitRevision(editingRev) : submitForReview(course.id)))
            }
            disabled={busy || blockers.length > 0}
          >
            {busy ? "Submitting…" : editingRev ? "Submit changes for review" : "Submit for review"}
          </PrimaryButton>

          {editingRev && (
            <>
              <Hint>{WITHDRAW_EXPLAINER}</Hint>
              <QuietButton danger disabled={busy} onClick={() => void run(() => withdrawRevision(editingRev))}>
                Discard these changes
              </QuietButton>
            </>
          )}
        </AuthorCard>
      )}

      <button
        type="button"
        onClick={() => navigate("/app/forum/courses/mine")}
        className="tap text-[13px] font-bold self-start"
        style={{ color: fv("link") }}
      >
        ← My courses
      </button>
    </div>
  );
}

/** The week list, and adding one. Each week owns its own lessons. */
function Weeks({
  courseId,
  revisionId,
  modules,
  lessons,
  editable,
  busy,
  onChanged,
  run,
}: {
  courseId: string;
  revisionId: string | null;
  modules: BuilderModule[];
  lessons: BuilderLesson[];
  editable: boolean;
  busy: boolean;
  onChanged: () => void;
  run: (fn: () => Promise<{ ok: boolean; message?: string }>) => Promise<void>;
}) {
  const [adding, setAdding] = useState("");

  const move = (index: number, by: number) => {
    const next = [...modules];
    const to = index + by;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    // The WHOLE new order, every week exactly once — the database checks that
    // and refuses anything else, so there is no partial move to get wrong.
    void run(() => reorderModules(courseId, next.map((m) => m.id), revisionId));
  };

  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[13px] font-extrabold tracking-[0.04em]" style={{ color: fv("muted") }}>
        WEEKS
      </span>

      {modules.length === 0 && (
        <AuthorCard>
          <span className="text-sm font-extrabold">No weeks yet</span>
          <Hint>A course is organised into weeks, and each week holds its lessons. Add the first one.</Hint>
        </AuthorCard>
      )}

      {modules.map((m, i) => (
        <WeekEditor
          key={m.id}
          index={i}
          module={m}
          lessons={lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.position - b.position)}
          courseId={courseId}
          editable={editable}
          busy={busy}
          canMoveUp={i > 0}
          canMoveDown={i < modules.length - 1}
          onMove={(by) => move(i, by)}
          onRename={(title) => void run(() => renameModule(m.id, title))}
          onRemove={() => void run(() => removeModule(m.id))}
          onChanged={onChanged}
        />
      ))}

      {editable && (
        <AuthorCard>
          <TextField
            value={adding}
            onChange={setAdding}
            placeholder={`Week ${modules.length + 1}`}
            maxLength={LIMITS.moduleTitle.max}
            label="New week title"
          />
          <PrimaryButton
            disabled={busy || adding.trim().length < LIMITS.moduleTitle.min}
            onClick={() =>
              void run(async () => {
                const r = await addModule(courseId, adding.trim(), revisionId);
                if (r.ok) setAdding("");
                return r;
              })
            }
          >
            Add week
          </PrimaryButton>
          {/* THE ONE THAT WILL SURPRISE AN AUTHOR, said where weeks and lessons
              are edited rather than buried in a help page. */}
          {revisionId && <Hint>{RENAME_RESETS_PROGRESS}</Hint>}
        </AuthorCard>
      )}
    </div>
  );
}
