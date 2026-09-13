import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Toggle } from "../ui/Toggle";
import { ShieldCheck, Download, Trash2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { fetchHideReadReceipts, setHideReadReceipts } from "../../services/preferences";

// V7 (QA 7.0): "take inspiration from Apple Health and Google Health for
// the privacy button" — both frame health data as private-by-default,
// stored on-device unless the user explicitly shares it, with clear
// controls to export or delete it. This prototype has no backend, so
// export/delete act on local data only.
export const PrivacySheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [shareWithProfessionals, setShareWithProfessionals] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const [personalization, setPersonalization] = useState(true);

  /**
   * READ RECEIPTS ARE THE ONE REAL CONTROL ON THIS SHEET. The three toggles
   * above hold `useState` and nothing else — they do not even reach
   * localStorage — so this is deliberately kept visually apart rather than
   * sitting in that group, where a row that genuinely writes to the server
   * would be indistinguishable from three that write nowhere.
   *
   * `null` UNTIL THE SERVER ANSWERS, so the switch is not rendered in a
   * position it might have to jump out of. Defaulting it to false on the way
   * in would show "receipts on" to someone who had turned them off, for as
   * long as the read takes.
   */
  const { authUserId } = useApp();
  const [hideReceipts, setHideReceipts] = useState<boolean | null>(null);
  const [savingReceipts, setSavingReceipts] = useState(false);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);

  // Re-read every time the sheet opens rather than once on mount: this
  // preference syncs across platforms, so the value can change somewhere else
  // between two openings of the same session.
  useEffect(() => {
    if (!open || !authUserId) return;
    let cancelled = false;
    void (async () => {
      const res = await fetchHideReadReceipts();
      if (cancelled) return;
      if (res.status === "ok") {
        setHideReceipts(res.hideReadReceipts);
        setReceiptsError(null);
      } else {
        setReceiptsError(res.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, authUserId]);

  const toggleReceipts = async (next: boolean) => {
    if (!authUserId || savingReceipts) return;
    const previous = hideReceipts;
    // Optimistic, then reverted to `previous` rather than to `!next` — those
    // differ when the value was still null, and flipping to a concrete false
    // would invent a state the server never reported.
    setHideReceipts(next);
    setSavingReceipts(true);
    setReceiptsError(null);
    const res = await setHideReadReceipts(authUserId, next);
    setSavingReceipts(false);
    if (res.status === "ok") {
      setHideReceipts(res.hideReadReceipts);
      return;
    }
    setHideReceipts(previous);
    setReceiptsError(res.message);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Privacy">
      <div className="space-y-5 animate-fade-slide-up">
        <div className="flex items-start gap-3 bg-primary-pale rounded-2xl p-4">
          <ShieldCheck size={18} className="text-primary-dark shrink-0 mt-0.5" />
          <p className="text-xs text-primary-dark leading-relaxed">
            Your health data stays on this device by default. It's only shared with a professional or
            business when you explicitly connect with them — you control that per connection in
            Professionals and Explore.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-charcoal">Share with connected professionals</p>
              <p className="text-[11px] text-charcoal-faint">Controlled per-professional in their detail page</p>
            </div>
            <Toggle checked={shareWithProfessionals} onChange={setShareWithProfessionals} label="Share with professionals" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-charcoal">Analytics & diagnostics</p>
              <p className="text-[11px] text-charcoal-faint">Helps improve Centium — never sold to third parties</p>
            </div>
            <Toggle checked={analytics} onChange={setAnalytics} label="Analytics" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-charcoal">Personalized recommendations</p>
              <p className="text-[11px] text-charcoal-faint">Uses your logs to tailor goals and insights</p>
            </div>
            <Toggle checked={personalization} onChange={setPersonalization} label="Personalization" />
          </div>
        </div>

        {/* Only rendered once the server has answered, and only for a signed-in
            account — there is no local fallback for this one, by design. */}
        {authUserId && hideReceipts !== null && (
          <div className="border-t border-charcoal/[0.06] pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-charcoal">Read receipts</p>
                <p className="text-[11px] text-charcoal-faint leading-relaxed">
                  Turn off to stop sharing when you've read messages. You won't be able to see
                  others' read receipts either.
                </p>
              </div>
              <Toggle
                checked={!hideReceipts}
                onChange={(v) => void toggleReceipts(!v)}
                label="Read receipts"
              />
            </div>
            {receiptsError && (
              <p className="text-[11.5px] text-status-high mt-2">{receiptsError}</p>
            )}
          </div>
        )}

        <div className="border-t border-charcoal/[0.06] pt-4 space-y-2">
          <button className="tap w-full flex items-center gap-3 rounded-2xl bg-cream-soft px-4 py-3.5 text-left">
            <Download size={17} className="text-primary" />
            <span className="text-sm font-semibold text-charcoal">Download my data</span>
          </button>
          <button className="tap w-full flex items-center gap-3 rounded-2xl bg-cream-soft px-4 py-3.5 text-left">
            <Trash2 size={17} className="text-[#C0392B]" />
            <span className="text-sm font-semibold text-charcoal">Delete my data</span>
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};
