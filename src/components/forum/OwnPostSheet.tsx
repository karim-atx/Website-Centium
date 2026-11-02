import { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { withdrawPost, type PostRef } from "../../services/forum";
import { DangerLine } from "./parts";
import { fv } from "./forumColor";
import { t } from "../../i18n/core";

// Withdrawing the reader's own post or reply (delete_forum_post), asked once
// more because it can't be undone from the app.
//
// Handover-complete pass (2026-10-07): MO1.3.3's ⋮ opens a dropdown menu
// (Foundations › Dropdown menu, ForumPostView), so this sheet is no longer a
// menu of its own: it is only the confirmation behind the menu's Withdraw
// (KEEP-SAFETY: removing your own words has no frame), restyled as the
// Foundations lavender-header sheet with a 52 pt destructive footer CTA and
// its error as a plain danger line.

type Props = {
  open: boolean;
  onClose: () => void;
  target: PostRef | null;
  kind: "post" | "reply";
  onWithdrawn: () => void;
};

export function OwnPostSheet(props: Props) {
  // BottomSheet renders nothing while closed, so each opening starts fresh.
  return (
    <BottomSheet open={props.open} onClose={props.onClose} title={props.kind === "post" ? t("Withdraw this post?") : t("Withdraw this reply?")}>
      <WithdrawBody {...props} />
    </BottomSheet>
  );
}

function WithdrawBody({ onClose, target, kind, onWithdrawn }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex flex-col gap-3.5" style={{ color: fv("text") }}>
      <p className="m-0 text-[13px] font-medium leading-[1.55]" style={{ color: fv("muted") }}>
        {t("It will disappear for everyone. This can't be undone.")}
      </p>
      {error && <DangerLine>{error}</DangerLine>}
      <CtaButton
        label={busy ? t("Withdrawing…") : kind === "post" ? t("Withdraw post") : t("Withdraw reply")}
        loading={busy}
        onClick={() => void withdraw()}
        className="!bg-[var(--forum-danger)] !text-white"
      />
      {/* Foundations › Buttons: a 13/700 text action. */}
      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        className="tap self-center h-11 px-3 text-[13px] font-bold"
        style={{ color: fv("link") }}
      >
        {t("Keep it")}
      </button>
    </div>
  );
}
