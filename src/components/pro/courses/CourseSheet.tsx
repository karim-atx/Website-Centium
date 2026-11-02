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
import { AUDIENCE_LIMITS } from "../../../services/courses/authorRules";
import { t, tn } from "../../../i18n/core";
import {
  coverUrl,
  fetchAudienceMembers,
  fetchCourseExtras,
  fetchRevisionDescription,
  setCourseAudience,
  setCourseDescription,
  submitCourseCover,
  withdrawCourseImage,
  removeCourseCover,
  type CourseExtras,
} from "../../../services/courses/extras";
import { useApp } from "../../../context/AppContext";
import { useOwnImage } from "../../moderation/ImageApproval";
import { fetchDrip, fetchModuleOpensAfter, fetchQuizCounts, fetchRevisionDrip, saveDrip, type DripMode } from "../../../services/pro/courses";
import { BottomSheet } from "../../ui/BottomSheet";
import { CentredPopup } from "../../ui/CentredPopup";
import { CtaButton } from "../../ui/PinnedCta";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { ListCard } from "../client/kit";
import { ProCardSkeleton } from "../states";
import { FieldError, Note, StepBar } from "./courseUi";
import { STEPS, audienceText, dripMatches, dripPlan, parsePrice, titleError, sizeLine } from "./courseModel";
import { DangerCta } from "./StructureStep";
import { BasicsStep, type BasicsDraft } from "./BasicsStep";
import { StructureStep } from "./StructureStep";
import { LessonEditor, LessonTypeStep } from "./LessonSteps";
import { AccessStep, type AccessDraft } from "./AccessStep";
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
  /** Round D: cover, description, focus and audience of the live course. */
  extras: CourseExtras;
  /** The open revision's description and focus (null = unchanged, "" = cleared). */
  revDesc: { description: string | null; focus: string | null };
  /** The selected clients, when the audience is "selected". */
  members: string[];
};

const NO_EXTRAS: CourseExtras = { coverPath: null, description: null, focus: null, audience: "public", unpublishedAt: null };

const emptyBasics = (categories: CourseCategory[]): BasicsDraft => ({
  title: "",
  subtitle: "",
  categoryKey: categories[0]?.key ?? "",
  level: "beginner",
  weeklyHours: "",
  learnPoints: "",
  coverColour: COVER_COLOURS[0],
  description: "",
  focus: "",
});

const basicsOf = (c: AuthoredCourse, text: { description: string; focus: string }): BasicsDraft => ({
  title: c.title,
  subtitle: c.subtitle ?? "",
  categoryKey: c.categoryKey,
  level: c.level,
  weeklyHours: c.weeklyHours === null ? "" : String(c.weeklyHours),
  learnPoints: c.learnPoints.join("\n"),
  coverColour: c.coverColour,
  description: text.description,
  focus: text.focus,
});

/** The description and focus being edited: the open revision's where it changes them, else the live course's. */
const shownText = (d: Loaded, editingRev: string | null) => ({
  description: (editingRev && d.revDesc.description !== null ? d.revDesc.description : d.extras.description) ?? "",
  focus: (editingRev && d.revDesc.focus !== null ? d.revDesc.focus : d.extras.focus) ?? "",
});

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

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
  const [access, setAccess] = useState<AccessDraft | null>(null);
  const { authUserId, professionalClients } = useApp();
  // Round D: a picked cover waits here until Save, then goes for approval.
  const [coverPick, setCoverPick] = useState<{ file: File; preview: string } | null>(null);
  const { image: ownCover, refresh: refreshCover } = useOwnImage("course_cover", courseId);
  useEffect(() => () => {
    if (coverPick) URL.revokeObjectURL(coverPick.preview);
  }, [coverPick]);

  const load = useCallback(async () => {
    if (!courseId) return;
    const c = await fetchMyCourse(courseId);
    if (!c.ok || !c.value) {
      setLoadError(c.ok ? t("That course no longer exists.") : c.message);
      return;
    }
    const rev = await fetchMyRevision(courseId);
    const revision = rev.ok ? rev.value : null;
    const editing = editingRevisionId(revision);
    const [tree, opens, drip, commission, extrasMap, revDesc] = await Promise.all([
      fetchBuilderTree(courseId, editing),
      fetchModuleOpensAfter(courseId, editing),
      editing ? fetchRevisionDrip(editing) : fetchDrip(courseId),
      fetchCommissionPercent(),
      fetchCourseExtras([courseId]),
      editing ? fetchRevisionDescription(editing) : Promise.resolve({ description: null, focus: null }),
    ]);
    if (!tree.ok) {
      setLoadError(tree.message);
      return;
    }
    const extras = extrasMap.get(courseId) ?? NO_EXTRAS;
    const [quizCounts, members] = await Promise.all([
      fetchQuizCounts(tree.value.lessons.filter((l) => l.kind === "quiz").map((l) => l.id)),
      extras.audience === "selected" ? fetchAudienceMembers(courseId) : Promise.resolve({ ok: true as const, value: [] as string[] }),
    ]);
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
      extras,
      revDesc,
      members: members.ok ? members.value : [],
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
    setBasics(basicsOf(shown, shownText(data, editingRev)));
    setAccess({
      free: shown.priceCents === 0,
      price: shown.priceCents ? String(shown.priceCents / 100) : "",
      mode: data.drip.mode,
      audience: data.extras.audience,
      members: data.members,
    });
    if (!started) {
      setStarted(true);
      if (data.course.status === "published") setView({ step: "overview" });
      else if (data.course.status === "submitted") setView({ step: 4 });
      else if (initialStep === 1) setView({ step: 1 });
    }
  }, [data, shown, started, initialStep, editingRev]);

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
      setError(r.message ?? t("Something went wrong. Try again."));
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

  /** Round D: what set_course_description should get: null leaves a field, "" clears it. */
  const textPatch = (b: BasicsDraft, base: { description: string; focus: string }) => {
    const d = b.description.trim();
    const f = b.focus.trim();
    return { description: d !== base.description.trim() ? d : null, focus: f !== base.focus.trim() ? f : null };
  };

  /** A picked cover goes for approval once the course exists. */
  const sendCover = async (id: string): Promise<{ ok: true } | { ok: false; message: string }> => {
    if (!coverPick || !authUserId) return { ok: true };
    const r = await submitCourseCover(authUserId, id, coverPick.file);
    if (r.ok) {
      setCoverPick(null);
      refreshCover();
    }
    return r;
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
      const problems: string[] = [];
      if (Object.keys(patch).length) {
        const r = await updateCourseDetails(created.value, patch, null);
        if (!r.ok) problems.push(r.message);
      }
      const text = textPatch(basics, { description: "", focus: "" });
      if (text.description || text.focus) {
        const r = await setCourseDescription(created.value, text.description, text.focus, null);
        if (!r.ok) problems.push(r.message);
      }
      const c = await sendCover(created.value);
      if (!c.ok) problems.push(c.message);
      setBusy(false);
      if (problems.length) setError(problems.map((p) => t(p)).join(" "));
      onChanged();
      if (then === "draft") onSavedDraft?.();
      else onCreated?.(created.value);
      return;
    }
    const patch = basicsPatch(basics, shown);
    const text = data ? textPatch(basics, shownText(data, editingRev)) : { description: null, focus: null };
    if (Object.keys(patch).length || text.description !== null || text.focus !== null || coverPick) {
      const ok = await run(async () => {
        if (Object.keys(patch).length) {
          const r = await updateCourseDetails(courseId!, patch, editingRev);
          if (!r.ok) return r;
        }
        if (text.description !== null || text.focus !== null) {
          const r = await setCourseDescription(courseId!, text.description, text.focus, editingRev);
          if (!r.ok) return r;
        }
        return sendCover(courseId!);
      });
      if (!ok) return;
    }
    setView(published ? { step: "overview" } : { step: 1 });
  };

  // ---- Access ---------------------------------------------------------------
  const saveAccess = async () => {
    if (!data || !shown || !access) return;
    // Round D: who can join takes effect at once and without review, so it is
    // saved even when the content is frozen. Only current clients can be chosen.
    const current = new Set(professionalClients.map((c) => c.clientId).filter(Boolean));
    const members = access.members.filter((id) => current.has(id));
    const audienceChanged = access.audience !== data.extras.audience || (access.audience === "selected" && !sameSet(members, data.members));
    if (access.audience === "selected" && (members.length < AUDIENCE_LIMITS.min || members.length > AUDIENCE_LIMITS.max)) {
      setError(t("Choose between {min} and {max} clients.", { min: AUDIENCE_LIMITS.min, max: AUDIENCE_LIMITS.max }));
      return;
    }
    const saveAudience = async () => (audienceChanged ? setCourseAudience(courseId!, access.audience, members) : { ok: true as const });
    if (!editable) {
      if (audienceChanged && !(await run(saveAudience))) return;
      setView(published ? { step: "overview" } : { step: 4 });
      return;
    }
    const cents = access.free ? 0 : parsePrice(access.price) ?? -1;
    if (!access.free && !(cents > 0 && cents <= 50_000)) {
      setError(t("Set a price between $1 and $500."));
      return;
    }
    const plan = dripPlan(data.modules.map((m) => m.id), access.mode);
    const priceChanged = cents !== shown.priceCents;
    const dripChanged = access.mode !== data.drip.mode || !dripMatches(plan, data.opensAfter);
    if (priceChanged || dripChanged || audienceChanged) {
      const ok = await run(async () => {
        const a = await saveAudience();
        if (!a.ok) return a;
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

  const title = published ? t("Edit course") : t("Create course");
  const stepIndex = typeof view.step === "number" ? view.step : null;
  const footer = <div ref={setFooterEl} className="flex w-full" style={{ gap: 8 }} />;
  const toFooter = (node: React.ReactNode) => (footerEl ? createPortal(node, footerEl) : null);

  let body: React.ReactNode;
  if (courseId && !data) {
    body = loadError ? (
      <FieldError>{t(loadError)}</FieldError>
    ) : (
      <div role="status" aria-label={t("Loading")} className="flex flex-col" style={{ gap: 10 }}>
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
        cover={{
          approvedUrl: coverUrl(data?.extras.coverPath),
          own: ownCover,
          pick: coverPick,
          onPick: (file) => setCoverPick(file ? { file, preview: URL.createObjectURL(file) } : null),
          onWithdraw: () => {
            if (courseId) void run(() => withdrawCourseImage("course_cover", courseId)).then(refreshCover);
          },
          onRemove: () => {
            if (courseId) void run(() => removeCourseCover(courseId));
          },
          live: published,
        }}
        footer={toFooter(
          <>
            <CtaButton variant="secondary" label={published ? t("Back") : t("Cancel")} onClick={() => (published ? setView({ step: "overview" }) : close())} disabled={busy} />
            <CtaButton label={t("Next")} icon={<ArrowRight size={15} strokeWidth={2} aria-hidden className="rtl:-scale-x-100" />} loading={busy} onClick={() => void saveBasics("next")} />
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
            <CtaButton variant="secondary" label={t("Back")} onClick={() => setView(published ? { step: "overview" } : { step: 0 })} disabled={busy} />
            <CtaButton label={t("Next")} icon={<ArrowRight size={15} strokeWidth={2} aria-hidden className="rtl:-scale-x-100" />} onClick={() => setView(published ? { step: "overview" } : { step: 3 })} disabled={busy} />
          </>
        )}
      />
    );
  } else if (view.step === 2 && view.sub === "type" && data) {
    const week = data.modules.findIndex((m) => m.id === view.moduleId);
    body = (
      <LessonTypeStep
        weekLabel={week >= 0 ? t("Week {n} · {title}", { n: week + 1, title: data.modules[week].title }) : ""}
        kind={view.kind}
        onPick={(k) => setView({ ...view, kind: k })}
        footer={toFooter(
          <>
            <CtaButton variant="secondary" label={t("Back")} onClick={() => setView({ step: 1 })} />
            <CtaButton
              label={t("Next")}
              icon={<ArrowRight size={15} strokeWidth={2} aria-hidden className="rtl:-scale-x-100" />}
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
        audienceEditable
        footer={toFooter(
          <>
            <CtaButton variant="secondary" label={t("Back")} onClick={() => setView(published ? { step: "overview" } : { step: 1 })} disabled={busy} />
            <CtaButton label={t("Next")} icon={<ArrowRight size={15} strokeWidth={2} aria-hidden className="rtl:-scale-x-100" />} loading={busy} onClick={() => void saveAccess()} />
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
              <CtaButton variant="secondary" label={t("Save as draft")} onClick={() => (onSavedDraft ? onSavedDraft() : onClose())} disabled={busy} />
              <CtaButton label={t("Publish")} icon={<Send size={15} strokeWidth={2} aria-hidden className="rtl:-scale-x-100" />} loading={busy} disabled={data.lessons.length === 0} onClick={() => void submit()} />
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
        {error && <FieldError mt={10}>{t(error)}</FieldError>}
      </BottomSheet>

      {/* MO28 "discard confirmation" (popup: trash tile, 18 / 800 title, 13 body; Discard 48 r14 on status.high, Save as draft secondary, Keep editing outline). */}
      <CentredPopup
        open={discard}
        onClose={() => setDiscard(false)}
        title={t("Discard this course?")}
        icon={<Trash2 size={22} strokeWidth={2} aria-hidden />}
        body={t("You haven't saved it as a draft. Everything you added will be lost.")}
      >
        <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
          <DangerCta
            label={t("Discard")}
            onClick={() => {
              setDiscard(false);
              onClose();
            }}
          />
          <CtaButton
            size="page"
            variant="secondary"
            label={t("Save as draft")}
            loading={busy}
            onClick={() => {
              setDiscard(false);
              void saveBasics("draft");
            }}
          />
          <CtaButton size="page" variant="outline" label={t("Keep editing")} onClick={() => setDiscard(false)} />
        </div>
      </CentredPopup>

      <CentredPopup
        open={withdrawAsk}
        onClose={() => setWithdrawAsk(false)}
        title={t("Discard these changes?")}
        icon={<Trash2 size={22} strokeWidth={2} aria-hidden />}
        body={t(WITHDRAW_EXPLAINER)}
      >
        <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
          <DangerCta
            label={t("Discard")}
            onClick={() => {
              setWithdrawAsk(false);
              if (editingRev) void run(() => withdrawRevision(editingRev));
            }}
          />
          <CtaButton size="page" variant="outline" label={t("Keep editing")} onClick={() => setWithdrawAsk(false)} />
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
  const price = shown.priceCents ? `$${shown.priceCents / 100}` : t("Free");
  return (
    <div>
      <div className="flex" style={{ borderRadius: 14, background: INK.goldPale, padding: "12px 14px", marginBottom: 12, gap: 10 }}>
        <Info size={16} strokeWidth={2} aria-hidden className="shrink-0" style={{ color: INK.goldInk, marginTop: 2 }} />
        <span style={{ fontSize: textPx(12.5), color: INK.ch, lineHeight: 1.5 }}>
          {enrolled === undefined
            ? t("You're editing a copy. Enrolled clients keep the current version until your changes are checked and go live. Renaming or removing a lesson resets progress on that lesson.")
            : tn(
                enrolled,
                "You're editing a copy. The {n} enrolled client keeps the current version until your changes are checked and go live. Renaming or removing a lesson resets progress on that lesson.",
                "You're editing a copy. The {n} enrolled clients keep the current version until your changes are checked and go live. Renaming or removing a lesson resets progress on that lesson."
              )}
        </span>
      </div>
      {open && look && (
        <Note mt={0}>
          <b style={{ color: INK.ch }}>{t(look.label)}.</b> {t(look.detail)}
        </Note>
      )}
      {rev?.status === "changes_requested" && rev.reviewReason && (
        <p style={{ marginTop: 8, fontSize: textPx(12), color: INK.goldInk, lineHeight: 1.45, overflowWrap: "anywhere" }}>{rev.reviewReason}</p>
      )}
      <div style={{ marginTop: open ? 10 : 0 }}>
        <ListCard
          rows={[
            { key: "b", icon: Pencil, title: t("Basics"), meta: t("Title, subtitle, level"), onClick: () => onRow({ step: 0 }) },
            {
              key: "s",
              icon: ListTree,
              title: t("Structure"),
              meta: `${sizeLine(data.modules.length, data.lessons.length, true)}${rev && open && rev.contentChanged ? ` · ${t("changed")}` : ""}`,
              onClick: () => onRow({ step: 1 }),
            },
            { key: "a", icon: LockOpen, title: t("Access"), meta: `${audienceText(data.extras.audience, data.extras.audience === "selected" ? data.members.length : undefined)} · ${price}`, onClick: () => onRow({ step: 3 }) },
          ]}
        />
      </div>
      {open && !frozen && (
        <button type="button" onClick={onWithdraw} disabled={busy} className="tap relative before:absolute before:-inset-3 before:content-['']" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.hi }}>
          {t("Discard these changes")}
        </button>
      )}
      {toFooter(<CtaButton label={t("Submit changes")} icon={<Send size={15} strokeWidth={2} aria-hidden className="rtl:-scale-x-100" />} loading={busy} disabled={!open || frozen} onClick={onSubmit} />)}
    </div>
  );
}

