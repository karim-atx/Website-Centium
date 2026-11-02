import React, { useId } from "react";
import { AlignLeft, Calendar, Camera, CircleDot, GitBranch, GripVertical, Hash, ListChecks, Gauge, Lock, Plus, Ruler, ShieldAlert, Square, Circle, ToggleRight, Trash2, Type, UserRoundPlus, X, type LucideIcon } from "lucide-react";
import { textPx } from "../../../theme/textSize";
import { Toggle } from "../../ui/Toggle";
import { INK } from "../proInk";
import type { GripProps } from "./useReorder";
import { t } from "../../../i18n/core";
import { OPTIONS_MAX, PROFILE_FIELD_LABEL, PROMPT_MAX, SAFETY_LABEL, SECTION_MAX, UNIT_MAX, isYesNo, typeLabel, uiTypeOf, type QuestionDraft, type UiType } from "./formModel";

/** The add-a-question glyphs (gen/r18.js QT18). */
export const TYPE_ICON: Record<UiType, LucideIcon> = {
  short: Type,
  long: AlignLeft,
  single: CircleDot,
  multi: ListChecks,
  number: Hash,
  scale: Gauge,
  date: Calendar,
  yesno: ToggleRight,
  photo: Camera,
  body: Ruler,
};

/**
 * Release 3 · MO29 one question card (gen/r18.js qCard18): card fill and
 * border, r16, pad 12 12 10, 8 apart; the head row (gap 8, 8 under it): the
 * grip 14 text.tertiary, the type in caps 10.5 / 800 0.06em primary.deep
 * with its 12 glyph, then "Required" 11.5 text.faint and the switch; the
 * question 14 / 700 (8 under); then the answer as the client will see it:
 * - short text: a 40 high r10 soft well, "Short answer" 13 text.tertiary;
 * - choices: rows gap 6, a 15 circle / square in text.tertiary, 13 text;
 * - number: a 90 × 40 r10 soft well and the unit 13 / 700 text.soft;
 * - scale: the numbers in a grid (gap 3), 30 high r8 soft, 11.5 / 700, with
 *   "Very low" and "Very high" 10.5 text.faint under it;
 * - date: 40 high r10 soft, the calendar 14 and "Pick a date";
 * - yes or no: two 36 high r10 soft halves, 13 / 700;
 * - photo: 56 high r12, a 1.5 dashed 11% border, the camera 15 and "Add
 *   photos or a file" 12.5 / 700.
 * Here the question, the answers and the unit are editable in place. A
 * safety-marked question (Weekly check-in: pain, injury, illness, symptoms)
 * is locked on: it can't be removed or reworded, and says why.
 *
 * Round D (not drawn; worded from the plan's D-S10 and the MO29 rows): long
 * text shows a 72 high well, "Long answer"; a question can open a section
 * ("Section {n}" caps and its title above the card, "Start a section here"
 * on the card), take one condition ("Only ask if…", picked in the builder's
 * sheet) and have its answer offered for the client's profile ("Carry into
 * the profile").
 */
export const QuestionCard: React.FC<{
  q: QuestionDraft;
  index: number;
  count: number;
  onChange: (q: QuestionDraft) => void;
  onRemove: () => void;
  register: (el: HTMLElement | null) => void;
  grip: GripProps;
  problem: string | null;
  /** Preview: the question as the client sees it, nothing editable. */
  readOnly?: boolean;
  /** The section number when this question opens one. */
  section?: number;
  /** "Only ask if {question} is {answer}", or null. */
  conditionLine?: string | null;
  /** Opens the condition picker; omitted when no earlier question can be named. */
  onCondition?: () => void;
  /** Opens the profile-field picker; omitted when the type carries nothing. */
  onProfile?: () => void;
}> = ({ q, index, count, onChange, onRemove, register, grip, problem, readOnly, section, conditionLine, onCondition, onProfile }) => {
  const id = useId();
  const ui = uiTypeOf(q);
  const Icon = TYPE_ICON[ui];
  const locked = !!q.safetyTopic || !!readOnly;
  const set = (patch: Partial<QuestionDraft>) => onChange({ ...q, ...patch });
  const yesNo = isYesNo(q.options);

  let body: React.ReactNode;
  if (q.type === "text") {
    body = <span className="block" style={{ height: 40, borderRadius: 10, background: INK.soft, padding: "0 12px", lineHeight: "40px", fontSize: textPx(13), color: INK.chT }}>{t("Short answer")}</span>;
  } else if (q.type === "long_text") {
    body = <span className="block" style={{ height: 72, borderRadius: 10, background: INK.soft, padding: "10px 12px", fontSize: textPx(13), color: INK.chT }}>{t("Long answer")}</span>;
  } else if ((q.type === "choice" || q.type === "multi") && yesNo) {
    body = (
      <div className="flex" style={{ gap: 6 }}>
        {["Yes", "No"].map((x) => (
          <span key={x} className="flex-1 flex items-center justify-center" style={{ height: 36, borderRadius: 10, background: INK.soft, fontSize: textPx(13), fontWeight: 700, color: INK.chS }}>
            {t(x)}
          </span>
        ))}
      </div>
    );
  } else if (q.type === "choice" || q.type === "multi") {
    const opts = q.options ?? [];
    const Mark = q.type === "choice" ? Circle : Square;
    // A rule this question carries names these answers: they can't be renamed or removed.
    const fixed = new Set(q.fixedOptions ?? []);
    body = (
      <div className="flex flex-col" style={{ gap: 6 }}>
        {opts.map((o, i) => (
          <span key={i} className="flex items-center" style={{ gap: 8 }}>
            <Mark size={15} strokeWidth={2} aria-hidden style={{ color: INK.chT, flexShrink: 0 }} />
            <input
              value={o}
              disabled={locked}
              readOnly={fixed.has(o)}
              maxLength={120}
              onChange={(e) => set({ options: opts.map((x, j) => (j === i ? e.target.value : x)) })}
              placeholder={t("Answer {n}", { n: i + 1 })}
              aria-label={t("Answer {n}", { n: i + 1 })}
              className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-charcoal-tertiary"
              style={{ fontSize: textPx(13), color: INK.ch, height: 28 }}
            />
            {fixed.has(o) && <Lock size={12} strokeWidth={2} aria-label={t("Can't be renamed")} style={{ color: INK.chF, flexShrink: 0 }} />}
            {!locked && !fixed.has(o) && opts.length > 2 && (
              <button type="button" onClick={() => set({ options: opts.filter((_, j) => j !== i) })} aria-label={t("Remove answer {n}", { n: i + 1 })} className="tap flex items-center justify-center shrink-0 relative before:absolute before:-inset-2 before:content-['']" style={{ width: 28, height: 28 }}>
                <X size={13} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
              </button>
            )}
          </span>
        ))}
        {fixed.size > 0 && (
          <p style={{ fontSize: textPx(11.5), lineHeight: 1.45, color: INK.chF, marginTop: 2 }}>
            {t("Answers with a lock can't be renamed or removed: recovery-sensitive mode, a note for you or a safety message depends on them.")}
          </p>
        )}
        {!locked && opts.length < OPTIONS_MAX && (
          <button type="button" onClick={() => set({ options: [...opts, ""] })} className="tap self-start flex items-center relative before:absolute before:-inset-y-3 before:inset-x-0 before:content-['']" style={{ gap: 4, fontSize: textPx(12), fontWeight: 700, color: INK.prDeep, marginTop: 2 }}>
            <Plus size={12} strokeWidth={2.4} aria-hidden />
            {t("Add an answer")}
          </button>
        )}
      </div>
    );
  } else if (q.type === "number") {
    body = (
      <span className="inline-flex items-center" style={{ gap: 8 }}>
        <span style={{ width: 90, height: 40, borderRadius: 10, background: INK.soft }} />
        <input
          value={q.unit ?? ""}
          disabled={locked}
          maxLength={UNIT_MAX}
          onChange={(e) => set({ unit: e.target.value })}
          placeholder={t("Unit")}
          aria-label={t("Unit")}
          className="bg-transparent outline-none placeholder:text-charcoal-tertiary"
          style={{ width: 90, fontSize: textPx(13), fontWeight: 700, color: INK.chS, height: 32 }}
        />
      </span>
    );
  } else if (q.type === "scale") {
    const lo = q.scaleMin ?? 1;
    const hi = q.scaleMax ?? 10;
    const nums = Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i);
    body = (
      <>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${nums.length}, minmax(0, 1fr))`, gap: 3 }}>
          {nums.map((n) => (
            <span key={n} className="flex items-center justify-center" style={{ height: 30, borderRadius: 8, background: INK.soft, fontSize: textPx(11.5), fontWeight: 700, color: INK.chS }}>
              {n}
            </span>
          ))}
        </div>
        <div className="flex justify-between" style={{ fontSize: textPx(10.5), color: INK.chF, marginTop: 4 }}>
          <span>{t("Very low")}</span>
          <span>{t("Very high")}</span>
        </div>
      </>
    );
  } else if (q.type === "date") {
    body = (
      <span className="inline-flex items-center" style={{ gap: 8, height: 40, borderRadius: 10, background: INK.soft, padding: "0 12px", fontSize: textPx(13), color: INK.chT }}>
        <Calendar size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
        {t("Pick a date")}
      </span>
    );
  } else {
    body = (
      <span className="flex items-center justify-center" style={{ gap: 8, height: 56, borderRadius: 12, border: "1.5px dashed rgb(var(--c-charcoal) / 0.11)", fontSize: textPx(12.5), fontWeight: 700, color: INK.chS }}>
        <Camera size={15} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
        {t("Add photos or a file")}
      </span>
    );
  }

  const linkBtn: React.CSSProperties = { gap: 6, minHeight: 36, fontSize: textPx(12), fontWeight: 700, color: INK.prDeep, textAlign: "start" };
  const showCondition = !!onCondition || !!conditionLine;
  const showProfile = !!onProfile || !!q.profileField;
  const extras =
    readOnly || (!showCondition && !showProfile && (locked || q.sectionTitle != null)) ? null : (
      <div className="flex flex-col items-start" style={{ marginTop: 8, paddingTop: 2, borderTop: `1px solid ${INK.b06}` }}>
        {showCondition && (
          <button type="button" disabled={locked || !onCondition} onClick={onCondition} className="tap flex items-center" style={{ ...linkBtn, color: conditionLine ? INK.ch : INK.prDeep }}>
            <GitBranch size={13} strokeWidth={2.2} aria-hidden style={{ color: INK.prDeep, flexShrink: 0 }} />
            <span style={{ overflowWrap: "anywhere" }}>{conditionLine ?? t("Only ask if…")}</span>
          </button>
        )}
        {showProfile && (
          <button type="button" disabled={locked || !onProfile} onClick={onProfile} className="tap flex items-center" style={{ ...linkBtn, color: q.profileField ? INK.ch : INK.prDeep }}>
            <UserRoundPlus size={13} strokeWidth={2.2} aria-hidden style={{ color: INK.prDeep, flexShrink: 0 }} />
            {q.profileField ? t("Carry into the profile: {field}", { field: t(PROFILE_FIELD_LABEL[q.profileField]) }) : t("Carry into the profile")}
          </button>
        )}
        {q.sectionTitle == null && !locked && (
          <button type="button" onClick={() => set({ sectionTitle: "" })} className="tap flex items-center" style={linkBtn}>
            <Plus size={13} strokeWidth={2.4} aria-hidden style={{ flexShrink: 0 }} />
            {t("Start a section here")}
          </button>
        )}
      </div>
    );

  const sectionHead =
    q.sectionTitle == null ? null : (
      <div style={{ margin: index ? "14px 0 8px" : "0 0 8px" }}>
        <span className="block" style={{ fontSize: textPx(10.5), fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: INK.chF, marginBottom: 2 }}>
          {t("Section {n}", { n: section ?? 1 })}
        </span>
        {locked ? (
          <p style={{ fontSize: textPx(15), fontWeight: 800, color: INK.ch, overflowWrap: "anywhere" }}>{q.sectionTitle}</p>
        ) : (
          <span className="flex items-center" style={{ gap: 6 }}>
            <input
              value={q.sectionTitle}
              maxLength={SECTION_MAX}
              onChange={(e) => set({ sectionTitle: e.target.value })}
              placeholder={t("Section title")}
              aria-label={t("Section {n} title", { n: section ?? 1 })}
              className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-charcoal-tertiary"
              style={{ fontSize: textPx(15), fontWeight: 800, color: INK.ch, height: 36, borderBottom: `1px solid ${INK.b10}` }}
            />
            <button type="button" onClick={() => set({ sectionTitle: null })} aria-label={t("Remove section {n}", { n: section ?? 1 })} className="tap flex items-center justify-center shrink-0 relative before:absolute before:-inset-2 before:content-['']" style={{ width: 28, height: 28 }}>
              <X size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
            </button>
          </span>
        )}
      </div>
    );

  return (
    <div ref={register}>
      {sectionHead}
      <div style={{ background: INK.card, border: `1px solid ${problem ? INK.hi : INK.bCard}`, borderRadius: 16, padding: "12px 12px 10px", marginBottom: 8 }}>
        <div className="flex items-center" style={{ gap: 8, marginBottom: 8 }}>
          {!readOnly && <button type="button" aria-label={t("Move question {n} of {count}. Use the arrow keys.", { n: index + 1, count })} className="tap flex items-center justify-center shrink-0 relative before:absolute before:-inset-3 before:content-['']" {...grip} style={{ width: 14, height: 20, ...grip.style }}>
            <GripVertical size={14} strokeWidth={2} aria-hidden style={{ color: INK.chT }} />
          </button>}
          <span className="inline-flex items-center min-w-0 whitespace-nowrap" style={{ gap: 4, fontSize: textPx(10.5), fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: INK.prDeep }}>
            <Icon size={12} strokeWidth={2.2} aria-hidden />
            <span className="truncate">{typeLabel(q)}</span>
          </span>
          {readOnly ? (
            q.required && <span className="ms-auto shrink-0" style={{ fontSize: textPx(11.5), color: INK.chF }}>{t("Required")}</span>
          ) : (
            <span className="ms-auto inline-flex items-center shrink-0" style={{ gap: 6, fontSize: textPx(11.5), color: INK.chF }}>
              <span aria-hidden>{t("Required")}</span>
              <Toggle checked={q.required} onChange={(v) => !locked && set({ required: v })} label={t("Required: {question}", { question: q.prompt || t("question {n}", { n: index + 1 }) })} disabled={locked} />
            </span>
          )}
          {!locked && (
            <button type="button" onClick={onRemove} aria-label={t("Remove question {n}", { n: index + 1 })} className="tap flex items-center justify-center shrink-0 relative before:absolute before:-inset-2 before:content-['']" style={{ width: 28, height: 28 }}>
              <Trash2 size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
            </button>
          )}
        </div>
        {readOnly || q.safetyTopic ? (
          <p style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch, marginBottom: 8, lineHeight: 1.4, overflowWrap: "anywhere" }}>{q.prompt}</p>
        ) : (
          <>
            <label htmlFor={id} className="sr-only">{t("Question {n}", { n: index + 1 })}</label>
            <textarea
              id={id}
              value={q.prompt}
              rows={1}
              maxLength={PROMPT_MAX}
              onChange={(e) => set({ prompt: e.target.value })}
              placeholder={t("Write your question")}
              className="block w-full bg-transparent outline-none resize-none placeholder:text-charcoal-tertiary [field-sizing:content]"
              style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch, marginBottom: 8, lineHeight: 1.4 }}
            />
          </>
        )}
        {!readOnly && q.safetyTopic && (
          <p className="flex items-start" style={{ gap: 6, fontSize: textPx(11.5), color: INK.chS, lineHeight: 1.45, marginBottom: 8 }}>
            <ShieldAlert size={13} strokeWidth={2} aria-hidden style={{ color: INK.hi, flexShrink: 0, marginTop: 2 }} />
            {t("Safety question: answers that suggest {topic} flag the check-in for you, so it can't be turned off.", { topic: t(SAFETY_LABEL[q.safetyTopic]) })}
          </p>
        )}
        {readOnly && conditionLine && (
          <p className="flex items-center" style={{ gap: 5, fontSize: textPx(11.5), color: INK.chF, marginBottom: 8, overflowWrap: "anywhere" }}>
            <GitBranch size={12} strokeWidth={2.2} aria-hidden style={{ flexShrink: 0 }} />
            {conditionLine}
          </p>
        )}
        {body}
        {extras}
        {problem && (
          <p role="alert" style={{ fontSize: textPx(11.5), fontWeight: 600, color: INK.hi, marginTop: 8 }}>
            {problem}
          </p>
        )}
      </div>
    </div>
  );
};
