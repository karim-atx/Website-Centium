import React, { useState } from "react";
import { ChevronDown, ImagePlus } from "lucide-react";
import { COURSE_LEVELS, COVER_COLOURS, LIMITS } from "../../../services/courses/author";
import type { CourseCategory } from "../../../services/courses";
import { levelLabel } from "../../../services/courses/rules";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { PopupMenu } from "../../ui/PopupMenu";
import { INK } from "../proInk";
import { ComingSoonPill } from "../ComingSoon";
import { coverBackground } from "../../courses/courseCover";
import { ChipRow, Field, FieldError, Label, Note, TextBox } from "./courseUi";
import { fieldBox } from "./courseStyles";
import { TITLE_MIN, titleError } from "./courseModel";

export interface BasicsDraft {
  title: string;
  subtitle: string;
  categoryKey: string;
  level: string;
  weeklyHours: string;
  learnPoints: string;
  coverColour: string;
}

/**
 * Release 3 · W6 MO28 "Create course · 1 Basics" (cBasics18) and its
 * validation state:
 * - the cover tile (120, r16, 1.5 dashed 11% border, status.high when
 *   invalid; image-plus 22 / 1.75; "Add a cover image" 12.5 / 700; "16 by 9
 *   works best" 11). There is no cover photo column or bucket, so the tile
 *   shows the course's colour with "Coming soon" and the colour swatches
 *   (the existing cover colour) sit under it; the photo source sheet and
 *   "Add a cover image before you continue" wait for that backend;
 * - Title (40 high field) with "At least 8 characters." and "Use at least 8
 *   characters" (11.5 / 600 status.high), Subtitle, Category (field with
 *   chevron-down 14, PopupMenu of course_categories), Level (chips18: 32,
 *   r10, 12.5 / 700);
 * - no Description or Focus: courses have neither column; kept instead from
 *   the old builder: "Hours a week" and "What you'll learn".
 */
export const BasicsStep: React.FC<{
  draft: BasicsDraft;
  onChange: (d: BasicsDraft) => void;
  categories: CourseCategory[];
  editable: boolean;
  showErrors: boolean;
  reviewReason: string | null;
  footer: React.ReactNode;
}> = ({ draft, onChange, categories, editable, showErrors, reviewReason, footer }) => {
  const dark = useIsDark();
  const [menu, setMenu] = useState<HTMLButtonElement | null>(null);
  const set = (k: keyof BasicsDraft, v: string) => onChange({ ...draft, [k]: v });
  const tErr = showErrors ? titleError(draft.title) : null;
  const cat = categories.find((c) => c.key === draft.categoryKey);
  const hours = draft.weeklyHours.trim() === "" ? null : Number(draft.weeklyHours);
  const hoursBad = hours !== null && !(Number.isFinite(hours) && hours >= LIMITS.weeklyHours.min && hours <= LIMITS.weeklyHours.max);

  return (
    <div>
      {reviewReason && (
        <div style={{ borderRadius: 14, background: INK.goldPale, padding: "12px 14px", marginBottom: 12 }}>
          <p style={{ fontSize: textPx(12.5), fontWeight: 700, color: INK.goldInk }}>What we'd like changed</p>
          <p style={{ fontSize: textPx(12.5), color: INK.ch, lineHeight: 1.5, marginTop: 4, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{reviewReason}</p>
        </div>
      )}
      <div
        className="flex flex-col items-center justify-center"
        style={{ height: 120, borderRadius: 16, background: coverBackground(draft.coverColour, dark), border: `1.5px dashed rgb(var(--c-charcoal) / 0.11)`, gap: 6 }}
      >
        <ImagePlus size={22} strokeWidth={1.75} aria-hidden style={{ color: INK.chF }} />
        <span className="whitespace-nowrap" style={{ fontSize: textPx(12.5), fontWeight: 700, color: INK.chS, background: INK.card, padding: "1px 8px", borderRadius: 6 }}>
          Add a cover image
        </span>
        <ComingSoonPill />
      </div>
      <Label>Cover colour</Label>
      <div className="flex flex-wrap" style={{ gap: 8 }} role="radiogroup" aria-label="Cover colour">
        {COVER_COLOURS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={draft.coverColour === c}
            aria-label={`Cover colour ${c}`}
            disabled={!editable}
            onClick={() => set("coverColour", c)}
            className="tap disabled:opacity-60 relative before:absolute before:-inset-1 before:content-['']"
            style={{ width: 36, height: 36, borderRadius: 11, background: coverBackground(c, dark), border: draft.coverColour === c ? `2.5px solid ${INK.prDeep}` : `1px solid ${INK.b10}` }}
          />
        ))}
      </div>

      <div style={{ height: 12 }} />
      <Field
        id="course-title"
        label="Title"
        value={draft.title}
        onChange={(v) => set("title", v)}
        maxLength={LIMITS.title.max}
        disabled={!editable}
        invalid={!!tErr}
        note={tErr ? `At least ${TITLE_MIN} characters.` : undefined}
      />
      {tErr && <FieldError>{tErr}</FieldError>}
      <div style={{ height: 12 }} />
      <Field id="course-subtitle" label="Subtitle" value={draft.subtitle} onChange={(v) => set("subtitle", v)} maxLength={LIMITS.subtitle.max} disabled={!editable} />
      <div style={{ height: 12 }} />
      <div>
        <span className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
          Category
        </span>
        <button
          type="button"
          ref={undefined}
          onClick={(e) => setMenu(e.currentTarget)}
          disabled={!editable}
          aria-haspopup="menu"
          aria-label={`Category: ${cat?.name ?? ""}`}
          className="tap flex items-center justify-between disabled:opacity-60"
          style={{ ...fieldBox(!!menu), gap: 8 }}
        >
          <span className="flex-1 min-w-0 text-left truncate">{cat?.name ?? ""}</span>
          <ChevronDown size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
        </button>
        {showErrors && !draft.categoryKey && <FieldError>Choose a category</FieldError>}
      </div>
      <PopupMenu<string>
        open={!!menu}
        anchor={menu}
        onClose={() => setMenu(null)}
        options={categories.map((c) => ({ value: c.key, label: c.name }))}
        selected={draft.categoryKey}
        onSelect={(k) => {
          set("categoryKey", k);
          setMenu(null);
        }}
      />

      <Label>Level</Label>
      <ChipRow items={COURSE_LEVELS.map((l) => ({ key: l, label: levelLabel(l) }))} on={draft.level} onPick={(k) => set("level", k)} disabled={!editable} />

      <div style={{ height: 14 }} />
      <Field
        id="course-hours"
        label="Hours a week"
        value={draft.weeklyHours}
        onChange={(v) => set("weeklyHours", v)}
        inputMode="decimal"
        disabled={!editable}
        invalid={hoursBad}
        note="Roughly how long a week takes. Leave it blank if it varies."
      />
      {hoursBad && <FieldError>That needs to be between 0.5 and {LIMITS.weeklyHours.max} hours.</FieldError>}
      <div style={{ height: 12 }} />
      <TextBox id="course-points" label="What you'll learn" value={draft.learnPoints} onChange={(v) => set("learnPoints", v)} rows={4} disabled={!editable} />
      <Note mt={6}>One per line, up to {LIMITS.learnPoints}.</Note>
      {footer}
    </div>
  );
};
