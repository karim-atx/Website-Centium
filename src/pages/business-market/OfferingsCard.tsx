import { useState } from "react";
import { Package, Plus, Trash2 } from "lucide-react";
import { useOnline } from "../../hooks/useOnline";
import { marketplaceCategories } from "../../data/mockProfessionals";
import type { OfferingCategory } from "../../services/business-offerings";
import { useMarket } from "./MarketContext";
import { lh, MCard, MFieldLabel, MLabel, MPopup, MPrimary, MSaveError, MSheet, px, useMarketToast } from "./kit";
import { BizShareButton } from "../../components/share/business/BizShareButton";
import { productData } from "../../components/share/business/bizCardModel";
import { fetchOfferingImage } from "../../services/share-links";

// MA1-001 K1 (KEEP-RESTYLE): business_offerings rows stay reachable for
// Classes and Gym, which have no Products tab. The earlier Marketplace tab's
// listing form (title, category, price, description, Publish) and its list
// with remove become this card and its sheet, in MA1 parts: MA1's own label,
// a list card (MA1-007 W1 rows), the dashed add row (MA1-007 OF3) and the
// MA1 sheet. Store products live under Products (OP1 / AN11).

const LISTABLE = marketplaceCategories.filter((x) => x.id !== "gyms" && x.id !== "classes");

export function OfferingsCard() {
  const m = useMarket();
  const { c, offerings } = m;
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const [remove, setRemove] = useState<{ id: string; title: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useMarketToast();
  const list = offerings.offerings;
  const label = (id: string) => LISTABLE.find((x) => x.id === id)?.label ?? "";

  return (
    <section style={{ marginTop: 16 }}>
      <MLabel c={c} margin="0 0 8px">
        Offerings
      </MLabel>
      {list.length > 0 && (
        <MCard c={c} r={20} style={{ overflow: "hidden", marginBottom: 8 }}>
          {list.map((o, i) => (
            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 8px 11px 14px", borderTop: i ? `1px solid ${c.divider}` : "none" }}>
              <span style={{ width: 36, height: 36, borderRadius: 12, background: c.pale, color: c.pDark, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Package size={17} strokeWidth={2} aria-hidden />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: px(13), fontWeight: 800, color: c.ink, lineHeight: lh(19.5) }}>{o.title}</span>
                <span style={{ display: "block", fontSize: px(11.5), color: c.faint, lineHeight: lh(16) }}>{[label(o.category), o.price].filter(Boolean).join(" · ")}</span>
              </span>
              {/* Market + Share 3.0 B-SH.1: share this item (Product spotlight card). */}
              <BizShareButton
                label={`Share ${o.title}`}
                getData={async () => ({ t: "product", d: productData(o, await fetchOfferingImage(o.id)) })}
              />
              <button
                type="button"
                aria-label={`Remove ${o.title}`}
                onClick={() => setRemove({ id: o.id, title: o.title })}
                disabled={!online || !m.can("marketing")}
                className="tap"
                style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: c.faint, background: "transparent", border: 0, opacity: !online || !m.can("marketing") ? 0.4 : 1 }}
              >
                <Trash2 size={15} strokeWidth={2.2} aria-hidden />
              </button>
            </div>
          ))}
        </MCard>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!online || !m.can("marketing") || !offerings.businessId}
        className="tap"
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
          fontSize: px(13),
          fontWeight: 800,
          color: c.pDark,
          opacity: !online || !m.can("marketing") || !offerings.businessId ? 0.4 : 1,
        }}
      >
        <Plus size={15} strokeWidth={2.4} aria-hidden />
        Add an offering
      </button>
      {offerings.error && !open && <MSaveError c={c}>{offerings.error}</MSaveError>}
      <OfferingSheet
        open={open}
        onClose={() => setOpen(false)}
        onSaved={(title) => {
          setOpen(false);
          showToast(`${title} is on your listing.`);
        }}
      />
      <MPopup
        open={!!remove}
        icon={Trash2}
        title={`Remove ${remove?.title ?? ""}?`}
        body="It comes off your listing on Explore. This can't be undone."
        action="Remove"
        keep="Keep it"
        busy={busy}
        onCancel={() => setRemove(null)}
        onAction={async () => {
          if (!remove) return;
          setBusy(true);
          await offerings.remove(remove.id);
          setBusy(false);
          setRemove(null);
        }}
      />
      {toast}
    </section>
  );
}

function OfferingSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (title: string) => void }) {
  const { c, offerings } = useMarket();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<OfferingCategory>(LISTABLE[0].id as OfferingCategory);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const can = !!title.trim() && !!description.trim() && !busy;
  const field = { width: "100%", height: 46, borderRadius: 14, background: c.soft, border: `1.5px solid ${c.border}`, padding: "0 12px", fontSize: px(13.5), fontWeight: 700, color: c.ink, boxSizing: "border-box" as const, outline: "none" };
  const save = async () => {
    if (!can) return;
    setBusy(true);
    const ok = await offerings.add({ title: title.trim(), category, price, description: description.trim() });
    setBusy(false);
    if (!ok) return;
    const t = title.trim();
    setTitle("");
    setPrice("");
    setDescription("");
    onSaved(t);
  };
  return (
    <MSheet
      open={open}
      onClose={onClose}
      title="Add an offering"
      footer={
        <>
          <MPrimary c={c} disabled={!can} onClick={() => void save()}>
            {busy ? "Publishing…" : "Publish"}
          </MPrimary>
          {offerings.error && <MSaveError c={c}>{offerings.error}</MSaveError>}
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label>
          <MFieldLabel c={c}>Title</MFieldLabel>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="10-class pack" style={field} />
        </label>
        <div>
          <MFieldLabel c={c}>Category</MFieldLabel>
          <div role="radiogroup" aria-label="Category" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {LISTABLE.map((x) => {
              const on = category === x.id;
              return (
                <button
                  key={x.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setCategory(x.id as OfferingCategory)}
                  className="tap"
                  style={{ minHeight: 34, padding: "0 12px", borderRadius: 10, border: `1px solid ${on ? c.optOn : c.option}`, background: on ? c.pale : c.raised, color: on ? c.deep : c.inkSoft, fontSize: px(12), fontWeight: 700 }}
                >
                  {x.label}
                </button>
              );
            })}
          </div>
        </div>
        <label>
          <MFieldLabel c={c}>Price (optional)</MFieldLabel>
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$25" inputMode="decimal" style={field} />
        </label>
        <label>
          <MFieldLabel c={c}>Description</MFieldLabel>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What makes this worth a look?"
            style={{ ...field, height: "auto", minHeight: 92, padding: "12px", lineHeight: lh(20), resize: "none", fontWeight: 500 }}
          />
        </label>
      </div>
    </MSheet>
  );
}
