import React, { useEffect, useRef, useState } from "react";
import { CircleAlert, Phone, ShieldCheck } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { INK } from "../pro/proInk";
import { textPx } from "../../theme/textSize";
import { localIsoDay } from "../../services/care-plan/logic";
import { appLocale } from "../../i18n/format";
import { t } from "../../i18n/core";
import { fetchReadinessForm, recordClearance, removeClearance, submitReadiness, type MyReadiness, type ReadinessForm, type ReadinessResult } from "../../services/readiness";
import { callNumbers, canSend, CLEARANCE_NOTE_MAX, clearanceDateOk, CONDITIONS, EMPTY_ANSWERS, INTENSITIES, memberHeadingKey, NONE, NOTE_MAX, toggleKey, WARNING_SIGNS, word, type ReadinessAnswers } from "../../services/readiness/model";

/**
 * Round K · DW "Before you start" (Database 20261226550000): the member's
 * form and outcome, in one sheet (a 440 side sheet on web, as every sheet).
 * Every word of the form is the server's (readiness_form, word for word from
 * the approved files); only the controls (Start, Send, Done, dates, errors)
 * are ours. The outcome is worked out on the server.
 *
 * - intro: intro.title / intro.body, Start, the footer citation;
 * - questions: Q1–Q4 numbered on screen, "None of these" on its own, and the
 *   optional note; Send;
 * - outcome: the outcome's title and its line (line_key); the urgent line
 *   with urgent_numbers under it (Lebanon: 140 and 112 to call); "My doctor
 *   has cleared me" (an optional date, not in the future, and a note up to
 *   500) when the outcome advises a doctor; once cleared, "Cleared by a
 *   doctor" with Remove; "Fill it in again"; the footer citation.
 *
 * `latest` opens on the latest form's outcome; without it the sheet starts
 * at the intro.
 */
type Step = "intro" | "questions" | "outcome";

interface Clearance {
  clearedAt: string | null;
  clearedOn: string | null;
  note: string | null;
}

export const ReadinessSheet: React.FC<{ open: boolean; latest: MyReadiness | null; onClose: (changed: boolean) => void }> = ({ open, latest, onClose }) => {
  const [form, setForm] = useState<ReadinessForm | null | "error">(null);
  const [step, setStep] = useState<Step>("intro");
  const [answers, setAnswers] = useState<ReadinessAnswers>(EMPTY_ANSWERS);
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [clearance, setClearance] = useState<Clearance>({ clearedAt: null, clearedOn: null, note: null });
  const [clearing, setClearing] = useState<{ date: string; note: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);
  const [nonce, setNonce] = useState(0);
  const top = useRef<HTMLDivElement | null>(null);

  // Each open starts where `latest` says, with the words in the app's language.
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const openKey = open ? (latest?.screeningId ?? "new") : null;
  if (openKey !== openedFor) {
    setOpenedFor(openKey);
    if (openKey) {
      setForm(null);
      setStep(latest ? "outcome" : "intro");
      setAnswers(EMPTY_ANSWERS);
      setResult(latest);
      setClearance({ clearedAt: latest?.clearedAt ?? null, clearedOn: latest?.clearedOn ?? null, note: latest?.clearanceNote ?? null });
      setClearing(null);
      setError(null);
      setChanged(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    let live = true;
    void fetchReadinessForm().then((r) => live && setForm(r.ok ? r.data : "error"));
    return () => {
      live = false;
    };
  }, [open, nonce]);

  const toTop = () => top.current?.scrollIntoView({ block: "start" });
  const close = () => onClose(changed);
  const texts = form && form !== "error" ? form.texts : {};
  const w = (key: string) => word(texts, key);
  const today = localIsoDay(new Date());
  const dayText = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(appLocale("en-US"), { day: "numeric", month: "long", year: "numeric" });

  const send = async () => {
    setBusy(true);
    setError(null);
    const r = await submitReadiness(answers);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setResult(r.result);
    setClearance({ clearedAt: null, clearedOn: null, note: null });
    setChanged(true);
    setStep("outcome");
    toTop();
  };

  const saveClearance = async () => {
    if (!clearing) return;
    if (!clearanceDateOk(clearing.date, today)) return setError(t("The date can't be in the future."));
    setBusy(true);
    setError(null);
    const r = await recordClearance(clearing.date || null, clearing.note);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setClearance({ clearedAt: new Date().toISOString(), clearedOn: clearing.date || null, note: clearing.note.trim() || null });
    setClearing(null);
    setChanged(true);
  };

  const dropClearance = async () => {
    setBusy(true);
    setError(null);
    const r = await removeClearance();
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setClearance({ clearedAt: null, clearedOn: null, note: null });
    setChanged(true);
  };

  const footerLine = w("footer") && (
    <p data-readiness-footer style={{ fontSize: textPx(11), lineHeight: 1.5, color: INK.chF, marginTop: 20 }}>
      {w("footer")}
    </p>
  );

  const option = (key: string, label: string, selected: boolean, onClick: () => void) => (
    <button
      key={key}
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`tap min-h-[44px] rounded-xl px-3 py-2.5 text-[12px] font-semibold border text-start ${selected ? "bg-primary-fill text-on-primary-fill border-primary-fill" : "bg-cream-card text-charcoal border-charcoal/[0.1]"}`}
    >
      {label}
    </button>
  );

  const question = (n: number, id: string, help: string | null, body: React.ReactNode) => (
    <fieldset key={id} style={{ border: 0, padding: 0, margin: "0 0 20px" }}>
      <legend id={`readiness-${id}`} className="text-[13px] font-semibold text-charcoal leading-[1.4] mb-1 p-0">
        {n}. {w(`${id}.prompt`)}
      </legend>
      {help && <p style={{ fontSize: textPx(12), lineHeight: 1.5, color: INK.chS, marginBottom: 8 }}>{help}</p>}
      {body}
    </fieldset>
  );

  const multi = (id: "q2" | "q3", keys: readonly string[], value: string[], set: (v: string[]) => void) => (
    <div className="grid grid-cols-1 gap-2" role="group" aria-labelledby={`readiness-${id}`}>
      {[...keys, NONE].map((k) => option(k, w(`${id}.${k}`), value.includes(k), () => set(toggleKey(value, k))))}
    </div>
  );

  const questions = (
    <div className="animate-fade-slide-up">
      {question(
        1,
        "q1",
        w("q1.help"),
        <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="readiness-q1">
          {option("yes", w("q1.yes"), answers.exercisesRegularly === true, () => setAnswers({ ...answers, exercisesRegularly: answers.exercisesRegularly === true ? null : true }))}
          {option("no", w("q1.no"), answers.exercisesRegularly === false, () => setAnswers({ ...answers, exercisesRegularly: answers.exercisesRegularly === false ? null : false }))}
        </div>
      )}
      {question(2, "q2", w("q2.help"), multi("q2", CONDITIONS, answers.conditions, (v) => setAnswers({ ...answers, conditions: v })))}
      {question(3, "q3", w("q3.help"), multi("q3", WARNING_SIGNS, answers.warningSigns, (v) => setAnswers({ ...answers, warningSigns: v })))}
      {question(
        4,
        "q4",
        w("q4.help") || null,
        <div className="grid grid-cols-1 gap-2" role="group" aria-labelledby="readiness-q4">
          {INTENSITIES.map((k) => option(k, w(`q4.${k}`), answers.intensity === k, () => setAnswers({ ...answers, intensity: answers.intensity === k ? null : k })))}
        </div>
      )}
      <label className="block" style={{ marginBottom: 4 }}>
        <span className="block text-[13px] font-semibold text-charcoal leading-[1.4]">
          {w("note.prompt")} <span style={{ fontWeight: 500, color: INK.chF }}>{w("note.optional")}</span>
        </span>
        {w("note.help") && <span className="block" style={{ fontSize: textPx(12), lineHeight: 1.5, color: INK.chS, margin: "2px 0 8px" }}>{w("note.help")}</span>}
        <textarea
          value={answers.note}
          maxLength={NOTE_MAX}
          rows={3}
          onChange={(e) => setAnswers({ ...answers, note: e.target.value })}
          className="w-full outline-none resize-none"
          style={{ borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "10px 12px", fontSize: textPx(14), color: INK.ch }}
        />
      </label>
    </div>
  );

  const outcome = result && (
    <div className="animate-fade-slide-up">
      {clearance.clearedAt ? (
        <div className="flex items-center" style={{ gap: 8, marginBottom: 6 }}>
          <ShieldCheck size={18} strokeWidth={2} aria-hidden style={{ color: INK.good, flexShrink: 0 }} />
          <h3 className="m-0" style={{ fontSize: textPx(17), lineHeight: 1.35, fontWeight: 800, color: INK.ch }}>
            {w(memberHeadingKey(result.outcome, "cleared_by_doctor"))}
          </h3>
        </div>
      ) : (
        <h3 className="m-0" style={{ fontSize: textPx(17), lineHeight: 1.35, fontWeight: 800, color: INK.ch, marginBottom: 6 }}>
          {w(memberHeadingKey(result.outcome, result.label))}
        </h3>
      )}
      <p style={{ fontSize: textPx(13.5), lineHeight: 1.55, color: INK.ch }}>{w(result.lineKey)}</p>

      {result.urgent && (
        <div role="alert" data-readiness-urgent style={{ marginTop: 14, borderRadius: 12, background: INK.hiBg, padding: "10px 12px" }}>
          <p className="flex items-start" style={{ gap: 8, fontSize: textPx(12.5), fontWeight: 700, lineHeight: 1.45, color: INK.hi }}>
            <CircleAlert size={15} strokeWidth={2.2} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{w("urgent")}</span>
          </p>
          {form && form !== "error" && form.urgentNumbers && (
            <>
              <p style={{ fontSize: textPx(12.5), lineHeight: 1.45, color: INK.hi, marginTop: 6 }}>{form.urgentNumbers}</p>
              <div className="flex flex-wrap" style={{ columnGap: 16 }}>
                {callNumbers(form.urgentNumbers).map((n) => (
                  <a key={n} href={`tel:${n}`} className="tap inline-flex items-center" style={{ gap: 6, minHeight: 44, fontSize: textPx(13), fontWeight: 800, color: INK.hi }}>
                    <Phone size={14} strokeWidth={2} aria-hidden />
                    {t("Call {n}", { n })}
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {clearance.clearedAt ? (
        <div data-readiness-cleared style={{ marginTop: 16, borderRadius: 12, background: INK.soft, padding: "10px 12px" }}>
          <p style={{ fontSize: textPx(12.5), lineHeight: 1.5, color: INK.ch, fontWeight: 600 }}>
            {clearance.clearedOn ? t("Cleared on {date}", { date: dayText(clearance.clearedOn) }) : t("Cleared by your doctor")}
          </p>
          {clearance.note && <p style={{ fontSize: textPx(12.5), lineHeight: 1.5, color: INK.chS, marginTop: 2, overflowWrap: "anywhere" }}>{clearance.note}</p>}
          <button type="button" disabled={busy} onClick={() => void dropClearance()} className="tap text-primary-dark" style={{ minHeight: 44, fontSize: textPx(12.5), fontWeight: 700 }}>
            {t("Remove")}
          </button>
        </div>
      ) : (
        result.outcome !== "cleared" &&
        (clearing ? (
          <div data-readiness-clearing style={{ marginTop: 16, borderRadius: 12, background: INK.soft, padding: "12px" }}>
            <p style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch, marginBottom: 8 }}>{w("clearance.button")}</p>
            <label className="block" style={{ marginBottom: 10 }}>
              <span className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 4 }}>
                {t("Date (optional)")}
              </span>
              <input
                type="date"
                value={clearing.date}
                max={today}
                onChange={(e) => setClearing({ ...clearing, date: e.target.value })}
                className="w-full outline-none"
                style={{ minHeight: 44, borderRadius: 12, background: INK.card, border: `1px solid ${INK.b10}`, padding: "0 12px", fontSize: textPx(14), color: INK.ch }}
              />
            </label>
            <label className="block">
              <span className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 4 }}>
                {t("Note (optional)")}
              </span>
              <textarea
                value={clearing.note}
                maxLength={CLEARANCE_NOTE_MAX}
                rows={2}
                onChange={(e) => setClearing({ ...clearing, note: e.target.value })}
                className="w-full outline-none resize-none"
                style={{ borderRadius: 12, background: INK.card, border: `1px solid ${INK.b10}`, padding: "10px 12px", fontSize: textPx(14), color: INK.ch }}
              />
            </label>
            <div className="flex flex-wrap" style={{ gap: 8, marginTop: 10 }}>
              <CtaButton size="base" label={t("Save")} loading={busy} onClick={() => void saveClearance()} />
              <CtaButton size="base" variant="secondary" label={t("Cancel")} onClick={() => setClearing(null)} />
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <CtaButton size="base" variant="secondary" icon={<ShieldCheck size={15} />} label={w("clearance.button")} onClick={() => setClearing({ date: "", note: "" })} />
          </div>
        ))
      )}
    </div>
  );

  const body =
    form === "error" ? (
      <div role="alert" style={{ fontSize: textPx(13), color: INK.chS }}>
        {t("Couldn't load this. Check your connection and try again.")}
        <div style={{ marginTop: 10 }}>
          <CtaButton size="base" variant="secondary" label={t("Retry")} onClick={() => {
              setForm(null);
              setNonce((n) => n + 1);
            }}
          />
        </div>
      </div>
    ) : !form ? (
      <p aria-live="polite" style={{ fontSize: textPx(13), color: INK.chF }}>
        {t("Loading…")}
      </p>
    ) : step === "intro" ? (
      <div className="animate-fade-slide-up">
        <p style={{ fontSize: textPx(13.5), lineHeight: 1.55, color: INK.ch }}>{w("intro.body")}</p>
      </div>
    ) : step === "questions" ? (
      questions
    ) : (
      outcome
    );

  const footer =
    !form || form === "error" ? undefined : (
      <div>
        {error && (
          <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginBottom: 10, lineHeight: 1.45 }}>
            {error}
          </p>
        )}
        {step === "intro" && (
          <CtaButton
            className="w-full"
            label={t("Start")}
            onClick={() => {
              setStep("questions");
              toTop();
            }}
          />
        )}
        {step === "questions" && <CtaButton className="w-full" label={t("Send")} loading={busy} disabled={!canSend(answers)} onClick={() => void send()} />}
        {step === "outcome" && (
          <div className="flex flex-col" style={{ gap: 8 }}>
            <CtaButton className="w-full" label={t("Done")} onClick={close} />
            <CtaButton
              className="w-full"
              variant="secondary"
              label={t("Fill it in again")}
              onClick={() => {
                setAnswers(EMPTY_ANSWERS);
                setError(null);
                setClearing(null);
                setStep("questions");
                toTop();
              }}
            />
          </div>
        )}
      </div>
    );

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={form && form !== "error" ? w("intro.title") : t("Loading…")}
      footer={footer}
      onBack={step === "questions" ? () => setStep(result ? "outcome" : "intro") : undefined}
    >
      <div ref={top} />
      {body}
      {form && form !== "error" && step !== "questions" && footerLine}
    </BottomSheet>
  );
};
