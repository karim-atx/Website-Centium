import { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Toggle } from "../ui/Toggle";
import { useApp } from "../../context/AppContext";
import { Building2, Globe2 } from "lucide-react";
import {
  fetchMyAffiliation,
  fetchMyProfile,
  saveMyProfile,
  setPublicListing,
  type Affiliation,
  type ProfessionalProfile,
} from "../../services/professional-profile";

type Draft = {
  specialty: string;
  location: string;
  bio: string;
  website: string;
  instagram: string;
  facebook: string;
  x: string;
};

const emptyDraft: Draft = {
  specialty: "",
  location: "",
  bio: "",
  website: "",
  instagram: "",
  facebook: "",
  x: "",
};

const draftFrom = (p: ProfessionalProfile | null): Draft =>
  p
    ? {
        specialty: p.specialty ?? "",
        location: p.location ?? "",
        bio: p.bio ?? "",
        website: p.website ?? "",
        instagram: p.instagram ?? "",
        facebook: p.facebook ?? "",
        x: p.x ?? "",
      }
    : emptyDraft;

/** Empty strings are absences, not values — don't write "" over a null. */
const orNull = (s: string) => (s.trim() === "" ? null : s.trim());

const fields: { key: keyof Draft; label: string; placeholder: string; multiline?: boolean }[] = [
  { key: "specialty", label: "Specialty", placeholder: "e.g. Strength & conditioning" },
  { key: "location", label: "Location", placeholder: "e.g. Beirut" },
  { key: "bio", label: "Bio", placeholder: "A couple of lines about how you work.", multiline: true },
  { key: "website", label: "Website", placeholder: "yoursite.com" },
  { key: "instagram", label: "Instagram", placeholder: "@handle" },
  { key: "facebook", label: "Facebook", placeholder: "Page name or URL" },
  { key: "x", label: "X", placeholder: "@handle" },
];

/**
 * A professional's public listing: the content, and the switch that publishes
 * it.
 *
 * These live together deliberately. The switch decides whether strangers can
 * see this, and the fields above it are exactly what they would see — putting
 * the control anywhere else would let someone publish without ever having
 * looked at what gets published.
 *
 * FOUR STATES for the switch, not two:
 *
 *   loading      nothing is known yet; the switch is not offered.
 *   no profile   nothing saved yet, so there is nothing to list. The database
 *                would answer "professional profile not found"; saying "save
 *                your details first" is the same fact in a useful form.
 *   affiliated   a business owns this professional's listing. Blocked by the
 *                database (ATX03), explained here by name.
 *   ready        off or on, and writable.
 */
export const PublicListingSheet: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { authUserId } = useApp();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [affiliation, setAffiliation] = useState<Affiliation | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [listingBusy, setListingBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Re-read on every open rather than once on mount: this sheet is rendered
  // permanently by More, so state from a previous open would otherwise
  // survive — including a stale affiliation, which is the one value here that
  // another person can change without this user doing anything.
  useEffect(() => {
    if (!open || !authUserId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSaved(false);
    void (async () => {
      const result = await fetchMyProfile(authUserId);
      if (cancelled) return;
      if (!result.ok) {
        setError(result.message);
        setLoading(false);
        return;
      }
      setProfile(result.profile);
      setDraft(draftFrom(result.profile));
      const aff = await fetchMyAffiliation(result.profile?.affiliatedBusinessId ?? null);
      if (cancelled) return;
      setAffiliation(aff);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, authUserId]);

  const save = async () => {
    if (!authUserId || saving) return;
    setSaving(true);
    setError(null);
    const result = await saveMyProfile(authUserId, {
      specialty: orNull(draft.specialty),
      location: orNull(draft.location),
      bio: orNull(draft.bio),
      website: orNull(draft.website),
      instagram: orNull(draft.instagram),
      facebook: orNull(draft.facebook),
      x: orNull(draft.x),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setProfile(result.profile);
    setSaved(true);
  };

  const toggleListing = async (next: boolean) => {
    if (listingBusy) return;
    setListingBusy(true);
    setError(null);
    const result = await setPublicListing(next);
    setListingBusy(false);

    if (result.status === "ok") {
      setProfile((p) => (p ? { ...p, listedPublicly: result.listed } : p));
      return;
    }
    if (result.status === "affiliated") {
      // Affiliation arrived between the read and the write. Re-read so the
      // switch stops being offered at all, rather than leaving a control that
      // will keep refusing.
      const refreshed = authUserId ? await fetchMyProfile(authUserId) : null;
      if (refreshed?.ok) {
        setProfile(refreshed.profile);
        setAffiliation(await fetchMyAffiliation(refreshed.profile?.affiliatedBusinessId ?? null));
      }
      return;
    }
    if (result.status === "no_profile") {
      setError("Save your details first — there's nothing to list yet.");
      return;
    }
    setError(result.message);
  };

  const listed = profile?.listedPublicly ?? false;

  return (
    <BottomSheet open={open} onClose={onClose} title="Your public listing">
      <div className="space-y-5 animate-fade-slide-up">
        <p className="text-[11px] text-charcoal-soft leading-relaxed">
          This is what clients see when they browse Explore. Nothing here is public until you turn
          the switch on.
        </p>

        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{f.label}</span>
            {f.multiline ? (
              <textarea
                rows={3}
                value={draft[f.key]}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            ) : (
              <input
                value={draft[f.key]}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            )}
          </label>
        ))}

        {error && <p className="text-xs font-semibold text-status-high">{error}</p>}

        <Button fullWidth onClick={() => void save()} disabled={saving || loading}>
          {saving ? "Saving…" : saved ? "Saved" : "Save details"}
        </Button>

        <div className="pt-4 border-t border-charcoal/[0.08]">
          {loading ? (
            <p className="text-xs text-charcoal-faint">Loading your listing…</p>
          ) : affiliation ? (
            // Blocked, and told why. The switch is rendered so the setting is
            // visibly present rather than mysteriously absent, but it is off,
            // non-interactive, and explained.
            <div className="rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-3">
              <div className="flex items-start gap-2.5">
                <Building2 size={15} className="text-charcoal-soft shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-charcoal">Listed by your business</p>
                  <p className="text-[11.5px] text-charcoal-soft mt-0.5 leading-relaxed">
                    Managed by {affiliation.businessName}. Your listing is handled by them while
                    you're affiliated.
                  </p>
                </div>
                <Toggle checked={false} onChange={() => {}} disabled label="Show me in Explore" />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-charcoal flex items-center gap-1.5">
                  <Globe2 size={14} className="text-charcoal-soft" /> Show me in Explore
                </p>
                <p className="text-[11px] text-charcoal-faint mt-0.5">
                  {profile
                    ? listed
                      ? "Clients browsing Explore can find you."
                      : "You're not listed. Only clients with your code can connect."
                    : "Save your details first — there's nothing to list yet."}
                </p>
              </div>
              <Toggle
                checked={listed}
                onChange={(v) => void toggleListing(v)}
                disabled={!profile || listingBusy}
                label="Show me in Explore"
              />
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
};
