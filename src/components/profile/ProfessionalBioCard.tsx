import { useEffect, useState } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { fetchMyProfile, saveMyProfile } from "../../services/professional-profile";

/**
 * The professional's bio, on their own Profile tab.
 *
 * REPLACES A FIELD THAT WENT NOWHERE. This card used to be a bare textarea
 * bound to `user.professionalBio` through `updateProfile`, which is `setUser`
 * — localStorage and nothing else. It wrote on every keystroke, showed no save
 * control, and its placeholder promised "This will appear to clients on your
 * Explore listing", which it could not: `professionalBio` had no reader
 * anywhere in the app, while every surface that displays a bio reads
 * `professional_profiles.bio`. A professional could write one, see it persist
 * across reloads, and have no client ever see it.
 *
 * SAME COLUMN AS THE PUBLIC LISTING SHEET, so the two are now one bio with two
 * entry points rather than two fields that look alike. This reads the server
 * value on mount instead of local state, so opening either surface shows what
 * the other last saved.
 *
 * AN EXPLICIT SAVE, NOT A WRITE PER CHARACTER. The button appears only when
 * the text differs from what is stored, which makes "you have unsaved changes"
 * a visible state rather than something to infer. Blur-to-save was the
 * alternative and is worse here: blur fires when someone switches app or tab,
 * so the write would happen invisibly at a moment they were not thinking about
 * it — the same ambiguity this card exists to remove.
 *
 * ONLY THE bio COLUMN IS SENT. `saveMyProfile` builds its payload from the
 * keys actually present, so a bio-only patch cannot disturb specialty,
 * location, socials or rates. That is what makes two editors of the same row
 * safe: this one never writes a field it does not show.
 *
 * The reverse direction has a last-write-wins window — the listing sheet sends
 * bio along with its six other fields, so a sheet left open before a save here
 * would overwrite this with the bio it read on open. In practice the sheet
 * re-reads every time it opens and is a modal, so it cannot be open while this
 * textarea is being typed into. Recorded rather than guarded: the machinery to
 * close it would cost more than the case is worth.
 */
export const ProfessionalBioCard: React.FC = () => {
  const { authUserId } = useApp();
  const [stored, setStored] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void fetchMyProfile(authUserId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        const bio = result.profile?.bio ?? "";
        setStored(bio);
        setDraft(bio);
      } else {
        setError(result.message);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  const dirty = draft.trim() !== stored.trim();

  const save = async () => {
    if (!authUserId || saving) return;
    setSaving(true);
    setError(null);
    const next = draft.trim();
    const result = await saveMyProfile(authUserId, { bio: next === "" ? null : next });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    // From the response rather than from the draft: what the row actually
    // holds is the only thing that should be treated as saved.
    setStored(result.profile.bio ?? "");
    setDraft(result.profile.bio ?? "");
    setSaved(true);
  };

  return (
    <Card className="mb-6 mt-4 animate-fade-slide-up">
      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">Bio</p>
      <textarea
        value={draft}
        disabled={loading}
        onChange={(e) => {
          setDraft(e.target.value);
          setSaved(false);
        }}
        placeholder="This will appear to clients on your Explore listing, and to clients you're connected to."
        rows={3}
        className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none disabled:opacity-60"
      />

      {error && <p className="text-[11px] font-semibold text-status-high mt-2">{error}</p>}

      {/* Nothing at rest. A permanently-visible Save on a saved field is the
          same lie in the other direction — it implies there is something to
          do. "Saved" appears only after a write this card actually made. */}
      {loading ? (
        <p className="text-[11px] text-charcoal-faint mt-2">Loading…</p>
      ) : dirty ? (
        <Button size="sm" className="mt-2.5" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save bio"}
        </Button>
      ) : saved ? (
        <p className="text-[11px] font-semibold text-primary-dark mt-2">Saved</p>
      ) : null}
    </Card>
  );
};
