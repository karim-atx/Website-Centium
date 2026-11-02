import { useCallback, useEffect, useState } from "react";
import { useIsDark } from "../../../hooks/useIsDark";
import { linePx, textPx } from "../../../theme/textSize";
import { marketPalette } from "../../../theme/marketTokens";
import { CentredDialog } from "../listingParts";
import { feeCalcLine, feeMoney, quoteFee, type HiringError, type HiringFeeQuote, type OpeningType, type PayUnit } from "../../../services/hiring";
import { useFeeRules } from "./hiringParts";
import { feeNote, offerBody, offerPayText, offerTitle, startsText } from "./hubModel";
import { t, tn } from "../../../i18n/core";
import { RefundPolicyLink } from "../../../components/legal/RefundPolicyLink";
import { BuyInApp } from "../../../components/premium/BuyInApp";
import { offerUsesCredit, type HiringCredits } from "../../../services/premium/model";

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
// The fee is the SERVER's (quote_hiring_fee, Database Release 2: the rate and
// floors are platform_settings rows): the ticket reads "Working out the fee"
// until it answers and Send waits for it; a failed quote says so and Send
// asks again. Nothing is charged here: accept_hire_offer recomputes the fee
// and records it when the professional accepts (the gym's quote is kept
// beside it).

export interface HireOffer {
  /** The professional's name (first name, as the readers give it). */
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
  /** The refusal it came from (Round G1: no_hiring_credit shows the buy block). */
  error?: HiringError;
}

type Quote = { key: string; q: HiringFeeQuote | null; failed: boolean };

export default function HireConfirmDialog({
  offer,
  direct,
  busy,
  note,
  credits = null,
  onCancel,
  onSend,
}: {
  offer: HireOffer | null;
  /** B-MA.8.6 "Send this offer?" (direct offer) rather than an applicant's "Offer {first} the role?". */
  direct: boolean;
  busy: boolean;
  note: DialogNote | null;
  /**
   * Round G1 (#15): my_hiring_credits. With credits_on, a ROLE offer says
   * "Uses 1 hiring credit" in place of the fee line (class-slot hires are
   * unchanged); null or off: exactly today's dialog.
   */
  credits?: HiringCredits | null;
  onCancel: () => void;
  onSend: () => void;
}) {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const rules = useFeeRules();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [tick, setTick] = useState(0);
  const key = offer ? `${offer.type}|${offer.pay}|${offer.payUnit}|${offer.classesPerMonth ?? ""}|${tick}` : "";

  const usesCredit = !!offer && offerUsesCredit(offer.type, credits);

  useEffect(() => {
    if (!offer || usesCredit) return;
    let live = true;
    void quoteFee(offer.type, offer.pay, offer.payUnit, offer.classesPerMonth).then((r) => {
      if (live) setQuote({ key, q: r.ok ? r.value : null, failed: !r.ok || !r.value });
    });
    return () => {
      live = false;
    };
  }, [offer, key, usesCredit]);
  const retry = useCallback(() => setTick((t) => t + 1), []);

  if (!offer) return null;
  const answered = quote && quote.key === key ? quote : null;
  const q = answered?.q ?? null;
  const failed = !!answered?.failed;

  const rows: [string, string][] = [
    [t("Role"), offer.title],
    [t("Pay"), offerPayText(offer.type, offer.pay, offer.payUnit, offer.classesPerMonth)],
    [t("Starts"), startsText(offer.startsOn)],
  ];
  const shownNote: DialogNote | null = note ?? (failed && !usesCredit ? { text: t("Couldn't work out the fee. Try again."), tone: "error" } : null);
  // ATXQ4, or no credit free before sending: the buy block (bought in the app only, G10).
  const showBuy = usesCredit && (note?.error === "no_hiring_credit" || credits?.free === 0);
  return (
    <CentredDialog
      open
      title={offerTitle(offer.name, direct)}
      body={offerBody(offer.name)}
      cancel={t("Cancel")}
      action={failed && !usesCredit ? t("Try again") : t("Send offer")}
      tone="primary"
      width={338}
      pad="24px 22px 22px"
      actionsTop={18}
      busy={busy || (!usesCredit && !q && !failed)}
      onAction={failed && !usesCredit ? retry : onSend}
      onCancel={onCancel}
    >
      <div data-hire-rows style={{ marginTop: 14, borderRadius: 14, background: m.sgrey, padding: "4px 14px", textAlign: "start" }}>
        {rows.map(([k, v], i) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: i ? `0.5px solid ${m.div}` : "0", fontSize: textPx(12.5) }}>
            <span style={{ color: m.slabel }}>{k}</span>
            <span style={{ fontWeight: 700, textAlign: "end", color: m.ink }}>{v}</span>
          </div>
        ))}
      </div>
      {usesCredit ? (
        // undrawn (Round G, no handover): the fee ticket's shape, for a credit.
        <div data-credit-ticket style={{ position: "relative", marginTop: 10, display: "flex", borderRadius: 14, background: m.pale, overflow: "hidden", textAlign: "start" }}>
          <div style={{ flex: 1, minWidth: 0, padding: "11px 14px" }}>
            <div style={{ fontSize: textPx(12), fontWeight: 800, color: m.pdark }}>{t("Uses 1 hiring credit")}</div>
            <div style={{ fontSize: textPx(11.5), lineHeight: linePx(16), color: m.ink2, marginTop: 2 }}>{tn(credits?.free ?? 0, "{n} credit free to use", "{n} credits free to use")}</div>
          </div>
          <div style={{ width: 84, flexShrink: 0, borderInlineStart: `1.5px dashed ${m.fill}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: textPx(17), fontWeight: 800, color: m.pdark, fontVariantNumeric: "tabular-nums" }}>1</span>
          </div>
          <span aria-hidden style={{ position: "absolute", insetInlineEnd: 77, top: -7, width: 14, height: 14, borderRadius: 999, background: m.sbody }} />
          <span aria-hidden style={{ position: "absolute", insetInlineEnd: 77, bottom: -7, width: 14, height: 14, borderRadius: 999, background: m.sbody }} />
        </div>
      ) : (
      <div data-fee-ticket aria-busy={!q || undefined} style={{ position: "relative", marginTop: 10, display: "flex", borderRadius: 14, background: m.pale, overflow: "hidden", textAlign: "start" }}>
        <div style={{ flex: 1, minWidth: 0, padding: "11px 14px" }}>
          <div style={{ fontSize: textPx(12), fontWeight: 800, color: m.pdark }}>{t("One-time Centium hiring fee")}</div>
          <div style={{ fontSize: textPx(11.5), lineHeight: linePx(16), color: m.ink2, marginTop: 2 }}>{q ? feeCalcLine(q, rules?.rate ?? null) : failed ? t("Not worked out yet") : t("Working out the fee")}</div>
          {q?.minimumApplied ? <div style={{ marginTop: 4, fontSize: textPx(11), fontWeight: 800, color: m.caution }}>{t("Minimum fee applied")}</div> : null}
        </div>
        <div style={{ width: 84, flexShrink: 0, borderInlineStart: `1.5px dashed ${m.fill}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: textPx(17), fontWeight: 800, color: m.pdark, fontVariantNumeric: "tabular-nums" }}>{q ? feeMoney(q.fee) : "–"}</span>
        </div>
        <span aria-hidden style={{ position: "absolute", insetInlineEnd: 77, top: -7, width: 14, height: 14, borderRadius: 999, background: m.sbody }} />
        <span aria-hidden style={{ position: "absolute", insetInlineEnd: 77, bottom: -7, width: 14, height: 14, borderRadius: 999, background: m.sbody }} />
      </div>
      )}
      {usesCredit ? (
        <div style={{ marginTop: 8, fontSize: textPx(11.5), lineHeight: linePx(16), color: m.faint }}>
          {t("The credit is used when they accept. No hiring fee is added.")} <RefundPolicyLink />
        </div>
      ) : q ? (
        <div style={{ marginTop: 8, fontSize: textPx(11.5), lineHeight: linePx(16), color: m.faint }}>
          {feeNote({ type: offer.type, minimum: q.minimum, minimumApplied: q.minimumApplied, onTeam: offer.onTeam, name: offer.name, direct })}{" "}
          {/* Round F (DN): every place a plan or charge is offered links the policy. */}
          <RefundPolicyLink />
        </div>
      ) : null}
      {shownNote ? (
        <p role={shownNote.tone === "error" ? "alert" : "status"} style={{ margin: "12px 0 0", fontSize: textPx(12), lineHeight: linePx(17), fontWeight: shownNote.tone === "error" ? 600 : 500, color: shownNote.tone === "error" ? m.high : m.faint }}>
          {t(shownNote.text)}
        </p>
      ) : null}
      {showBuy && credits ? <BuyInApp product="hiring_credits" price1={credits.price1} price3={credits.price3} compact className="mt-3 text-start" /> : null}
    </CentredDialog>
  );
}
