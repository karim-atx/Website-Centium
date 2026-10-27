import React, { useRef, useState } from "react";
import { ShareEditorSheet, type EditorResult, type WinConsent } from "./ShareEditorSheet";
import { ShareOptionsSheet } from "./ShareOptionsSheet";
import { cardPayload, type CardPro, type CardSpec, type ShareFormat } from "./shareCardModel";
import { recordErrorMessage, recordSharedItem, sharedItemPath, type ItemKind } from "../../services/share";
import { siteHref } from "../../config/site";

/**
 * Release 3 · W8: one share, from the SH6 editor to the SH7 options. Each
 * export (Save image, Copy sticker, More) first records the card
 * (record_shared_item), so the client's "Sharing your wins" list and the
 * public card exist before the image leaves the device; a win is refused
 * unless the client allowed it. The payload carries only the allowlisted
 * keys (shareCardModel.cardPayload) and the stats left switched on.
 * shared_items.format is the export's own format, Square included (W8-4,
 * Database Release A 20261216010000).
 *
 * Every card is recorded: a practice milestone as kind `milestone` (W8-3,
 * 20261216020000), so it has a public link like the others.
 */
export const ShareFlow: React.FC<{
  open: boolean;
  onClose: () => void;
  spec: CardSpec;
  pro: CardPro;
  kind: ItemKind;
  win?: { consent: WinConsent; requestId: string; label: string } | null;
  statRows?: { title: string; sub: string }[];
  onShared?: () => void;
}> = ({ open, onClose, spec, pro, kind, win, statRows, onShared }) => {
  const [result, setResult] = useState<EditorResult | null>(null);
  const recorded = useRef(new Map<string, string>());

  const close = () => {
    setResult(null);
    recorded.current.clear();
    onClose();
  };

  const onRecord = async (format: ShareFormat): Promise<{ ok: true; link: string | null } | { ok: false; message: string }> => {
    if (!result) return { ok: false, message: "Couldn't share the card. Try again." };
    const shown = { ...spec, stats: spec.stats.filter((_, i) => !result.hide.includes(i)) };
    const payload = cardPayload(shown, format, result.style, win ? (result.client ?? null) : null);
    const key = JSON.stringify(payload);
    const link = (id: string) => siteHref(sharedItemPath(id));
    const hit = recorded.current.get(key);
    if (hit) return { ok: true, link: link(hit) };
    const r = await recordSharedItem(kind, format, payload, win?.requestId ?? null);
    if (!r.ok) return { ok: false, message: r.offline ? "You're offline. Try again when you're back online." : recordErrorMessage(r.code, r.message) };
    recorded.current.set(key, r.data);
    onShared?.();
    return { ok: true, link: link(r.data) };
  };

  return (
    <>
      <ShareEditorSheet
        open={open && !result}
        onClose={close}
        spec={spec}
        pro={pro}
        win={win?.consent ?? null}
        winLabel={win?.label}
        statRows={statRows}
        onShare={setResult}
      />
      {result && (
        <ShareOptionsSheet
          open={open}
          onClose={close}
          spec={spec}
          pro={pro}
          format={result.format}
          style={result.style}
          client={result.client}
          qr={result.qr}
          hide={result.hide}
          photoUrl={result.photoUrl}
          placement={result.placement}
          clientFirstName={win?.consent.firstName}
          onRecord={onRecord}
          onDone={close}
        />
      )}
    </>
  );
};
