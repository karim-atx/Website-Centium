import React, { useRef, useState } from "react";
import { ChevronDown, ImagePlus } from "lucide-react";
import { COURSE_LEVELS, COVER_COLOURS, LIMITS } from "../../../services/courses/author";
import { DESCRIPTION_MAX, FOCUS_CHOICES, FOCUS_MAX } from "../../../services/courses/authorRules";
import { IMAGE_ACCEPT, validateCourseImage } from "../../../services/courses/extras";
import type { CourseCategory } from "../../../services/courses";
import { levelLabel } from "../../../services/courses/rules";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { PopupMenu } from "../../ui/PopupMenu";
import { INK } from "../proInk";
import { coverBackground } from "../../courses/courseCover";
import { ImageApprovalBadge, ImageApprovalNote, type OwnImageState } from "../../moderation/ImageApproval";
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
  /** Round D: courses.description (up to 2,000) and focus (up to 300). */
  description: string;
  focus: string;
}


/** The cover tile's state, kept by the sheet: a picked file waits for Save, then goes for approval. */
export interface CoverControl {
  /** The approved cover (course-covers), or null. */
  approvedUrl: string | null;
  /** The author's own pending or refused submission. */
  own: OwnImageState;
  pick: { file: File; preview: string } | null;
  onPick: (file: File | null) => void;
  /** Takes back a cover still waiting for approval. */
  onWithdraw: () => void;
  /** Removes the approved cover at once (remove_course_cover). */
  onRemove: () => void;
  /** A published course's cover changes the live course once approved, not through the revision. */
  live: boolean;
}

/**
 * Release 3 · W6 MO28 "Create course · 1 Basics" (cBasics18) and its
 * validation state:
 * - the cover tile (120, r16, 1.5 dashed 11% border; image-plus 22 / 1.75;
 *   "Add a cover image" 12.5 / 700; "16 by 9 works best" 11). Round D: a
 *   picked photo is kept here until Save, then goes through image approval
 *   (course_cover) with the usual "Waiting for approval" badge and note; the
 *   colour swatches stay as the fallback when there's no approved cover;
 * - Title (40 high field) with "At least 8 characters." and "Use at least 8
 *   characters" (11.5 / 600 status.high), Subtitle, Category (field with
 *   chevron-down 14, PopupMenu of course_categories), Level (chips18: 32,
 *   r10, 12.5 / 700);
 * - Round D: "Description" and Focus (Training / Nutrition / Health
 *   education chips; both checked against the word lists); kept from the
 *   old builder: "Hours a week" and "What you'll learn".
 */
export const BasicsStep: React.FC<{
  draft: BasicsDraft;
  onChange: (d: BasicsDraft) => void;
  categories: CourseCategory[];
  editable: boolean;
  showErrors: boolean;
  reviewReason: string | null;
  cover: CoverControl;
  footer: React.ReactNode;
}> = ({ draft, onChange, categories, editable, showErrors, reviewReason, cover, footer }) => {
  const dark = useIsDark();
  const [menu, setMenu] = useState<HTMLButtonElement | null>(null);
  const [coverErr, setCoverErr] = useState<string | null>(null);
  const [removeAsk, setRemoveAsk] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);
  const set = (k: keyof BasicsDraft, v: string) => onChange({ ...draft, [k]: v });
  const own = cover.pick ? null : cover.own;
  const coverSrc = cover.pick?.preview ?? (own?.status === "pending" ? own.url : null) ?? cover.approvedUrl;
  const pickCover = (f: File | null | undefined) => {
    if (!f) return;
    const bad = validateCourseImage(f);
    setCoverErr(bad);
    if (!bad) cover.onPick(f);
  };
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
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={!editable}
        aria-label={coverSrc ? "Change the cover image" : "Add a cover image"}
        className="tap relative w-full flex flex-col items-center justify-center overflow-hidden disabled:cursor-default"
        style={{ height: 120, borderRadius: 16, background: coverBackground(draft.coverColour, dark), border: coverSrc ? `1px solid ${INK.b10}` : `1.5px dashed rgb(var(--c-charcoal) / 0.11)`, gap: 6 }}
      >
        {coverSrc ? (
          <img src={coverSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <>
            <ImagePlus size={22} strokeWidth={1.75} aria-hidden style={{ color: INK.chF }} />
            <span className="whitespace-nowrap" style={{ fontSize: textPx(12.5), fontWeight: 700, color: INK.chS, background: INK.card, padding: "1px 8px", borderRadius: 6 }}>
              Add a cover image
            </span>
            <span style={{ fontSize: textPx(11), color: INK.chS, background: INK.card, padding: "0 6px", borderRadius: 6 }}>16 by 9 works best</span>
          </>
        )}
        {own && <ImageApprovalBadge state={own} className="absolute top-2 left-2" />}
      </button>
      <input ref={input} type="file" accept={IMAGE_ACCEPT} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => {
          pickCover(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {coverErr && <FieldError>{coverErr}</FieldError>}
      {cover.pick ? (
        <Note mt={6}>
          Sent for approval when you save.{" "}
          <button type="button" onClick={() => cover.onPick(null)} className="tap font-bold underline" style={{ color: INK.prDeep }}>
            Don't use it
          </button>
        </Note>
      ) : own ? (
        <>
          <ImageApprovalNote state={own} className="mt-1.5" />
          {own.status === "pending" && editable && (
            <button type="button" onClick={cover.onWithdraw} className="tap" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.hi, minHeight: 32 }}>
              Remove this photo
            </button>
          )}
        </>
      ) : (
        <Note mt={6}>JPEG, PNG or WebP, up to 5 MB. {cover.live ? "A new cover goes live once our team approves it." : "Our team approves it before others see it."}</Note>
      )}
      {!cover.pick && cover.approvedUrl && own?.status !== "pending" && (
        removeAsk ? (
          <div className="flex flex-wrap items-center" style={{ gap: 10, marginTop: 6 }}>
            <span style={{ fontSize: textPx(12), color: INK.chF }}>Remove the cover? A new one needs approval again.</span>
            <button
              type="button"
              onClick={() => {
                setRemoveAsk(false);
                cover.onRemove();
              }}
              className="tap"
              style={{ fontSize: textPx(12), fontWeight: 700, color: INK.hi, minHeight: 32 }}
            >
              Remove
            </button>
            <button type="button" onClick={() => setRemoveAsk(false)} className="tap" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep, minHeight: 32 }}>
              Keep it
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setRemoveAsk(true)} className="tap" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.hi, minHeight: 32 }}>
            Remove cover
          </button>
        )
      )}
      <Label>Cover colour</Label>
      <p style={{ fontSize: textPx(11), color: INK.chF, marginTop: -2, marginBottom: 6 }}>Shown when there's no cover image.</p>
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

      <Label>Focus</Label>
      <ChipRow
        items={FOCUS_CHOICES.map((f) => ({ key: f, label: f }))}
        on={draft.focus}
        onPick={(k) => set("focus", draft.focus === k ? "" : k)}
        disabled={!editable}
      />
      {draft.focus !== "" && !(FOCUS_CHOICES as readonly string[]).includes(draft.focus) && <Note mt={6}>Focus: {draft.focus}</Note>}

      <div style={{ height: 14 }} />
      <TextBox
        id="course-description"
        label="Description"
        value={draft.description}
        onChange={(v) => set("description", v)}
        rows={4}
        maxLength={DESCRIPTION_MAX}
        disabled={!editable}
        placeholder="What the course covers and who it's for"
      />
      <Note mt={6}>
        Up to {DESCRIPTION_MAX.toLocaleString("en-US")} characters. {draft.description.length > DESCRIPTION_MAX - 200 ? `${(DESCRIPTION_MAX - draft.description.length).toLocaleString("en-US")} left.` : ""}
      </Note>
      {draft.focus.length > FOCUS_MAX && <FieldError>The focus is up to {FOCUS_MAX} characters.</FieldError>}

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
