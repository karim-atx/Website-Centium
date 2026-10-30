import { useMemo, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Award, BadgePercent, CalendarClock, CalendarX2, ChartColumn, Copy, Ellipsis, Gift, Megaphone, Pause, Pencil, Percent, Play, Plus, Trash2, X, type LucideIcon } from "lucide-react";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { initialsOf } from "../../components/business-more/kind";
import { MarketEmptyCard, MarketError, MarketSkeleton } from "../../components/market/MarketStates";
import { statusChip } from "../../components/market/marketColor";
import { FOCUS_CSS } from "../../components/market/usePress";
import { useOnline } from "../../hooks/useOnline";
import { priceLabel, saveListingPerk } from "../../services/business-market";
import { cancelPromotion, endPromotion, pausePromotion, promotionStatus, setPromotionOnListing, type PromoStatus, type Promotion } from "../../services/business-market/promotions";
import type { Placement } from "../../services/business-market/promoLogic";
import type { MarketPalette } from "../../theme/marketTokens";
import { useMarket } from "./MarketContext";
import { Card, CapsLabel, CentredDialog, fieldStyle, lh, MasterSheet, OutlineButton, PrimaryButton, px, SaveError, SheetBox, SheetSwitch, useMarketColors, useStrip } from "./listingParts";
import { classFlag, dayMonth, dowTime, isoOf, whenFromNow } from "./model";
import {
  CHIP_LABEL,
  chipOfStatus,
  draftOf,
  featuredLine,
  iconOfType,
  itemForPromotion,
  offerSub,
  offerUsed,
  OWNER_ONLY,
  peopleText,
  placementCard,
  promoActions,
  promoDates,
  promotables,
  recordedLine,
  retryStart,
  sortPromotions,
  usesText,
  type ChipKey,
  type IconKey,
  type PromoAction,
  type PromoDraft,
  type Promotable,
} from "./promoModel";
import { PromotionSheet, type PromoEdit } from "./PromotionSheet";
import { FeatureSheet, PaySheet, ResultsSheet, type FeatureRetry } from "./FeatureSheets";
import { usePromotions } from "./usePromotions";

// Market + Share 3.0 · W3 (D-13): the live promotions, the perk and the
// featured weeks are KEPT on the Offers tab under the drawn point offers
// (OffersManager renders this under its caps "Promotions" group heading, so
// there is no outer heading here), restyled in the handover chrome: r20
// cards on --border, caps 10.5 / 700 / 0.1em section labels, the status chips
// as the offer chips (10.5 / 800, radius 999, padding 2 8: Active / Scheduled
// / Paused / Ended as OfferCard's manager chips), MasterBottomSheet
// (MasterSheet) for every sheet, two-step CentredDialogs for End / Cancel /
// Remove, the ConfirmationStrip overlay for results (useStrip) and the 42 ×
// 26 sheet switch. "Create promotion" is an outlined button at the end of the
// promotions (the old fixed CTA would sit on the Offers tab's own).
//
// MA1-007 / 020-022 / 050-053 / 066 / 072 / 099-118 · Promotions, and the
// Gym / Store variants (OURS-MA1-gym-promotions, MA1-072).
//
// LIVE: "Offers on your listing" = the listing perk (business_profiles.perk,
// V6-88), with "Add an offer" (OF3) and its Edit / Remove (its switch stays
// drawn on and disabled: no show-on-listing column for it), then each running
// promotion below. B16: business_discounts is no longer read or written; once
// the perk is set, "Add an offer" opens Create promotion, the offer's home
// since B13.
// B13 MK-05 (live when the probe finds promotions): "Your promotions" lists
// every promotions row (insiders see all), with its status from the dates and
// the paused / ended stamps, promotion_stats (uses, people, the revenue the
// business recorded on the payments that used it), and Edit / Pause / Resume
// / End / Cancel / Run again. Each running promotion is also an offer on the
// listing whose switch is show_on_listing.
// B13 MK-06: my_featured_placements as cards (awaiting payment, scheduled,
// featured, ended, payment not received with Pick new dates), the Featured
// card's line, and Feature for a week (owner only). Pending (the table or
// function absent): the earlier empty states.
// `?promote={id}` opens Create promotion on that item; `?offer=new` opens Add
// an offer.

interface OfferRow {
  id: string;
  label: string;
  perk: boolean;
}

const TYPE_ICON: Record<IconKey, LucideIcon> = { percent: Percent, gift: Gift, megaphone: Megaphone, award: Award };

export function PromotionsTab() {
  const m = useMarket();
  const { v, kind, business } = m;
  const c = useMarketColors();
  const online = useOnline();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const promoteParam = params.get("promote");
  const [strip, showStrip] = useStrip();
  const showToast = (msg: string, error?: boolean) => showStrip(msg, error ? "error" : "success");
  const [create, setCreate] = useState<{ what: string | null; prefill?: PromoDraft } | null>(promoteParam ? { what: promoteParam } : null);
  const [edit, setEdit] = useState<PromoEdit | null>(null);
  const [offerSheet, setOfferSheet] = useState<{ mode: "add" | "edit"; row?: OfferRow } | null>(params.get("offer") === "new" ? { mode: "add" } : null);
  const [menuFor, setMenuFor] = useState<{ row: OfferRow; el: HTMLElement } | null>(null);
  const [removeRow, setRemoveRow] = useState<{ row: OfferRow; step: 1 | 2 } | null>(null);
  const [feature, setFeature] = useState<{ item: string | null; from?: string; retry?: FeatureRetry } | null>(null);
  const [pay, setPay] = useState<{ itemId: string; from: string; price: Parameters<typeof PaySheet>[0]["price"]; retry?: FeatureRetry } | null>(null);
  const [results, setResults] = useState<Placement | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "end" | "cancel"; p: Promotion; step: 1 | 2 } | null>(null);
  const [showSheet, setShowSheet] = useState<Promotion | null>(null);
  const [glow, setGlow] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const today = isoOf(new Date());
  const canMarket = m.can("marketing");
  const data = usePromotions(business?.id ?? null, m.backend, { promos: canMarket || m.can("revenue"), placements: canMarket || m.can("revenue") });
  const offers: OfferRow[] = useMemo(() => (m.perk ? [{ id: "perk", label: m.perk, perk: true }] : []), [m.perk]);
  const items = useMemo(
    () =>
      promotables(kind, {
        classes: m.classes.classes,
        booked: m.booked,
        offerings: m.offerings.offerings,
        plans: m.plans.plans,
        offers: offers.map((o) => o.label),
        today,
        now,
        instructors: m.instructors,
      }),
    [kind, m.classes.classes, m.booked, m.offerings.offerings, m.plans.plans, offers, today, now, m.instructors]
  );
  /** Titles of everything a row can point at (past classes too). */
  const titles = useMemo(() => {
    const t = new Map<string, string>();
    for (const x of m.classes.classes) t.set(x.id, x.title);
    for (const o of m.offerings.offerings) t.set(o.id, o.title);
    for (const p of m.plans.plans) t.set(p.id, p.name);
    if (business) t.set(business.id, business.name);
    return t;
  }, [m.classes.classes, m.offerings.offerings, m.plans.plans, business]);
  const placementTitle = (p: Placement) => titles.get(p.targetId) ?? (p.targetKind === "business" ? business?.name ?? "Your listing" : "Your listing");

  const rows = useMemo(() => sortPromotions(data.promotions.map((p) => ({ p, status: promotionStatus(p, today) }))), [data.promotions, today]);
  const running = rows.filter((r) => r.status !== "ended");
  const placementCards = data.placements.map((p) => ({ p, card: placementCard(p, today) })).filter((x) => x.card);

  const sugg =
    kind === "classes" || kind === "gym"
      ? m.classes.classes
          .filter((x) => x.date >= today)
          .map((x) => {
            const start = new Date(`${x.date}T${x.startTime}:00`).getTime();
            const end = new Date(`${x.date}T${x.endTime}:00`).getTime();
            const b = m.booked?.get(x.id) ?? 0;
            return { x, b, start, flag: classFlag(b, x.maxCapacity, start, end, now) };
          })
          .filter((r) => r.flag === "low")
          .sort((a, b) => a.start - b.start)
          .slice(0, 2)
      : [];
  const hasSomething = items.length > 0;
  const price = m.featurePrice ? priceLabel(m.featurePrice) : null;
  const featLine = featuredLine(data.placements, placementTitle, today);
  /** The read answered and there is no business row (not loading, not an error). */
  const noRow = !business && !m.loading && !m.error;
  const sheetOpen = !!create || !!edit || !!offerSheet || !!feature || !!pay || !!removeRow || !!results || !!confirm || !!showSheet;
  const canWrite = online && canMarket && !!business;

  const flash = (id: string) => {
    setGlow(id);
    window.setTimeout(() => setGlow((g) => (g === id ? null : g)), 3000);
  };

  const clearParam = () => {
    if (params.get("promote") || params.get("offer")) {
      const next = new URLSearchParams(params);
      next.delete("promote");
      next.delete("offer");
      setParams(next, { replace: true });
    }
  };

  /** Put a written row in place, then re-read the stats. */
  const applied = (p: Promotion, msg: string) => {
    data.setPromotions((list) => (list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [p, ...list]));
    data.reload();
    m.reloadListingPromos();
    flash(p.id);
    showToast(msg);
  };

  const doRemove = async (row: OfferRow) => {
    if (!business) return;
    setBusy(true);
    const r = await saveListingPerk(business.id, null);
    setBusy(false);
    setRemoveRow(null);
    if (!r.ok) return showToast(r.message, true);
    m.setPerk(null);
    showToast(`${row.label} is off your listing.`);
  };

  const onPause = async (p: Promotion, paused: boolean) => {
    setRowBusy(p.id);
    const r = await pausePromotion(p.id, paused);
    setRowBusy(null);
    if (!r.ok) return showToast(r.message, true);
    applied(r.value, paused ? `${r.value.name} is paused. It's hidden from Explore until you resume it.` : `${r.value.name} is live on Explore.`);
  };

  const onConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    const { p } = confirm;
    if (confirm.kind === "cancel") {
      const r = await cancelPromotion(p.id);
      setBusy(false);
      setConfirm(null);
      if (!r.ok) return showToast(r.message, true);
      data.setPromotions((list) => list.filter((x) => x.id !== p.id));
      data.reload();
      m.reloadListingPromos();
      return showToast(`${p.name} is cancelled.`);
    }
    const r = await endPromotion(p.id);
    setBusy(false);
    setConfirm(null);
    if (!r.ok) return showToast(r.message, true);
    applied(r.value, `${r.value.name} has ended.`);
  };

  const onListing = async (p: Promotion, on: boolean) => {
    setRowBusy(p.id);
    const r = await setPromotionOnListing(p.id, on);
    setRowBusy(null);
    if (!r.ok) return showToast(r.message, true);
    data.setPromotions((list) => list.map((x) => (x.id === p.id ? r.value : x)));
    m.reloadListingPromos();
    if (on) flash(`offer:${p.id}`);
    showToast(on ? `${p.name} is now on your listing.` : `${p.name} is off your listing.`);
  };

  const act = (a: PromoAction, p: Promotion, status: PromoStatus) => {
    const item = itemForPromotion(p, items, titles);
    if (a === "edit") return setEdit({ promo: p, status, item });
    if (a === "pause" || a === "resume") return void onPause(p, a === "pause");
    if (a === "end") return setConfirm({ kind: "end", p, step: 1 });
    if (a === "cancel") return setConfirm({ kind: "cancel", p, step: 1 });
    // Run again (MA1-111 S1): Create promotion prefilled, dates cleared.
    setCreate({ what: item.id, prefill: { ...draftOf(p, item), from: today, to: null } });
  };

  const promoBlock =
    data.loading && data.promotions.length === 0 && placementCards.length === 0 ? (
      <MarketSkeleton radius={20} rows={3} height={181} count={2} gap={10} label="Loading your promotions" />
    ) : data.error ? (
      <MarketError thing="your promotions" onRetry={data.reload} />
    ) : rows.length === 0 && placementCards.length === 0 ? (
      <MarketEmptyCard title="No promotions yet" body={v.promosEmpty} />
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {placementCards.map(({ p, card }) =>
          card ? (
            <PromoCard
              key={p.id}
              c={c}
              icon={Award}
              title={`${placementTitle(p)}, featured`}
              dates={card.dates}
              chip={card.chip}
              borderColor={card.view === "featured" ? c.segactive : undefined}
              line={card.line}
              actions={
                card.view === "unpaid"
                  ? [{ key: "retry", icon: CalendarClock, label: "Pick new dates", disabled: !online || !m.isOwner, onClick: () => setFeature({ item: p.targetId, from: retryStart(p, today), retry: { placementId: p.id, itemId: p.targetId } }) }]
                  : card.view === "awaiting"
                    ? []
                    : [{ key: "results", icon: ChartColumn, label: "Results", onClick: () => setResults(p) }]
              }
            />
          ) : null
        )}
        {rows.map(({ p, status }) => {
          const s = data.stats.get(p.id);
          return (
            <PromoCard
              key={p.id}
              c={c}
              icon={TYPE_ICON[iconOfType(p.type)]}
              title={p.name}
              dates={promoDates(p, status, v.audienceNew)}
              chip={chipOfStatus(status)}
              glow={glow === p.id}
              stats={[
                { label: v.statLabel, value: usesText(status, s) },
                { label: "People", value: peopleText(status, s) },
              ]}
              line={recordedLine(s)}
              actions={promoActions(status).map((a) => ({
                key: a,
                icon: ACTION_ICON[a],
                label: ACTION_LABEL[a],
                warn: a === "end" || a === "cancel",
                disabled: !canWrite || rowBusy === p.id,
                onClick: () => act(a, p, status),
              }))}
            />
          );
        })}
      </div>
    );

  const addDisabled = !online || !canMarket || !business;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, color: c.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <CapsLabel>Your promotions</CapsLabel>
      {promoBlock}
      <OutlineButton onClick={() => setCreate({ what: null })} disabled={!canWrite} style={{ width: "100%", minHeight: 44 }}>
        <Plus size={15} strokeWidth={2.4} aria-hidden />
        Create promotion
      </OutlineButton>

      <CapsLabel style={{ marginTop: 6 }}>Offers on your listing</CapsLabel>
      {noRow ? (
        // No business_profiles row: offers attach to it (main's discounts gate, NOTHING_LOST LOST 3).
        <>
          <MarketEmptyCard title="No offers yet" body="Save your business profile first to start adding offers." />
          <OutlineButton onClick={() => navigate("/app/business/profile")} style={{ width: "100%", minHeight: 44 }}>
            Set up business profile
          </OutlineButton>
        </>
      ) : offers.length === 0 && running.length === 0 ? (
        <MarketEmptyCard title="No offers yet" body={v.offersEmpty} />
      ) : (
        <>
          {offers.map((o) => (
            <OfferCard
              key={o.id}
              c={c}
              icon={o.perk ? Percent : BadgePercent}
              title={o.label}
              sub={o.perk ? "Your listing perk" : "Discount"}
              on
              switchDisabled
              chip={o.label}
              teal={glow === o.id}
              menu={{ label: `Options for ${o.label}`, disabled: !online || !canMarket, onOpen: (el) => setMenuFor({ row: o, el }) }}
            />
          ))}
          {running.map(({ p, status }) => (
            <OfferCard
              key={`offer:${p.id}`}
              c={c}
              icon={TYPE_ICON[iconOfType(p.type)]}
              title={p.name}
              sub={offerSub(p)}
              on={p.showOnListing}
              switchDisabled={!canWrite || rowBusy === p.id}
              onSwitch={(on) => (on ? setShowSheet(p) : void onListing(p, false))}
              chip={p.name}
              used={offerUsed(status, p.showOnListing, data.stats.get(p.id))}
              teal={glow === `offer:${p.id}`}
            />
          ))}
        </>
      )}
      <button
        type="button"
        // The perk is the listing's one free-text offer; any further offer is a promotion (B13).
        onClick={() => (m.perk ? setCreate({ what: null }) : setOfferSheet({ mode: "add" }))}
        disabled={addDisabled}
        className="tap market-focus"
        style={{
          width: "100%",
          minHeight: 52,
          borderRadius: 20,
          border: `1.5px dashed ${c.border}`,
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          fontFamily: "inherit",
          fontSize: px(13),
          fontWeight: 800,
          color: c.pdark,
          cursor: addDisabled ? "default" : "pointer",
          opacity: addDisabled ? 0.4 : 1,
        }}
      >
        <Plus size={15} strokeWidth={2.4} aria-hidden />
        Add an offer
      </button>

      {sugg.length > 0 && (
        <>
          <CapsLabel style={{ marginTop: 6 }}>Worth promoting</CapsLabel>
          <Card r={20} style={{ overflow: "hidden" }}>
            {sugg.map((s, i) => (
              <div key={s.x.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderTop: i ? `1px solid ${c.div}` : "none" }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: px(13.5), fontWeight: 700, color: c.ink, lineHeight: lh(19) }}>{`${s.x.title} · ${dowTime(s.x.date, s.x.startTime)}`}</span>
                  <span style={{ display: "block", fontSize: px(11.5), color: c.caution, fontWeight: 700, lineHeight: lh(16) }}>{`${s.b} of ${s.x.maxCapacity} booked · ${whenFromNow(s.start, now, today, s.x.date)}`}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setCreate({ what: s.x.id })}
                  disabled={!canWrite}
                  className="tap market-focus"
                  style={{ height: 34, padding: "0 12px", borderRadius: 10, background: "transparent", color: c.pdark, border: `1px solid ${c.fill}`, display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit", fontSize: px(12), fontWeight: 800, whiteSpace: "nowrap", cursor: canWrite ? "pointer" : "default", opacity: canWrite ? 1 : 0.4 }}
                >
                  <Megaphone size={13} strokeWidth={2.4} aria-hidden />
                  Promote
                </button>
              </div>
            ))}
          </Card>
        </>
      )}

      {hasSomething && (
        <>
          <CapsLabel style={{ marginTop: 6 }}>Featured on Explore</CapsLabel>
          <Card r={20} style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 36, height: 36, borderRadius: 11, background: c.cautionbg, color: c.gold, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Award size={17} strokeWidth={2} aria-hidden />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: px(14), fontWeight: 800, color: c.ink, lineHeight: lh(20) }}>{v.featureTitle}</span>
                <span style={{ display: "block", fontSize: px(11.5), color: c.faint, lineHeight: lh(16) }}>Shown first in your area for 7 days</span>
              </span>
              {price && <span style={{ fontSize: px(14), fontWeight: 800, color: c.ink }}>{price}</span>}
            </div>
            {featLine ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, minHeight: 44, padding: "0 12px", borderRadius: 12, background: c.pale, color: c.pdark, fontSize: px(12.5), fontWeight: 800 }}>
                <Award size={15} strokeWidth={2.2} aria-hidden />
                <span style={{ flex: 1, minWidth: 0 }}>{featLine.text}</span>
                {featLine.right && <span style={{ fontSize: px(11.5), fontWeight: 700 }}>{featLine.right}</span>}
              </div>
            ) : (
              <>
                <OutlineButton onClick={() => setFeature({ item: null })} disabled={!online || !m.isOwner} style={{ width: "100%", marginTop: 10, minHeight: 44 }}>
                  Feature for a week
                </OutlineButton>
                {!m.isOwner && business && <p style={{ fontSize: px(11.5), color: c.faint, lineHeight: lh(16), marginTop: 8, textAlign: "center" }}>{OWNER_ONLY}</p>}
              </>
            )}
          </Card>
        </>
      )}

      {create && (
        <PromotionSheet
          open
          items={items}
          initialWhat={create.what}
          prefill={create.prefill ?? null}
          onClose={() => {
            setCreate(null);
            clearParam();
          }}
          onSaved={(p, msg) => {
            setCreate(null);
            clearParam();
            applied(p, msg);
          }}
          onEnded={() => undefined}
        />
      )}
      {edit && (
        <PromotionSheet
          open
          items={items}
          edit={edit}
          onClose={() => setEdit(null)}
          onDuplicate={(d) => {
            setEdit(null);
            setCreate({ what: d.what, prefill: d });
          }}
          onSaved={(p, msg) => {
            setEdit(null);
            applied(p, msg);
          }}
          onEnded={(p) => {
            setEdit(null);
            applied(p, `${p.name} has ended.`);
          }}
        />
      )}
      {offerSheet && (
        <OfferSheet
          mode={offerSheet.mode}
          row={offerSheet.row ?? null}
          offers={offers}
          onClose={() => {
            setOfferSheet(null);
            clearParam();
          }}
          onSaved={(label, id) => {
            setOfferSheet(null);
            clearParam();
            if (id) flash(id);
            showToast(`${label} is now on your listing.`);
          }}
        />
      )}
      {showSheet && (
        <ShowSheet
          promo={showSheet}
          shown={[...offers.map((o) => o.label), ...running.filter((r) => r.p.showOnListing).map((r) => r.p.name)]}
          busy={rowBusy === showSheet.id}
          onClose={() => setShowSheet(null)}
          onTurnOn={async () => {
            await onListing(showSheet, true);
            setShowSheet(null);
          }}
        />
      )}
      {feature && (
        <FeatureSheet
          open
          items={withRetryItem(items, feature.retry, data.placements, placementTitle)}
          initialItem={feature.item}
          initialFrom={feature.from}
          retry={feature.retry ?? null}
          onClose={() => setFeature(null)}
          onContinue={(item, from, p) => {
            setPay({ itemId: item.id, from, price: p, retry: feature.retry });
            setFeature(null);
          }}
        />
      )}
      {pay && (
        <PaySheet
          open
          item={withRetryItem(items, pay.retry, data.placements, placementTitle).find((i) => i.id === pay.itemId) ?? null}
          from={pay.from}
          price={pay.price}
          retry={pay.retry ?? null}
          onClose={() => setPay(null)}
          onRequested={(msg) => {
            setPay(null);
            data.reload();
            showToast(msg);
          }}
        />
      )}
      {results && <ResultsSheet open item={placementTitle(results)} from={results.startsOn} to={results.endsOn} onClose={() => setResults(null)} />}
      <PopupMenu
        open={!!menuFor && !sheetOpen}
        onClose={() => setMenuFor(null)}
        anchor={menuFor?.el ?? null}
        align="right"
        width={180}
        options={[
          ...(menuFor?.row.perk ? [{ value: "edit", label: "Edit" }] : []),
          { value: "remove", label: "Remove", destructive: true, icon: <Trash2 size={15} aria-hidden /> },
        ]}
        onSelect={(k) => {
          const row = menuFor?.row;
          setMenuFor(null);
          if (!row) return;
          if (k === "edit") setOfferSheet({ mode: "edit", row });
          else setRemoveRow({ row, step: 1 });
        }}
      />
      <CentredDialog
        open={removeRow?.step === 1}
        title={`Remove ${removeRow?.row.label ?? ""}?`}
        body="It comes off your card on Explore. You can add it again any time."
        action="Remove"
        cancel="Keep it"
        onAction={() => removeRow && setRemoveRow({ ...removeRow, step: 2 })}
        onCancel={() => setRemoveRow(null)}
      />
      <CentredDialog
        open={removeRow?.step === 2}
        title="Confirm remove"
        body={`${removeRow?.row.label ?? ""} comes off your listing now.`}
        action="Remove"
        cancel="Keep it"
        busy={busy}
        onAction={() => removeRow && void doRemove(removeRow.row)}
        onCancel={() => setRemoveRow(null)}
      />
      <CentredDialog
        open={confirm?.kind === "end" && confirm.step === 1}
        title="End this promotion now?"
        body={`${confirm?.p.name ?? ""} will stop showing on Explore today instead of ${confirm?.p.endsOn ? dayMonth(confirm.p.endsOn) : "its end date"}. People who already claimed it keep it.`}
        action="End promotion"
        cancel="Keep it running"
        onAction={() => confirm && setConfirm({ ...confirm, step: 2 })}
        onCancel={() => setConfirm(null)}
      />
      <CentredDialog
        open={confirm?.kind === "end" && confirm.step === 2}
        title="Confirm end"
        body="This can't be undone."
        action="End promotion"
        cancel="Keep it running"
        busy={busy}
        onAction={() => void onConfirm()}
        onCancel={() => setConfirm(null)}
      />
      <CentredDialog
        open={confirm?.kind === "cancel" && confirm.step === 1}
        title="Cancel this promotion?"
        body={`It won't start on ${confirm ? dayMonth(confirm.p.startsOn) : ""}.`}
        action="Cancel promotion"
        cancel="Keep it"
        onAction={() => confirm && setConfirm({ ...confirm, step: 2 })}
        onCancel={() => setConfirm(null)}
      />
      <CentredDialog
        open={confirm?.kind === "cancel" && confirm.step === 2}
        title="Confirm cancel"
        body="This can't be undone."
        action="Cancel promotion"
        cancel="Keep it"
        busy={busy}
        onAction={() => void onConfirm()}
        onCancel={() => setConfirm(null)}
      />
      {strip}
    </div>
  );
}

const ACTION_ICON: Record<PromoAction, LucideIcon> = { edit: Pencil, pause: Pause, resume: Play, end: CalendarX2, cancel: X, again: Copy };
const ACTION_LABEL: Record<PromoAction, string> = { edit: "Edit", pause: "Pause", resume: "Resume", end: "End", cancel: "Cancel", again: "Run again" };

/** Pick new dates: the unpaid week's own target, even when it isn't in the list (a past class, the business itself). */
function withRetryItem(items: Promotable[], retry: FeatureRetry | undefined, placements: Placement[], title: (p: Placement) => string): Promotable[] {
  if (!retry || items.some((i) => i.id === retry.itemId)) return items;
  const p = placements.find((x) => x.id === retry.placementId);
  if (!p) return items;
  const t = title(p);
  const kind: Promotable["kind"] = p.targetKind === "class" ? "class" : p.targetKind === "product" ? "offering" : "offer";
  return [{ id: p.targetId, kind, title: t, field: t, sub: p.targetKind === "class" ? "Class" : p.targetKind === "product" ? "Offering" : "Your listing", preview: "" }, ...items];
}

/** The status chips as the offer chips (OfferCard manager): Active / Scheduled / Paused / Ended; featured --pale, awaiting --caution, unpaid --high. */
function chipTone(chip: ChipKey, m: MarketPalette): [string, string] {
  if (chip === "active" || chip === "scheduled" || chip === "paused") return statusChip(chip, m);
  if (chip === "ended") return statusChip("expired", m);
  if (chip === "featured") return [m.pale, m.pdark];
  if (chip === "awaiting") return [m.cautionbg, m.caution];
  return [m.highbg, m.high];
}

interface CardAction {
  key: string;
  icon: LucideIcon;
  label: string;
  warn?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/** MA1-007 P1 / P1a-c: the promotion card (also the featured-week card, MA1-115), as a handover r20 card. */
function PromoCard({
  c,
  icon: Icon,
  title,
  dates,
  chip,
  glow,
  borderColor,
  stats,
  line,
  actions,
}: {
  c: MarketPalette;
  icon: LucideIcon;
  title: string;
  dates: string;
  chip: ChipKey;
  glow?: boolean;
  borderColor?: string;
  stats?: { label: string; value: string }[];
  line?: string | null;
  actions: CardAction[];
}) {
  const [bg, ink] = chipTone(chip, c);
  return (
    <div data-promo-card style={{ borderRadius: 20, background: c.card, border: `1px solid ${borderColor ?? c.border}`, padding: "14px 16px", boxShadow: glow ? `0 0 0 3px ${c.pale}` : "none", transition: "box-shadow 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ width: 36, height: 36, borderRadius: 11, background: c.pale, color: c.pdark, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={17} strokeWidth={2} aria-hidden />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: px(14), fontWeight: 800, lineHeight: lh(20), color: c.ink }}>{title}</span>
          <span style={{ display: "block", fontSize: px(11.5), color: c.faint, marginTop: 2, lineHeight: lh(16) }}>{dates}</span>
        </span>
        <span style={{ fontSize: px(10.5), fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: bg, color: ink, whiteSpace: "nowrap" }}>{CHIP_LABEL[chip]}</span>
      </div>
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 12 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ borderRadius: 12, background: c.soft, padding: "8px 10px" }}>
              <p style={{ fontSize: px(10.5), color: c.faint, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: lh(15.75) }}>{s.label}</p>
              <p style={{ fontSize: px(16), fontWeight: 800, fontVariantNumeric: "tabular-nums", color: c.ink, lineHeight: lh(22) }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}
      {line && <p style={{ fontSize: px(11.5), color: c.ink2, marginTop: 8, lineHeight: lh(16) }}>{line}</p>}
      {actions.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={a.onClick}
              disabled={a.disabled}
              className="tap market-focus"
              style={{
                flex: 1,
                minWidth: 0,
                height: 40,
                borderRadius: 12,
                border: `1px solid ${a.warn ? c.highbg : c.border}`,
                background: a.warn ? c.highbg : "transparent",
                color: a.warn ? c.high : c.ink2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                fontFamily: "inherit",
                fontSize: px(12),
                fontWeight: 800,
                cursor: a.disabled ? "default" : "pointer",
                opacity: a.disabled ? 0.4 : 1,
              }}
            >
              <a.icon size={14} strokeWidth={2.2} aria-hidden />
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** MA1-007 OF1 / OF2: an offer on the listing (perk, discount or a running promotion). */
function OfferCard({
  c,
  icon: Icon,
  title,
  sub,
  on,
  switchDisabled,
  onSwitch,
  chip,
  used,
  teal,
  menu,
}: {
  c: MarketPalette;
  icon: LucideIcon;
  title: string;
  sub: string;
  on: boolean;
  switchDisabled?: boolean;
  onSwitch?: (on: boolean) => void;
  chip: string;
  used?: string;
  teal?: boolean;
  menu?: { label: string; disabled: boolean; onOpen: (el: HTMLElement) => void };
}) {
  return (
    <div style={{ borderRadius: 20, background: c.card, border: `1px solid ${teal ? c.teal : c.border}`, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 36, height: 36, borderRadius: 11, background: c.pale, color: c.pdark, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={17} strokeWidth={2} aria-hidden />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: px(14), fontWeight: 800, color: c.ink, lineHeight: lh(20) }}>{title}</span>
          <span style={{ display: "block", fontSize: px(11.5), color: c.faint, lineHeight: lh(16) }}>{sub}</span>
        </span>
        <SheetSwitch on={on} onChange={(x) => onSwitch?.(x)} label={on ? `Turn off ${title}` : `Turn on ${title}`} disabled={switchDisabled || !onSwitch} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${c.div}` }}>
        <span style={{ fontSize: px(11), fontWeight: 600, color: c.faint }}>On your card:</span>
        <span style={{ fontSize: px(10.5), fontWeight: 800, color: on ? c.pdark : c.faint, background: on ? c.pale : c.soft, opacity: on ? 1 : 0.6, borderRadius: 999, padding: "2px 8px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chip}</span>
        {used && <span style={{ marginInlineStart: "auto", fontSize: px(11), color: c.faint, whiteSpace: "nowrap" }}>{used}</span>}
        {menu && (
          <button
            type="button"
            aria-label={menu.label}
            disabled={menu.disabled}
            onClick={(e) => menu.onOpen(e.currentTarget)}
            className="tap market-focus"
            style={{ marginInlineStart: "auto", width: 32, height: 24, display: "flex", alignItems: "center", justifyContent: "center", color: c.faint, background: "transparent", border: 0, borderRadius: 8, cursor: menu.disabled ? "default" : "pointer", opacity: menu.disabled ? 0.4 : 1 }}
          >
            <Ellipsis size={16} strokeWidth={2.4} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

/** MA1-051: turning a promotion on for the listing (show_on_listing) previews the card first. */
function ShowSheet({ promo, shown, busy, onClose, onTurnOn }: { promo: Promotion; shown: string[]; busy: boolean; onClose: () => void; onTurnOn: () => void }) {
  const m = useMarket();
  const { business, v } = m;
  const c = useMarketColors();
  const online = useOnline();
  return (
    <MasterSheet
      open
      onClose={onClose}
      title={`Show ${promo.name}`}
      footer={
        <PrimaryButton disabled={!online} busy={busy} onClick={onTurnOn}>
          Turn on
        </PrimaryButton>
      }
    >
      <p style={{ fontSize: px(13), fontWeight: 500, color: c.slabel, marginBottom: 8 }}>How it appears on Explore</p>
      <Preview c={c} name={business?.name ?? ""} existing={shown.filter((l) => l !== promo.name)} added={promo.name} />
      <p style={{ fontSize: px(12), color: c.faint, marginTop: 10, lineHeight: lh(17) }}>{`New ${v.people} see it on your card${m.kind === "classes" ? " and class pages" : ""}. You can turn it off any time.`}</p>
    </MasterSheet>
  );
}

/** MA1-051 row 2: the card preview, existing chips plus the new one filled with the teal ring. */
function Preview({ c, name, existing, added }: { c: MarketPalette; name: string; existing: string[]; added: string }): ReactNode {
  return (
    <div style={{ borderRadius: 16, border: `1px solid ${c.border}`, background: c.card, padding: 12, display: "flex", gap: 12 }}>
      <span style={{ width: 44, height: 44, borderRadius: 12, background: c.pale, display: "flex", alignItems: "center", justifyContent: "center", fontSize: px(14), fontWeight: 800, color: c.pdark, flexShrink: 0 }}>{initialsOf(name)}</span>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: px(14), fontWeight: 800, color: c.ink }}>{name}</p>
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          {existing.map((l) => (
            <span key={l} style={{ fontSize: px(10.5), fontWeight: 800, color: c.pdark, background: c.pale, borderRadius: 999, padding: "2px 8px" }}>
              {l}
            </span>
          ))}
          {added && <span style={{ fontSize: px(10.5), fontWeight: 800, color: c.onfill, background: c.fill, borderRadius: 999, padding: "2px 8px", boxShadow: `0 0 0 2px ${c.teal}` }}>{added}</span>}
        </div>
      </div>
    </div>
  );
}

/** OF3 (OURS): one field "Offer", the Explore preview (MA1-051 rows 1-3) and Save. */
function OfferSheet({ mode, row, offers, onClose, onSaved }: { mode: "add" | "edit"; row: OfferRow | null; offers: OfferRow[]; onClose: () => void; onSaved: (label: string, id: string | null) => void }) {
  const m = useMarket();
  const { business, v } = m;
  const c = useMarketColors();
  const [text, setText] = useState(row?.label ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = text.trim();
  const existing = offers.filter((o) => o.id !== row?.id).map((o) => o.label);
  const save = async () => {
    if (!business || !t) return;
    setBusy(true);
    setError(null);
    // The perk is the listing's free-text offer (business_profiles.perk); this
    // sheet only sets it. Further offers are promotions (B13; B16 retired
    // business_discounts).
    const r = await saveListingPerk(business.id, t);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    m.setPerk(r.value);
    onSaved(t, "perk");
  };
  return (
    <MasterSheet
      open
      onClose={onClose}
      title={mode === "edit" ? "Edit offer" : "Add an offer"}
      footer={
        <>
          <PrimaryButton disabled={!t || (mode === "edit" && t === row?.label)} busy={busy} onClick={() => void save()}>
            Save
          </PrimaryButton>
          {error && <SaveError>{error}</SaveError>}
        </>
      }
    >
      <SheetBox label="Offer" htmlFor="perk-offer">
        <input id="perk-offer" value={text} onChange={(e) => setText(e.target.value)} maxLength={120} placeholder="10% off with Centium" className="market-focus" style={fieldStyle(c)} />
      </SheetBox>
      <p style={{ fontSize: px(13), fontWeight: 500, color: c.slabel, margin: "16px 0 8px" }}>How it appears on Explore</p>
      <Preview c={c} name={business?.name ?? ""} existing={existing} added={t} />
      <p style={{ fontSize: px(12), color: c.faint, marginTop: 10, lineHeight: lh(17) }}>{`New ${v.people} see it on your card${m.kind === "classes" ? " and class pages" : ""}. You can turn it off any time.`}</p>
    </MasterSheet>
  );
}
