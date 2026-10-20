import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarClock, Check, ChevronLeft, CircleCheck, Plus, Send, Trash2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useProSubtype } from "../../../hooks/useProSubtype";
import { useOnline } from "../../../hooks/useOnline";
import { textPx } from "../../../theme/textSize";
import { BottomSheet } from "../../ui/BottomSheet";
import { CentredPopup } from "../../ui/CentredPopup";
import { CtaButton, PinnedCta } from "../../ui/PinnedCta";
import { INK } from "../proInk";
import { SectionHead } from "../client/kit";
import { ComingSoon, ComingSoonPill } from "../ComingSoon";
import { ProCardSkeleton, ProError } from "../states";
import { ErrorLine } from "../library/libraryUi";
import { QuestionCard, TYPE_ICON } from "./QuestionCard";
import { SendingSheet, ScheduleSheet } from "./SendSheets";
import { TopToast, fieldStyle } from "./moKit";
import { moveItem, useReorder } from "./useReorder";
import { TITLE_MAX, UI_TYPES, questionProblem, questionsFor, type FormKind, type QuestionDraft, type UiType } from "./formModel";
import { archiveForm, canWriteForm, fetchForm, saveForm, type FormAssignment } from "../../../services/pro/forms";
import { FORMS_PATH } from "./FormsHome";

const OFFLINE = "You're offline. Try again when you're connected.";

/**
 * Release 3 · MO29 Form builder and Check-in builder (gen/r18.js builder18,
 * qTypes18, sendSheet18): the head row (back 18 text.soft, title 17 / 800,
 * "Preview" 13 / 700 primary.deep; 12 under it), the Title field, the
 * questions (QuestionCard) under "Questions · {n}", the dashed "Add question"
 * (44 high, r14, 1.5 dashed 11%, 13 / 700 primary.deep with the plus), and
 * the pinned pair: "Sending" (intake) or "Schedule" (check-in) beside "Save".
 *
 * Not in the database, so not drawn as working (reported): the form's
 * Description and its Sections (no columns; "Add section" is left out),
 * Long text (one text type), sending on hire, carrying answers into the
 * profile, and every 2 / 4 weeks. Nothing is written until Save; Sending and
 * Schedule work on the saved form.
 */
export const FormBuilder: React.FC = () => {
  const { formId: routeId, kind: routeKind } = useParams<{ formId?: string; kind?: string }>();
  const { authUserId } = useApp();
  const { lane } = useProSubtype();
  const online = useOnline();
  const navigate = useNavigate();
  const titleId = useId();
  const isNew = !routeId;
  const [kind, setKind] = useState<FormKind>(routeKind === "check-in" ? "check_in" : "intake");
  const [formId, setFormId] = useState<string | null>(routeId ?? null);
  const [title, setTitle] = useState("");
  const [savedTitle, setSavedTitle] = useState("");
  const [saved, setSaved] = useState<QuestionDraft[]>([]);
  const [draft, setDraft] = useState<QuestionDraft[]>([]);
  const [series, setSeries] = useState<FormAssignment[]>([]);
  const [state, setState] = useState<"loading" | "ok" | "missing" | "error" | "offline">(isNew ? "ok" : "loading");
  const [nonce, setNonce] = useState(0);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"add" | "send" | "preview" | null>(null);
  const [confirm, setConfirm] = useState<"discard" | "remove" | null>(null);

  useEffect(() => {
    if (!routeId) return;
    let live = true;
    void fetchForm(routeId).then((r) => {
      if (!live) return;
      if (!r.ok) return setState(r.offline ? "offline" : "error");
      if (!r.data) return setState("missing");
      setKind(r.data.kind);
      setFormId(r.data.id);
      setTitle(r.data.title);
      setSavedTitle(r.data.title);
      setSaved(r.data.questions);
      setDraft(r.data.questions);
      setSeries(r.data.assignments.filter((a) => a.status === "series"));
      setState("ok");
    });
    return () => {
      live = false;
    };
  }, [routeId, nonce]);

  useEffect(() => {
    let live = true;
    void canWriteForm(kind).then((v) => live && setAllowed(v));
    return () => {
      live = false;
    };
  }, [kind]);

  const dirty = title.trim() !== savedTitle.trim() || JSON.stringify(saved) !== JSON.stringify(draft);
  const problems = useMemo(() => draft.map(questionProblem), [draft]);
  const titleProblem = !title.trim() ? "Give the form a title." : title.trim().length > TITLE_MAX ? `Keep the title under ${TITLE_MAX} characters.` : null;
  const blocked = !!titleProblem || problems.some(Boolean) || draft.length === 0;
  const ready = !!formId && !dirty;

  const move = useCallback((from: number, to: number) => setDraft((d) => moveItem(d, from, to)), []);
  const { register, gripProps } = useReorder(draft.length, move);

  const back = () => (dirty ? setConfirm("discard") : navigate(kind === "check_in" ? `${FORMS_PATH}?tab=check-ins` : FORMS_PATH));

  const save = async () => {
    setTried(true);
    if (blocked || busy || !authUserId) return;
    if (!online) return setErr(OFFLINE);
    setBusy(true);
    setErr(null);
    const r = await saveForm(authUserId, formId, kind, title, saved, draft);
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    setToast("Saved.");
    setTried(false);
    if (!formId) navigate(`${FORMS_PATH}/${r.id}`, { replace: true });
    else setNonce((n) => n + 1);
  };

  const remove = async () => {
    if (!formId || busy) return;
    if (!online) return setErr(OFFLINE);
    setBusy(true);
    const r = await archiveForm(formId);
    setBusy(false);
    setConfirm(null);
    if (!r.ok) return setErr(r.message);
    navigate(kind === "check_in" ? `${FORMS_PATH}?tab=check-ins` : FORMS_PATH, { replace: true });
  };

  const add = (ui: UiType) => {
    setDraft((d) => [...d, ...questionsFor(ui)]);
    setSheet(null);
  };

  if (state === "loading")
    return (
      <div className="flex flex-col" style={{ gap: 12 }}>
        <ProCardSkeleton lines={2} height={80} />
        <ProCardSkeleton lines={3} height={160} />
        <ProCardSkeleton lines={3} height={160} />
      </div>
    );
  if (state === "error" || state === "offline") return <ProError onRetry={() => { setState("loading"); setNonce((n) => n + 1); }} />;
  if (state === "missing")
    return (
      <div>
        <Head title="Form" onBack={() => navigate(FORMS_PATH)} onPreview={null} />
        <ComingSoon line="This form isn't available any more." />
      </div>
    );

  const heading = title.trim() || (kind === "check_in" ? "New check-in" : "New form");
  if (allowed === false)
    return (
      <div>
        <Head title={heading} onBack={() => navigate(FORMS_PATH)} onPreview={null} />
        <p style={{ fontSize: textPx(13), color: INK.chS }}>Check-ins are for Full coaching and Nutrition professionals.</p>
      </div>
    );

  return (
    <div style={{ paddingBottom: 172 }}>
      <Head title={heading} onBack={back} onPreview={draft.length ? () => setSheet("preview") : null} />
      <label htmlFor={titleId} className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
        Title
      </label>
      <input id={titleId} value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} className="outline-none focus:border-primary" style={{ ...fieldStyle(), height: 40 }} />
      {tried && titleProblem && <ErrorLine>{titleProblem}</ErrorLine>}
      <div style={{ height: 14 }} />
      <SectionHead label={`Questions · ${draft.length}`} />
      {draft.map((q, i) => (
        <QuestionCard
          key={q.id}
          q={q}
          index={i}
          count={draft.length}
          register={register(i)}
          grip={gripProps(i)}
          problem={tried ? problems[i] : null}
          onChange={(next) => setDraft((d) => d.map((x) => (x.id === q.id ? next : x)))}
          onRemove={() => setDraft((d) => d.filter((x) => x.id !== q.id))}
        />
      ))}
      {tried && draft.length === 0 && <ErrorLine>Add at least one question.</ErrorLine>}
      <button
        type="button"
        onClick={() => setSheet("add")}
        className="tap w-full flex items-center justify-center"
        style={{ gap: 6, height: 44, borderRadius: 14, border: "1.5px dashed rgb(var(--c-charcoal) / 0.11)", fontSize: textPx(13), fontWeight: 700, color: INK.prDeep, marginTop: 4 }}
      >
        <Plus size={14} strokeWidth={2.4} aria-hidden />
        Add question
      </button>
      {err && <div style={{ marginTop: 12 }}><ErrorLine>{err}</ErrorLine></div>}
      {formId && (
        <button type="button" onClick={() => setConfirm("remove")} className="tap flex items-center mx-auto" style={{ gap: 6, marginTop: 20, minHeight: 44, fontSize: textPx(12.5), fontWeight: 700, color: INK.hi }}>
          <Trash2 size={14} strokeWidth={2} aria-hidden />
          Remove form
        </button>
      )}

      <PinnedCta
        primary={{ label: "Save", icon: <Check size={15} />, loading: busy, onClick: () => void save(), disabled: !dirty && !!formId }}
        secondary={{ label: kind === "check_in" ? "Schedule" : "Sending", icon: kind === "check_in" ? <CalendarClock size={15} /> : <Send size={15} />, onClick: () => setSheet("send") }}
      />

      <BottomSheet open={sheet === "add"} onClose={() => setSheet(null)} title="Add a question">
        <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8 }}>
          {UI_TYPES.map((t) => {
            const Icon = TYPE_ICON[t.key];
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => t.available && add(t.key)}
                aria-disabled={!t.available || undefined}
                className="tap flex items-center text-left"
                style={{ gap: 10, padding: 10, borderRadius: 14, border: `1px solid ${INK.b10}`, background: INK.card, minHeight: 50, opacity: t.available ? 1 : 0.55 }}
              >
                <span className="flex items-center justify-center shrink-0" style={{ width: 30, height: 30, borderRadius: 9, background: INK.prPale }}>
                  <Icon size={15} strokeWidth={2} aria-hidden style={{ color: INK.prDeep }} />
                </span>
                <span className="flex-1 min-w-0" style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch }}>
                  {t.label}
                  {!t.available && (
                    <span className="block" style={{ marginTop: 2 }}>
                      <ComingSoonPill />
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.5, marginTop: 10 }}>Carrying allergy, injury and medication answers into the client's profile is coming soon.</p>
      </BottomSheet>

      {kind === "intake" ? (
        <SendingSheet open={sheet === "send"} onClose={() => setSheet(null)} formId={formId} ready={ready} onSent={(t) => { setSheet(null); setToast(t); }} />
      ) : (
        <ScheduleSheet
          open={sheet === "send"}
          onClose={() => setSheet(null)}
          formId={formId}
          ready={ready}
          lane={lane ?? "full_coaching"}
          series={series}
          onDone={(t) => {
            setSheet(null);
            setToast(t);
            setNonce((n) => n + 1);
          }}
        />
      )}

      <BottomSheet open={sheet === "preview"} onClose={() => setSheet(null)} title={heading}>
        {draft.map((q, i) => (
          <QuestionCard key={q.id} q={q} index={i} count={draft.length} readOnly register={() => undefined} grip={gripProps(i)} problem={null} onChange={() => undefined} onRemove={() => undefined} />
        ))}
      </BottomSheet>

      <CentredPopup
        open={confirm === "discard"}
        onClose={() => setConfirm(null)}
        title="Discard your changes?"
        body="What you changed since the last save is lost."
      >
        <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
          <CtaButton size="page" label="Discard" onClick={() => navigate(kind === "check_in" ? `${FORMS_PATH}?tab=check-ins` : FORMS_PATH)} />
          <CtaButton size="page" variant="secondary" label="Keep editing" onClick={() => setConfirm(null)} />
        </div>
      </CentredPopup>
      <CentredPopup
        open={confirm === "remove"}
        onClose={() => setConfirm(null)}
        title={`Remove ${heading}?`}
        body="It leaves your forms. Answers clients already sent stay on their pages."
      >
        <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
          <CtaButton size="page" label="Remove form" loading={busy} onClick={() => void remove()} />
          <CtaButton size="page" variant="secondary" label="Keep it" onClick={() => setConfirm(null)} />
        </div>
      </CentredPopup>
      <TopToast icon={CircleCheck} text={toast} onDone={() => setToast(null)} />
    </div>
  );
};

/** builder18 head: back 18 text.soft and the title 17 / 800 (gap 6), "Preview" 13 / 700 primary.deep; 12 under it. */
const Head: React.FC<{ title: string; onBack: () => void; onPreview: (() => void) | null }> = ({ title, onBack, onPreview }) => (
  <div className="flex items-center justify-between" style={{ gap: 8, marginBottom: 12 }}>
    <div className="flex items-center min-w-0" style={{ gap: 6 }}>
      <button type="button" onClick={onBack} aria-label="Back" className="tap flex items-center justify-center shrink-0 relative before:absolute before:-inset-3 before:content-['']" style={{ width: 24, height: 24, marginLeft: -4 }}>
        <ChevronLeft size={18} strokeWidth={2} aria-hidden style={{ color: INK.chS }} />
      </button>
      <h1 className="truncate" style={{ fontSize: textPx(17), fontWeight: 800, color: INK.ch }}>
        {title}
      </h1>
    </div>
    {onPreview && (
      <button type="button" onClick={onPreview} className="tap shrink-0 relative before:absolute before:-inset-3 before:content-['']" style={{ fontSize: textPx(13), fontWeight: 700, color: INK.prDeep }}>
        Preview
      </button>
    )}
  </div>
);
