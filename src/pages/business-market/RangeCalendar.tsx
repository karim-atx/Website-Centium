import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMarket } from "./MarketContext";
import { lh, px } from "./kit";
import { addDays, dateOf, dayMonth, daysBetween, isoOf } from "./model";

// MA1-102 / 133 / 134: the inline date-range calendar (opens in place under
// the date fields, never a sheet). Monday first (user rule; October 2026
// starts with 3 blanks). Past days disabled. `fixedDays` = Feature for a
// week: one tap picks the start and the 7 days run from it. `max` = the last
// day that can be picked (featuring: today + 90). `fixedStart` = a started
// promotion (ATX10): its start stays, a tap picks only the end.

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WD = ["M", "T", "W", "T", "F", "S", "S"];

export function RangeCalendar({
  from,
  to,
  fixedDays,
  fixedStart,
  max,
  onCancel,
  onDone,
}: {
  from: string | null;
  to: string | null;
  fixedDays?: number;
  fixedStart?: boolean;
  max?: string;
  onCancel: () => void;
  onDone: (from: string, to: string) => void;
}) {
  const { c } = useMarket();
  const today = isoOf(new Date());
  const [a, setA] = useState<string | null>(from);
  const [b, setB] = useState<string | null>(fixedDays && from ? addDays(from, fixedDays - 1) : to);
  const start = dateOf(a ?? today);
  const [month, setMonth] = useState({ y: start.getFullYear(), m: start.getMonth() });
  const first = new Date(month.y, month.m, 1);
  const blanks = (first.getDay() + 6) % 7;
  const daysIn = new Date(month.y, month.m + 1, 0).getDate();
  const thisMonth = new Date();
  const atCurrent = month.y === thisMonth.getFullYear() && month.m === thisMonth.getMonth();

  const pick = (iso: string) => {
    if (fixedDays) {
      setA(iso);
      setB(addDays(iso, fixedDays - 1));
      return;
    }
    if (fixedStart && a) {
      if (iso >= a) setB(iso);
      return;
    }
    if (!a || (a && b) || iso < a) {
      setA(iso);
      setB(null);
    } else setB(iso);
  };
  const line = a && b ? `${dayMonth(a)} to ${dayMonth(b)} · ${daysBetween(a, b)} days` : a ? `${dayMonth(a)} to …` : "";
  const nav = (d: number) => setMonth((x) => ({ y: x.m + d < 0 ? x.y - 1 : x.m + d > 11 ? x.y + 1 : x.y, m: (x.m + d + 12) % 12 }));
  const disc = (dis: boolean) => ({ width: 32, height: 32, borderRadius: 999, background: c.soft, color: dis ? c.tert : c.inkSoft, display: "flex", alignItems: "center", justifyContent: "center", border: 0 });

  return (
    <div role="dialog" aria-label="Choose dates" style={{ borderRadius: 20, border: `1px solid ${c.border}`, background: c.card, padding: 12, boxShadow: "0 12px 32px rgba(95,80,147,0.16)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button type="button" aria-label="Previous month" aria-disabled={atCurrent} onClick={() => !atCurrent && nav(-1)} className="tap" style={disc(atCurrent)}>
          <ChevronLeft size={16} aria-hidden />
        </button>
        <p style={{ fontSize: px(15), fontWeight: 700, color: c.ink }} aria-live="polite">{`${MONTHS[month.m]} ${month.y}`}</p>
        <button type="button" aria-label="Next month" onClick={() => nav(1)} className="tap" style={disc(false)}>
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 4, marginBottom: 4 }} aria-hidden>
        {WD.map((w, i) => (
          <span key={i} style={{ textAlign: "center", fontSize: px(10), fontWeight: 700, color: c.faint, padding: "4px 0" }}>
            {w}
          </span>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 4 }}>
        {Array.from({ length: blanks }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: daysIn }, (_, i) => {
          const iso = isoOf(new Date(month.y, month.m, i + 1));
          const past = iso < today || (!!max && iso > max) || (!!fixedStart && !!a && iso < a);
          const edge = iso === a || iso === b;
          const inR = !!a && !!b && iso > a && iso < b;
          const isToday = iso === today && !edge;
          return (
            <button
              key={iso}
              type="button"
              aria-disabled={past}
              aria-pressed={edge || inR}
              aria-label={`${i + 1} ${MONTHS[month.m]}`}
              onClick={() => !past && pick(iso)}
              style={{
                aspectRatio: "1",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: px(13.5),
                fontWeight: edge ? 800 : 600,
                color: edge ? c.onFill : past ? c.tert : c.ink,
                background: edge ? c.fill : inR ? c.pale : "transparent",
                boxShadow: isToday ? `inset 0 0 0 1.5px ${c.primary}` : "none",
                fontVariantNumeric: "tabular-nums",
                border: 0,
                padding: 0,
                cursor: past ? "default" : "pointer",
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: px(12), fontWeight: 700, color: c.inkSoft, textAlign: "center", marginTop: 10, minHeight: lh(18) }}>{line}</p>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)", gap: 8, marginTop: 10 }}>
        <button type="button" onClick={onCancel} style={{ height: 40, borderRadius: 12, border: `1px solid ${c.border}`, background: "transparent", fontSize: px(13), fontWeight: 700, color: c.inkSoft }}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => a && b && onDone(a, b)}
          disabled={!a || !b}
          style={{ height: 40, borderRadius: 12, background: c.fill, color: c.onFill, border: 0, fontSize: px(13), fontWeight: 800, opacity: a && b ? 1 : 0.4 }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
