import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Info, ListTree, LockOpen, Pencil, Send, Trash2 } from "lucide-react";
import {
  addModule,
  canEditNow,
  createCourse,
  editingRevisionId,
  fetchBuilderTree,
  fetchCommissionPercent,
  fetchMyCourse,
  fetchMyRevision,
  openRevision,
  revisionStatusLook,
  submitForReview,
  submitRevision,
  updateCourseDetails,
  withdrawRevision,
  COVER_COLOURS,
  WITHDRAW_EXPLAINER,
  type AuthoredCourse,
  type BuilderLesson,
  type BuilderModule,
  type CourseRevision,
} from "../../../services/courses/author";
import type { CourseCategory } from "../../../services/courses";
import type { LessonKind } from "../../../services/courses/rules";
import { fetchDrip, fetchModuleOpensAfter, fetchQuizCounts, fetchRevisionDrip, saveDrip, type DripMode } from "../../../services/pro/courses";
import { BottomSheet } from "../../ui/BottomSheet";
import { CentredPopup } from "../../ui/CentredPopup";
import { CtaButton } from "../../ui/PinnedCta";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { ListCard } from "../client/kit";
import { ProCardSkeleton } from "../states";
import { FieldError, Note, StepBar } from "./courseUi";
import { STEPS, dripMatches, dripPlan, parsePrice, titleError, sizeLine } from "./courseModel";
import { DangerCta } from "./StructureStep";
import { BasicsStep, type BasicsDraft } from "./BasicsStep";
import { StructureStep } from "./StructureStep";
import { LessonEditor, LessonTypeStep } from "./LessonSteps";
import { AccessStep } from "./AccessStep";
import { ReviewStep } from "./ReviewStep";

/**
 * Release 3 · W6 MO28 "Create course" (1 Basics … 5 Review, discard
 * confirmation) and "Edit a published course", one bottom sheet over Your
 * courses (or the stats page) with the board's step bar (stepBar18) and the
 * sheet footer (cta 'sheet': 52 high, r16, gap 8).
 *
 * WHICH TREE AM I EDITING (kept from the old builder): a course in draft or
 * changes_requested is edited directly; a PUBLISHED course through a
 * revision (open_course_revision copies the tree; my_course_revision reads
 * it; submit_course_revision / withdraw_course_revision). The fields lock
 * when course_content_is_editable would refuse (canEditNow): a course or
 * revision with Centium is frozen.
 *
 * A NEW COURSE EXISTS ONLY ONCE BASICS IS SAVED (create_course needs a
 * title, category and level). Closing before that asks "Discard this
 * course?" (Discard / Save as draft / Keep editing). After that every step
 * saves as it goes, so the course is always a draft in Drafts.
 *
 * Publish = submit_course_for_review: Centium checks the course before it
 * goes live (ATX66 without a verified licence, ATX67 with no lesson).
 */

type View =
  | { step: "overview" }
  | { step: 0 }
  | { step: 1 }
  | { step: 2; sub: "type"; moduleId: string; kind: LessonKind | null }
  | { step: 2; sub: "edit"; moduleId: string; kind: LessonKind; lessonId: string | null }
  | { step: 3 }
  | { step: 4 };

type Loaded = {
  course: AuthoredCourse;
  revision: CourseRevision | null;
  modules: BuilderModule[];
  lessons: BuilderLesson[];
  opensAfter: Map<string, number>;
  quizCounts: Map<string, number>;
  drip: { mode: DripMode; weekday: number | null };
  commission: number | null;
};

const emptyBasics = (categories: CourseCategory[]): BasicsDraft => ({
  title: "",
  subtitle: "",
  categoryKey: categories[0]?.key ?? "",
  level: "beginner",
  weeklyHours: "",
  learnPoints: "",
  coverColour: COVER_COLOURS[0],
});

const basicsOf = (c: AuthoredCourse): BasicsDraft => ({
  title: c.title,
  subtitle: c.subtitle ?? "",
  categoryKey: c.categoryKey,
  level: c.level,
  weeklyHours: c.weeklyHours === null ? "" : String(c.weeklyHours),
  learnPoints: c.learnPoints.join("\n"),
  coverColour: c.coverColour,
});

export function CourseSheet({
  courseId,
  categories,
  initialStep,
  onClose,
  onChanged,
  onCreated,
  onSubmitted,
  onSavedDraft,
  authorName,
  enrolled,
}: {
  courseId: string | null;
  categories: CourseCategory[];
  initialStep?: number;
  onClose: () => void;
  onChanged: () => void;
  onCreated?: (id: string) => void;
  onSubmitted: (title: string) => void;
  onSavedDraft?: () => void;
  authorName?: string;
  /** The live course's enrolled count, for the published course's Edit note. */
  enrolled?: number;
}) {
  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ step: 0 });
  const [basics, setBasics] = useState<BasicsDraft>(() => emptyBasics(categories));
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);
  const [withdrawAsk, setWithdrawAsk] = useState(false);
  const [footerEl, setFooterEl] = useState<HTMLDivElement | null>(null);
  const [access, setAccess] = useState<{ free: boolean; price: string; mode: DripMode } | null>(null);

  const load = useCallback(async () => {
    if (!courseId) return;
    const c = await fetchMyCourse(courseId);
    if (!c.ok || !c.value) {
      setLoadError(c.ok ? "That course no longer exists." : c.message);
      return;
    }
    const rev = await fetchMyRevision(courseId);
    const revision = rev.ok ? rev.value : null;
    const editing = editingRevisionId(revision);
    const [tree, opens, drip, commission] = await Promise.all([fetchBuilderTree(courseId, editing), fetchModuleOpensAfter(courseId, editing), editing ? fetchRevisionDrip(editing) : fetchDrip(courseId), fetchCommissionPercent()]);
    if (!tree.ok) {
      setLoadError(tree.message);
      return;
    }
    const quizCounts = await fetchQuizCounts(tree.value.lessons.filter((l) => l.kind === "quiz").map((l) => l.id));
    setLoadError(null);
    setData({
      course: c.value,
      revision,
      modules: tree.value.modules,
      lessons: tree.value.lessons,
      opensAfter: opens.ok ? opens.data : new Map(),
      quizCounts,
      drip: drip.ok ? drip.data : { mode: "all_at_once", weekday: null },
      commission,
    });
  }, [courseId]);

  // First load picks the starting view; later loads keep it.
  const [started, setStarted] = useState(false);
  useEffect(() => {
    void load();
  }, [load]);

  const editingRev = data ? editingRevisionId(data.revision) : null;
  const published = data?.course.status === "published";
  // Header fields: the revision's overrides over the live course (my_course_revision returns null for unchanged fields).
  const shown: AuthoredCourse | null = useMemo(() => {
    if (!data) return null;
    const { course, revision } = data;
    if (!editingRev || !revision) return course;
    return {
      ...course,
      title: revision.title ?? course.title,
      subtitle: revision.subtitle ?? course.subtitle,
      categoryKey: revision.categoryKey ?? course.categoryKey,
      level: revision.level ?? course.level,
      weeklyHours: revision.weeklyHours ?? course.weeklyHours,
      learnPoints: revision.learnPoints ?? course.learnPoints,
      coverColour: revision.coverColour ?? course.coverColour,
      priceCents: revision.priceCents ?? course.priceCents,
    };
  }, [data, editingRev]);

  useEffect(() => {
    if (!data || !shown) return;
    setBasics(basicsOf(shown));
    setAccess({ free: shown.priceCents === 0, price: shown.priceCents ? String(shown.priceCents / 100) : "", mode: data.drip.mode });
    if (!started) {
      setStarted(true);
      if (data.course.status === "published") setView({ step: "overview" });
      else if (data.course.status === "submitted") setView({ step: 4 });
      else if (initialStep === 1) setView({ step: 1 });
    }
  }, [data, shown, started, initialStep]);

  useEffect(() => {
    if (!courseId && categories.length && !basics.categoryKey) setBasics((b) => ({ ...b, categoryKey: categories[0].key }));
  }, [categories, courseId, basics.categoryKey]);

  const editable = data ? canEditNow(data.course.status, data.revision) : true;
  const isNew = !courseId;
  const dirtyNew = isNew && (basics.title.trim() !== "" || basics.subtitle.trim() !== "" || basics.learnPoints.trim() !== "");

  const run = async (fn: () => Promise<{ ok: boolean; message?: string }>): Promise<boolean> => {
    if (busy) return false;
    setBusy(true);
    setError(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) {
      setError(r.message ?? "Something went wrong. Try again.");
      return false;
    }
    onChanged();
    await load();
    return true;
  };

  // ---- Basics ---------------------------------------------------------------
  const basicsPatch = (b: BasicsDraft, base: AuthoredCourse | null) => {
    const patch: Parameters<typeof updateCourseDetails>[1] = {};
    const points = b.learnPoints.split("\n").map((p) => p.trim()).filter(Boolean);
    const hours = b.weeklyHours.trim() === "" ? null : Number(b.weeklyHours);
    if (!base || b.title.trim() !== base.title) patch.title = b.title.trim();
    if (b.subtitle.trim() && b.subtitle.trim() !== (base?.subtitle ?? "")) patch.subtitle = b.subtitle.trim();
    if (base && b.categoryKey !== base.categoryKey) patch.categoryKey = b.categoryKey;
    if (base && b.level !== base.level) patch.level = b.level;
    if (hours !== null && Number.isFinite(hours) && hours !== (base?.weeklyHours ?? null)) patch.weeklyHours = hours;
    if (points.join("\n") !== (base?.learnPoints ?? []).join("\n")) patch.learnPoints = points;
    if (b.coverColour !== (base?.coverColour ?? "")) patch.coverColour = b.coverColour;
    return patch;
  };

  const saveBasics = async (then: "next" | "draft"): Promise<void> => {
    setShowErrors(true);
    if (titleError(basics.title) || !basics.categoryKey) return;
    if (!editable) {
      setView({ step: 1 });
      return;
    }
    if (isNew) {
      setBusy(true);
      setError(null);
      const created = await createCourse(basics.title.trim(), basics.categoryKey, basics.level);
      if (!created.ok) {
        setBusy(false);
        setError(created.message);
        return;
      }
      const patch = basicsPatch(basics, null);
      delete patch.title;
      if (Object.keys(patch).length) {
        const r = await updateCourseDetails(created.value, patch, null);
        if (!r.ok) setError(r.message);
      }
      setBusy(false);
      onChanged();
      if (then === "draft") onSavedDraft?.();
      else onCreated?.(created.value);
      return;
    }
    const patch = basicsPatch(basics, shown);
    if (Object.keys(patch).length) {
      const ok = await run(() => updateCourseDetails(courseId!, patch, editingRev));
      if (!ok) return;
    }
    setView(published ? { step: "overview" } : { step: 1 });
  };

  // ---- Access ---------------------------------------------------------------
  const saveAccess = async () => {
    if (!data || !shown || !access) return;
    if (!editable) {
      setView({ step: 4 });
      return;
    }
    const cents = access.free ? 0 : parsePrice(access.price) ?? -1;
    if (!access.free && !(cents > 0 && cents <= 50_000)) {
      setError("A price is between $1 and $500.");
      return;
    }
    const plan = dripPlan(data.modules.map((m) => m.id), access.mode);
    const priceChanged = cents !== shown.priceCents;
    const dripChanged = access.mode !== data.drip.mode || !dripMatches(plan, data.opensAfter);
    if (priceChanged || dripChanged) {
      const ok = await run(async () => {
        if (priceChanged) {
          const r = await updateCourseDetails(courseId!, { priceCents: cents }, editingRev);
          if (!r.ok) return r;
        }
        if (dripChanged) return saveDrip(courseId!, access.mode, data.drip.weekday, plan);
        return { ok: true };
      });
      if (!ok) return;
    }
    setView(published ? { step: "overview" } : { step: 4 });
  };

  // ---- Submit ---------------------------------------------------------------
  const submit = async () => {
    if (!data || !shown) return;
    // open_course_revision copies the drip (Database 20261124170000), so
    // nothing is re-written before submitting.
    const ok = await run(async () => (editingRev ? submitRevision(editingRev) : submitForReview(courseId!)));
    if (ok) onSubmitted(shown.title);
  };

  // Rows of the published course's Edit sheet open a revision first.
  const openEdit = async (to: View) => {
    if (!data) return;
    if (!editingRev && data.course.status === "published") {
      const ok = await run(() => openRevision(courseId!));
      if (!ok) return;
    }
    setView(to);
  };

  const close = () => {
    if (dirtyNew) setDiscard(true);
    else onClose();
  };

  const title = published ? "Edit course" : "Create course";
  const stepIndex = typeof view.step === "number" ? view.step : null;
  const footer = <div ref={setFooterEl} className="flex w-full" style={{ gap: 8 }} />;
  const toFooter = (node: React.ReactNode) => (footerEl ? createPortal(node, footerEl) : null);

  let body: React.ReactNode;
  if (courseId && !data) {
    body = loadError ? (
      <FieldError>{loadError}</FieldError>
    ) : (
      <div role="status" aria-label="Loading" className="flex flex-col" style={{ gap: 10 }}>
        <ProCardSkeleton lines={2} height={120} />
        <ProCardSkeleton lines={3} height={160} />
      </div>
    );
  } else if (view.step === "overview" && data && shown) {
    body = (
      <EditOverview
        data={data}
        shown={shown}
        busy={busy}
        onRow={(to) => void openEdit(to)}
        onWithdraw={() => setWithdrawAsk(true)}
        onSubmit={() => void submit()}
        toFooter={toFooter}
        enrolled={enrolled}
      />
    );
  } else if (view.step === 0) {
    body = (
      <BasicsStep
        draft={basics}
        onChange={setBasics}
        categories={categories}
        editable={editable}
        showErrors={showErrors}
        reviewReason={data?.course.status === "changes_requested" ? data.course.reviewReason : data?.revision?.status === "changes_requested" ? data.revision.reviewReason : null}
        footer={toFooter(
          <>
            <CtaButton variant="secondary" label={published ? "Back" : "Cancel"} onClick={() => (published ? setView({ step: "overview" }) : close())} disabled={busy} />
            <CtaButton label="Next" icon={<ArrowRight size={15} strokeWidth={2} aria-hidden />} loading={busy} onClick={() => void saveBasics("next")} />
          </>
        )}
      />
    );
  } else if (view.step === 1 && data) {
    body = (
      <StructureStep
        courseId={courseId!}
        revisionId={editingRev}
        modules={data.modules}
        lessons={data.lessons}
        quizCounts={data.quizCounts}
        editable={editable}
        busy={busy}
        run={run}
        onAddLesson={(moduleId) => setView({ step: 2, sub: "type", moduleId, kind: null })}
        onEditLesson={(l) => setView({ step: 2, sub: "edit", moduleId: l.moduleId, kind: l.kind, lessonId: l.id })}
        onAddWeek={(t) => run(() => addModule(courseId!, t, editingRev))}
        footer={toFooter(
          <>
            <CtaButton variant="secondary" label="Back" onClick={() => setView(published ? { step: "overview" } : { step: 0 })} disabled={busy} />
            <CtaButton label="Next" icon={<ArrowRight size={15} strokeWidth={2} aria-hidden />} onClick={() => setView(published ? { step: "overview" } : { step: 3 })} disabled={busy} />
          </>
        )}
      />
    );
  } else if (view.step === 2 && view.sub === "type" && data) {
    const week = data.modules.findIndex((m) => m.id === view.moduleId);
    body = (
      <LessonTypeStep
        weekLabel={week >= 0 ? `Week ${week + 1} · ${data.modules[week].title}` : ""}
        kind={view.kind}
        onPick={(k) => setView({ ...view, kind: k })}
        footer={toFooter(
          <>
            <CtaButton variant="secondary" label="Back" onClick={() => setView({ step: 1 })} />
            <CtaButton
              label="Next"
              icon={<ArrowRight size={15} strokeWidth={2} aria-hidden />}
              disabled={!view.kind}
              onClick={() => view.kind && setView({ step: 2, sub: "edit", moduleId: view.moduleId, kind: view.kind, lessonId: null })}
            />
          </>
        )}
      />
    );
  } else if (view.step === 2 && view.sub === "edit" && data) {
    const week = data.modules.findIndex((m) => m.id === view.moduleId);
    const lesson = view.lessonId ? data.lessons.find((l) => l.id === view.lessonId) ?? null : null;
    body = (
      <LessonEditor
        key={view.lessonId ?? `new-${view.kind}`}
        courseId={courseId!}
        moduleId={view.moduleId}
        weekIndex={Math.max(0, week)}
        kind={view.kind}
        lesson={lesson}
        editable={editable}
        inRevision={!!editingRev}
        onBack={() => setView(view.lessonId ? { step: 1 } : { step: 2, sub: "type", moduleId: view.moduleId, kind: view.kind })}
        onSaved={async (createdId, stay) => {
          onChanged();
          await load();
          if (stay && createdId) setView({ step: 2, sub: "edit", moduleId: view.moduleId, kind: view.kind, lessonId: createdId });
          else setView({ step: 1 });
        }}
        toFooter={toFooter}
      />
    );
  } else if (view.step === 3 && data && access) {
    body = (
      <AccessStep
        value={access}
        onChange={setAccess}
        commission={data.commission}
        editable={editable}
        footer={toFooter(
          <>
            <CtaButton variant="secondary" label="Back" onClick={() => setView(published ? { step: "overview" } : { step: 1 })} disabled={busy} />
            <CtaButton label="Next" icon={<ArrowRight size={15} strokeWidth={2} aria-hidden />} loading={busy} onClick={() => void saveAccess()} />
          </>
        )}
      />
    );
  } else if (view.step === 4 && data && shown) {
    body = (
      <ReviewStep
        course={data.course}
        shown={shown}
        modules={data.modules}
        lessons={data.lessons}
        dripMode={data.drip.mode}
        authorName={authorName ?? ""}
        categories={categories}
        onStep={(s) => setView(s === 0 ? { step: 0 } : s === 1 ? { step: 1 } : { step: 3 })}
        footer={toFooter(
          editable ? (
            <>
              <CtaButton variant="secondary" label="Save as draft" onClick={() => (onSavedDraft ? onSavedDraft() : onClose())} disabled={busy} />
              <CtaButton label="Publish" icon={<Send size={15} strokeWidth={2} aria-hidden />} loading={busy} disabled={data.lessons.length === 0} onClick={() => void submit()} />
            </>
          ) : null
        )}
      />
    );
  }

  return (
    <>
      <BottomSheet open onClose={close} title={title} footer={footer} size="tall">
        {stepIndex !== null && <StepBar steps={STEPS} at={stepIndex} onStep={published || !editable ? undefined : (i) => i !== 2 && setView(i === 0 ? { step: 0 } : i === 1 ? { step: 1 } : { step: 3 })} />}
        {body}
        {error && <FieldError mt={10}>{error}</FieldError>}
      </BottomSheet>

      {/* MO28 "discard confirmation" (popup: trash tile, 18 / 800 title, 13 body; Discard 48 r14 on status.high, Save as draft secondary, Keep editing outline). */}
      <CentredPopup
        open={discard}
        onClose={() => setDiscard(false)}
        title="Discard this course?"
        icon={<Trash2 size={22} strokeWidth={2} aria-hidden />}
        body="You haven't saved it as a draft. Everything you added will be lost."
      >
        <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
          <DangerCta
            label="Discard"
            onClick={() => {
              setDiscard(false);
              onClose();
            }}
          />
          <CtaButton
            size="page"
            variant="secondary"
            label="Save as draft"
            loading={busy}
            onClick={() => {
              setDiscard(false);
              void saveBasics("draft");
            }}
          />
          <CtaButton size="page" variant="outline" label="Keep editing" onClick={() => setDiscard(false)} />
        </div>
      </CentredPopup>

      <CentredPopup
        open={withdrawAsk}
        onClose={() => setWithdrawAsk(false)}
        title="Discard these changes?"
        icon={<Trash2 size={22} strokeWidth={2} aria-hidden />}
        body={WITHDRAW_EXPLAINER}
      >
        <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
          <DangerCta
            label="Discard"
            onClick={() => {
              setWithdrawAsk(false);
              if (editingRev) void run(() => withdrawRevision(editingRev));
            }}
          />
          <CtaButton size="page" variant="outline" label="Keep editing" onClick={() => setWithdrawAsk(false)} />
        </div>
      </CentredPopup>
    </>
  );
}

/**
 * MO28 "Edit a published course" (cEditPub18): the gold note (r14, gold
 * pale, pad 12 14, info 16 gold ink, 12.5 line 1.5), the three rows
 * (listCard6: pencil Basics, list-tree Structure, lock-open Access),
 * "Discard these changes" 12 / 700 status.high, footer "Submit changes".
 */
function EditOverview({
  data,
  shown,
  busy,
  onRow,
  onWithdraw,
  onSubmit,
  toFooter,
  enrolled,
}: {
  enrolled?: number;
  data: Loaded;
  shown: AuthoredCourse;
  busy: boolean;
  onRow: (to: View) => void;
  onWithdraw: () => void;
  onSubmit: () => void;
  toFooter: (n: React.ReactNode) => React.ReactNode;
}) {
  const rev = data.revision;
  const open = !!editingRevisionId(rev);
  const look = rev ? revisionStatusLook(rev.status) : null;
  const frozen = rev?.status === "submitted";
  const price = shown.priceCents ? `$${shown.priceCents / 100}` : "Free";
  return (
    <div>
      <div className="flex" style={{ borderRadius: 14, background: INK.goldPale, padding: "12px 14px", marginBottom: 12, gap: 10 }}>
        <Info size={16} strokeWidth={2} aria-hidden className="shrink-0" style={{ color: INK.goldInk, marginTop: 2 }} />
        <span style={{ fontSize: textPx(12.5), color: INK.ch, lineHeight: 1.5 }}>
          You're editing a copy. {enrolled === undefined ? "Enrolled clients keep" : enrolled === 1 ? "The 1 enrolled client keeps" : `The ${enrolled} enrolled clients keep`} the current version until your changes are checked and go live. Renaming or removing a lesson resets progress on that lesson.
        </span>
      </div>
      {open && look && (
        <Note mt={0}>
          <b style={{ color: INK.ch }}>{look.label}.</b> {look.detail}
        </Note>
      )}
      {rev?.status === "changes_requested" && rev.reviewReason && (
        <p style={{ marginTop: 8, fontSize: textPx(12), color: INK.goldInk, lineHeight: 1.45, overflowWrap: "anywhere" }}>{rev.reviewReason}</p>
      )}
      <div style={{ marginTop: open ? 10 : 0 }}>
        <ListCard
          rows={[
            { key: "b", icon: Pencil, title: "Basics", meta: "Title, subtitle, level", onClick: () => onRow({ step: 0 }) },
            {
              key: "s",
              icon: ListTree,
              title: "Structure",
              meta: `${sizeLine(data.modules.length, data.lessons.length).replace(" · ", ", ")}${rev && open && rev.contentChanged ? " · changed" : ""}`,
              onClick: () => onRow({ step: 1 }),
            },
            { key: "a", icon: LockOpen, title: "Access", meta: `Public · ${price}`, onClick: () => onRow({ step: 3 }) },
          ]}
        />
      </div>
      {open && !frozen && (
        <button type="button" onClick={onWithdraw} disabled={busy} className="tap relative before:absolute before:-inset-3 before:content-['']" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.hi }}>
          Discard these changes
        </button>
      )}
      {toFooter(<CtaButton label="Submit changes" icon={<Send size={15} strokeWidth={2} aria-hidden />} loading={busy} disabled={!open || frozen} onClick={onSubmit} />)}
    </div>
  );
}

