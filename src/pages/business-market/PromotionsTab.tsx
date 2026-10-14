import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Award, BadgePercent, Ellipsis, Megaphone, Percent, Plus, Trash2 } from "lucide-react";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { initialsOf } from "../../components/business-more/kind";
import { useOnline } from "../../hooks/useOnline";
import { priceLabel, saveListingPerk } from "../../services/business-market";
import { useMarket } from "./MarketContext";
import { lh, MCard, MEmpty, MFieldLabel, MFixedCta, MLabel, MOutline, MPopup, MPrimary, MSaveError, MSheet, MSwitch, px, useMarketToast } from "./kit";
import { classFlag, dowTime, isoOf, whenFromNow } from "./model";
import { promotables, type PromoDraft } from "./promoModel";
import { PromotionSheet } from "./PromotionSheet";
import { FeatureSheet, PaySheet } from "./FeatureSheets";

// MA1-007 / 020-022 / 050-053 / 066 / 072 / 099-118 · Promotions, and the
// Gym / Store variants (OURS-MA1-gym-promotions, MA1-072).
//
// LIVE: "Offers on your listing" = the listing perk (business_profiles.perk,
// V6-88: its editor moved here from the Dashboard) and business_discounts
// (until B16), with "Add an offer" (OF3, the kept add-discount feature) and
// each offer's Edit / Remove. An offer's on / off switch needs B13's
// show-on-listing flag (MK-05): drawn on and disabled until then.
// B13 (not on the local stack): the promotions themselves (MK-05) and
// Feature for a week (MK-06): "Your promotions" shows its empty card, Create
// promotion opens the full form whose Save says "Coming soon", and the
// Featured card shows the price only when the database returns one (V6-45).

interface OfferRow {
  id: string;
  label: string;
  perk: boolean;
}

export function PromotionsTab() {
  const m = useMarket();
  const { c, v, kind, business } = m;
  const online = useOnline();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const promoteParam = params.get("promote");
  const [toast, showToast] = useMarketToast();
  const [create, setCreate] = useState<{ what: string | null; draft?: PromoDraft } | null>(promoteParam ? { what: promoteParam } : null);
  const [offerSheet, setOfferSheet] = useState<{ mode: "add" | "edit"; row?: OfferRow } | null>(params.get("offer") === "new" ? { mode: "add" } : null);
  const [menuFor, setMenuFor] = useState<{ row: OfferRow; el: HTMLElement } | null>(null);
  const [removeRow, setRemoveRow] = useState<OfferRow | null>(null);
  const [feature, setFeature] = useState<{ item: string | null } | null>(null);
  const [pay, setPay] = useState<{ itemId: string; from: string } | null>(null);
  const [glow, setGlow] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());

  const today = isoOf(new Date());
  const offers: OfferRow[] = useMemo(
    () => [...(m.perk ? [{ id: "perk", label: m.perk, perk: true }] : []), ...m.discounts.discounts.map((d) => ({ id: d.id, label: d.label, perk: false }))],
    [m.perk, m.discounts.discounts]
  );
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
  /** The read answered and there is no business row (not loading, not an error). */
  const noRow = !business && !m.loading && !m.error;
  const sheetOpen = !!create || !!offerSheet || !!feature || !!pay || !!removeRow;

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

  const doRemove = async (row: OfferRow) => {
    if (!business) return;
    setBusy(true);
    if (row.perk) {
      const r = await saveListingPerk(business.id, null);
      setBusy(false);
      if (!r.ok) return showToast(r.message);
      m.setPerk(null);
    } else {
      await m.discounts.remove(row.id);
      setBusy(false);
    }
    setRemoveRow(null);
    showToast(`${row.label} is off your listing.`, { overCta: true });
  };

  return (
    <div>
      <MLabel c={c}>Your promotions</MLabel>
      <div style={{ borderRadius: 20, border: `1.5px dashed ${c.border}`, padding: "18px 16px", textAlign: "center", marginBottom: 16 }}>
        <p style={{ fontSize: px(14), fontWeight: 800, color: c.ink, lineHeight: lh(21) }}>No promotions yet</p>
        <p style={{ fontSize: px(12), color: c.faint, marginTop: 4, lineHeight: lh(17) }}>{v.promosEmpty}</p>
      </div>

      <MLabel c={c} margin="0 0 8px">
        Offers on your listing
      </MLabel>
      {noRow ? (
        // No business_profiles row: offers attach to it (main's discounts gate, NOTHING_LOST LOST 3).
        <MEmpty
          c={c}
          icon={BadgePercent}
          title="No offers yet"
          body="Save your business profile first to start adding offers."
          pad="22px 20px"
          bodyLh={18}
          action={{ label: "Set up business profile", onClick: () => navigate("/app/business/profile") }}
        />
      ) : offers.length === 0 ? (
        <MEmpty c={c} icon={BadgePercent} title="No offers yet" body={v.offersEmpty} pad="22px 20px" bodyLh={18} />
      ) : (
        offers.map((o) => (
          <MCard key={o.id} c={c} r={20} borderColor={glow === o.id ? c.teal : undefined} style={{ padding: "12px 14px", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 36, height: 36, borderRadius: 12, background: c.pale, color: c.pDark, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {o.perk ? <Percent size={17} strokeWidth={2} aria-hidden /> : <BadgePercent size={17} strokeWidth={2} aria-hidden />}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: px(13.5), fontWeight: 800, color: c.ink, lineHeight: lh(20) }}>{o.label}</span>
                <span style={{ display: "block", fontSize: px(11.5), color: c.faint, lineHeight: lh(16) }}>{o.perk ? "Your listing perk" : "Discount"}</span>
              </span>
              <MSwitch c={c} on onChange={() => undefined} label={`Turn off ${o.label}`} disabled />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${c.divider}` }}>
              <span style={{ fontSize: px(10.5), fontWeight: 700, color: c.faint }}>On your card:</span>
              <span style={{ fontSize: px(10), fontWeight: 800, color: c.pDark, background: c.pale, borderRadius: 999, padding: "2px 8px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</span>
              <button
                type="button"
                aria-label={`Options for ${o.label}`}
                disabled={!online || !m.isOwner}
                onClick={(e) => setMenuFor({ row: o, el: e.currentTarget })}
                className="tap"
                style={{ marginLeft: "auto", width: 32, height: 24, display: "flex", alignItems: "center", justifyContent: "center", color: c.faint, background: "transparent", border: 0, opacity: !online || !m.isOwner ? 0.4 : 1 }}
              >
                <Ellipsis size={16} strokeWidth={2.4} aria-hidden />
              </button>
            </div>
          </MCard>
        ))
      )}
      <button
        type="button"
        onClick={() => setOfferSheet({ mode: "add" })}
        disabled={!online || !m.isOwner || !business}
        className="tap"
        style={{
          width: "100%",
          minHeight: 52,
          marginTop: 8,
          borderRadius: 20,
          border: `1.5px dashed ${c.border}`,
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          fontSize: px(13),
          fontWeight: 800,
          color: c.pDark,
          opacity: !online || !m.isOwner || !business ? 0.4 : 1,
        }}
      >
        <Plus size={15} strokeWidth={2.4} aria-hidden />
        Add an offer
      </button>
      {m.discounts.error && <MSaveError c={c}>{m.discounts.error}</MSaveError>}

      {sugg.length > 0 && (
        <>
          <MLabel c={c} margin="16px 0 8px">
            Worth promoting
          </MLabel>
          <MCard c={c} r={20} style={{ overflow: "hidden" }}>
            {sugg.map((s, i) => (
              <div key={s.x.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderTop: i ? `1px solid ${c.divider}` : "none" }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: px(13), fontWeight: 800, color: c.ink, lineHeight: lh(19.5) }}>{`${s.x.title} · ${dowTime(s.x.date, s.x.startTime)}`}</span>
                  <span style={{ display: "block", fontSize: px(11.5), color: c.caution, fontWeight: 700, lineHeight: lh(17) }}>{`${s.b} of ${s.x.maxCapacity} booked · ${whenFromNow(s.start, now, today, s.x.date)}`}</span>
                </span>
                <button type="button" onClick={() => setCreate({ what: s.x.id })} className="tap" style={{ height: 34, padding: "0 12px", borderRadius: 10, background: "transparent", color: c.pDark, border: `1px solid ${c.primary}`, display: "flex", alignItems: "center", gap: 5, fontSize: px(12), fontWeight: 800, whiteSpace: "nowrap" }}>
                  <Megaphone size={13} strokeWidth={2.4} aria-hidden />
                  Promote
                </button>
              </div>
            ))}
          </MCard>
        </>
      )}

      {hasSomething && (
        <>
          <MLabel c={c} margin="16px 0 8px">
            Featured on Explore
          </MLabel>
          <MCard c={c} r={20} style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 36, height: 36, borderRadius: 12, background: c.goldTrack, color: c.gold, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Award size={17} strokeWidth={2} aria-hidden />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: px(13.5), fontWeight: 800, color: c.ink, lineHeight: lh(20) }}>{v.featureTitle}</span>
                <span style={{ display: "block", fontSize: px(11.5), color: c.faint, lineHeight: lh(16) }}>Shown first in your area for 7 days</span>
              </span>
              {price && <span style={{ fontSize: px(13), fontWeight: 800, color: c.ink }}>{price}</span>}
            </div>
            <MOutline c={c} onClick={() => setFeature({ item: null })} disabled={!online || !m.isOwner} style={{ width: "100%", marginTop: 10 }}>
              Feature for a week
            </MOutline>
          </MCard>
        </>
      )}
      <div style={{ height: 72 }} />

      {!sheetOpen && <MFixedCta c={c} label="Create promotion" icon={<Plus size={17} strokeWidth={2.6} aria-hidden />} onClick={() => setCreate({ what: null })} disabled={!online || !m.isOwner || !business} />}

      {create && (
        <PromotionSheet
          open
          items={items}
          initialWhat={create.what}
          onClose={() => {
            setCreate(null);
            clearParam();
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
            showToast(`${label} is now on your listing.`, { overCta: true });
          }}
        />
      )}
      {feature && (
        <FeatureSheet
          open
          items={items}
          initialItem={feature.item}
          onClose={() => setFeature(null)}
          onContinue={(item, from) => {
            setFeature(null);
            setPay({ itemId: item.id, from });
          }}
        />
      )}
      {pay && <PaySheet open item={items.find((i) => i.id === pay.itemId) ?? null} from={pay.from} onClose={() => setPay(null)} />}
      <PopupMenu
        open={!!menuFor}
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
          else setRemoveRow(row);
        }}
      />
      <MPopup
        open={!!removeRow}
        icon={Trash2}
        title={`Remove ${removeRow?.label ?? ""}?`}
        body="It comes off your card on Explore. You can add it again any time."
        action="Remove"
        keep="Keep it"
        busy={busy}
        onAction={() => removeRow && void doRemove(removeRow)}
        onCancel={() => setRemoveRow(null)}
      />
      {toast}
    </div>
  );
}

/** OF3 (OURS): one field "Offer", the Explore preview (MA1-051 rows 1-3) and Save. */
function OfferSheet({ mode, row, offers, onClose, onSaved }: { mode: "add" | "edit"; row: OfferRow | null; offers: OfferRow[]; onClose: () => void; onSaved: (label: string, id: string | null) => void }) {
  const m = useMarket();
  const { c, business, v } = m;
  const [text, setText] = useState(row?.label ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = text.trim();
  const existing = offers.filter((o) => o.id !== row?.id).map((o) => o.label);
  const save = async () => {
    if (!business || !t) return;
    setBusy(true);
    setError(null);
    // The perk is the listing's first offer: the first one added fills it, the rest are discounts.
    if (mode === "edit" ? row?.perk : !m.perk) {
      const r = await saveListingPerk(business.id, t);
      setBusy(false);
      if (!r.ok) return setError(r.message);
      m.setPerk(r.value);
      onSaved(t, "perk");
      return;
    }
    const ok = await m.discounts.add(t);
    setBusy(false);
    if (!ok) return setError(m.discounts.error ?? "Couldn't save. Try again.");
    onSaved(t, null);
  };
  return (
    <MSheet
      open
      onClose={onClose}
      title={mode === "edit" ? "Edit offer" : "Add an offer"}
      footer={
        <>
          <MPrimary c={c} disabled={!t || busy || (mode === "edit" && t === row?.label)} onClick={() => void save()}>
            Save
          </MPrimary>
          {error && <MSaveError c={c}>{error}</MSaveError>}
        </>
      }
    >
      <label>
        <MFieldLabel c={c}>Offer</MFieldLabel>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={120}
          placeholder="10% off with Centium"
          style={{ width: "100%", height: 46, borderRadius: 14, background: c.soft, border: `1.5px solid ${c.border}`, padding: "0 12px", fontSize: px(13.5), fontWeight: 700, color: c.ink, boxSizing: "border-box", outline: "none" }}
        />
      </label>
      <p style={{ fontSize: px(12), fontWeight: 700, color: c.inkSoft, margin: "16px 2px 8px" }}>How it appears on Explore</p>
      <div style={{ borderRadius: 18, border: `1px solid ${c.border}`, padding: 12, display: "flex", gap: 12 }}>
        <span style={{ width: 44, height: 44, borderRadius: 14, background: c.pale, display: "flex", alignItems: "center", justifyContent: "center", fontSize: px(14), fontWeight: 800, color: c.pDark, flexShrink: 0 }}>{initialsOf(business?.name ?? "")}</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: px(14), fontWeight: 800, color: c.ink }}>{business?.name}</p>
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            {existing.map((l) => (
              <span key={l} style={{ fontSize: px(10), fontWeight: 800, color: c.pDark, background: c.pale, borderRadius: 999, padding: "2px 8px" }}>
                {l}
              </span>
            ))}
            {t && <span style={{ fontSize: px(10), fontWeight: 800, color: c.onFill, background: c.fill, borderRadius: 999, padding: "2px 8px", boxShadow: `0 0 0 2px ${c.teal}` }}>{t}</span>}
          </div>
        </div>
      </div>
      <p style={{ fontSize: px(11.5), color: c.faint, marginTop: 10, lineHeight: lh(16) }}>{`New ${v.people} see it on your card${m.kind === "classes" ? " and class pages" : ""}. You can turn it off any time.`}</p>
    </MSheet>
  );
}
