import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MoreVertical } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { useOnline } from "../../../hooks/useOnline";
import { textPx } from "../../../theme/textSize";
import { marketPalette } from "../../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../pro/proInk";
import { PopupMenu } from "../../ui/PopupMenu";
import { OfferCard } from "../OfferCard";
import { PointsLeaf } from "../PointsFigure";
import { MarketError, MarketOffline, MarketSkeleton } from "../MarketStates";
import { FOCUS_CSS } from "../usePress";
import { fetchMyOffers, offerMeta, offerStatus, setOfferPaused, sortOffers, type ManagedOffer, type OfferOwner } from "../../../services/offers/manage";
import { Caps, OutlineButton } from "./parts";
import { useOverlayStrip } from "./useOverlayStrip";

// Market + Share 3.0 · W3 · the Offers Manager list (B-MA.3 `offersList`,
// Business Marketplace Screens lines 159–176; P-MA.3 `ofList` / `ofEmpty`,
// Professional Marketplace Screens lines 229–252), shared by both UIs:
// - the row (space-between, centred): caps "Point offers" and the outlined
//   "Create offer";
// - margin-top 10, a column (gap 10) of OfferCard manager rows (status chip,
//   meta "Ends Dec 31, 2026 · 30 redeemed", cost + leaf), Active, Scheduled,
//   Paused, Expired; a tap opens the editor (an expired offer read only);
// - the row menu (ours, the board draws none on offers; the kebab is the
//   B-MA.5 plan row's: 32, radius 10, --ink2 18 / 2.2): Edit offer, Pause /
//   Resume (set_offer_paused), not on an expired offer;
// - empty (`ofEmpty`): a column (centred, gap 10, padding 44 24 0): the 56
//   tile radius 18 #EEEAF8 (--pale in dark) with the 24 leaf, "No offers yet"
//   16 / 800, the body 13 / 1.55 --faint (max-width 290), "Create offer"
//   without the + (margin-top 6);
// - loading MarketSkeleton (radius 20); error / offline the
//   MarketStates strips. The list reads DB2 `offers`; Create / Edit / Pause
//   answer "coming soon" until the Database ships owner writers (manage.ts).

export interface OffersListProps {
  variant: "business" | "professional";
  /** Null while the business is loading. */
  owner: OfferOwner | null;
  /** May create, edit and pause (business: marketing or owner; a professional: always). */
  canManage: boolean;
  onCreate: () => void;
  onOpen: (offerId: string) => void;
  /** A strip to show once on arrival ("Offer published"). */
  flash?: string | null;
}

type Load = { kind: "loading" } | { kind: "ready"; offers: ManagedOffer[] } | { kind: "error" } | { kind: "offline" };

export const OffersList: React.FC<OffersListProps> = ({ variant, owner, canManage, onCreate, onOpen, flash }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const online = useOnline();
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [tick, setTick] = useState(0);
  const [menu, setMenu] = useState<{ offer: ManagedOffer; anchor: HTMLElement } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [strip, showStrip] = useOverlayStrip();
  const ownerKey = owner ? (owner.variant === "business" ? owner.businessId : "me") : null;

  useEffect(() => {
    if (flash) showStrip(flash);
  }, [flash, showStrip]);

  useEffect(() => {
    if (!owner) return;
    let alive = true;
    setLoad((l) => (l.kind === "ready" ? l : { kind: "loading" }));
    void fetchMyOffers(owner).then((r) => {
      if (!alive) return;
      if (r.ok) setLoad({ kind: "ready", offers: r.value });
      else setLoad(r.offline ? { kind: "offline" } : { kind: "error" });
    });
    return () => {
      alive = false;
    };
    // ownerKey stands for owner.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerKey, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const offers = useMemo(() => (load.kind === "ready" ? sortOffers(load.offers) : []), [load]);

  const togglePause = async (o: ManagedOffer) => {
    const pause = offerStatus(o) !== "paused";
    setBusy(o.id);
    const r = await setOfferPaused(o.id, pause);
    setBusy(null);
    if (!r.ok) {
      showStrip(r.message, r.pending || r.offline ? "neutral" : "error");
      return;
    }
    showStrip(pause ? "Offer paused" : "Offer resumed");
    if (r.offer) {
      const next = r.offer;
      setLoad((l) => (l.kind === "ready" ? { kind: "ready", offers: l.offers.map((x) => (x.id === next.id ? next : x)) } : l));
    } else reload();
  };

  const empty = load.kind === "ready" && offers.length === 0;

  return (
    <section aria-labelledby={`offers-caps-${variant}`} style={{ color: m.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      {strip}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <Caps id={`offers-caps-${variant}`}>Point offers</Caps>
        {canManage ? <OutlineButton label="Create offer" onPress={onCreate} disabled={!owner} /> : null}
      </div>

      {load.kind === "loading" ? <MarketSkeleton radius={20} rows={2} count={3} label="Loading offers" style={{ marginTop: 10 }} /> : null}
      {load.kind === "error" ? <MarketError thing="your offers" onRetry={reload} style={{ marginTop: 10 }} /> : null}
      {load.kind === "offline" ? <MarketOffline loaded={false} force onRetry={reload} style={{ marginTop: 10 }} /> : null}

      {offers.length > 0 ? (
        <>
          {!online ? <MarketOffline loaded style={{ marginTop: 10 }} /> : null}
          <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {offers.map((o) => {
              const status = offerStatus(o);
              const meta = offerMeta(o);
              const hasMenu = canManage && status !== "expired" && !o.hiddenAt;
              return (
                <li key={o.id}>
                  <OfferCard
                    variant="manager"
                    headline={o.headline}
                    status={status}
                    meta={meta}
                    cost={o.pointsCost}
                    onPress={canManage ? () => onOpen(o.id) : undefined}
                    pressLabel={`${o.headline}. ${status === "expired" ? "Expired" : status[0].toUpperCase() + status.slice(1)}. ${meta}. ${status === "expired" ? "View" : "Edit"}`}
                    trailing={
                      hasMenu ? (
                        <button
                          type="button"
                          aria-label="Offer options"
                          aria-haspopup="menu"
                          aria-expanded={menu?.offer.id === o.id}
                          disabled={busy === o.id}
                          onClick={(e) => setMenu({ offer: o, anchor: e.currentTarget })}
                          className="market-focus hit"
                          style={{ width: 32, height: 32, margin: "-6px -8px -6px 0", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: menu?.offer.id === o.id ? m.soft : "transparent", color: m.ink2, border: 0, padding: 0, cursor: "pointer", opacity: busy === o.id ? 0.4 : 1 }}
                        >
                          <MoreVertical size={18} strokeWidth={2.2} aria-hidden style={NO_ICON_SCALE} />
                        </button>
                      ) : undefined
                    }
                  />
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {empty ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "44px 24px 0" }}>
          <span aria-hidden style={{ width: 56, height: 56, borderRadius: 18, background: dark ? m.pale : "#EEEAF8", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PointsLeaf height={24} label={null} />
          </span>
          <div style={{ fontSize: textPx(16), fontWeight: 800 }}>No offers yet</div>
          <div style={{ fontSize: textPx(13), lineHeight: 1.55, color: m.faint, maxWidth: 290 }}>
            {variant === "professional"
              ? "Offer a discount on your services that clients can redeem with their points. You fund it in full."
              : "Offer a discount that members can redeem with their points. You fund it in full."}
          </div>
          {empty && canManage ? <OutlineButton label="Create offer" icon={false} onPress={onCreate} style={{ marginTop: 6 }} /> : null}
        </div>
      ) : null}

      <PopupMenu
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.anchor ?? null}
        align="right"
        width={180}
        options={
          menu
            ? [
                { value: "edit", label: "Edit offer" },
                { value: "pause", label: offerStatus(menu.offer) === "paused" ? "Resume offer" : "Pause offer" },
              ]
            : []
        }
        onSelect={(v) => {
          const o = menu?.offer;
          setMenu(null);
          if (!o) return;
          if (v === "edit") onOpen(o.id);
          else void togglePause(o);
        }}
      />
    </section>
  );
};
