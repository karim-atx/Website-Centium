import { useState } from "react";
import { Square, SquareCheck } from "lucide-react";
import { useMarket } from "./MarketContext";
import { lh, MLead, MPrimary, MSheet, MSoonNote, px } from "./kit";

// OURS-MA1-listing-details-sheets: Amenities and First visit, in the MA1
// sheet shell. Both values are B13 (MK-02: venue amenities text[] from a
// fixed list, first_visit up to 300). Not on the local stack, so the options
// and the text box work but Save is drawn disabled with "Coming soon"; nothing
// is stored on the device in the meantime.

export const AMENITIES = ["Showers", "Lockers", "Changing rooms", "Parking", "Towels", "Water", "Wi-Fi", "Wheelchair access", "Child care"];

/** B13 MK-02 writes are wired (flip when the stage lands and HANDOVER_API.md names the write). */
const DETAILS_WRITES = false;

export function AmenitiesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { c } = useMarket();
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (a: string) => setPicked((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));
  return (
    <MSheet
      open={open}
      onClose={onClose}
      title="Amenities"
      footer={
        <>
          <MPrimary c={c} disabled={!DETAILS_WRITES}>
            Save amenities
          </MPrimary>
          {!DETAILS_WRITES && <MSoonNote c={c}>Saving this is coming soon.</MSoonNote>}
        </>
      }
    >
      <MLead c={c}>Shown on your listing so people know what to expect.</MLead>
      <div role="group" aria-label="Amenities">
        {AMENITIES.map((a) => {
          const on = picked.includes(a);
          return (
            <button
              key={a}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(a)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 8,
                padding: "9px 10px",
                marginTop: 6,
                border: `1px solid ${on ? c.optOn : c.option}`,
                background: on ? c.pale : c.raised,
                minHeight: 44,
                width: "100%",
                textAlign: "left",
                color: c.ink,
              }}
            >
              <span style={{ flex: 1, fontSize: px(13), fontWeight: 700 }}>{a}</span>
              <span style={{ display: "flex", color: on ? c.pDark : c.tert }}>{on ? <SquareCheck size={17} strokeWidth={2.4} aria-hidden /> : <Square size={17} strokeWidth={2.4} aria-hidden />}</span>
            </button>
          );
        })}
      </div>
    </MSheet>
  );
}

export function FirstVisitSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { c } = useMarket();
  const [text, setText] = useState("");
  return (
    <MSheet
      open={open}
      onClose={onClose}
      title="First visit"
      footer={
        <>
          <MPrimary c={c} disabled={!DETAILS_WRITES}>
            Save
          </MPrimary>
          {!DETAILS_WRITES && <MSoonNote c={c}>Saving this is coming soon.</MSoonNote>}
        </>
      }
    >
      <MLead c={c}>Tell new clients what to bring and where to go.</MLead>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 300))}
        aria-label="First visit"
        maxLength={300}
        style={{
          width: "100%",
          minHeight: 120,
          borderRadius: 14,
          background: c.soft,
          border: `1.5px solid ${c.border}`,
          fontSize: px(14),
          lineHeight: lh(20),
          color: c.ink,
          padding: "12px 12px",
          boxSizing: "border-box",
          resize: "vertical",
          outline: "none",
        }}
      />
      <p style={{ fontSize: px(11), color: c.faint, textAlign: "right", marginTop: 4 }}>{`${text.length}/300`}</p>
    </MSheet>
  );
}
