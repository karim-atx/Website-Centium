import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Check, CircleAlert, HandHeart, HeartHandshake, Phone, X } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { CtaButton } from "../ui/PinnedCta";
import { WarningSignsCard } from "../health-checks/WarningSignsCard";
import { Avatar } from "../pro/client/kit";
import { INK } from "../pro/proInk";
import { textPx } from "../../theme/textSize";
import { GetSupportPopup } from "../moderation/GetSupportPopup";
import { RECOVERY_LINK, RECOVERY_SETTING_PATH, supportPlace } from "../../services/moderation/support";
import { browserTimezone } from "../../services/timezone";
import {
  firstPartMissing,
  formParts,
  keepOfferedOptions,
  LONG_TEXT_MAX,
  longDate,
  missingMessage,
  missingRequired,
  nextOccurrence,
  optionChoices,
  parseNumber,
  partQuestions,
  promptsFor,
  resumePart,
  scaleColumns,
  scaleValues,
  SHORT_TEXT_MAX,
  showDoctorFollowUp,
  shownQuestions,
  toggleMulti,
  visibleAnswers,
  visibleQuestions,
  type Answers,
  type ClientPrompt,
  type ClientQuestion,
  type FormItem,
} from "../../services/client-forms/logic";
import { CONSENT_REQUIRED_MESSAGE, formPhotoUrls, removeFormPhoto, saveFormResponse, uploadFormPhoto, type ClientFormBundle } from "../../services/client-forms";
import { consentBox, consentLine, DOCTOR_FOLLOW_UP, GET_SUPPORT, SEE_WARNING_SIGNS, SUPPORT_PROMPT, thanksLine, urgentNumbers } from "./copy";
import { clearLocalDraft, readLocalDraft, writeLocalDraft } from "../../services/client-forms/localDraft";
import { ProfileProposals } from "./ProfileProposals";
import { appLocale } from "../../i18n/format";

/**
 * Release 3 · W7 CU6 v3 / CU26: a professional's check-in or intake, filled
 * in by the client. Built on the Mood check-in's pattern
 * (components/health-checks/CheckInSheet.tsx, unchanged): a bottom sheet over
 * Home, numbered questions 13 / 600, two-column answer buttons 44 high with a
 * 12 radius and the primary fill when picked, one primary button at the foot,
 * and the finished state in the same sheet with text and Done. Titled
 * "Weekly check-in" so it's never confused with the Mood check-in, whose
 * answers stay on the device; an intake takes its form's title.
 *
 * Answers save as typed (save_form_response, p_submit false), so closing is
 * "Save, come back later" and Home shows "Continue your check-in". Send
 * submits (p_submit true). A flagged response (safety_flag, set by the
 * database) shows the Mood check-in's "talk to a doctor" follow-up and its
 * warning signs. Recovery-sensitive mode is applied by the database
 * (my_form_questions, 20261222080000): the questions and options it hides
 * never arrive, reworded options show their other words while the option
 * itself is stored, and save_form_response requires and stores neither. The
 * J12 filter here (isHiddenInRecovery: body measures and progress photos)
 * stays for the read before that migration and while the setting is still
 * unknown, and the consent line names neither.
 *
 * Release A (20261216060000): sending needs the client's consent
 * (save_form_response p_consent, refused with consent_required without it).
 * Not drawn: a required box above Send, "Share these answers with {pro}",
 * in the AllergiesSheet checkbox style. Send without it ticked says so and
 * sends nothing; draft saves never ask and never send consent.
 *
 * Round D (20261222050000): the form's description above the first part;
 * sections as the parts ("section 2 of 3" and the section's title, 15 / 700);
 * long text (a taller field, up to 5,000 characters); and conditions: a
 * question whose condition isn't met by the answers so far is hidden, not
 * required and not sent (shownQuestions mirrors form_condition_met), its
 * answer kept on this device in case it shows again. After sending, a form
 * with "Carry into the profile" questions lists the answers the Database
 * proposed for the profile (ProfileProposals), each confirmed on its own.
 *
 * The approved templates (20261222080000): option_labels shown while options
 * are stored, the words at both ends of a scale, placeholders, and "None" /
 * "Nothing" clearing a multiple choice's other options (toggleMulti). An
 * answer that meets a question's client_prompt shows it under that question
 * at once, before sending (promptsFor over the questions shown): urgent, the
 * server's message in the status-high colours with a Call 112 link; support,
 * a private Get support link (GetSupportPopup); recovery and support, Get
 * support and a link to the recovery-sensitive setting in Profile (saved as a
 * draft first; offered only while the mode is off). A form with a safety line
 * ends with it on the last part, above the consent line.
 */

const SAVE_DELAY_MS = 800;
const MAX_PHOTOS = 3;
const PHOTO_TYPES = "image/jpeg,image/png,image/webp,image/heic";

type SaveState = "idle" | "saving" | "saved" | "error";

interface Done {
  flagged: boolean;
  next: Date | null;
  /** The sent response, when some answer may be offered for the profile. */
  proposalsFor: string | null;
}

interface FormSheetProps {
  open: boolean;
  bundle: ClientFormBundle | null;
  me: string;
  /** Recovery-sensitive (or not yet known): weight, measurement and photo questions are skipped. */
  hideBody: boolean;
  timezone: string | null;
  onClose: (changed: boolean) => void;
}

/** Fresh state for every form that opens: the sheet body is keyed by the assignment. */
export const FormSheet: React.FC<FormSheetProps> = (props) =>
  props.bundle && props.open ? <FormSheetOpen key={props.bundle.assignmentId} {...props} bundle={props.bundle} /> : null;

const FormSheetOpen: React.FC<FormSheetProps & { bundle: ClientFormBundle }> = ({ open, bundle, me, hideBody, timezone, onClose }) => {
  const visible = useMemo(() => visibleQuestions(bundle.questions, hideBody), [bundle, hideBody]);

  // Round D O7: answers kept on this device (typed while offline, or the
  // sheet closed before the server had them) win over the server draft.
  const [localDraft] = useState(() => readLocalDraft(me, bundle.assignmentId));
  const [initial] = useState(() => visibleAnswers(keepOfferedOptions(localDraft ? { ...bundle.answers, ...localDraft } : bundle.answers, visible), visible));
  const [answers, setAnswers] = useState<Answers>(initial);
  // Round D: the parts follow the answers, as a condition shows or hides a question.
  const { parts, titles, sectioned } = useMemo(() => formParts(visible, answers), [visible, answers]);
  const [stepState, setStep] = useState(() => (bundle.hasDraft || localDraft ? resumePart(formParts(visible, initial).parts, initial) : 0));
  const step = Math.min(stepState, parts.length - 1);
  const [saveState, setSaveState] = useState<SaveState>(bundle.hasDraft ? "saved" : "idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // Release A: unticked on every open; the client agrees for this send.
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [showSigns, setShowSigns] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [photoError, setPhotoError] = useState<{ id: string; message: string } | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const navigate = useNavigate();
  // 20261222080000: the prompts these answers trigger, by question, among those shown.
  const prompts = useMemo(() => new Map(promptsFor(shownQuestions(visible, answers), answers).map((p) => [p.question.id, p.prompt])), [visible, answers]);

  const dirty = useRef(!!localDraft);
  const changed = useRef(false);
  const timer = useRef<number | null>(null);
  const answersRef = useRef<Answers>(initial);
  const topRef = useRef<HTMLDivElement>(null);

  // Thumbnails for photo answers already saved.
  useEffect(() => {
    const paths = Object.values(initial).flatMap((v) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.includes("/")) : []));
    if (!paths.length) return;
    let live = true;
    void formPhotoUrls(paths).then((urls) => live && setPhotoUrls((prev) => ({ ...prev, ...urls })));
    return () => {
      live = false;
    };
  }, [initial]);

  const saveDraft = useCallback(async () => {
    if (!dirty.current) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    dirty.current = false;
    setSaveState("saving");
    const res = await saveFormResponse(bundle.assignmentId, visibleAnswers(answersRef.current, shownQuestions(visible, answersRef.current)), false);
    if (res.ok) {
      changed.current = true;
      setSaveState("saved");
      if (!dirty.current) clearLocalDraft(me, bundle.assignmentId);
    } else {
      dirty.current = true;
      setSaveState("error");
      if (res.code === "sent" || res.code === "closed") setSendError(res.message);
    }
  }, [bundle, visible, me]);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  // Round D O7: answers kept on this device go to the server as soon as it
  // can be reached: on open, and when the connection comes back.
  useEffect(() => {
    const flush = () => {
      if (dirty.current && navigator.onLine) void saveDraft();
    };
    flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [saveDraft]);

  const setAnswer = (id: string, value: unknown) => {
    const next = { ...answersRef.current };
    if (value === undefined || value === null || (typeof value === "string" && value === "")) delete next[id];
    else next[id] = value;
    answersRef.current = next;
    setAnswers(next);
    writeLocalDraft(me, bundle.assignmentId, next);
    setErrors((e) => e.filter((x) => x !== id));
    dirty.current = true;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void saveDraft(), SAVE_DELAY_MS);
  };

  const close = () => {
    if (dirty.current && !done) void saveDraft().finally(() => onClose(changed.current));
    else onClose(changed.current || !!done);
  };

  // The recovery-sensitive setting lives in Profile: the answers are saved as a
  // draft, the sheet closes, and the person turns it on there themselves.
  const toRecoverySetting = () => {
    close();
    navigate(RECOVERY_SETTING_PATH);
  };

  const toTop = () => window.setTimeout(() => topRef.current?.scrollIntoView({ block: "start" }), 0);

  const next = async () => {
    const missing = missingRequired(partQuestions(parts[step] ?? []), answersRef.current);
    if (missing.length) {
      setErrors(missing);
      return;
    }
    setErrors([]);
    void saveDraft();
    setStep(Math.min(step + 1, parts.length - 1));
    toTop();
  };

  const send = async () => {
    const at = firstPartMissing(parts, answersRef.current);
    if (at !== -1) {
      setStep(at);
      setErrors(missingRequired(partQuestions(parts[at]), answersRef.current));
      toTop();
      return;
    }
    if (!consent) {
      setSendError(CONSENT_REQUIRED_MESSAGE);
      return;
    }
    if (timer.current) window.clearTimeout(timer.current);
    setSending(true);
    setSendError(null);
    const asked = shownQuestions(visible, answersRef.current);
    const final = visibleAnswers(answersRef.current, asked);
    const res = await saveFormResponse(bundle.assignmentId, final, true, consent);
    setSending(false);
    if (!res.ok) {
      setSendError(res.message);
      return;
    }
    dirty.current = false;
    changed.current = true;
    clearLocalDraft(me, bundle.assignmentId);
    const carries = asked.some((q) => !!q.profileField && final[q.id] !== undefined);
    setDone({ flagged: showDoctorFollowUp(res.row, asked, final), next: bundle.kind === "check_in" ? nextOccurrence(bundle.schedule, bundle.dueAt) : null, proposalsFor: carries && res.row.id ? res.row.id : null });
  };

  const addPhoto = async (q: ClientQuestion, file: File | undefined) => {
    if (!file) return;
    setPhotoError(null);
    setUploading(q.id);
    const res = await uploadFormPhoto(me, bundle.assignmentId, file);
    setUploading(null);
    if (!res.ok) {
      setPhotoError({ id: q.id, message: res.message });
      return;
    }
    const list = Array.isArray(answersRef.current[q.id]) ? (answersRef.current[q.id] as string[]) : [];
    setPhotoUrls((prev) => ({ ...prev, [res.path]: URL.createObjectURL(file) }));
    setAnswer(q.id, [...list, res.path]);
  };

  const dropPhoto = (q: ClientQuestion, path: string) => {
    const list = Array.isArray(answersRef.current[q.id]) ? (answersRef.current[q.id] as string[]) : [];
    const rest = list.filter((p) => p !== path);
    setAnswer(q.id, rest.length ? rest : undefined);
    void removeFormPhoto(path);
  };

  const isCheckIn = bundle.kind === "check_in";
  const last = step >= parts.length - 1;
  const pro = bundle.proName;
  const title = done ? (isCheckIn ? "Check-in sent" : "Form sent") : isCheckIn ? "Weekly check-in" : bundle.title;
  const savedWord = saveState === "saved" ? "saved" : saveState === "saving" ? "saving" : saveState === "error" ? "not saved yet" : null;
  const partLine = [`For ${pro}`, parts.length > 1 ? `${sectioned ? "section" : "part"} ${step + 1} of ${parts.length}` : null, savedWord].filter(Boolean).join(" · ");
  const sectionTitle = titles[step] ?? null;

  // Question numbers run across parts (CU6: part 2 starts at 3).
  const firstNumber = parts.slice(0, step).reduce((n, p) => n + p.length, 1);

  const field = (bad: boolean): React.CSSProperties => ({
    minHeight: 44,
    borderRadius: 12,
    background: INK.card,
    border: `1px solid ${bad ? INK.hi : INK.b10}`,
  });

  const errorLine = (q: ClientQuestion) =>
    errors.includes(q.id) ? (
      <p role="alert" className="flex items-center" style={{ gap: 5, fontSize: textPx(11.5), fontWeight: 600, color: INK.hi, marginTop: 6 }}>
        <CircleAlert size={12} strokeWidth={2} aria-hidden className="shrink-0" />
        {missingMessage(q)}
      </p>
    ) : null;

  const optional = (
    <span style={{ fontWeight: 500, color: INK.chF }}> (optional)</span>
  );

  const choiceButton = (key: string, label: string, selected: boolean, onClick: () => void, centred = false) => (
    <button
      key={key}
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`tap min-h-[44px] rounded-xl px-3 py-2.5 text-[12px] font-semibold border ${centred ? "text-center" : "text-start"} ${
        selected ? "bg-primary-fill text-on-primary-fill border-primary-fill" : "bg-cream-card text-charcoal border-charcoal/[0.1]"
      }`}
    >
      {label}
    </button>
  );

  const renderAnswer = (q: ClientQuestion, labelled: boolean) => {
    const v = answers[q.id];
    switch (q.type) {
      case "choice":
      case "multi": {
        // The option is stored; its words (option_labels) are shown.
        const picked = q.type === "multi" ? (Array.isArray(v) ? v.map(String) : []) : [];
        return (
          <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby={`${q.id}-l`}>
            {optionChoices(q).map(({ value: o, label }) =>
              q.type === "choice"
                ? choiceButton(o, label, v === o, () => setAnswer(q.id, v === o ? undefined : o))
                : choiceButton(o, label, picked.includes(o), () => {
                    const nextList = toggleMulti(picked, o);
                    setAnswer(q.id, nextList.length ? nextList : undefined);
                  })
            )}
          </div>
        );
      }
      case "scale": {
        const values = scaleValues(q);
        return (
          <>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${scaleColumns(values.length)}, minmax(0, 1fr))` }} role="group" aria-labelledby={`${q.id}-l`}>
              {values.map((n) => choiceButton(String(n), String(n), v === n, () => setAnswer(q.id, v === n ? undefined : n), true))}
            </div>
            {(q.scaleMinLabel || q.scaleMaxLabel) && (
              <p className="flex justify-between" style={{ gap: 12, marginTop: 6, fontSize: textPx(11), lineHeight: 1.4, color: INK.chF }}>
                <span className="min-w-0">{q.scaleMinLabel ? `${values[0] ?? q.scaleMin} = ${q.scaleMinLabel}` : ""}</span>
                <span className="min-w-0 text-end">{q.scaleMaxLabel ? `${values[values.length - 1] ?? q.scaleMax} = ${q.scaleMaxLabel}` : ""}</span>
              </p>
            )}
          </>
        );
      }
      case "number":
        return (
          <label className="block min-w-0">
            {labelled && <span className="block" style={{ fontSize: textPx(11.5), color: INK.chF, marginBottom: 4 }}>{q.prompt}</span>}
            <span className="flex items-center justify-between" style={{ ...field(errors.includes(q.id)), padding: "0 12px", gap: 6 }}>
              <NumberInput
                value={typeof v === "number" ? v : null}
                label={labelled ? undefined : q.prompt}
                placeholder={q.placeholder ?? "0"}
                onChange={(n) => setAnswer(q.id, n)}
              />
              {q.unit && <span style={{ fontSize: textPx(11), color: INK.chF }}>{q.unit}</span>}
            </span>
          </label>
        );
      case "date":
        return (
          <input
            type="date"
            aria-labelledby={`${q.id}-l`}
            value={typeof v === "string" ? v : ""}
            onChange={(e) => setAnswer(q.id, e.target.value || undefined)}
            className="w-full bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            style={{ ...field(errors.includes(q.id)), padding: "0 12px", fontSize: textPx(13), fontWeight: 600, color: INK.ch }}
          />
        );
      case "photo": {
        const list = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
        return (
          <>
            <div className="grid grid-cols-3 gap-2">
              {list.map((p) => (
                <span key={p} className="relative overflow-hidden" style={{ height: 96, borderRadius: 12, background: INK.soft }}>
                  {photoUrls[p] && <img src={photoUrls[p]} alt="" className="w-full h-full object-cover" />}
                  <button type="button" onClick={() => dropPhoto(q, p)} aria-label="Remove photo" className="tap absolute top-1 end-1 w-11 h-11 flex items-start justify-end p-1">
                    <span className="flex items-center justify-center rounded-full" style={{ width: 22, height: 22, background: "rgba(36,31,27,0.55)", color: "#FFFFFF" }}>
                      <X size={12} strokeWidth={2.4} aria-hidden />
                    </span>
                  </button>
                </span>
              ))}
              {list.length < MAX_PHOTOS && (
                <label
                  className="tap flex flex-col items-center justify-center cursor-pointer"
                  style={{ height: 96, borderRadius: 12, border: `1.5px dashed ${errors.includes(q.id) ? INK.hi : "rgb(var(--c-charcoal) / 0.11)"}`, gap: 4, fontSize: textPx(11.5), fontWeight: 600, color: INK.chS }}
                >
                  <Camera size={18} strokeWidth={1.75} aria-hidden style={{ color: INK.chF }} />
                  {uploading === q.id ? "Adding…" : "Add photo"}
                  <input type="file" accept={PHOTO_TYPES} className="sr-only" disabled={uploading === q.id} onChange={(e) => void addPhoto(q, e.target.files?.[0] ?? undefined).finally(() => (e.target.value = ""))} />
                </label>
              )}
            </div>
            {photoError?.id === q.id && (
              <p role="alert" style={{ fontSize: textPx(11.5), fontWeight: 600, color: INK.hi, marginTop: 6 }}>
                {photoError.message}
              </p>
            )}
          </>
        );
      }
      case "long_text": {
        const text = typeof v === "string" ? v : "";
        return (
          <>
            <textarea
              aria-labelledby={`${q.id}-l`}
              value={text}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              rows={5}
              maxLength={LONG_TEXT_MAX}
              placeholder={q.placeholder ?? undefined}
              className="block w-full resize-y bg-transparent outline-none placeholder:text-charcoal-tertiary focus-visible:ring-2 focus-visible:ring-primary/40"
              style={{ ...field(errors.includes(q.id)), minHeight: 120, padding: 12, fontSize: textPx(12.5), lineHeight: 1.5, color: INK.ch }}
            />
            {text.length > LONG_TEXT_MAX - 500 && (
              <p style={{ fontSize: textPx(11), color: INK.chF, marginTop: 4, textAlign: "end" }}>{`${text.length.toLocaleString(appLocale("en-GB"))} of ${LONG_TEXT_MAX.toLocaleString(appLocale("en-GB"))}`}</p>
            )}
          </>
        );
      }
      default:
        return (
          <textarea
            aria-labelledby={`${q.id}-l`}
            value={typeof v === "string" ? v : ""}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            rows={q.required ? 1 : 2}
            maxLength={SHORT_TEXT_MAX}
            placeholder={q.placeholder ?? undefined}
            className="block w-full resize-none bg-transparent outline-none placeholder:text-charcoal-tertiary focus-visible:ring-2 focus-visible:ring-primary/40"
            style={{ ...field(errors.includes(q.id)), minHeight: q.required ? 44 : 64, padding: 12, fontSize: textPx(12.5), lineHeight: 1.5, color: INK.ch }}
          />
        );
    }
  };

  const promptLink = (icon: React.ReactNode, label: string, onClick: () => void) => (
    <button type="button" onClick={onClick} className="tap inline-flex items-center text-start text-primary-dark" style={{ gap: 6, minHeight: 44, fontSize: textPx(12.5), fontWeight: 700 }}>
      {icon}
      {label}
    </button>
  );

  // What the client is shown the moment an answer matches (client_prompt).
  const place = supportPlace(null, timezone ?? browserTimezone());
  const urgent = urgentNumbers(place);
  const promptBlock = (p: ClientPrompt) =>
    p.kind === "urgent" ? (
      <div role="alert" data-client-prompt="urgent" style={{ marginTop: 10, borderRadius: 12, background: INK.hiBg, padding: "10px 12px 0" }}>
        <p style={{ fontSize: textPx(12.5), fontWeight: 700, lineHeight: 1.45, color: INK.hi, overflowWrap: "anywhere" }}>{p.message}</p>
        <div className="flex flex-wrap" style={{ columnGap: 16, paddingBottom: urgent.length ? 0 : 10 }}>
          {urgent.map((n) => (
            <a key={n} href={`tel:${n}`} className="tap inline-flex items-center" style={{ gap: 6, minHeight: 44, fontSize: textPx(13), fontWeight: 800, color: INK.hi }}>
              <Phone size={14} strokeWidth={2} aria-hidden />
              {`Call ${n}`}
            </a>
          ))}
        </div>
      </div>
    ) : (
      <div aria-live="polite" data-client-prompt={p.kind} style={{ marginTop: 10, borderRadius: 12, background: "rgb(var(--c-charcoal) / 0.04)", padding: "10px 12px 0" }}>
        <p style={{ fontSize: textPx(12), lineHeight: 1.5, color: INK.chS, overflowWrap: "anywhere" }}>{p.message ?? SUPPORT_PROMPT}</p>
        <div className="flex flex-wrap" style={{ columnGap: 16 }}>
          {promptLink(<HeartHandshake size={14} strokeWidth={2} aria-hidden />, GET_SUPPORT, () => setSupportOpen(true))}
          {p.kind === "recovery_and_support" && !hideBody && promptLink(<HandHeart size={14} strokeWidth={2} aria-hidden />, RECOVERY_LINK, toRecoverySetting)}
        </div>
      </div>
    );

  const renderItem = (item: FormItem, n: number) => {
    const qs = item.questions;
    const group = item.kind === "measures" && qs.length > 1;
    const head = qs[0];
    const allOptional = qs.every((q) => !q.required);
    const label = group ? (isCheckIn ? "This week's measurements" : "Your measurements") : head.prompt;
    return (
      <fieldset key={head.id} style={{ border: 0, padding: 0, margin: "0 0 20px" }}>
        <legend id={`${head.id}-l`} className="text-[13px] font-semibold text-charcoal leading-[1.4] mb-2 p-0">
          {n}. {label}
          {allOptional && optional}
        </legend>
        {group ? (
          <div className="grid grid-cols-3 gap-2">{qs.map((q) => <React.Fragment key={q.id}>{renderAnswer(q, true)}</React.Fragment>)}</div>
        ) : (
          renderAnswer(head, false)
        )}
        {qs.map((q) => (
          <React.Fragment key={q.id}>
            {errorLine(q)}
            {prompts.has(q.id) && promptBlock(prompts.get(q.id)!)}
          </React.Fragment>
        ))}
      </fieldset>
    );
  };

  const footer = done ? undefined : (
    <div>
      {sendError && (
        <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginBottom: 10, lineHeight: 1.45 }}>
          {sendError}
        </p>
      )}
      {last && (
        <button
          type="button"
          role="checkbox"
          aria-checked={consent}
          data-consent-box
          onClick={() => {
            setConsent((c) => !c);
            setSendError((e) => (e === CONSENT_REQUIRED_MESSAGE ? null : e));
          }}
          className="tap w-full flex items-center text-start"
          style={{ gap: 12, minHeight: 44, marginBottom: 8 }}
        >
          <span
            aria-hidden
            className="flex items-center justify-center shrink-0"
            style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              background: consent ? "rgb(var(--c-primary-fill))" : "transparent",
              border: consent ? "none" : `2px solid ${sendError === CONSENT_REQUIRED_MESSAGE ? INK.hi : "rgb(var(--c-charcoal) / 0.10)"}`,
              color: "rgb(var(--c-on-primary-fill))",
            }}
          >
            {consent && <Check size={12} strokeWidth={3} />}
          </span>
          <span className="min-w-0" style={{ fontSize: textPx(13.5), fontWeight: 600, color: INK.ch }}>
            {consentBox(pro)}
          </span>
        </button>
      )}
      {last ? (
        <CtaButton label={isCheckIn ? `Send to ${pro}` : "Submit"} loading={sending} onClick={() => void send()} />
      ) : (
        <CtaButton label="Next" onClick={() => void next()} />
      )}
    </div>
  );

  return (
    <BottomSheet open={open} onClose={close} title={title} footer={footer} onBack={!done && step > 0 ? () => { setErrors([]); setStep(step - 1); toTop(); } : undefined}>
      <div ref={topRef} />
      {done ? (
        <div className="animate-fade-slide-up">
          <p className="text-[13px] leading-[1.5] text-charcoal">{thanksLine(pro)}</p>
          {done.next && (
            <p style={{ fontSize: textPx(12), lineHeight: 1.5, color: INK.chF, marginTop: 6 }}>Next check-in: {longDate(done.next)}</p>
          )}
          {done.flagged && (
            <div data-safety-follow-up className="mt-4">
              <p className="text-[13px] leading-[1.5] text-charcoal">{DOCTOR_FOLLOW_UP}</p>
              {!showSigns && (
                <Button className="w-full mt-4" onClick={() => setShowSigns(true)}>
                  {SEE_WARNING_SIGNS}
                </Button>
              )}
              {showSigns && (
                <div className="mt-4">
                  <WarningSignsCard timezone={timezone} />
                </div>
              )}
            </div>
          )}
          {done.proposalsFor && <ProfileProposals responseId={done.proposalsFor} hideNumbers={hideBody} />}
          <CtaButton variant="secondary" label="Done" className="mt-4" onClick={close} />
        </div>
      ) : (
        <>
          <p className="flex items-center" style={{ gap: 6, marginBottom: 14, fontSize: textPx(11.5), fontWeight: 600, color: INK.chF }}>
            <Avatar name={pro} url={null} size={16} tone="teal" />
            <span aria-live="polite">{partLine}</span>
          </p>
          {step === 0 && bundle.description && (
            <p style={{ fontSize: textPx(12.5), lineHeight: 1.5, color: INK.chS, marginBottom: 14, whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{bundle.description}</p>
          )}
          {sectionTitle && (
            <h3 style={{ fontSize: textPx(15), fontWeight: 700, color: INK.ch, marginBottom: 12, overflowWrap: "anywhere" }}>{sectionTitle}</h3>
          )}
          {visible.length === 0 ? (
            <p className="text-[13px] leading-[1.5] text-charcoal-soft">Nothing to answer here. You can send it as it is.</p>
          ) : (
            (parts[step] ?? []).map((item, i) => renderItem(item, firstNumber + i))
          )}
          {last && bundle.safetyLine && (
            <p style={{ fontSize: textPx(11), lineHeight: 1.6, color: INK.chF, padding: "2px 0", marginBottom: 6, overflowWrap: "anywhere" }} data-safety-line>
              {bundle.safetyLine}
            </p>
          )}
          {last && (
            <p style={{ fontSize: textPx(11), lineHeight: 1.6, color: INK.chF, padding: "2px 0" }} data-consent>
              {consentLine(pro, bundle.kind, hideBody)}
            </p>
          )}
        </>
      )}
      <GetSupportPopup open={supportOpen} onClose={() => setSupportOpen(false)} place={place} />
    </BottomSheet>
  );
};

/** A decimal field that keeps what's typed ("81." while typing) and reports a number or null. */
const NumberInput: React.FC<{ value: number | null; label?: string; placeholder: string; onChange: (n: number | null) => void }> = ({ value, label, placeholder, onChange }) => {
  // Starts from the saved value; the sheet remounts per form, so no outside reset is needed.
  const [text, setText] = useState(value === null ? "" : String(value));
  return (
    <input
      inputMode="decimal"
      aria-label={label}
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseNumber(e.target.value));
      }}
      className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-charcoal-tertiary"
      style={{ height: 42, fontSize: textPx(13), fontWeight: 600, color: INK.ch }}
    />
  );
};

