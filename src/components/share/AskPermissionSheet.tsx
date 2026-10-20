import React, { useState } from "react";
import { Send } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { SegmentedTabs } from "../ui/SegmentedTabs";
import { CtaButton } from "../ui/PinnedCta";
import { INK } from "../pro/proInk";
import { textPx } from "../../theme/textSize";
import { ShareCard } from "./ShareCard";
import { EditorLabel } from "./shareKit";
import { cardPayload, clientShownAs, type CardPro, type CardSpec, type ClientWin, type Visibility } from "./shareCardModel";
import { askErrorMessage, askToShareWin, type ShareRequest } from "../../services/share";

/**
 * Release 3 · W8 SH5 "Ask {client} for permission" (source/gen/r31.js
 * ask31): the Post card in Brand at 190, centred, 12 below; "{first} sees
 * exactly this card before you can share it." 12.5 / 1.5 text.soft centred,
 * 14 below; "Show {first} as" (12 / 600 text.soft, 8 below) with Name /
 * Initials / Nothing (Initials first, as drawn), 12 below; the soft r14
 * "{first} can answer" box; pinned "Send request" (send).
 *
 * The card sent with the ask is exactly the one previewed (share_requests.
 * card), so the client's CU29 pop-up shows the same card. The client's
 * "Always allow" answers at once (status allowed, by initials); "Never"
 * refuses (ATXH0), as does a second ask for the same win.
 */
export const AskPermissionSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  win: ClientWin;
  spec: CardSpec;
  pro: CardPro;
  client: { fullName: string; firstName: string };
  onSent: (r: ShareRequest) => void;
}> = ({ open, onClose, win, spec, pro, client, onSent }) => {
  const [visibility, setVisibility] = useState<Visibility>("initials");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = client.firstName;
  const shownAs = clientShownAs(client.fullName, visibility);

  const send = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await askToShareWin(win.clientId, win.winId, cardPayload(spec, "post", "B", shownAs), visibility);
    setBusy(false);
    if (!r.ok) return setError(r.offline ? "You're offline. Try again when you're back online." : askErrorMessage(r.code, r.message, first));
    onSent(r.data);
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`Ask ${first} for permission`}
      titleWrap
      size="tall"
      footer={<CtaButton label="Send request" icon={<Send size={15} strokeWidth={2} aria-hidden />} loading={busy} disabled={busy} onClick={() => void send()} />}
    >
      <div className="flex justify-center" style={{ marginBottom: 12 }}>
        <ShareCard spec={spec} pro={pro} format="post" style="B" width={190} client={shownAs} />
      </div>
      <p style={{ fontSize: textPx(12.5), lineHeight: 1.5, color: INK.chS, textAlign: "center", marginBottom: 14 }}>{`${first} sees exactly this card before you can share it.`}</p>
      <EditorLabel first>{`Show ${first} as`}</EditorLabel>
      <SegmentedTabs
        items={[
          { key: "name", label: "Name" },
          { key: "initials", label: "Initials" },
          { key: "none", label: "Nothing" },
        ]}
        activeKey={visibility}
        onChange={(k) => setVisibility(k as Visibility)}
        className="mb-3"
      />
      <div style={{ borderRadius: 14, background: INK.soft, padding: 12 }}>
        <p style={{ fontSize: textPx(12), fontWeight: 800, color: INK.ch, marginBottom: 4 }}>{`${first} can answer`}</p>
        <p style={{ fontSize: textPx(12), lineHeight: 1.55, color: INK.chS }}>{`Allow, Allow without my name, or Decline. You'll get a notification. If ${first} declines, you can't ask again for this win.`}</p>
      </div>
      {error && (
        <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginTop: 10 }}>
          {error}
        </p>
      )}
    </BottomSheet>
  );
};
