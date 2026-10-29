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
import { Toggle } from "../../ui/Toggle";
import { INK } from "../proInk";
import { SectionHead } from "../client/kit";
import { ComingSoon, ComingSoonPill } from "../ComingSoon";
import { ProCardSkeleton, ProError } from "../states";
import { ErrorLine } from "../library/libraryUi";
import { QuestionCard, TYPE_ICON } from "./QuestionCard";
import { SendingSheet, ScheduleSheet } from "./SendSheets";
import { ChoiceChips, FieldLabel, RadioRows, TopToast, fieldStyle } from "./moKit";
import { moveItem, useReorder } from "./useReorder";
import {
  DESCRIPTION_MAX,
  PROFILE_FIELD_LABEL,
  TITLE_MAX,
  UI_TYPES,
  conditionLine,
  conditionParents,
  conditionProblem,
  conditionValues,
  OP_LABEL,
  opsFor,
  sheetCondition,
  sheetShowIf,
  type ShowIfOp,
  profileFieldsFor,
  questionProblem,
  questionsFor,
  sectionNumber,
  withoutQuestion,
  type FormKind,
  type ProfileField,
  type QuestionDraft,
  type UiType,
} from "./formModel";
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
 * Round D (20261222050000): the form's Description (shown to the client
 * above the questions, up to 1,000 characters); for intake forms "Send when
 * someone hires you" (forms.send_on_hire); Long text; sections ("Add
 * section" beside "Add question" opens a section at the next question, or
 * "Start a section here" on a card); "Only ask if…" (one condition on an
 * earlier choice, yes / no, multiple choice or scale question, which may
 * have a condition itself; the builder creates "is" and "includes", and a
 * template's "is not", "doesn't include" and "is one of" are shown and kept);
 * and "Carry into the profile" (the answer is offered to the client for
 * their profile after they send it, the field fitting the question's type).
 * Nothing is written until Save; Sending and Schedule work on the saved form.
 */
export const FormBuilder: React.FC = () => {
  const { formId: routeId, kind: routeKind } = useParams<{ formId?: string; kind?: string }>();
  const { authUserId } = useApp();
  const { lane } = useProSubtype();
  const online = useOnline();
  const navigate = useNavigate();
  const titleId = useId();
  const descId = useId();
  const isNew = !routeId;
  const [kind, setKind] = useState<FormKind>(routeKind === "check-in" ? "check_in" : "intake");
  const [formId, setFormId] = useState<string | null>(routeId ?? null);
  const [title, setTitle] = useState("");
  const [savedTitle, setSavedTitle] = useState("");
  const [description, setDescription] = useState("");
  const [savedDescription, setSavedDescription] = useState("");
  const [onHire, setOnHire] = useState(false);
  const [savedOnHire, setSavedOnHire] = useState(false);
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
  /** "Add section": the next question added opens a section. */
  const [addAsSection, setAddAsSection] = useState(false);
  const [confirm, setConfirm] = useState<"discard" | "remove" | null>(null);
  /** The question whose condition or profile field is being picked. */
  const [picking, setPicking] = useState<{ id: string; what: "condition" | "profile" } | null>(null);
  const [pickParent, setPickParent] = useState<string | null>(null);
  // The condition being chosen in the sheet: its kind and answers, for one parent.
  const [pickCond, setPickCond] = useState<{ parent: string; op: ShowIfOp; picked: string[] } | null>(null);

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
      setDescription(r.data.description);
      setSavedDescription(r.data.description);
      setOnHire(r.data.sendOnHire);
      setSavedOnHire(r.data.sendOnHire);
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

  const dirty =
    title.trim() !== savedTitle.trim() || description.trim() !== savedDescription.trim() || onHire !== savedOnHire || JSON.stringify(saved) !== JSON.stringify(draft);
  const problems = useMemo(() => draft.map((q, i) => questionProblem(q) ?? conditionProblem(draft, i)), [draft]);
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
    const r = await saveForm(authUserId, formId, { kind, title, description, sendOnHire: kind === "intake" && onHire }, saved, draft);
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
    const added = questionsFor(ui);
    if (addAsSection && added[0]) added[0] = { ...added[0], sectionTitle: "" };
    setDraft((d) => [...d, ...added]);
    setAddAsSection(false);
    setSheet(null);
  };

  const update = (id: string, patch: Partial<QuestionDraft>) => setDraft((d) => d.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const closePicker = () => {
    setPicking(null);
    setPickParent(null);
    setPickCond(null);
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
        <p style={{ fontSize: textPx(13), color: INK.chS }}>Only professionals can write and send forms.</p>
      </div>
    );

  const pickIndex = picking ? draft.findIndex((x) => x.id === picking.id) : -1;
  const pickQ = pickIndex >= 0 ? draft[pickIndex] : null;
  const parents = pickQ ? conditionParents(draft, pickIndex) : [];
  const parent = pickParent ? draft.find((x) => x.id === pickParent) ?? null : null;
  const cond = parent ? (pickCond?.parent === parent.id ? pickCond : { parent: parent.id, ...sheetCondition(pickQ?.showIf ?? null, parent) }) : null;
  const saveCondition = (op: ShowIfOp, picked: string[]) => {
    if (!pickQ || !parent) return;
    const c = sheetShowIf(parent.id, op, picked);
    if (!c) return;
    update(pickQ.id, { showIf: c });
    closePicker();
  };

  return (
    <div style={{ paddingBottom: 172 }}>
      <Head title={heading} onBack={back} onPreview={draft.length ? () => setSheet("preview") : null} />
      <label htmlFor={titleId} className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
        Title
      </label>
      <input id={titleId} value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} className="outline-none focus:border-primary" style={{ ...fieldStyle(), height: 40 }} />
      {tried && titleProblem && <ErrorLine>{titleProblem}</ErrorLine>}
      <label htmlFor={descId} className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, margin: "12px 0 6px" }}>
        Description <span style={{ fontWeight: 500, color: INK.chF }}>(optional)</span>
      </label>
      <textarea
        id={descId}
        value={description}
        maxLength={DESCRIPTION_MAX}
        rows={2}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What it's for, shown to the client above the questions"
        className="block w-full outline-none resize-none focus:border-primary placeholder:text-charcoal-tertiary [field-sizing:content]"
        style={{ ...fieldStyle(), minHeight: 64, padding: "10px 12px", lineHeight: 1.45 }}
      />
      {kind === "intake" && (
        <div className="flex items-center justify-between" style={{ gap: 12, marginTop: 12, minHeight: 44 }}>
          <span className="min-w-0">
            <span className="block" style={{ fontSize: textPx(13.5), fontWeight: 700, color: INK.ch }}>
              Send when someone hires you
            </span>
            <span className="block" style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 2 }}>
              Due 3 days after they hire you
            </span>
          </span>
          <Toggle checked={onHire} onChange={setOnHire} label="Send when someone hires you" />
        </div>
      )}
      <div style={{ height: 14 }} />
      <SectionHead label={`Questions · ${draft.length}`} />
      {draft.map((q, i) => {
        const canPickCondition = !q.safetyTopic && (!!q.showIf || conditionParents(draft, i).length > 0);
        const canPickProfile = !q.safetyTopic && profileFieldsFor(q).length > 0;
        return (
          <QuestionCard
            key={q.id}
            q={q}
            index={i}
            count={draft.length}
            register={register(i)}
            grip={gripProps(i)}
            problem={tried ? problems[i] : null}
            section={q.sectionTitle != null ? sectionNumber(draft, i) : undefined}
            conditionLine={conditionLine(draft, q)}
            onCondition={canPickCondition ? () => setPicking({ id: q.id, what: "condition" }) : undefined}
            onProfile={canPickProfile ? () => setPicking({ id: q.id, what: "profile" }) : undefined}
            onChange={(next) => setDraft((d) => d.map((x) => (x.id === q.id ? next : x)))}
            onRemove={() => setDraft((d) => withoutQuestion(d, q.id))}
          />
        );
      })}
      {tried && draft.length === 0 && <ErrorLine>Add at least one question.</ErrorLine>}
      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8, marginTop: 4 }}>
        {(["question", "section"] as const).map((what) => (
          <button
            key={what}
            type="button"
            onClick={() => {
              setAddAsSection(what === "section");
              setSheet("add");
            }}
            className="tap w-full flex items-center justify-center"
            style={{ gap: 6, height: 44, borderRadius: 14, border: "1.5px dashed rgb(var(--c-charcoal) / 0.11)", fontSize: textPx(13), fontWeight: 700, color: INK.prDeep }}
          >
            <Plus size={14} strokeWidth={2.4} aria-hidden />
            {what === "question" ? "Add question" : "Add section"}
          </button>
        ))}
      </div>
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

      <BottomSheet
        open={sheet === "add"}
        onClose={() => {
          setSheet(null);
          setAddAsSection(false);
        }}
        title={addAsSection ? "Add a section" : "Add a question"}
      >
        {addAsSection && <p style={{ fontSize: textPx(12), color: INK.chF, lineHeight: 1.5, marginBottom: 10 }}>A section starts with a question. Choose its first one, then give the section a title.</p>}
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
      </BottomSheet>

      <BottomSheet open={picking?.what === "condition" && !!pickQ} onClose={closePicker} title="Only ask if…">
        {pickQ && !parent && (
          <>
            <p style={{ fontSize: textPx(12), color: INK.chF, lineHeight: 1.5, marginBottom: 10 }}>The client sees this question only when an earlier answer matches. Otherwise it's skipped.</p>
            {parents.length ? (
              <RadioRows
                label="Earlier question"
                value={pickQ.showIf?.questionId ?? null}
                onChange={(v) => setPickParent(v)}
                rows={parents.map((p) => ({ value: p.id, title: p.prompt.trim(), line: p.type === "multi" ? "Multiple choice" : p.type === "scale" ? "Scale" : "Single choice" }))}
              />
            ) : (
              <p style={{ fontSize: textPx(12.5), color: INK.chS }}>Add a choice, yes or no, or scale question above this one first.</p>
            )}
            {pickQ.showIf && (
              <CtaButton
                className="w-full mt-3"
                size="sheet"
                variant="secondary"
                label="Always ask"
                onClick={() => {
                  update(pickQ.id, { showIf: null });
                  closePicker();
                }}
              />
            )}
          </>
        )}
        {pickQ && parent && (
          <>
            <p style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch, marginBottom: 2, overflowWrap: "anywhere" }}>{parent.prompt.trim()}</p>
            {cond && (
              <>
                <FieldLabel top={8}>Condition</FieldLabel>
                <ChoiceChips
                  label="Condition"
                  value={cond.op}
                  onChange={(op) => setPickCond({ parent: parent.id, op, picked: op === "in" ? cond.picked : cond.picked.slice(0, 1) })}
                  items={opsFor(parent).map((op) => ({ value: op, label: OP_LABEL[op] }))}
                />
                <FieldLabel top={10}>{cond.op === "in" ? "Any of these answers" : "This answer"}</FieldLabel>
                {cond.op === "in" ? (
                  <>
                    <div role="group" aria-label="Any of these answers" className="flex flex-wrap" style={{ gap: 6 }}>
                      {conditionValues(parent).map((v) => {
                        const on = cond.picked.includes(v);
                        return (
                          <button
                            key={v}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setPickCond({ parent: parent.id, op: "in", picked: on ? cond.picked.filter((x) => x !== v) : [...cond.picked, v] })}
                            className="tap inline-flex items-center relative before:absolute before:inset-x-0 before:-inset-y-[6px] before:content-['']"
                            style={{ height: 32, padding: "0 12px", borderRadius: 10, fontSize: textPx(12.5), fontWeight: 700, background: on ? INK.fill : INK.soft, color: on ? INK.onFill : INK.chS }}
                          >
                            {v}
                          </button>
                        );
                      })}
                    </div>
                    <CtaButton className="w-full mt-3" size="sheet" label="Save condition" disabled={cond.picked.length === 0} onClick={() => saveCondition("in", cond.picked)} />
                  </>
                ) : (
                  <ChoiceChips
                    label="This answer"
                    value={cond.picked[0] ?? ""}
                    onChange={(v) => saveCondition(cond.op, [v])}
                    items={conditionValues(parent).map((v) => ({ value: v, label: v }))}
                  />
                )}
              </>
            )}
            <button type="button" onClick={() => setPickParent(null)} className="tap flex items-center" style={{ minHeight: 44, marginTop: 8, fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep }}>
              Choose another question
            </button>
          </>
        )}
      </BottomSheet>

      <BottomSheet open={picking?.what === "profile" && !!pickQ} onClose={closePicker} title="Carry into the profile">
        {pickQ && (
          <>
            <p style={{ fontSize: textPx(12), color: INK.chF, lineHeight: 1.5, marginBottom: 10 }}>
              After sending, the client is asked whether to add this answer to their profile. Nothing is added unless they confirm it. Weight is never offered while they use recovery-sensitive mode.
            </p>
            <RadioRows<ProfileField | "none">
              label="Carry into the profile"
              value={pickQ.profileField ?? "none"}
              onChange={(v) => {
                update(pickQ.id, { profileField: v === "none" ? null : v });
                closePicker();
              }}
              rows={[{ value: "none" as const, title: "Don't carry it" }, ...profileFieldsFor(pickQ).map((f) => ({ value: f, title: PROFILE_FIELD_LABEL[f] }))]}
            />
          </>
        )}
      </BottomSheet>

      {kind === "intake" ? (
        <SendingSheet
          open={sheet === "send"}
          onClose={() => setSheet(null)}
          formId={formId}
          ready={ready}
          questions={draft}
          sendOnHire={savedOnHire}
          onSendOnHire={(v) => {
            setOnHire(v);
            setSavedOnHire(v);
          }}
          onSent={(t) => { setSheet(null); setToast(t); }}
        />
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
        {description.trim() && <p style={{ fontSize: textPx(13), color: INK.chS, lineHeight: 1.5, marginBottom: 12, whiteSpace: "pre-line" }}>{description.trim()}</p>}
        {draft.map((q, i) => (
          <QuestionCard
            key={q.id}
            q={q}
            index={i}
            count={draft.length}
            readOnly
            section={q.sectionTitle != null ? sectionNumber(draft, i) : undefined}
            conditionLine={conditionLine(draft, q)}
            register={() => undefined}
            grip={gripProps(i)}
            problem={null}
            onChange={() => undefined}
            onRemove={() => undefined}
          />
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
