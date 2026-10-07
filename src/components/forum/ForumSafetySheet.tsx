import { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { blockAuthor, reportPost, type PostRef } from "../../services/forum";
import { DangerLine } from "./parts";
import { fv } from "./forumColor";
import { FORUM_REPORT_REASONS, type ReportReasonKey } from "../../services/forum/rules";

// Report a post, or block its author: what MO1.3.3's ⋮ dropdown menu
// (ForumPostView) opens for someone else's post or reply.
//
// KEEP-SAFETY (handover-complete pass, 2026-10-07): reporting and blocking
// have no frame, so they stay, restyled to the handover's parts: the
// Foundations lavender-header sheet, single-select rows with the trailing
// 20 pt check circle (Foundations › Checks and radios), a 52 pt footer CTA in
// the sheet and errors as a plain danger line. The menu picks which of the
// two this sheet asks, so each is one decision (was one sheet holding both).
//
// BLOCK NAMES A POST, NOT A PERSON. block_forum_author finds the author on the
// server and writes the ordinary user_blocks row, so the block is the same
// one messaging uses: it hides their posts and replies from you, yours from
// them, and closes messages between you. The reader never learns who it was.

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "report" | "block";
  target: PostRef | null;
  kind: "post" | "reply";
  authorLabel: string;
  onBlocked: () => void;
};

export function ForumSafetySheet(props: Props) {
  // BottomSheet renders nothing while closed, so the body mounts afresh on
  // every opening: the first reason, nothing sent.
  const title =
    props.mode === "block" ? `Block ${props.authorLabel}?` : props.kind === "post" ? "Report this post" : "Report this reply";
  return (
    <BottomSheet open={props.open} onClose={props.onClose} title={title}>
      {props.mode === "block" ? <BlockBody {...props} /> : <ReportBody {...props} />}
    </BottomSheet>
  );
}

function ReportBody({ target }: Props) {
  const [reason, setReason] = useState<ReportReasonKey>("harmful_health_advice");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!target || busy) return;
    setBusy(true);
    setError(null);
    const r = await reportPost(target, reason);
    setBusy(false);
    if (!r.ok) setError(r.message);
    else setSent(true);
  };

  return (
    <div className="flex flex-col gap-3.5" style={{ color: fv("text") }}>
      <p className="m-0 text-[13px] font-medium leading-[1.55]" style={{ color: fv("muted") }}>
        A moderator will review it. The author won't be told who reported it.
      </p>
      {sent ? (
        <p role="status" className="m-0 text-[14px] font-semibold" style={{ color: fv("text") }}>
          Report sent. Thank you.
        </p>
      ) : (
        <>
          <fieldset className="border-none m-0 p-0 flex flex-col gap-1.5">
            <legend className="text-[12px] font-semibold p-0 mb-1.5" style={{ color: fv("muted") }}>
              Reason
            </legend>
            {FORUM_REPORT_REASONS.map((r) => {
              const on = reason === r.value;
              return (
                <label
                  key={r.value}
                  className="flex items-center gap-2.5 min-h-[48px] px-3.5 rounded-[14px] text-[14px] font-semibold cursor-pointer"
                  style={{ border: on ? `1.5px solid ${fv("accent")}` : `1px solid ${fv("border")}`, background: on ? fv("rules-bg") : fv("card") }}
                >
                  <input type="radio" name="forum-report-reason" checked={on} onChange={() => setReason(r.value)} className="sr-only" />
                  <span className="flex-1 min-w-0">{r.label}</span>
                  <span
                    aria-hidden
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={on ? { background: fv("accent"), color: fv("on-accent") } : { border: `1.5px solid ${fv("border")}` }}
                  >
                    {on && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                </label>
              );
            })}
          </fieldset>
          {error && <DangerLine>{error}</DangerLine>}
          <CtaButton label={busy ? "Sending…" : "Send report"} loading={busy} onClick={() => void send()} />
        </>
      )}
    </div>
  );
}

function BlockBody({ target, onClose, onBlocked }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const block = async () => {
    if (!target || busy) return;
    setBusy(true);
    setError(null);
    const r = await blockAuthor(target);
    setBusy(false);
    if (!r.ok) setError(r.message);
    else onBlocked();
  };

  return (
    <div className="flex flex-col gap-3.5" style={{ color: fv("text") }}>
      <p className="m-0 text-[13px] font-medium leading-[1.55]" style={{ color: fv("muted") }}>
        Blocking hides their posts and replies from you, and yours from them, here and in messages.
      </p>
      {error && <DangerLine>{error}</DangerLine>}
      <CtaButton
        label={busy ? "Blocking…" : "Block"}
        loading={busy}
        onClick={() => void block()}
        className="!bg-[var(--forum-danger)] !text-white"
      />
      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        className="tap self-center h-11 px-3 text-[13px] font-bold"
        style={{ color: fv("link") }}
      >
        Cancel
      </button>
    </div>
  );
}
