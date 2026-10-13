import { useMemo, useState } from "react";
import { CalendarCheck, CalendarPlus, ChevronDown, ChevronLeft, ChevronRight, ListFilter, RefreshCw, UserMinus, UserPlus, UserRound, type LucideIcon } from "lucide-react";
import type { DashPalette } from "./palette";
import type { ActivityEvent, ActivityType, WeekTotal } from "./dashboardModel";
import { dayLabel, whenLabel } from "./dashboardModel";
import { PopupMenu } from "../ui/PopupMenu";
import { linePx, textPx } from "../../theme/textSize";

// DA1-015 #29-#31 · Recent activity (BizSummaryV27), OURS-DA-states #3-#6:
// live line, refresh, collapsed 3 rows, expanded with this week's totals, the
// offline line and the "See all activity" screen.

const TYPE_ICON: Record<ActivityType, LucideIcon> = { joined: UserPlus, ended: UserMinus, booked: CalendarCheck, created: CalendarPlus };

function badgeOf(c: DashPalette, t: ActivityType) {
  return t === "joined" ? c.good : t === "ended" ? c.high : t === "booked" ? (c.dark ? "#7F6BD8" : c.pDark) : c.tealDark;
}

const rgbaOf = (col: string, a: number) => {
  if (col.startsWith("#")) {
    const n = parseInt(col.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  // rgb(var(--th-x)) → rgb(var(--th-x) / a)
  return col.replace(/\)$/, ` / ${a})`);
};

function Row({ c, e, now, isNew }: { c: DashPalette; e: ActivityEvent; now: Date; isNew: boolean }) {
  const Icon = TYPE_ICON[e.type];
  return (
    <div
      data-activity-row
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: `8px ${isNew ? 8 : 0}px`,
        margin: `0 ${isNew ? -8 : 0}px`,
        borderRadius: 14,
        background: isNew ? c.newRow : "transparent",
      }}
    >
      <span style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: e.initial ? c.tealPale : c.maskBg,
            color: e.initial ? c.tealInk : c.maskInk,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: textPx(13),
            fontWeight: 800,
          }}
        >
          {e.initial ?? <UserRound size={16} aria-hidden />}
        </span>
        <span
          style={{
            position: "absolute",
            right: -4,
            bottom: -4,
            width: 20,
            height: 20,
            borderRadius: 999,
            background: badgeOf(c, e.type),
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 0 2px ${isNew ? c.newRow : c.card}`,
          }}
        >
          <Icon size={11} strokeWidth={2.6} aria-hidden />
        </span>
      </span>
      <span style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: textPx(12.5), fontWeight: 600, lineHeight: linePx(17), color: c.ink }}>
          <span style={{ minWidth: 0 }}>{e.title}</span>
          {isNew && (
            <span style={{ fontSize: textPx(9), fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: c.onFill, background: c.fill, borderRadius: 999, padding: "1px 6px" }}>New</span>
          )}
        </span>
        <span style={{ display: "block", fontSize: textPx(11), lineHeight: linePx(15), color: c.faint }}>{e.sub}</span>
      </span>
      <span style={{ fontSize: textPx(10.5), color: c.faint, whiteSpace: "nowrap", paddingTop: 2 }}>{whenLabel(e.at, now)}</span>
    </div>
  );
}

function groupByDay(events: ActivityEvent[], today: string) {
  const out: { day: string; label: string; items: ActivityEvent[] }[] = [];
  for (const e of events) {
    const last = out[out.length - 1];
    if (last && last.day === e.day) last.items.push(e);
    else out.push({ day: e.day, label: dayLabel(e.day, today), items: [e] });
  }
  return out;
}

const EMPTY_TEXT = "Joins, bookings, ended memberships and new classes show here as they happen.";

function Groups({ c, events, now, today, newKeys }: { c: DashPalette; events: ActivityEvent[]; now: Date; today: string; newKeys: Set<string> }) {
  return (
    <>
      {groupByDay(events, today).map((g) => (
        <div key={g.day}>
          <p style={{ fontSize: textPx(10), fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: c.faint, padding: "12px 0 2px", margin: 0 }}>{g.label}</p>
          {g.items.map((e) => (
            <Row key={e.key} c={c} e={e} now={now} isNew={newKeys.has(e.key)} />
          ))}
        </div>
      ))}
    </>
  );
}

function EmptyLine({ c }: { c: DashPalette }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0 10px" }}>
      <span style={{ width: 36, height: 36, borderRadius: 999, border: `1.5px dashed ${c.tert}`, flexShrink: 0 }} />
      <p style={{ fontSize: textPx(12), lineHeight: linePx(17), color: c.faint, margin: 0 }}>{EMPTY_TEXT}</p>
    </div>
  );
}

function Totals({ c, totals }: { c: DashPalette; totals: WeekTotal[] }) {
  return (
    <div style={{ padding: "0 16px 12px" }}>
      <p style={{ fontSize: textPx(10.5), lineHeight: linePx(14), color: c.faint, marginBottom: 8, marginTop: 0 }}>This week, compared with last week</p>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${totals.length},minmax(0,1fr))`, gap: 6 }}>
        {totals.map((t) => {
          const col = badgeOf(c, t.type);
          const has = t.n + t.prev > 0;
          const mx = has ? Math.max(...t.days, 1) : 1;
          const pts = t.days.map((v, k) => [2 + k * 6.67, has ? 12 - (v / mx) * 10 : 7]);
          const spark = pts.map((p, k) => (k ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
          const last = pts[6];
          const diff = t.n - t.prev;
          const trend = !has ? "No activity yet" : diff === 0 ? "Same as last wk" : `${diff > 0 ? "↑ +" : "↓ −"}${Math.abs(diff)} vs last wk`;
          const goodDir = t.label === "Ended" ? diff < 0 : diff > 0;
          const Icon = TYPE_ICON[t.type];
          return (
            <div
              key={t.label}
              style={{
                position: "relative",
                borderRadius: 16,
                background: has ? rgbaOf(col, c.dark ? 0.09 : 0.06) : c.soft,
                border: `1px solid ${has ? rgbaOf(col, c.dark ? 0.32 : 0.22) : c.border}`,
                boxShadow: `inset 0 1px 0 ${c.dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)"}`,
                padding: "10px 4px 9px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 5,
                minWidth: 0,
              }}
            >
              <span style={{ width: 28, height: 28, borderRadius: 10, background: has ? rgbaOf(col, c.dark ? 0.2 : 0.14) : c.track, color: has ? col : c.tert, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={14} strokeWidth={2.4} aria-hidden />
              </span>
              <span style={{ fontSize: textPx(20), fontWeight: 800, lineHeight: linePx(22), letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: has ? c.ink : c.tert }}>{has ? String(t.n) : "–"}</span>
              <span style={{ fontSize: textPx(10), fontWeight: 600, lineHeight: linePx(12), color: c.faint }}>{t.label}</span>
              <svg width="44" height="14" viewBox="0 0 44 14" className="qa-shape" style={{ display: "block", overflow: "visible" }} aria-hidden>
                <path d={spark} fill="none" style={{ stroke: has ? col : c.tert }} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={has ? "none" : "2 3"} />
                {has && <path d={`M${(last[0] - 2).toFixed(1)},${last[1].toFixed(1)} a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0`} style={{ fill: col }} />}
              </svg>
              <span style={{ fontSize: textPx(9.5), fontWeight: 700, lineHeight: linePx(12), color: !has || diff === 0 ? c.faint : goodDir ? c.good : c.high, whiteSpace: "nowrap" }}>{trend}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RecentActivityCard({
  c,
  week,
  totals,
  now,
  today,
  updatedAt,
  online,
  refreshing,
  onRefresh,
  onSeeAll,
  newKeys,
}: {
  c: DashPalette;
  /** The last 7 days, newest first. */
  week: ActivityEvent[];
  totals: WeekTotal[];
  now: Date;
  today: string;
  updatedAt: number | null;
  online: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onSeeAll: () => void;
  newKeys: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const shown = useMemo(() => (open ? week : week.slice(0, 3)), [open, week]);
  const mins = updatedAt === null ? null : Math.max(0, Math.floor((now.getTime() - updatedAt) / 60000));
  const updated = mins === null ? "" : mins < 1 ? "Updated just now" : `Updated ${mins} min ago`;
  const toggle = () => setOpen(!open);
  return (
    <section aria-label="Recent activity" style={{ background: c.card, borderRadius: 24, border: `1px solid ${c.border}`, overflow: "hidden", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 12px" }}>
        <button type="button" onClick={toggle} aria-expanded={open} style={{ flex: 1, minWidth: 0, cursor: "pointer", background: "none", border: 0, padding: 0, textAlign: "left" }}>
          <p style={{ fontSize: textPx(10.5), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: c.faint, whiteSpace: "nowrap", margin: 0, lineHeight: 1.5 }}>Recent activity</p>
          <p data-live-line style={{ display: "flex", alignItems: "center", gap: 6, fontSize: textPx(11), lineHeight: linePx(15), color: c.inkSoft, marginTop: 3, marginBottom: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: online ? c.good : c.tert, boxShadow: online ? `0 0 0 3px ${c.goodTint}` : "none", flexShrink: 0 }} />
            <span style={{ fontWeight: 700, color: online ? c.good : c.faint }}>{online ? "Live" : "Offline"}</span>
            {updated && <span>{`· ${updated}`}</span>}
          </p>
        </button>
        <button
          type="button"
          className="hit"
          aria-label="Refresh"
          disabled={!online || refreshing}
          onClick={onRefresh}
          style={{ width: 34, height: 34, borderRadius: 999, background: c.soft, display: "flex", alignItems: "center", justifyContent: "center", color: c.inkSoft, flexShrink: 0, border: 0, opacity: online ? 1 : 0.4 }}
        >
          <RefreshCw size={15} strokeWidth={2} aria-hidden className={refreshing ? "animate-spin" : undefined} />
        </button>
        <button
          type="button"
          className="hit"
          aria-label={open ? "Show less" : "Show more"}
          aria-expanded={open}
          onClick={toggle}
          style={{ width: 34, height: 34, borderRadius: 999, background: c.soft, display: "flex", alignItems: "center", justifyContent: "center", color: c.inkSoft, flexShrink: 0, border: 0, transform: open ? "rotate(180deg)" : "none" }}
        >
          <ChevronDown size={16} strokeWidth={2.2} aria-hidden />
        </button>
      </div>
      {open && <Totals c={c} totals={totals} />}
      <div style={{ padding: "0 16px 6px", borderTop: `1px solid ${c.divider}` }}>
        {week.length === 0 ? <EmptyLine c={c} /> : <Groups c={c} events={shown} now={now} today={today} newKeys={newKeys} />}
      </div>
      {week.length > 0 && (
        <button
          type="button"
          onClick={open ? onSeeAll : toggle}
          style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "center", gap: 4, padding: "11px 0 13px", borderTop: `1px solid ${c.divider}`, fontSize: textPx(11.5), fontWeight: 700, color: c.pDark, cursor: "pointer", background: "none", borderLeft: 0, borderRight: 0, borderBottom: 0, minHeight: 44 }}
        >
          {open ? "See all activity" : `Show ${Math.max(week.length - 3, 0)} more and this week's totals`}
          <ChevronRight size={13} aria-hidden />
        </button>
      )}
    </section>
  );
}

type Filter = "all" | ActivityType;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "booked", label: "Bookings" },
  { value: "joined", label: "Joins" },
  { value: "ended", label: "Ended" },
  { value: "created", label: "Classes" },
];

/** OURS-DA-states #6: the "See all activity" screen (last 30 days, filter). */
export function ActivityScreen({ c, events, now, today, onBack, classBased }: { c: DashPalette; events: ActivityEvent[]; now: Date; today: string; onBack: () => void; classBased: boolean }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const shown = filter === "all" ? events : events.filter((e) => e.type === filter);
  const options = FILTERS.filter((f) => classBased || (f.value !== "booked" && f.value !== "created"));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
        <button type="button" aria-label="Back" onClick={onBack} style={{ display: "flex", width: 40, height: 40, marginLeft: -8, borderRadius: 999, alignItems: "center", justifyContent: "center", color: c.inkSoft, flexShrink: 0, background: "none", border: 0 }}>
          <ChevronLeft size={20} aria-hidden />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: textPx(11), fontWeight: 700, color: c.faint, margin: 0, lineHeight: 1.5 }}>Dashboard</p>
          <h1 style={{ fontSize: textPx(24), fontWeight: 700, letterSpacing: "-0.02em", lineHeight: linePx(30), margin: 0, color: c.ink }}>Recent activity</h1>
          <p style={{ fontSize: textPx(12.5), color: c.faint, marginTop: 2, lineHeight: linePx(18), marginBottom: 0 }}>Last 30 days</p>
        </div>
        <button
          ref={setAnchor}
          type="button"
          aria-label="Filter"
          aria-haspopup="menu"
          onClick={() => setMenuOpen(true)}
          style={{ display: "flex", width: 44, height: 44, borderRadius: 999, alignItems: "center", justifyContent: "center", color: c.inkSoft, background: c.card, border: `1px solid ${c.border}`, flexShrink: 0 }}
        >
          <ListFilter size={18} aria-hidden />
        </button>
      </div>
      <PopupMenu open={menuOpen} onClose={() => setMenuOpen(false)} anchor={anchor} options={options} selected={filter} onSelect={(v) => setFilter(v)} align="right" width={180} />
      <div style={{ background: c.card, borderRadius: 24, border: `1px solid ${c.border}`, padding: "0 16px 6px" }}>
        {shown.length === 0 ? <EmptyLine c={c} /> : <Groups c={c} events={shown} now={now} today={today} newKeys={new Set()} />}
      </div>
    </div>
  );
}
