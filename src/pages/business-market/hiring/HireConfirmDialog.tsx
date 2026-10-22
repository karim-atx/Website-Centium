import { useEffect, useMemo, useState } from "react";
import { useIsDark } from "../../../hooks/useIsDark";
import { linePx, textPx } from "../../../theme/textSize";
import { marketPalette } from "../../../theme/marketTokens";
import { CentredDialog } from "../listingParts";
import { feeBase, feeCalcLine, feeMoney, quoteFee, quoteHiringFee, type HiringFeeQuote, type OpeningType, type PayUnit } from "../../../services/hiring";
import { feeNote, offerBody, offerPayText, offerTitle, startsText } from "./hubModel";

// Market + Share 3.0 · W4 · B-MA.8.3 Offer and hire (`hireConfirm`,
// `hireConfirmMin`) and B-MA.8.6's "Send this offer?" (`dConfirm`): the W3
// CentredDialog at the board's `dlg` (markup lines 305–328): width 338,
// padding 24 22 22, title 20 / 26 800 --stitle, body 13 / 19 500 --ink2
// (margin-top 8); rows box margin-top 14, --sgrey radius 14 padding 4 14,
// rows padding 8 0 with a 0.5px --div between, 12.5, key --slabel, value 700
// right-aligned; the fee ticket margin-top 10, --pale radius 14: body padding
// 11 14 ("One-time Centium hiring fee" 12 / 800 --pdark, the calculation
// 11.5 / 16 --ink2 margin-top 2, "Minimum fee applied" 11 / 800 --caution
// margin-top 4), stub 84 with a 1.5px dashed --fill border, the fee 17 / 800
// --pdark tabular; two 14 notches (right 77) in --sbody; the note 11.5 / 16
// --faint (margin-top 8); buttons margin-top 18: Cancel #F0EDF9 / #5F5093,
// Send offer #AEA1DC / #FFFFFF (--fill / --onfill).
//
// The fee shows the fee.ts mirror at once and the server's quote_hiring_fee
// when it answers (awaiting DB stage DB8: pending today, so the mirror
// stays). Nothing is charged here: the fee is recorded only when the
// professional accepts (HANDOVER §9 "Hiring fee").

export interface HireOffer {
  /** The professional's full name. */
  name: string;
  onTeam: boolean;
  type: OpeningType;
  title: string;
  pay: number;
  payUnit: PayUnit;
  classesPerMonth: number | null;
  /** YYYY-MM-DD. */
  startsOn: string;
}

export interface DialogNote {
  text: string;
  tone: "soon" | "error";
}

export default function HireConfirmDialog({
  offer,
  direct,
  busy,
  note,
  onCancel,
  onSend,
}: {
  offer: HireOffer | null;
  /** B-MA.8.6 "Send this offer?" (direct offer) rather than an applicant's "Offer {first} the role?". */
  direct: boolean;
  busy: boolean;
  note: DialogNote | null;
  onCancel: () => void;
  onSend: () => void;
}) {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const base = offer ? feeBase(offer.type, offer.pay, offer.payUnit, offer.classesPerMonth) : null;
  const mirror = useMemo(() => (offer && base != null ? quoteHiringFee(offer.type, base) : null), [offer, base]);
  const [server, setServer] = useState<{ key: string; q: HiringFeeQuote } | null>(null);
  const key = offer ? `${offer.type}|${offer.pay}|${offer.payUnit}|${offer.classesPerMonth ?? ""}` : "";

  useEffect(() => {
    if (!offer) return;
    let live = true;
    // awaiting DB stage DB8 (quote_hiring_fee): pending today, so the fee.ts mirror stays on screen.
    void quoteFee(offer.type, offer.pay, offer.payUnit, offer.classesPerMonth).then((r) => {
      if (live && r.ok && r.value) setServer({ key, q: r.value });
    });
    return () => {
      live = false;
    };
  }, [offer, key]);

  const q = server && server.key === key ? server.q : mirror;
  if (!offer || !q) return null;

  const rows: [string, string][] = [
    ["Role", offer.title],
    ["Pay", offerPayText(offer.type, offer.pay, offer.payUnit, offer.classesPerMonth)],
    ["Starts", startsText(offer.startsOn)],
  ];
  return (
    <CentredDialog
      open
      title={offerTitle(offer.name, direct)}
      body={offerBody(offer.name)}
      cancel="Cancel"
      action="Send offer"
      tone="primary"
      width={338}
      pad="24px 22px 22px"
      actionsTop={18}
      busy={busy}
      onAction={onSend}
      onCancel={onCancel}
    >
      <div data-hire-rows style={{ marginTop: 14, borderRadius: 14, background: m.sgrey, padding: "4px 14px", textAlign: "left" }}>
        {rows.map(([k, v], i) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: i ? `0.5px solid ${m.div}` : "0", fontSize: textPx(12.5) }}>
            <span style={{ color: m.slabel }}>{k}</span>
            <span style={{ fontWeight: 700, textAlign: "right", color: m.ink }}>{v}</span>
          </div>
        ))}
      </div>
      <div data-fee-ticket style={{ position: "relative", marginTop: 10, display: "flex", borderRadius: 14, background: m.pale, overflow: "hidden", textAlign: "left" }}>
        <div style={{ flex: 1, minWidth: 0, padding: "11px 14px" }}>
          <div style={{ fontSize: textPx(12), fontWeight: 800, color: m.pdark }}>One-time Centium hiring fee</div>
          <div style={{ fontSize: textPx(11.5), lineHeight: linePx(16), color: m.ink2, marginTop: 2 }}>{feeCalcLine(q)}</div>
          {q.minimumApplied ? <div style={{ marginTop: 4, fontSize: textPx(11), fontWeight: 800, color: m.caution }}>Minimum fee applied</div> : null}
        </div>
        <div style={{ width: 84, flexShrink: 0, borderLeft: `1.5px dashed ${m.fill}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: textPx(17), fontWeight: 800, color: m.pdark, fontVariantNumeric: "tabular-nums" }}>{feeMoney(q.fee)}</span>
        </div>
        <span aria-hidden style={{ position: "absolute", right: 77, top: -7, width: 14, height: 14, borderRadius: 999, background: m.sbody }} />
        <span aria-hidden style={{ position: "absolute", right: 77, bottom: -7, width: 14, height: 14, borderRadius: 999, background: m.sbody }} />
      </div>
      <div style={{ marginTop: 8, fontSize: textPx(11.5), lineHeight: linePx(16), color: m.faint }}>
        {feeNote({ type: offer.type, minimumApplied: q.minimumApplied, onTeam: offer.onTeam, name: offer.name, direct })}
      </div>
      {note ? (
        <p role={note.tone === "error" ? "alert" : "status"} style={{ margin: "12px 0 0", fontSize: textPx(12), lineHeight: linePx(17), fontWeight: note.tone === "error" ? 600 : 500, color: note.tone === "error" ? m.high : m.faint }}>
          {note.text}
        </p>
      ) : null}
    </CentredDialog>
  );
}
