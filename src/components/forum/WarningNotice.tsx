import { useEffect, useState } from "react";
import { acknowledgeWarning, fetchUnseenWarnings, type ForumWarning } from "../../services/forum";
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

  return (
    <div
      role="status"
      className="rounded-2xl px-[14px] py-3 flex flex-col gap-2"
      style={{ background: fv("amber-bg"), color: fv("held-ink") }}
    >
      <span className="text-xs font-extrabold tracking-[0.04em]">A MESSAGE FROM THE MODERATORS</span>
      <p className="m-0 text-[13px] leading-[1.5] whitespace-pre-wrap [overflow-wrap:anywhere]">{current.body}</p>
      {error && <p className="m-0 text-xs font-semibold text-status-high">{error}</p>}
      <button
        type="button"
        onClick={() => void acknowledge()}
        disabled={busy}
        className="tap self-start h-10 rounded-full px-4 text-[13px] font-extrabold disabled:opacity-60"
        style={{ background: fv("card"), color: fv("text"), border: `1px solid ${fv("border")}` }}
      >
        {busy ? "Saving…" : "I understand"}
      </button>
    </div>
  );
}
