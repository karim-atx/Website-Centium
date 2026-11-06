import React, { useState } from "react";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { Toast } from "../../ui/Toast";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { replaceManualSteps } from "../../../services/health-metrics";
import { FieldLabel, dayLabel, partBSheetTone } from "../log/LogSheetParts";
import { textPx } from "../../../theme/textSize";
import { t } from "../../../i18n/core";

// Steps history Edit on a hand-logged day (Round J follow-up, Karim
// 2026-11-06): the Part B log sheet shell, one number field for the day's
// count, pinned Save. Replaces that day's hand-logged rows (replaceManualSteps);
// the synced count, if any, is left alone.

export const EditStepsSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  day: string | null;
  initial: number | null;
  /** The day's hand-logged rows being replaced. */
  replaceIds: readonly string[];
}> = ({ open, onClose, onSaved, day, initial, replaceIds }) => {
  const { authUserId, today } = useApp();
  const dark = useIsDark();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setText(initial !== null ? String(initial) : "");
    setSaving(false);
  } else if (!open && wasOpen) setWasOpen(false);

  const value = Number(text.replace(/[^\d]/g, ""));
  const save = async () => {
    if (!authUserId || !day) return;
    setSaving(true);
    const r = await replaceManualSteps({ userId: authUserId, day, today, value, replaceIds });
    setSaving(false);
    if (!r.ok) {
      setToast(r.message ?? t("Couldn't save. Try again."));
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={t("Edit steps")}
        chrome="partB"
        tone={partBSheetTone(dark)}
        footerBottom={30}
        footer={<CtaButton label={t("Save")} loading={saving} disabled={!text.trim()} onClick={() => void save()} />}
      >
        <FieldLabel htmlFor="edit-steps">{day ? dayLabel(day, today) : t("Steps")}</FieldLabel>
        <input
          id="edit-steps"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
          aria-label={t("Steps")}
          className="block w-full bg-cream-soft text-charcoal focus:outline-none"
          style={{ minHeight: 48, borderRadius: 12, padding: "0 12px", fontSize: textPx(18), lineHeight: "24px", fontWeight: 700, fontVariantNumeric: "tabular-nums", border: `0.5px solid ${dark ? "rgba(245,243,250,0.1)" : "rgba(36,31,27,0.1)"}` }}
        />
      </BottomSheet>
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </>
  );
};
