import { useEffect, useState } from "react";
import {
  formatCents,
  priceBreakdown,
  updateCourseDetails,
  COURSE_LEVELS,
  COVER_COLOURS,
  LIMITS,
  type AuthoredCourse,
  type NetEarnings,
} from "../../../services/courses/author";
import type { CourseCategory } from "../../../services/courses";
import { levelLabel } from "../../../services/courses/rules";
import { fv } from "../../forum/forumColor";
import { AuthorCard, ErrorNote, FieldLabel, Hint, PrimaryButton, QuietButton, TextArea, TextField } from "./authorParts";

// The course's own details, and its price.
//
// EVERY FIELD IS SENT ONLY IF IT CHANGED. update_course_details treats null as
// "unchanged", and on a revision it means something stronger — "this revision
// does not change that field" — which is what lets a revision be applied by
// copying only the columns it actually sets. Sending the whole form every time
// would make every revision claim to change everything.

export function CourseDetailsEditor({
  course,
  categories,
  revisionId,
  editable,
  commission,
  earnings,
  lockedReason,
  onSaved,
}: {
  course: AuthoredCourse;
  categories: CourseCategory[];
  revisionId: string | null;
  editable: boolean;
  commission: number | null;
  earnings: NetEarnings | null;
  /** Why the fields are disabled, so the note can say which. */
  lockedReason: "review" | "published" | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(course.title);
  const [subtitle, setSubtitle] = useState(course.subtitle ?? "");
  const [categoryKey, setCategoryKey] = useState(course.categoryKey);
  const [level, setLevel] = useState(course.level);
  const [weeklyHours, setWeeklyHours] = useState(course.weeklyHours === null ? "" : String(course.weeklyHours));
  const [learnPoints, setLearnPoints] = useState(course.learnPoints.join("\n"));
  const [coverColour, setCoverColour] = useState(course.coverColour);
  const [free, setFree] = useState(course.priceCents === 0);
  const [dollars, setDollars] = useState(course.priceCents === 0 ? "" : String(course.priceCents / 100));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Re-seed when the loaded course changes underneath — after a save, or when
  // a revision opens and the header becomes the revision's overrides.
  useEffect(() => {
    setTitle(course.title);
    setSubtitle(course.subtitle ?? "");
    setCategoryKey(course.categoryKey);
    setLevel(course.level);
    setWeeklyHours(course.weeklyHours === null ? "" : String(course.weeklyHours));
    setLearnPoints(course.learnPoints.join("\n"));
    setCoverColour(course.coverColour);
    setFree(course.priceCents === 0);
    setDollars(course.priceCents === 0 ? "" : String(course.priceCents / 100));
  }, [course]);

  const parsedPrice = free ? 0 : Math.round(Number(dollars.replace(/[^0-9.]/g, "")) * 100);
  const priceValid = free || (Number.isFinite(parsedPrice) && parsedPrice >= 0 && parsedPrice <= LIMITS.priceCents.max);
  const points = learnPoints
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

  const parsedHours = weeklyHours.trim() === "" ? null : Number(weeklyHours);
  const hoursValid =
    parsedHours === null || (Number.isFinite(parsedHours) && parsedHours > 0 && parsedHours <= LIMITS.weeklyHours.max);

  const titleValid = title.trim().length >= LIMITS.title.min;
  const subtitleValid = subtitle.trim() === "" || subtitle.trim().length >= LIMITS.subtitle.min;
  const pointsValid = points.length <= LIMITS.learnPoints && points.join(" ").length <= LIMITS.learnPointsChars;

  const save = async () => {
    if (busy || !titleValid || !priceValid || !hoursValid || !subtitleValid || !pointsValid) return;
    setBusy(true);
    setError(null);
    setSaved(false);

    // ONLY WHAT CHANGED. See the note at the top of the file.
    const patch: Parameters<typeof updateCourseDetails>[1] = {};
    if (title.trim() !== course.title) patch.title = title.trim();
    if (subtitle.trim() !== (course.subtitle ?? "")) patch.subtitle = subtitle.trim();
    if (categoryKey !== course.categoryKey) patch.categoryKey = categoryKey;
    if (level !== course.level) patch.level = level;
    if (parsedHours !== course.weeklyHours && parsedHours !== null) patch.weeklyHours = parsedHours;
    if (points.join("\n") !== course.learnPoints.join("\n")) patch.learnPoints = points;
    if (coverColour !== course.coverColour) patch.coverColour = coverColour;
    if (parsedPrice !== course.priceCents) patch.priceCents = parsedPrice;

    if (Object.keys(patch).length === 0) {
      setBusy(false);
      setSaved(true);
      return;
    }

    const r = await updateCourseDetails(course.id, patch, revisionId);
    if (!r.ok) setError(r.message);
    else {
      setSaved(true);
      onSaved();
    }
    setBusy(false);
  };

  const breakdown = priceBreakdown(parsedPrice, commission ?? 0);

  return (
    <AuthorCard>
      <span className="text-sm font-extrabold">Course details</span>

      <FieldLabel>Title</FieldLabel>
      <TextField value={title} onChange={setTitle} maxLength={LIMITS.title.max} disabled={!editable} label="Title" />

      <FieldLabel hint="The line under the title in the catalogue.">Subtitle</FieldLabel>
      <TextField
        value={subtitle}
        onChange={setSubtitle}
        maxLength={LIMITS.subtitle.max}
        disabled={!editable}
        placeholder="What somebody will be able to do by the end"
        label="Subtitle"
      />

      <FieldLabel>Category</FieldLabel>
      <select
        value={categoryKey}
        onChange={(e) => setCategoryKey(e.target.value)}
        disabled={!editable}
        aria-label="Category"
        className="h-11 rounded-[14px] px-3 text-sm outline-none w-full disabled:opacity-60"
        style={{ background: fv("card"), border: `1px solid ${fv("border")}`, color: fv("text") }}
      >
        {categories.map((c) => (
          <option key={c.key} value={c.key}>
            {c.name}
          </option>
        ))}
      </select>

      <FieldLabel>Level</FieldLabel>
      <div className="flex gap-1.5 flex-wrap">
        {COURSE_LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            disabled={!editable}
            onClick={() => setLevel(l)}
            className="tap text-[13px] font-bold rounded-full px-3 py-1.5 disabled:opacity-60"
            style={level === l ? { background: fv("accent"), color: fv("on-accent") } : { background: fv("track"), color: fv("muted") }}
          >
            {levelLabel(l)}
          </button>
        ))}
      </div>

      <FieldLabel hint="Roughly how long a week takes. Leave it blank if it varies.">Hours a week</FieldLabel>
      <TextField
        value={weeklyHours}
        onChange={setWeeklyHours}
        placeholder="2"
        disabled={!editable}
        inputMode="decimal"
        label="Hours a week"
      />
      {!hoursValid && <Hint>That needs to be between 0.5 and {LIMITS.weeklyHours.max} hours.</Hint>}

      <FieldLabel hint={`One per line, up to ${LIMITS.learnPoints}.`}>What you'll learn</FieldLabel>
      <TextArea
        value={learnPoints}
        onChange={setLearnPoints}
        disabled={!editable}
        rows={4}
        placeholder={"Build a weekly routine you'll stick to\nLift safely with a barbell"}
        label="What you'll learn"
      />
      {!pointsValid && <Hint>Up to {LIMITS.learnPoints} points, and {LIMITS.learnPointsChars} characters in total.</Hint>}

      <FieldLabel hint="The card's background in the catalogue.">Cover colour</FieldLabel>
      <div className="flex gap-2 flex-wrap">
        {COVER_COLOURS.map((c) => (
          <button
            key={c}
            type="button"
            disabled={!editable}
            onClick={() => setCoverColour(c)}
            aria-label={`Cover colour ${c}`}
            aria-pressed={coverColour === c}
            className="tap w-9 h-9 rounded-[11px] disabled:opacity-60"
            style={{ background: c, border: coverColour === c ? `2.5px solid ${fv("accent")}` : `1px solid ${fv("border")}` }}
          />
        ))}
      </div>

      {/* ---- price ------------------------------------------------------ */}
      <span className="text-sm font-extrabold mt-1">Price</span>
      <div className="flex gap-1.5">
        {[true, false].map((isFree) => (
          <button
            key={String(isFree)}
            type="button"
            disabled={!editable}
            onClick={() => setFree(isFree)}
            className="tap grow basis-0 h-10 rounded-[12px] text-[13px] font-bold disabled:opacity-60"
            style={free === isFree ? { background: fv("accent"), color: fv("on-accent") } : { background: fv("track"), color: fv("muted") }}
          >
            {isFree ? "Free" : "Fixed price"}
          </button>
        ))}
      </div>

      {!free && (
        <>
          <TextField
            value={dollars}
            onChange={setDollars}
            placeholder="29"
            disabled={!editable}
            inputMode="decimal"
            label="Price in dollars"
          />
          {!priceValid && <Hint>A price is up to {formatCents(LIMITS.priceCents.max)}.</Hint>}
        </>
      )}

      {/* WHAT THE PRICE ACTUALLY LEAVES THEM, rounded the way
          course_net_earnings rounds it, so the estimate here and the total
          below cannot disagree by a cent. */}
      {!free && priceValid && parsedPrice > 0 && commission !== null && (
        <div className="rounded-xl px-3 py-2.5 flex flex-col gap-1" style={{ background: fv("track") }}>
          <span className="flex justify-between text-[13px]">
            <span style={{ color: fv("muted") }}>Learner pays</span>
            <strong>{formatCents(parsedPrice)}</strong>
          </span>
          <span className="flex justify-between text-[13px]">
            <span style={{ color: fv("muted") }}>Centium commission ({commission}%)</span>
            <span style={{ color: fv("muted") }}>−{formatCents(breakdown.commissionCents)}</span>
          </span>
          <span className="flex justify-between text-[13px] pt-1" style={{ borderTop: `1px solid ${fv("border")}` }}>
            <strong>You receive</strong>
            <strong>{formatCents(breakdown.netCents)}</strong>
          </span>
        </div>
      )}

      {/* FREE IS A DECISION, NOT AN ABSENCE, so it is worth a line. */}
      {free && <Hint>Anyone over 18 can take it. Videos and readings are free in every course either way — a price adds quizzes, downloadable plans, questions to you, and a certificate.</Hint>}

      {/* What it HAS earned, net of the rate that applied to each sale rather
          than today's rate applied backwards. */}
      {earnings && earnings.sales > 0 && (
        <div className="rounded-xl px-3 py-2.5 flex flex-col gap-1" style={{ background: fv("teal-bg"), color: fv("teal-ink") }}>
          <span className="text-[13px] font-extrabold">
            {earnings.sales} {earnings.sales === 1 ? "sale" : "sales"} so far
          </span>
          <span className="flex justify-between text-[13px]">
            <span>Earned, after commission</span>
            <strong>{formatCents(earnings.netCents)}</strong>
          </span>
        </div>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}

      {editable && (
        <div className="flex gap-2 items-center">
          <span className="grow">
            <PrimaryButton onClick={() => void save()} disabled={busy || !titleValid || !priceValid || !hoursValid || !pointsValid}>
              {busy ? "Saving…" : "Save details"}
            </PrimaryButton>
          </span>
          {saved && !busy && (
            <span className="text-[13px] font-bold" style={{ color: fv("good") }}>
              Saved
            </span>
          )}
        </div>
      )}

      {/* WHY IT IS LOCKED, NOT JUST THAT IT IS. A published course is not with
          a reviewer — it is live, and the way to change it is a revision. Saying
          "with a reviewer" there sent an author looking for a queue they were
          not in. */}
      {!editable && (
        <QuietButton disabled>
          {lockedReason === "review" ? "Locked while it's with a reviewer" : "Published — open a revision above to edit it"}
        </QuietButton>
      )}
    </AuthorCard>
  );
}
