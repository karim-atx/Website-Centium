import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, CalendarPlus, ChevronLeft, ChevronRight, Megaphone, Minus, Plus, SlidersHorizontal } from "lucide-react";
import { useOnline } from "../../hooks/useOnline";
import { fetchClassCentium, fetchFeaturedClassIds, saveClassCentium, type ClassCentium } from "../../services/business-market/listing";
import { centiumSpotsFor, openOnCentium } from "../../services/business-market/listingLogic";
import { time12Split } from "../../utils/time12";
import { DAY_SHORT } from "../../utils/week";
import type { BusinessClassRow } from "../../services/business-classes";
import { useMarket } from "./MarketContext";
import { lh, MBlock, MCard, MEmpty, MError, MPrimary, MSaveError, MSheet, MSoonNote, MSwitch, px, useMarketToast } from "./kit";
import { addDays, classFlag, dateOf, dayMonth, dowTime, isoOf, mondayOf, type ClassFlag } from "./model";

// MA1-003 / 040 / 042 / 048 / 064 / 117 · Open spots (Classes). The week's
// classes (business_classes), their bookings and instructors, and B13 MK-04:
// business_classes.centium_spots (total places for people from Centium, null
// = no separate limit), listed_on_explore (the row switch: off keeps a class
// off Explore while members still book it) and the booking source set by
// the database ("From Centium"). Writing either needs the Schedule
// permission (business_classes_update_insider). The rule itself (ATXF6) is
// enforced by book_class(), not here. Classes in a live featured week
// (MK-06) carry the Featured flag. While the columns are absent (probe
// "pending") the hatch is empty, the switches are drawn disabled, the two
// Centium figures read "–" and the Spots sheet's Save says "Coming soon".

export function SpotsTab() {
  const m = useMarket();
  const { c, business, classes } = m;
  const navigate = useNavigate();
  const today = isoOf(new Date());
  const [week, setWeek] = useState(() => mondayOf(today));
  const [day, setDay] = useState(today);
  const [spotsFor, setSpotsFor] = useState<BusinessClassRow | null>(null);
  const [now] = useState(() => Date.now());
  const [toast, showToast] = useMarketToast();
  const online = useOnline();
  const spotsLive = m.backend.spots === "live";
  const canWrite = spotsLive && online && m.can("schedule");
  const [centium, setCentium] = useState<Map<string, ClassCentium> | null>(null);
  const [featured, setFeatured] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<string | null>(null);
  const classIds = useMemo(() => classes.classes.map((x) => x.id).join(","), [classes.classes]);
  const businessId = business?.id ?? null;
  useEffect(() => {
    if (!spotsLive || !classIds) return;
    let alive = true;
    void fetchClassCentium(classIds.split(",")).then((r) => {
      if (alive && r.ok) setCentium(r.value);
    });
    return () => {
      alive = false;
    };
  }, [spotsLive, classIds]);
  useEffect(() => {
    if (!businessId || m.backend.placements !== "live") return;
    let alive = true;
    void fetchFeaturedClassIds(businessId).then((ids) => alive && setFeatured(ids));
    return () => {
      alive = false;
    };
  }, [businessId, m.backend.placements]);

  const days = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(week, i)), [week]);
  const byDay = useMemo(() => {
    const map = new Map<string, BusinessClassRow[]>();
    for (const x of classes.classes) map.set(x.date, [...(map.get(x.date) ?? []), x]);
    for (const l of map.values()) l.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return map;
  }, [classes.classes]);

  if (classes.error && classes.classes.length === 0) return <MError c={c} onRetry={m.reload} />;
  if (classes.loading && classes.classes.length === 0) {
    return (
      <div aria-busy="true" aria-label="Loading your classes">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 5, marginBottom: 12 }}>
          {days.map((d) => (
            <MBlock key={d} c={c} h={72} r={16} />
          ))}
        </div>
        <MBlock c={c} h={63.5} r={20} style={{ marginBottom: 12 }} />
        <MBlock c={c} h={146.5} r={20} style={{ marginBottom: 8 }} />
        <MBlock c={c} h={146.5} r={20} />
      </div>
    );
  }

  const weekCount = days.reduce((n, d) => n + (byDay.get(d)?.length ?? 0), 0);
  const rows = byDay.get(day) ?? [];
  const listed = !!business?.active;
  const todayRows = byDay.get(today) ?? [];
  const todayCount = todayRows.length;
  const dash = "–";
  const openOf = (x: BusinessClassRow): number | null => {
    const cc = centium?.get(x.id);
    if (!cc) return null;
    return openOnCentium(x.maxCapacity, m.booked?.get(x.id) ?? 0, cc.centiumSpots, cc.centiumBooked);
  };
  // On Centium = spots open on Centium in today's upcoming classes on Explore;
  // From Centium = today's bookings that came through Centium (MA1-003 row 6a).
  const onCentium = !centium
    ? null
    : !listed
      ? 0
      : todayRows.filter((x) => new Date(`${x.date}T${x.endTime}:00`).getTime() > now && centium.get(x.id)?.listed).reduce((a, x) => a + (openOf(x) ?? 0), 0);
  const fromCentium = centium ? todayRows.reduce((a, x) => a + (centium.get(x.id)?.centiumBooked ?? 0), 0) : null;
  const cells = [
    { v: String(todayCount), l: "Today" },
    { v: onCentium === null ? dash : String(onCentium), l: "On Centium" },
    { v: fromCentium === null ? dash : String(fromCentium), l: "From Centium" },
  ];

  const toggleListed = async (x: BusinessClassRow, on: boolean) => {
    const cc = centium?.get(x.id);
    if (!cc || !centium) return;
    setCentium(new Map(centium).set(x.id, { ...cc, listed: on }));
    const r = await saveClassCentium(x.id, { listed: on });
    if (!r.ok) {
      setCentium((cur) => (cur ? new Map(cur).set(x.id, cc) : cur));
      return showToast(r.message);
    }
    showToast(on ? `${x.title} is on Explore.` : `${x.title} is off Explore. Members can still book.`);
  };

  const moveWeek = (n: number) => {
    const w = addDays(week, n * 7);
    setWeek(w);
    setDay(w <= today && today <= addDays(w, 6) ? today : w);
  };

  return (
    <div style={{ paddingBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "-6px -10px 6px" }}>
        <WeekArrow c={c} label="Previous week" onClick={() => moveWeek(-1)} disabled={week <= mondayOf(today)}>
          <ChevronLeft size={16} aria-hidden />
        </WeekArrow>
        <p style={{ fontSize: px(12), fontWeight: 800, color: c.ink }} aria-live="polite">{`Week of ${dayMonth(week)}`}</p>
        <WeekArrow c={c} label="Next week" onClick={() => moveWeek(1)}>
          <ChevronRight size={16} aria-hidden />
        </WeekArrow>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 5, marginBottom: 12 }}>
        {days.map((d, i) => {
          const sel = d === day;
          const n = byDay.get(d)?.length ?? 0;
          return (
            <button
              key={d}
              type="button"
              aria-pressed={sel}
              aria-label={`${DAY_SHORT[i]} ${dateOf(d).getDate()}, ${n} class${n === 1 ? "" : "es"}`}
              onClick={() => setDay(d)}
              style={{
                borderRadius: 16,
                border: `1.5px solid ${sel ? c.primary : c.border}`,
                background: sel ? c.pale : c.card,
                height: 72,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                minWidth: 0,
                padding: 0,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: px(10), fontWeight: 700, color: sel ? c.deep : c.faint, lineHeight: lh(12) }}>{DAY_SHORT[i]}</span>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  background: sel ? (c.dark ? c.fill : c.pDark) : "transparent",
                  color: sel ? (c.dark ? c.onFill : "#FFFFFF") : c.ink,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: px(14.5),
                  fontWeight: 800,
                }}
              >
                {dateOf(d).getDate()}
              </span>
              <span style={{ fontSize: px(9.5), fontWeight: 800, color: c.faint, lineHeight: lh(10), minHeight: 10 }}>{weekCount === 0 ? "" : n ? String(n) : dash}</span>
            </button>
          );
        })}
      </div>
      <MCard c={c} r={20} style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", overflow: "hidden", marginBottom: 12 }}>
        {cells.map((x, i) => (
          <div key={x.l} style={{ padding: "12px 8px", textAlign: "center", borderLeft: i ? `1px solid ${c.divider}` : "none" }}>
            <p style={{ fontSize: px(20), fontWeight: 800, lineHeight: lh(24), fontVariantNumeric: "tabular-nums", color: x.v === dash || (weekCount === 0 && x.v === "0") ? c.tert : c.ink }}>{x.v}</p>
            <p style={{ fontSize: px(10.5), color: c.faint, lineHeight: lh(14) }}>{x.l}</p>
          </div>
        ))}
      </MCard>

      {weekCount === 0 || rows.length === 0 ? (
        <MEmpty
          c={c}
          icon={CalendarPlus}
          title={weekCount === 0 ? "No classes this week" : "No classes this day"}
          body="Create a class and choose how many spots to open on Centium."
          action={{ label: "Create class", onClick: () => navigate("/app/business/classes?create=1") }}
        />
      ) : (
        rows.map((x) => {
          const start = new Date(`${x.date}T${x.startTime}:00`).getTime();
          const end = new Date(`${x.date}T${x.endTime}:00`).getTime();
          const b = m.booked?.get(x.id) ?? 0;
          const flag = classFlag(b, x.maxCapacity, start, end, now);
          return (
            <ClassRow
              key={x.id}
              x={x}
              booked={b}
              flag={flag}
              who={x.professionalId ? m.instructors.get(x.professionalId) ?? null : null}
              listed={listed}
              spotsLive={spotsLive}
              canWrite={canWrite}
              centium={centium?.get(x.id) ?? null}
              open={openOf(x)}
              featured={featured.has(x.id)}
              saved={saved === x.id}
              onListed={(on) => void toggleListed(x, on)}
              onSpots={() => setSpotsFor(x)}
              onPromote={() => navigate(`${m.tabHref("promo")}&promote=${encodeURIComponent(x.id)}`)}
            />
          );
        })
      )}
      {rows.length > 0 && (
        <p style={{ display: "flex", alignItems: "center", gap: 12, fontSize: px(10.5), color: c.faint, marginTop: 4, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 14, height: 6, borderRadius: 999, background: c.primary }} />
            Booked
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 14, height: 6, borderRadius: 999, background: `repeating-linear-gradient(90deg, ${c.teal} 0 3px, transparent 3px 5px)` }} />
            Open on Centium
          </span>
          <span>The rest stay for members.</span>
        </p>
      )}
      {spotsFor && (
        <SpotsSheet
          x={spotsFor}
          booked={m.booked?.get(spotsFor.id) ?? 0}
          who={spotsFor.professionalId ? m.instructors.get(spotsFor.professionalId) ?? null : null}
          centium={centium?.get(spotsFor.id) ?? null}
          canWrite={canWrite}
          onClose={() => setSpotsFor(null)}
          onSaved={(cc, open) => {
            setCentium((cur) => new Map(cur ?? []).set(spotsFor.id, cc));
            setSpotsFor(null);
            setSaved(spotsFor.id);
            showToast(`${spotsFor.title} now has ${open} spot${open === 1 ? "" : "s"} open on Centium.`);
          }}
        />
      )}
      {toast}
    </div>
  );
}

function WeekArrow({ c, label, onClick, disabled, children }: { c: ReturnType<typeof useMarket>["c"]; label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: 0, opacity: disabled ? 0.4 : 1 }}>
      <span style={{ width: 32, height: 32, borderRadius: 999, background: c.soft, color: disabled ? c.tert : c.inkSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</span>
    </button>
  );
}

function ClassRow({
  x,
  booked,
  flag,
  who,
  listed,
  spotsLive,
  canWrite,
  centium,
  open,
  featured,
  saved,
  onListed,
  onSpots,
  onPromote,
}: {
  x: BusinessClassRow;
  booked: number;
  flag: ClassFlag;
  who: string | null;
  listed: boolean;
  spotsLive: boolean;
  canWrite: boolean;
  centium: ClassCentium | null;
  open: number | null;
  featured: boolean;
  saved: boolean;
  onListed: (on: boolean) => void;
  onSpots: () => void;
  onPromote: () => void;
}) {
  const { c } = useMarket();
  const t = time12Split(x.startTime);
  const cap = Math.max(1, x.maxCapacity);
  const ended = flag === "ended";
  const flagText = flag === "almost" ? "Almost full" : flag === "low" ? "Low in 48 h" : flag === "ended" ? "Ended" : "";
  const flagBg = flag === "almost" ? c.goodBg : flag === "low" ? c.cautionBg : c.soft;
  const flagInk = flag === "almost" ? c.good : flag === "low" ? c.caution : c.faint;
  const classListed = centium ? centium.listed : true;
  const state = !listed ? "Listing is off" : ended ? "Not bookable" : !classListed ? "Members only" : "On Explore";
  const mp = !ended && listed && classListed && open !== null ? open : 0;
  const chipStyle: React.CSSProperties = { fontSize: px(9.5), fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", padding: "1px 7px", borderRadius: 999, flexShrink: 0 };
  return (
    <MCard c={c} r={20} borderColor={saved ? c.teal : undefined} style={{ padding: "12px 12px 12px 14px", marginBottom: 8, opacity: ended ? 0.6 : 1 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{ width: 52, flexShrink: 0, borderRadius: 14, background: c.pale, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 0" }}>
          <span style={{ fontSize: px(14), fontWeight: 800, lineHeight: lh(16), fontVariantNumeric: "tabular-nums", color: c.ink }}>{t?.time ?? x.startTime}</span>
          <span style={{ fontSize: px(9.5), fontWeight: 700, color: c.faint }}>{t?.meridiem ?? ""}</span>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: px(14), fontWeight: 800, lineHeight: lh(18), color: c.ink, flexWrap: "wrap" }}>
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{x.title}</span>
            {flagText && <span style={{ ...chipStyle, background: flagBg, color: flagInk }}>{flagText}</span>}
            {featured && (
              <span style={{ ...chipStyle, background: c.pale, color: c.pDark, display: "inline-flex", alignItems: "center", gap: 3 }}>
                <Award size={10} strokeWidth={2.6} aria-hidden />
                Featured
              </span>
            )}
          </p>
          <p style={{ fontSize: px(11.5), color: c.faint, lineHeight: lh(17.25) }}>{`${who ? `With ${who} · ` : ""}${x.maxCapacity} spots`}</p>
          <div style={{ position: "relative", height: 6, borderRadius: 999, background: c.track, marginTop: 8, overflow: "hidden" }} aria-hidden>
            <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, (booked / cap) * 100)}%`, background: flag === "low" ? c.caution : c.primary }} />
            {mp > 0 && (
              <span
                style={{
                  position: "absolute",
                  left: `${Math.min(100, (booked / cap) * 100)}%`,
                  top: 0,
                  bottom: 0,
                  width: `${(mp / cap) * 100}%`,
                  opacity: 0.9,
                  background: `repeating-linear-gradient(90deg, ${c.teal} 0 3px, transparent 3px 5px)`,
                }}
              />
            )}
          </div>
          <p style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: px(11.5), marginTop: 5, color: c.ink }}>
            <span style={{ fontWeight: 700 }}>{`${booked} of ${x.maxCapacity} booked`}</span>
            {!ended && (!listed || !classListed) && <span style={{ color: c.tealInk, fontWeight: 700, whiteSpace: "nowrap" }}>Not on Explore</span>}
            {!ended && listed && classListed && open !== null && <span style={{ color: c.tealInk, fontWeight: 700, whiteSpace: "nowrap" }}>{`${open} open on Centium`}</span>}
          </p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${c.divider}` }}>
        <span style={{ fontSize: px(11.5), fontWeight: 700, color: listed ? c.inkSoft : c.faint, flex: 1, minWidth: 0, lineHeight: lh(15) }}>{state}</span>
        {flag === "low" && listed && (
          <button type="button" onClick={onPromote} className="tap" style={{ height: 32, padding: "0 10px", borderRadius: 10, border: `1px solid ${c.primary}`, color: c.pDark, background: "transparent", display: "flex", alignItems: "center", gap: 5, fontSize: px(11.5), fontWeight: 800, whiteSpace: "nowrap" }}>
            <Megaphone size={13} strokeWidth={2.2} aria-hidden />
            Promote
          </button>
        )}
        {!ended && (
          <button type="button" aria-label="Edit spots offered" onClick={onSpots} className="tap" style={{ height: 32, padding: "0 10px", borderRadius: 10, background: c.soft, color: c.ink, border: 0, display: "flex", alignItems: "center", gap: 5, fontSize: px(11.5), fontWeight: 800, whiteSpace: "nowrap" }}>
            <SlidersHorizontal size={13} strokeWidth={2.2} aria-hidden />
            Spots
          </button>
        )}
        <MSwitch c={c} on={listed && !ended && classListed} onChange={(on) => onListed(on)} label={`Show ${x.title} on Explore`} disabled={!spotsLive || !canWrite || !centium || ended || !listed} />
      </div>
    </MCard>
  );
}

/** MA1-040: Spots on Centium. Stores centium_spots = Centium bookings so far + the spots left open (B13 MK-04). */
function SpotsSheet({
  x,
  booked,
  who,
  centium,
  canWrite,
  onClose,
  onSaved,
}: {
  x: BusinessClassRow;
  booked: number;
  who: string | null;
  centium: ClassCentium | null;
  canWrite: boolean;
  onClose: () => void;
  onSaved: (cc: ClassCentium, open: number) => void;
}) {
  const { c, backend, can } = useMarket();
  const free = Math.max(0, x.maxCapacity - booked);
  const [offered, setOffered] = useState(() => (centium ? openOnCentium(x.maxCapacity, booked, centium.centiumSpots, centium.centiumBooked) : 0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const writes = canWrite && !!centium;
  const save = async () => {
    if (!centium || busy) return;
    setBusy(true);
    setError(null);
    const spots = centiumSpotsFor(offered, centium.centiumBooked);
    const r = await saveClassCentium(x.id, { centiumSpots: spots });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onSaved({ ...centium, centiumSpots: spots }, offered);
  };
  const step = (d: number) => setOffered((o) => Math.max(0, Math.min(free, o + d)));
  const stepBtn = (label: string, d: number, Icon: typeof Minus, dis: boolean) => (
    <button
      type="button"
      aria-label={label}
      onClick={() => step(d)}
      disabled={dis}
      className="tap"
      style={{ width: 48, height: 48, borderRadius: 14, border: `1px solid ${c.border}`, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: c.pDark, opacity: dis ? 0.4 : 1, flexShrink: 0 }}
    >
      <Icon size={18} strokeWidth={2.4} aria-hidden />
    </button>
  );
  return (
    <MSheet
      open
      onClose={onClose}
      title="Spots on Centium"
      footer={
        <>
          {error && <MSaveError c={c}>{error}</MSaveError>}
          <MPrimary c={c} disabled={!writes || busy} onClick={() => void save()}>
            Save
          </MPrimary>
          {backend.spots !== "live" && <MSoonNote c={c}>Saving this is coming soon.</MSoonNote>}
          {backend.spots === "live" && !can("schedule") && <MSoonNote c={c}>You need the Schedule permission to change this. Ask the owner.</MSoonNote>}
        </>
      }
    >
      <div style={{ borderRadius: 16, background: c.soft, padding: "12px 14px" }}>
        <span style={{ display: "block", fontSize: px(14), fontWeight: 800, color: c.ink }}>{`${x.title} · ${dowTime(x.date, x.startTime)}`}</span>
        <span style={{ display: "block", fontSize: px(12), color: c.inkSoft }}>{`${who ? `With ${who} · ` : ""}${x.maxCapacity} spots · ${booked} booked`}</span>
      </div>
      <p style={{ fontSize: px(12), fontWeight: 700, color: c.inkSoft, margin: "16px 2px 8px" }}>Spots open on Centium</p>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {stepBtn("Fewer", -1, Minus, offered <= 0)}
        <span role="status" aria-label={`${offered} spots open on Centium`} style={{ flex: 1, height: 48, borderRadius: 14, border: `1.5px solid ${c.primary}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: px(20), fontWeight: 800, fontVariantNumeric: "tabular-nums", color: c.ink }}>
          {offered}
        </span>
        {stepBtn("More", 1, Plus, offered >= free)}
      </div>
      <div aria-hidden style={{ display: "flex", height: 12, borderRadius: 999, overflow: "hidden", gap: 2, marginTop: 14 }}>
        <span style={{ flex: Math.max(0, x.maxCapacity - offered), background: c.primary }} />
        <span style={{ flex: offered, background: `repeating-linear-gradient(90deg, ${c.teal} 0 3px, transparent 3px 5px)` }} />
      </div>
      <p style={{ display: "flex", justifyContent: "space-between", fontSize: px(12), marginTop: 6 }}>
        <span style={{ color: c.inkSoft }}>{`${x.maxCapacity - offered} kept for members`}</span>
        <span style={{ color: c.tealInk, fontWeight: 700 }}>{`${offered} open to new clients`}</span>
      </p>
      <p style={{ fontSize: px(11.5), color: c.faint, marginTop: 10, lineHeight: lh(16) }}>Members can always book any free spot. Spots open on Centium can also be booked by new clients.</p>
    </MSheet>
  );
}

