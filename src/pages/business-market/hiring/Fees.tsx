import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MarketError, MarketSkeleton } from "../../../components/market/MarketStates";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { feeMoney, feeRows, fetchHiringFees, type HiringFee } from "../../../services/hiring";
import { BackHeader, px, useMarketColors } from "../listingParts";
import { HIRING_ROUTES } from "./HiringRoutes";
import { TagChip } from "./hiringParts";
import { useHiringBusiness } from "./useHiringBusiness";
import { HiringEmpty, NotForThisBusiness, PaleNote, RECEIPT_ICON } from "./teamParts";
import { feeRoleLine } from "./teamModel";

// Market + Share 3.0 · W4-B · B-MA.8.5 Hiring fees (Business Hiring Screens
// lines 187–208, `FEE()` / fees / feesEmpty; frame-check B-MA.8.5, 2 states).
// Owner only (HiringRoutes: ConsoleGate owner; my_hiring_fees is the
// owner's). The pale note; one card per fee (radius 20, 1px --border, padding
// 14 16): professional 14 / 800, "{role} · Role|Class slot · hired {date}"
// 11.5 --faint, the fee 16 / 800 tabular (feeMoney), the DUE / PAID chip
// (TagChip: --cautionbg / --caution, --goodbg / --good; the board's padding
// 2 8 here), and the rows box (--soft radius 12 padding 2 12; rows 7 0, 12;
// key --faint, value 700) from feeRows(quote): Base used, 8% of base, Minimum
// applied. Empty: "No hiring fees" with the board's explanation.
//
// Centium bill (D-32): a fee is a line on the existing `centium_charges`
// (product `hiring_fee`, DB8); DUE = the charge unpaid, PAID = paid. The page
// reads my_hiring_fees only, never centium_charges, until DB8 documents it.
// Pending (DB8 not landed): the drawn empty state, which explains the fee.

type Load = { status: "loading" } | { status: "ok"; fees: HiringFee[] } | { status: "pending" } | { status: "error" };

export default function FeesPage() {
  const biz = useHiringBusiness();
  const m = useMarketColors();
  const navigate = useNavigate();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [tick, setTick] = useState(0);
  const businessId = biz.canHire ? biz.businessId : null;

  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    setLoad({ status: "loading" });
    // awaiting DB stage DB8 (my_hiring_fees)
    void fetchHiringFees(businessId).then((r) => {
      if (!alive) return;
      setLoad(r.ok ? { status: "ok", fees: r.value } : r.pending ? { status: "pending" } : { status: "error" });
    });
    return () => {
      alive = false;
    };
  }, [businessId, tick]);
  const retry = useCallback(() => setTick((t) => t + 1), []);

  const note = <PaleNote>One-time fees, charged when a hire is confirmed and added to your Centium bill. Nothing recurring. Pay for the work itself is between you and the professional.</PaleNote>;

  let body: React.ReactNode;
  if (biz.loading || (businessId && load.status === "loading")) {
    body = (
      <>
        {note}
        <MarketSkeleton radius={20} rows={4} height={170} count={2} label="Loading your hiring fees" style={{ marginTop: 12 }} />
      </>
    );
  } else if (!biz.canHire || !businessId) {
    body = <NotForThisBusiness error={biz.error} onRetry={biz.reload} />;
  } else if (load.status === "error") {
    body = (
      <>
        {note}
        <MarketError thing="your hiring fees" onRetry={retry} style={{ marginTop: 12 }} />
      </>
    );
  } else if (load.status === "pending" || (load.status === "ok" && load.fees.length === 0)) {
    body = (
      <>
        {note}
        <HiringEmpty
          icon={RECEIPT_ICON}
          title="No hiring fees"
          body="Each hire through Centium has one fee: 8% of the base, or the minimum ($25 per role, $3 per class slot), whichever is higher. It shows here with how it was worked out."
          top={36}
        />
      </>
    );
  } else if (load.status === "ok") {
    body = (
      <>
        {note}
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {load.fees.map((f) => (
            <div key={f.id} data-fee style={{ borderRadius: 20, background: m.card, border: `1px solid ${m.border}`, padding: "14px 16px", lineHeight: "normal" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: px(14), fontWeight: 800, color: m.ink }}>{f.professionalName}</div>
                  <div style={{ fontSize: px(11.5), color: m.faint }}>{feeRoleLine(f.roleTitle, f.type, f.hiredAt)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: px(16), fontWeight: 800, fontVariantNumeric: "tabular-nums", color: m.ink }}>{feeMoney(f.quote.fee)}</div>
                  <TagChip tag={f.status} style={{ padding: "2px 8px" }} />
                </div>
              </div>
              <div style={{ marginTop: 10, borderRadius: 12, background: m.soft, padding: "2px 12px" }}>
                {feeRows(f.quote).map(([k, v], i) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderTop: i ? `0.5px solid ${m.div}` : 0, fontSize: px(12) }}>
                    <span style={{ color: m.faint }}>{k}</span>
                    <span style={{ fontWeight: 700, textAlign: "right", color: m.ink }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <div style={{ color: m.ink, lineHeight: "normal", paddingBottom: 32 }}>
      <style>{FOCUS_CSS}</style>
      <BackHeader eyebrow="Hiring" title="Hiring fees" onBack={() => navigate(HIRING_ROUTES.hub)} backLabel="Back to Hiring" />
      {body}
    </div>
  );
}
