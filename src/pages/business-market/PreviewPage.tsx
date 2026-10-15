import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { ClassCard } from "../../components/marketplace/ClassCard";
import type { MarketplaceClass } from "../../services/marketplace";
import { initialsOf } from "../../components/business-more/kind";
import { MarketProvider, useMarket } from "./MarketContext";
import { lh, MError, px } from "./kit";
import { typeLine } from "./listingParts";
import { isoOf, notEnded } from "./model";

// MA1-026 · Preview as client: a read-only Explore result built from this
// business's own listing, without the navbar. The class rows are the client
// Explore ClassCard itself (the client card wins), fed with the business's
// next classes; Book is inert. Gym shows its passes and plans, Store its
// products (OURS section names).

export default function PreviewPage() {
  return (
    <MarketProvider>
      <PreviewBody />
    </MarketProvider>
  );
}

function PreviewBody() {
  const m = useMarket();
  const { c, v, kind, business } = m;
  const navigate = useNavigate();
  const [now] = useState(() => Date.now());
  if (m.error && !business) return <MError c={c} onRetry={m.reload} />;
  if (!business) return <div aria-busy="true" style={{ minHeight: 400 }} />;
  const today = isoOf(new Date());
  const live = m.classes.classes.filter((x) => x.date >= today && notEnded(x, now));
  const upcoming = live.slice(0, 6);
  const chips = [...(m.perk ? [m.perk] : []), ...m.listingPromos.map((p) => p.name)];
  const meta =
    kind === "store"
      ? `${m.offerings.offerings.length} products`
      : kind === "gym"
        ? `${m.plans.plans.length} passes and plans`
        : upcoming.length === 0
          ? "No upcoming classes"
          : `${live.length} upcoming classes`;
  const toMarket = (x: (typeof upcoming)[number]): MarketplaceClass => {
    const b = m.booked?.get(x.id) ?? 0;
    const n = Number(String(x.price).replace(/[^0-9.]/g, ""));
    return {
      classId: x.id,
      businessId: business.id,
      businessName: business.name,
      location: business.location,
      title: x.title,
      classType: x.classType || null,
      date: x.date,
      startTime: x.startTime,
      endTime: x.endTime,
      price: x.price,
      priceValue: x.price && Number.isFinite(n) && n > 0 ? n : null,
      paymentType: x.paymentType,
      notes: x.notes,
      maxCapacity: x.maxCapacity,
      bookedCount: b,
      spotsRemaining: Math.max(0, x.maxCapacity - b),
      isFull: b >= x.maxCapacity,
    };
  };
  const rows: { id: string; title: string; sub: string }[] =
    kind === "gym"
      ? m.plans.plans.map((p) => ({ id: p.id, title: p.name, sub: p.price }))
      : kind === "store"
        ? m.offerings.offerings.map((o) => ({ id: o.id, title: o.title, sub: o.price }))
        : [];

  return (
    <div style={{ color: c.ink, marginTop: -4 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "-8px 0 10px -10px" }}>
        <button type="button" aria-label="Close preview" onClick={() => navigate(m.tabHref("listing"))} className="tap" style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: 0, color: c.ink }}>
          <X size={22} strokeWidth={2.2} aria-hidden />
        </button>
        <span style={{ fontSize: px(11), fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: c.pDark, background: c.pale, borderRadius: 999, padding: "4px 10px" }}>Preview as client</span>
      </div>
      <h1 style={{ fontSize: px(24), fontWeight: 800, lineHeight: lh(36) }}>Explore</h1>
      <div aria-disabled="true" style={{ display: "flex", alignItems: "center", gap: 8, height: 46, borderRadius: 14, background: c.soft, border: `1px solid ${c.border}`, padding: "0 14px", margin: "10px 0" }}>
        <Search size={16} color={c.faint} aria-hidden />
        <span style={{ fontSize: px(14), color: c.faint }}>Search classes, places or a location</span>
      </div>
      <div style={{ borderRadius: 18, background: c.card, border: `1px solid ${c.border}`, padding: 12, display: "flex", gap: 12 }}>
        <span style={{ width: 48, height: 48, borderRadius: 14, background: c.pale, display: "flex", alignItems: "center", justifyContent: "center", fontSize: px(15), fontWeight: 800, color: c.pDark, flexShrink: 0, overflow: "hidden" }}>
          {business.logoUrl ? <img src={business.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initialsOf(business.name)}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: px(14), fontWeight: 800 }}>{business.name}</p>
          <p style={{ fontSize: px(12), fontWeight: 600, color: c.pDark }}>{typeLine(business.type, business.categories)}</p>
          <p style={{ fontSize: px(11.5), color: c.faint }}>{business.location?.trim() || "Add your address"}</p>
          {business.bio?.trim() && <p style={{ fontSize: px(12), color: c.inkSoft, marginTop: 4, lineHeight: lh(17) }}>{business.bio}</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" }}>
            <span style={{ fontSize: px(11.5), color: c.faint }}>{meta}</span>
            {chips.map((t) => (
              <span key={t} style={{ fontSize: px(10), fontWeight: 800, color: c.pDark, background: c.pale, borderRadius: 999, padding: "2px 8px" }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p style={{ fontSize: px(12), fontWeight: 800, margin: "16px 2px 8px" }}>{v.previewSection(business.name)}</p>
      {kind === "classes" || kind === "gym" ? (
        upcoming.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }} aria-disabled="true">
            {upcoming.map((x) => (
              <ClassCard key={x.id} c={toMarket(x)} booked={false} onOpen={() => undefined} />
            ))}
          </div>
        ) : kind === "classes" ? (
          <Empty text="No upcoming classes" />
        ) : null
      ) : null}
      {kind !== "classes" &&
        (rows.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: kind === "gym" && upcoming.length ? 8 : 0 }}>
            {rows.map((r) => (
              <div key={r.id} style={{ borderRadius: 18, background: c.card, border: `1px solid ${c.border}`, padding: 12 }}>
                <p style={{ fontSize: px(14), fontWeight: 800 }}>{r.title}</p>
                {r.sub && <span style={{ display: "inline-block", marginTop: 6, fontSize: px(12), fontWeight: 800, borderRadius: 999, padding: "2px 10px", background: c.tealPale, color: c.tealInk }}>{r.sub}</span>}
              </div>
            ))}
          </div>
        ) : (
          <Empty text={kind === "gym" ? "No passes yet" : "No products yet"} />
        ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  const { c } = useMarket();
  return <div style={{ borderRadius: 18, border: `1px solid ${c.border}`, padding: "16px 12px", fontSize: px(12.5), color: c.faint, textAlign: "center" }}>{text}</div>;
}
