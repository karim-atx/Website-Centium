import React, { useEffect, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { INK, NO_ICON_SCALE } from "../pro/proInk";
import { ProCardSkeleton, ProError } from "../pro/states";
import { textPx } from "../../theme/textSize";
import { siteHref } from "../../config/site";
import { OFFLINE_MESSAGE } from "../../services/network-error";
import { fetchMyOwnedSharedItems, sharedItemPath, type OwnedSharedItem } from "../../services/share";
import { ShareCard } from "./ShareCard";
import { specFromPayload } from "./shareCardModel";
import { itemAllows } from "./heldShareModel";
import { HeldShareNote, PausedLink } from "./HeldShareParts";
import { copyText } from "./shareActions";
import { useSharePro } from "./useSharePro";

type Load = { status: "loading" } | { status: "error"; offline: boolean } | { status: "missing" } | { status: "found"; item: OwnedSharedItem };

/**
 * Round D · DV: one of the professional's own cards, opened from the hub
 * notice pro.share.held (payload.shared_item_id). The card as recorded (the
 * owner's own preview, my_shared_items().card), then its state:
 * - held for review: D-S21's amber note with the short reason and the
 *   Community guidelines link, and the disabled "Copy link (works once
 *   approved)";
 * - live again (released): "Your shared card is live." and Copy link;
 * - removal requested or removed: the chip's own line; the link only while
 *   link_live says it answers.
 * The card is drawn without its QR while the link is paused.
 */
export const HeldShareCardSheet: React.FC<{ itemId: string | null; onClose: () => void }> = ({ itemId, onClose }) => {
  const pro = useSharePro();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState<boolean | null>(null);

  // A fresh sheet for each card.
  const [shownId, setShownId] = useState(itemId);
  if (itemId !== shownId) {
    setShownId(itemId);
    setLoad({ status: "loading" });
    setCopied(null);
  }

  useEffect(() => {
    if (!itemId) return;
    let live = true;
    void fetchMyOwnedSharedItems().then((r) => {
      if (!live) return;
      if (!r.ok) return setLoad({ status: "error", offline: r.offline });
      const item = r.data.find((x) => x.id === itemId);
      setLoad(item ? { status: "found", item } : { status: "missing" });
    });
    return () => {
      live = false;
    };
  }, [itemId, attempt]);

  const found = load.status === "found" ? load.item : null;
  const card = found && pro ? specFromPayload(found.card, pro.name) : null;
  const allows = found ? itemAllows(found.state, found.linkLive) : null;
  const shown = (found?.card as { name_display?: unknown } | null)?.name_display;

  const copy = async () => {
    if (!found) return;
    setCopied(await copyText(siteHref(sharedItemPath(found.id))));
  };

  return (
    <BottomSheet open={!!itemId} onClose={onClose} title="Shared card" footer={<CtaButton label="Done" size="sheet" onClick={onClose} />}>
      {load.status === "loading" || (found && !pro) ? (
        <ProCardSkeleton lines={3} />
      ) : load.status === "error" ? (
        <ProError onRetry={() => setAttempt((a) => a + 1)} message={load.offline ? OFFLINE_MESSAGE : "Couldn't load this card."} />
      ) : load.status === "missing" || !found || !allows ? (
        <p className="text-center" style={{ fontSize: textPx(13), color: INK.chS, padding: "12px 0" }}>
          This card is no longer in your shared cards.
        </p>
      ) : (
        <div>
          {card && pro ? (
            <div className="flex justify-center" style={{ marginBottom: 16 }}>
              <ShareCard spec={card.spec} pro={pro} format={card.format} style={card.style} width={card.format === "post" ? 150 : 120} client={typeof shown === "string" && shown.trim() ? shown : undefined} qr={allows.link} onChecker={card.format === "sticker"} />
            </div>
          ) : null}
          {found.state === "held_for_review" ? (
            <HeldShareNote reason={found.heldReason} onNavigate={onClose} />
          ) : found.state === "live" ? (
            <p role="status" className="flex items-center justify-center" style={{ gap: 6, fontSize: textPx(13), fontWeight: 700, color: INK.good }}>
              <Check size={15} strokeWidth={2.4} aria-hidden style={{ ...NO_ICON_SCALE, flex: "none" }} />
              Your shared card is live.
            </p>
          ) : found.state === "removal_requested" ? (
            <p className="text-center" style={{ fontSize: textPx(12.5), lineHeight: 1.5, color: INK.chS }}>
              The client asked you to remove this card.
            </p>
          ) : null}
          <div style={{ marginTop: 12 }}>
            {allows.link ? (
              <>
                <CtaButton label="Copy link" icon={<Link2 size={15} aria-hidden />} size="sheet" variant="outline" onClick={() => void copy()} />
                {copied !== null && (
                  <p role="status" className="text-center" style={{ fontSize: textPx(12), color: copied ? INK.chS : INK.hi, marginTop: 6 }}>
                    {copied ? "Link copied." : "Couldn't copy the link."}
                  </p>
                )}
              </>
            ) : (
              <PausedLink line={allows.line ?? ""} label={found.state === "removed" ? "Copy link" : undefined} />
            )}
          </div>
        </div>
      )}
    </BottomSheet>
  );
};
