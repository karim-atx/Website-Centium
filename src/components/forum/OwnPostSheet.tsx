import { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { editTimeLeft, withdrawPost, type PostRef } from "../../services/forum";
import { fv } from "./forumColor";

// The "…" menu on the reader's own post or reply: edit it within 30 minutes
// of posting (edit_forum_post's window), or withdraw it at any time
// (delete_forum_post). Withdrawing asks once more, because it can't be undone
// from the app.

type Props = {
  open: boolean;
  onClose: () => void;
  target: PostRef | null;
  kind: "post" | "reply";
  createdAt: string;
  onEdit: () => void;
  onWithdrawn: () => void;
};

export function OwnPostSheet(props: Props) {
  // BottomSheet renders nothing while closed, so each opening starts fresh.
  return (
    <BottomSheet open={props.open} onClose={props.onClose} hideHeader>
      <OwnBody {...props} />
    </BottomSheet>
  );
}

function OwnBody({ onClose, target, kind, createdAt, onEdit, onWithdrawn }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Read once when the sheet opens; the server's window is the authority.
  const [minutesLeft] = useState(() => Math.ceil(editTimeLeft(createdAt) / 60_000));
  const noun = kind === "post" ? "post" : "reply";

  const withdraw = async () => {
    if (!target || busy) return;
    setBusy(true);
    setError(null);
    const r = await withdrawPost(target);
    setBusy(false);
    if (!r.ok) setError(r.message);
    else onWithdrawn();
  };

  return (
    <div className="flex flex-col gap-3 pt-2.5 pb-7" style={{ color: fv("text") }}>
      <div className="w-10 h-[5px] rounded-[3px] self-center" style={{ background: fv("handle") }} aria-hidden="true" />
      {confirming ? (
        <>
          <h2 className="m-0 text-[19px] font-extrabold">Withdraw this {noun}?</h2>
          <p className="m-0 text-[13px] leading-[1.5]" style={{ color: fv("muted") }}>
            It will disappear for everyone. This can't be undone.
          </p>
          {error && (
            <p role="alert" className="m-0 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => void withdraw()}
            disabled={busy}
            className="tap h-[52px] rounded-2xl text-[15px] font-extrabold disabled:opacity-60"
            style={{ background: fv("danger"), color: "#FFFFFF" }}
          >
            {busy ? "Withdrawing…" : `Withdraw ${noun}`}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="tap h-12 rounded-2xl text-sm font-bold"
            style={{ border: `1px solid ${fv("border")}`, background: fv("card"), color: fv("text") }}
          >
            Keep it
          </button>
        </>
      ) : (
        <>
          <h2 className="m-0 text-[19px] font-extrabold">Your {noun}</h2>
          <button
            type="button"
            onClick={onEdit}
            disabled={minutesLeft <= 0}
            className="tap min-h-[52px] rounded-2xl px-4 py-2.5 text-left flex flex-col gap-0.5 disabled:opacity-60"
            style={{ border: `1px solid ${fv("border")}`, background: fv("card"), color: fv("text") }}
          >
            <span className="text-[15px] font-bold">Edit</span>
            <span className="text-xs" style={{ color: fv("muted") }}>
              {minutesLeft > 0
                ? `You can edit for ${minutesLeft} more ${minutesLeft === 1 ? "minute" : "minutes"}.`
                : "Posts can be edited for 30 minutes after posting."}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="tap min-h-[52px] rounded-2xl px-4 py-2.5 text-left flex flex-col gap-0.5"
            style={{ border: `1px solid ${fv("border")}`, background: fv("card") }}
          >
            <span className="text-[15px] font-bold text-status-high">Withdraw</span>
            <span className="text-xs" style={{ color: fv("muted") }}>
              Remove it from the forum for everyone.
            </span>
          </button>
        </>
      )}
    </div>
  );
}
