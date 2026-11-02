import { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { fetchMyProfile, saveMyProfile } from "../../services/professional-profile";
import { wellStyle } from "../pro/calendar/calendarFields";
import { CtaButton, ErrorLine } from "../pro/profile/kit";
import { INK } from "../pro/proInk";
import { textPx } from "../../theme/textSize";
import { GuidelinesLink } from "../moderation/GuidelinesLink";
import { t } from "../../i18n/core";

/**
 * The professional's bio. Release 3 W6: the MO14 Edit public profile "Bio"
 * row opens it as a sheet (it was a card on Profile, which MO26 no longer
 * carries).
 *
 * SAME COLUMN EVERYWHERE: professional_profiles.bio, which every surface that
 * displays a bio reads. It reads the server value on every open, so it always
 * shows what was last saved.
 *
 * AN EXPLICIT SAVE, NOT A WRITE PER CHARACTER, and ONLY THE bio COLUMN IS
 * SENT (saveMyProfile builds its payload from the keys present), so it never
 * disturbs the specialty, location, socials or rates.
 */
export const ProfessionalBioSheet: React.FC<{ open: boolean; onClose: () => void; onSaved?: (bio: string | null) => void }> = ({ open, onClose, onSaved }) => {
  const { authUserId } = useApp();
  const [stored, setStored] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !authUserId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchMyProfile(authUserId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        const bio = result.profile?.bio ?? "";
        setStored(bio);
        setDraft(bio);
      } else setError(result.message);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, authUserId]);

  const dirty = draft.trim() !== stored.trim();

  const save = async () => {
    if (!authUserId || saving) return;
    setSaving(true);
    setError(null);
    const next = draft.trim();
    const result = await saveMyProfile(authUserId, { bio: next === "" ? null : next });
    setSaving(false);
    if (!result.ok) return setError(result.message);
    setStored(result.profile.bio ?? "");
    setDraft(result.profile.bio ?? "");
    onSaved?.(result.profile.bio);
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("Bio")}
      footer={<CtaButton label={t("Save")} size="sheet" onClick={() => void save()} disabled={loading || !dirty} busy={saving} full />}
    >
      <label htmlFor="pro-bio" className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
        {t("About you")}
      </label>
      {/* Disabled while loading: anything typed before the read lands would be overwritten by it. */}
      <textarea
        id="pro-bio"
        value={draft}
        disabled={loading}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t("This will appear to clients on your Explore listing, and to clients you're connected to.")}
        rows={7}
        className="w-full resize-none outline-none placeholder:text-charcoal-faint disabled:opacity-60"
        style={{ ...wellStyle(), padding: "10px 12px", lineHeight: 1.5 }}
      />
      {error && (
        <ErrorLine>
          {error}
          <GuidelinesLink message={error} />
        </ErrorLine>
      )}
    </BottomSheet>
  );
};
