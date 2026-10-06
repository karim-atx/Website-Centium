import { useEffect, useState } from "react";
import { acknowledgeWarning, fetchUnseenWarnings, type ForumWarning } from "../../services/forum";
import { ShieldAlert } from "lucide-react";
import { fv } from "./forumColor";

// A moderator's warning to this member (my_forum_warnings), shown at the top
// of the forum until they acknowledge it (acknowledge_forum_warning). Only
// the member can read their own warnings; nobody else is told.

export function WarningNotice() {
  const [warnings, setWarnings] = useState<ForumWarning[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void fetchUnseenWarnings().then((w) => live && setWarnings(w));
    return () => {
      live = false;
    };
  }, []);

  const current = warnings[0];
  if (!current) return null;

  const acknowledge = async () => {
    setBusy(true);
    setError(null);
    const r = await acknowledgeWarning(current.id);
    setBusy(false);
    if (!r.ok) setError(r.message);
    else setWarnings((prev) => prev.filter((w) => w.id !== current.id));
  };

  // Decision 23 (item 265): restyled as an inline notice card. Foundations
  // has no notice-card entry of its own, so it is built from its parts: the
  // card (white, 1 px border.card, radius 18, padding 14), a 36 pt tile
  // (radius 11) with a 17 pt icon in the forum's amber, a 14/700 title, the
  // 13/500 body, and the "Text action" button (13/700 primary.accent).
  return (
    <div role="status" className="rounded-[18px] p-[14px] flex gap-3 bg-cream-card border border-charcoal/[0.08]">
      <span className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0" style={{ background: fv("amber-bg"), color: fv("held-ink") }} aria-hidden>
        <ShieldAlert size={17} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <span className="text-[14px] font-bold text-charcoal">A message from the moderators</span>
        <p className="m-0 text-[13px] font-medium leading-[1.55] whitespace-pre-wrap [overflow-wrap:anywhere]" style={{ color: fv("body") }}>
          {current.body}
        </p>
        {error && <p role="alert" className="m-0 text-[12px] font-semibold text-status-high">{error}</p>}
        <button
          type="button"
          onClick={() => void acknowledge()}
          disabled={busy}
          // 44 to the finger, the text action drawn flush with the body.
          className="tap self-start h-11 -my-2 text-[13px] font-bold text-primary-accent disabled:opacity-60"
        >
          {busy ? "Saving…" : "I understand"}
        </button>
      </div>
    </div>
  );
}
