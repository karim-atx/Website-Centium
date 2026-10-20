import React, { useState } from "react";
import { CentredPopup } from "../../ui/CentredPopup";
import { CtaButton } from "../../ui/PinnedCta";
import { INK } from "../../pro/proInk";
import { textPx } from "../../../theme/textSize";
import { useIsDark } from "../../../hooks/useIsDark";
import { ReminderIcon } from "../../client-forms/parts";
import { toneSet } from "../../client-forms/tone";
import { ShareCard } from "../ShareCard";
import { specFromPayload } from "../shareCardModel";
import { answerShareRequest, type ShareRequest } from "../../../services/share";
import { OFFLINE_MESSAGE } from "../../../services/network-error";
import { askBody, askTitle, type ShareAnswerKind } from "./sharingText";

/**
 * Release 3 · W8 CU29: a professional asks to share the client's win, one
 * pop-up of the Home queue (source/gen/r31.js clientAsk31, literal): a card
 * at most 350 wide, radius 20, padding 18 18 14, "{i} of {n}" at the top
 * right (11 / 700 text.faint), the remIcon21 share-2 tile with the
 * professional's avatar, title 17 / 800 / 1.3 10 below it, body 12.5 / 1.5
 * text.soft 4 below, the card preview (176 wide, the request's own format and
 * style) 12 above and 14 below, Allow (primary), Allow without my name
 * (secondary) and Decline (a 44 text button, 14 / 700 text.soft) 8 apart,
 * then the queue's dots 6 below. Tapping outside is "Not now": the request
 * stays pending and comes back on a later open.
 *
 * The client's handle can't be read for a pending request (no documented
 * reader), so the preview has no handle line, link or QR.
 */
export const WinPermissionPopup: React.FC<{
  open: boolean;
  index: number;
  count: number;
  request: ShareRequest;
  proName: string;
  proAvatarUrl?: string | null;
  /** Answered: the toast and the next pop-up. */
  onAnswered: (answer: ShareAnswerKind) => void;
  /** ATX08: already answered or withdrawn; drop it from the queue. */
  onGone: () => void;
  onDismiss: () => void;
}> = ({ open, index, count, request, proName, proAvatarUrl, onAnswered, onGone, onDismiss }) => {
  const dark = useIsDark();
  const tn = toneSet("pr", dark);
  const [busy, setBusy] = useState<ShareAnswerKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const card = specFromPayload(request.card, proName);
  const shownAs = (request.card as { name_display?: unknown } | null)?.name_display;

  const answer = async (a: ShareAnswerKind) => {
    if (busy) return;
    setBusy(a);
    setError(null);
    const r = await answerShareRequest(request.id, a);
    setBusy(null);
    if (r.ok) return onAnswered(a);
    if (r.code === "ATX08") return onGone();
    setError(r.offline ? OFFLINE_MESSAGE : "Couldn't send your answer. Try again.");
  };

  return (
    <CentredPopup
      open={open}
      onClose={() => {
        if (!busy) onDismiss();
      }}
      title={askTitle(proName)}
      titleClass="text-[17px] leading-[1.3] -mt-1"
      body={<span style={{ display: "block", marginTop: -2, fontSize: textPx(12.5), lineHeight: 1.5, fontWeight: 400 }}>{askBody(request.visibility)}</span>}
      describeBody
      maxWidth={350}
      className="!px-[18px] !pt-[18px] !pb-[14px] !shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
      iconBare
      iconWell={{ size: 38, radius: 12 }}
      icon={<ReminderIcon kind="share_request" tone={tn} proName={proName} proAvatarUrl={proAvatarUrl} />}
      titleAside={
        <span style={{ position: "relative", display: "block", top: -10, right: -4, fontSize: textPx(11), lineHeight: "normal", fontWeight: 700, color: INK.chF }}>
          {index + 1} of {count}
        </span>
      }
    >
      {card && (
        <div data-win-preview className="flex justify-center" style={{ margin: "-4px 0 14px" }}>
          <ShareCard
            spec={card.spec}
            pro={{ name: proName, handle: null }}
            format={card.format}
            style={card.style}
            width={176}
            client={typeof shownAs === "string" && shownAs.trim() ? shownAs : "A client"}
          />
        </div>
      )}
      {error && (
        <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, lineHeight: 1.45, color: INK.hi, marginBottom: 10, textAlign: "center" }}>
          {error}
        </p>
      )}
      <div className="grid" style={{ gap: 8 }}>
        <CtaButton size="page" label="Allow" loading={busy === "allowed"} disabled={!!busy && busy !== "allowed"} onClick={() => void answer("allowed")} />
        <CtaButton size="page" variant="secondary" label="Allow without my name" loading={busy === "allowed_no_name"} disabled={!!busy && busy !== "allowed_no_name"} onClick={() => void answer("allowed_no_name")} />
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void answer("declined")}
          className="tap flex items-center justify-center disabled:opacity-60"
          style={{ height: 44, fontSize: textPx(14), fontWeight: 700, color: INK.chS }}
        >
          {busy === "declined" ? "Sending…" : "Decline"}
        </button>
      </div>
      <div className="flex justify-center" aria-hidden style={{ gap: 5, marginTop: 6 }}>
        {Array.from({ length: count }, (_, i) => (
          <span key={i} style={{ width: i === index ? 16 : 6, height: 6, borderRadius: 9999, background: i === index ? INK.prDeep : "rgb(var(--c-charcoal) / 0.11)" }} />
        ))}
      </div>
    </CentredPopup>
  );
};
