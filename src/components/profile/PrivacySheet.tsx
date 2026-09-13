import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomSheet } from "../ui/BottomSheet";
import { Toggle } from "../ui/Toggle";
import { ShieldCheck, Download, Trash2, Users, ChevronRight } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { fetchHideReadReceipts, setHideReadReceipts } from "../../services/preferences";

// V7 (QA 7.0): "take inspiration from Apple Health and Google Health for
// the privacy button" — both frame health data as private-by-default, with
// clear controls over who may see it.
//
// THE "STAYS ON THIS DEVICE" FRAMING IS GONE, BECAUSE IT STOPPED BEING TRUE.
// It was written when this had no backend, and said so. health-metrics, food,
// labs, imaging and medical-history all read and write Supabase now, so the
// sentence had become a claim about data handling that was wrong in the
// direction that understates what the app does — on a screen titled Privacy.
//
// Private-by-default still holds; only the mechanism changed. It is
// client_access_grants: a row per category per professional, granting nothing
// until the client turns something on, revocable afterwards. That is a
// stronger and more specific promise than "no server", so the copy names it
// rather than softening to something vague.
//
// DOWNLOAD / DELETE MY DATA ARE STILL NOT WIRED — neither button carries an
// onClick, so they act on nothing at all rather than "on local data only" as
// this note used to say. Real account deletion is in Settings, not here.
export const PrivacySheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  /**
   * THE ONLY TOGGLE ON THIS SHEET, now that the other three are gone. It was
   * kept visually apart from them while they existed, because a row that
   * genuinely writes to the server should not sit indistinguishably beside
   * three that wrote nowhere. That separation is no longer load-bearing, but
   * the ordering it produced is kept: navigation first, then the switch.
   *
   * `null` UNTIL THE SERVER ANSWERS, so the switch is not rendered in a
   * position it might have to jump out of. Defaulting it to false on the way
   * in would show "receipts on" to someone who had turned them off, for as
   * long as the read takes.
   */
  const { authUserId, user } = useApp();
  const navigate = useNavigate();
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
            Your health data is stored securely on Centium's servers, and connecting with a
            professional doesn't give them access to it. You choose what each one can see, category
            by category, and can change or withdraw it any time — in Profile or the Professionals
            tab.
          </p>
        </div>

        {/* CUSTOMER ONLY, matching how Settings and Profile gate their other
            client-side sections. A professional has no professionals of their
            own to share with, and the Professionals tab renders their client
            roster instead of the directory — so for them this row would both
            read oddly and navigate somewhere unrelated. */}
        {user.accountType === "customer" && (
          <button
            onClick={() => {
              onClose();
              navigate("/app/professionals");
            }}
            className="tap w-full flex items-center gap-3 rounded-2xl bg-cream-soft px-4 py-3.5 text-left"
          >
            <Users size={17} className="text-primary shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-charcoal">
                Sharing with professionals
              </span>
              <span className="block text-[11px] text-charcoal-faint">
                Manage what each professional can see
              </span>
            </span>
            <ChevronRight size={17} className="text-charcoal-faint shrink-0" />
          </button>
        )}

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
