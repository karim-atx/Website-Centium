import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { useApp } from "../../context/AppContext";
import { updateDateOfBirth } from "../../services/profile";
import { ageFromDateOfBirth, isoDateYearsAgo, MAX_AGE, MIN_AGE, validateDateOfBirth } from "../../utils/date";

/**
 * A date of birth, asked for where it is missing (Database 16f2f43): being
 * listed publicly or showing an area on the map now needs one on file.
 *
 * Inline, not a modal: an already-listed professional without one keeps their
 * listing and keeps working, so this sits in the sheet until it is answered.
 * Saved to profiles.date_of_birth, the same field Profile edits.
 */
export const DobInline: React.FC<{
  title: string;
  body: string;
  /** Called after the date is saved, e.g. to retry what was refused. */
  onSaved: () => void;
  /** Profile (decision 23 item 100): an r18 card with a 36 #F0EDF9 icon tile,
      like the Recovery card. Unset keeps the gold inline block (Home, the
      public listing sheet). */
  tile?: boolean;
}> = ({ title, body, onSaved, tile }) => {
  const { authUserId, user, updateProfile } = useApp();
  const [dob, setDob] = useState(user.dateOfBirth ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const message = validateDateOfBirth(dob);
    if (message) return setError(message);
    if (!authUserId) return setError("You need to be signed in to change this.");
    setSaving(true);
    setError(null);
    const r = await updateDateOfBirth(authUserId, dob);
    setSaving(false);
    if (!r.ok) return setError(r.message ?? "Couldn't save that. Try again.");
    updateProfile({ dateOfBirth: dob, age: ageFromDateOfBirth(dob) ?? user.age });
    onSaved();
  };

  const field = (
    <>
      <label className="block">
        <span className="text-xs font-semibold text-charcoal-soft mb-1 block">Date of birth</span>
        <input
          type="date"
          value={dob}
          min={isoDateYearsAgo(MAX_AGE)}
          max={isoDateYearsAgo(MIN_AGE)}
          onChange={(e) => {
            setDob(e.target.value);
            setError(null);
          }}
          className="w-full rounded-xl bg-cream-card border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </label>
      {error && <p className="text-xs font-semibold text-status-high">{error}</p>}
      <Button size="sm" onClick={() => void save()} disabled={!dob || saving}>
        {saving ? "Saving…" : "Save date of birth"}
      </Button>
    </>
  );

  if (tile)
    // As the Recovery card (MO1.5 row 7): r18, padding 16 16 18, the glyph
    // 17/1.5 #7D6BB5 in a 36 #F0EDF9 tile, the title 14/600 beside it, and
    // the rest under the title's x, 10 below, 12/400 on an 18 line.
    return (
      <Card padded={false} className="!rounded-[18px] pt-4 px-4 pb-[18px]" role="region" aria-label="Date of birth">
        <span className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0" aria-hidden>
            <CalendarDays size={17} strokeWidth={1.5} className="text-primary-dark" />
          </span>
          <span className="text-sm font-semibold text-charcoal">{title}</span>
        </span>
        <div className="ps-12 mt-2.5 flex flex-col gap-2">
          <p className="text-xs text-charcoal-faint leading-normal">{body}</p>
          {field}
        </div>
      </Card>
    );

  return (
    <div className="rounded-xl bg-gold-pale/60 border border-gold/30 px-3.5 py-3 flex flex-col gap-2" role="region" aria-label="Date of birth">
      <p className="text-sm font-semibold text-charcoal">{title}</p>
      <p className="text-[11.5px] text-charcoal-soft leading-relaxed">{body}</p>
      {field}
    </div>
  );
};
