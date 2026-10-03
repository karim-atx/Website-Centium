import { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { blockAuthor, reportPost, type PostRef } from "../../services/forum";
import { fv } from "./forumColor";
import { FORUM_REPORT_REASONS, type ReportReasonKey } from "../../services/forum/rules";

// Design screen 5's sheet: report this post, or block its author.
//
// BLOCK NAMES A POST, NOT A PERSON. block_forum_author finds the author on the
// server and writes the ordinary user_blocks row, so the block is the same
// one messaging uses: it hides their posts and replies from you, yours from
// them, and closes messages between you. The reader never learns who it was.

type Props = {
  open: boolean;
  onClose: () => void;
  target: PostRef | null;
  kind: "post" | "reply";
  authorLabel: string;
  onBlocked: () => void;
};

export function ForumSafetySheet(props: Props) {
  // BottomSheet renders nothing while closed, so the body mounts afresh on
  // every opening: the first reason, nothing sent.
  return (
    <BottomSheet open={props.open} onClose={props.onClose} hideHeader>
      <SafetyBody {...props} />
    </BottomSheet>
  );
}

function SafetyBody({ target, kind, authorLabel, onBlocked }: Props) {
  const [reason, setReason] = useState<ReportReasonKey>("harmful_health_advice");
  const [busy, setBusy] = useState<"report" | "block" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!target || busy) return;
    setBusy("report");
    setError(null);
    const r = await reportPost(target, reason);
    setBusy(null);
    if (!r.ok) setError(r.message);
    else setSent(true);
  };

  const block = async () => {
    if (!target || busy) return;
    setBusy("block");
    setError(null);
    const r = await blockAuthor(target);
    setBusy(null);
    if (!r.ok) setError(r.message);
    else onBlocked();
  };

  return (
    <div className="flex flex-col gap-3 pt-2.5 pb-7" style={{ color: fv("text") }}>
      <div className="w-10 h-[5px] rounded-[3px] self-center" style={{ background: fv("handle") }} aria-hidden="true" />
      <h2 className="m-0 text-[19px] font-extrabold">{kind === "post" ? "Report this post" : "Report this reply"}</h2>
      <p className="m-0 text-[13px] leading-[1.5]" style={{ color: fv("muted") }}>
        A moderator will review it. The author won't be told who reported it.
      </p>
      {sent ? (
        <p role="status" className="m-0 text-sm font-bold rounded-xl px-3.5 py-3" style={{ background: fv("rules-bg"), color: fv("rules-ink") }}>
          Report sent. Thank you.
        </p>
      ) : (
        <>
          <fieldset className="border-none m-0 p-0 flex flex-col">
            <legend className="text-[13px] font-extrabold p-0 mb-1">Reason</legend>
            {FORUM_REPORT_REASONS.map((r, i) => (
              <label
                key={r.value}
                className="flex items-center gap-2.5 min-h-[48px] text-sm font-semibold cursor-pointer"
                style={i < FORUM_REPORT_REASONS.length - 1 ? { borderBottom: `1px solid ${fv("rule")}` } : undefined}
              >
                <input
                  type="radio"
                  name="forum-report-reason"
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  style={{ accentColor: fv("accent") }}
                />
                {r.label}
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            onClick={() => void send()}
            disabled={!!busy}
            className="tap h-[52px] rounded-2xl text-[15px] font-extrabold disabled:opacity-60"
            style={{ background: fv("danger"), color: "#FFFFFF" }}
          >
            {busy === "report" ? "Sending…" : "Send report"}
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="m-0 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => void block()}
        disabled={!!busy}
        className="tap h-12 rounded-2xl text-sm font-bold disabled:opacity-60 [overflow-wrap:anywhere] px-3"
        style={{ border: `1px solid ${fv("border")}`, background: fv("card"), color: fv("text") }}
      >
        {busy === "block" ? "Blocking…" : `Block ${authorLabel}`}
      </button>
      <span className="text-xs leading-[1.5] text-center" style={{ color: fv("muted") }}>
        Blocking hides their posts and replies from you, and yours from them, here and in messages.
      </span>
    </div>
  );
}
