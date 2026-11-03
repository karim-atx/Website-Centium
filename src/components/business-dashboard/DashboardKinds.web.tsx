import React, { useState } from "react";
import { CalendarDays, CalendarPlus, ChevronDown, Clock, Package, Plus, Truck, type LucideIcon } from "lucide-react";
import type { DashPalette } from "./palette";
import type { DayItem, NumberBox, TodayBlock } from "./dashboardModel";
import { DAY_LONG, DAY_SHORT } from "./dashboardModel";
import { WebKLabel } from "./DashboardParts.web";
import { minutesOfDay, range12, time12 } from "../../utils/time12";
import { getLanguage, t, tn } from "../../i18n/core";
import { ARABIC_LOCALE } from "../../i18n/format";

// Website viewport v1 · WB-HO · CS (WB-HO Classes Dashboard Web v2) and
// WB-HO · ST (WB-HO Store Dashboard Web v2): the Today blocks and the Classes
// Schedule section, at the web token set ("t" at web: boxes 28/36 with
// 14 × 16 padding, lists r18 with 58 rows, 15/22 and 13/20 text, pills 11/16).
// The data is the mobile dashboard's (dashboardModel todayBlock / weekItems);
// the mobile parts (TodayBlock, ScheduleBlock) are not touched.

const LAV = "#AEA1DC";

type ClassesModel = Extract<TodayBlock, { kind: "classes" }>;
type StoreModel = Extract<TodayBlock, { kind: "store" }>;
type EmptyModel = Extract<TodayBlock, { kind: "empty" }>;
type PillTone = "good" | "warn" | "bad" | "soft" | "pale";

const toneInk = (c: DashPalette, tone: NumberBox["tone"]) => (tone === "good" ? c.good : tone === "warn" ? c.warn : tone === "bad" ? c.high : c.faint);
const pillColours = (c: DashPalette, tone: PillTone): [string, string] =>
  tone === "good" ? [c.goodBg, c.good] : tone === "warn" ? [c.warnBg, c.warn] : tone === "bad" ? [c.highBg, c.high] : tone === "pale" ? [c.pale, c.pDark] : [c.soft, c.faint];
const linkStyle = (c: DashPalette): React.CSSProperties => ({ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: c.pDark, whiteSpace: "nowrap", background: "none", border: 0, padding: 0, cursor: "pointer" });

/** The three number boxes: #F7F7FC r16, padding 14 × 16, gap 12, value 28/36 800, label 13/20 600, delta 13/20 700. */
function Boxes({ c, boxes }: { c: DashPalette; boxes: NumberBox[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, flex: "none" }}>
      {boxes.map((b) => (
        <div key={b.label} data-today-box style={{ borderRadius: 16, background: c.listBg, padding: "14px 16px", minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 800, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: c.ink }}>{b.value}</p>
          <p style={{ margin: "2px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: c.faint }}>{b.label}</p>
          {b.delta && <p style={{ margin: "2px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 700, color: toneInk(c, b.tone) }}>{b.delta}</p>}
        </div>
      ))}
    </div>
  );
}

/** The dashed empty box: r20, 1.5 dashed lavender, padding 24 × 18, tile 56 r14 (glyph 26), title 17/24 800, body 15/24. */
function EmptyBox({ c, icon: Icon, title, body }: { c: DashPalette; icon: LucideIcon; title: string; body: string }) {
  return (
    <div data-kit-empty style={{ flex: 1, marginTop: 12, boxSizing: "border-box", borderRadius: 20, border: `1.5px dashed ${LAV}`, padding: "24px 18px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <span style={{ width: 56, height: 56, borderRadius: 14, background: c.pale, color: c.pDark, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={26} strokeWidth={1.75} aria-hidden />
      </span>
      <p style={{ margin: "12px 0 0", fontSize: 17, lineHeight: "24px", fontWeight: 800, color: c.ink }}>{title}</p>
      <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: "24px", color: c.inkSoft, textWrap: "pretty" } as React.CSSProperties}>{body}</p>
    </div>
  );
}

interface ListRow {
  key: string;
  Icon: LucideIcon;
  title: string;
  detail: string;
  pill?: { text: string; tone: PillTone };
  value?: string;
  onClick?: () => void;
}

/**
 * A Today list: the caps label (margin 0 2 10) with See all, then the #F7F7FC
 * r18 card (padding 2 × 16), rows min 58 (padding 8 0, gap 12) with the 48-in
 * rule, tile 36 r11 (glyph 20), title 15/22 700, detail 13/20; Classes rows
 * keep one line, Store rows wrap to two.
 */
function TodayList({ c, label, onSeeAll, rows, wrap, empty }: { c: DashPalette; label: string; onSeeAll?: () => void; rows: ListRow[]; wrap?: boolean; empty: string }) {
  const clamp = (lines: number): React.CSSProperties => (wrap ? { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" } : { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" });
  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      <WebKLabel c={c} label={label} margin="0 2px 10px" right={onSeeAll && <button type="button" onClick={onSeeAll} style={linkStyle(c)}>{t("See all")}</button>} />
      <div role="list" aria-label={label} style={{ borderRadius: 18, background: c.listBg, padding: "2px 16px", display: "flex", flexDirection: "column" }}>
        {rows.length === 0 && <p style={{ margin: 0, padding: "18px 0", fontSize: 13, lineHeight: "20px", color: c.faint }}>{empty}</p>}
        {rows.map((r, k) => {
          const inner = (
            <>
              {k > 0 && <span aria-hidden style={{ position: "absolute", top: 0, insetInlineStart: 48, insetInlineEnd: 0, height: 1, background: c.listRule }} />}
              <span style={{ width: 36, height: 36, borderRadius: 11, background: c.pale, color: c.pDark, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                <r.Icon size={20} strokeWidth={1.75} aria-hidden />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span title={r.title} style={{ display: "block", fontSize: 15, lineHeight: "22px", fontWeight: 700, color: c.ink, ...clamp(2) }}>{r.title}</span>
                <span style={{ display: "block", fontSize: 13, lineHeight: "20px", color: c.faint, ...clamp(2) }}>{r.detail}</span>
              </span>
              {r.pill && (
                <span style={{ fontSize: 11, lineHeight: "16px", fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 999, background: pillColours(c, r.pill.tone)[0], color: pillColours(c, r.pill.tone)[1], whiteSpace: "nowrap" }}>{r.pill.text}</span>
              )}
              {r.value && <span style={{ fontSize: 15, lineHeight: "22px", fontWeight: 800, whiteSpace: "nowrap", color: c.ink, fontVariantNumeric: "tabular-nums" }}>{r.value}</span>}
            </>
          );
          const st: React.CSSProperties = { position: "relative", display: "flex", alignItems: "center", gap: 12, minHeight: 58, padding: "8px 0", boxSizing: "border-box", width: "100%" };
          return r.onClick ? (
            <button key={r.key} type="button" role="listitem" data-today-row onClick={r.onClick} className="hover:!bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ ...st, background: "none", border: 0, cursor: "pointer", textAlign: "start", font: "inherit", color: "inherit" }}>
              {inner}
            </button>
          ) : (
            <div key={r.key} role="listitem" data-today-row style={st}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** One bar of Fill by class today: its class name, start and booked figures. */
export interface ClassBar {
  h: number;
  label: string;
  name: string;
  booked: number;
  cap: number;
}

/**
 * Today (Classes): the three boxes; Fill by class today (r18, 16 × 18, 17/24
 * and 13/20, a bar per class with its % above (11/16 800) and its start and
 * name under it (11/16, 11/14 600), the next class in the deep lavender) beside
 * Next up, two columns 24 apart; the dashed "No classes yet" box with no class.
 */
export function WebTodayClasses({
  c,
  model,
  empty,
  bars,
  onSeeAll,
  onOpenClass,
  style,
}: {
  c: DashPalette;
  model: ClassesModel | null;
  empty: EmptyModel | null;
  bars: ClassBar[];
  onSeeAll: () => void;
  onOpenClass: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <section aria-label={t("Today")} data-today style={{ minWidth: 0, display: "flex", flexDirection: "column", ...style }}>
      <WebKLabel c={c} label={t("Today")} />
      {empty ? (
        <>
          {empty.boxes && <Boxes c={c} boxes={empty.boxes} />}
          <EmptyBox c={c} icon={CalendarPlus} title={empty.title} body={empty.body} />
        </>
      ) : (
        model && (
          <>
            <Boxes c={c} boxes={model.boxes} />
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 24, marginTop: 14 }}>
              <div data-fill-card style={{ borderRadius: 18, background: c.listBg, padding: "16px 18px", display: "flex", flexDirection: "column", minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 800, color: c.ink }}>{t("Fill by class today")}</p>
                <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: "20px", color: c.faint }}>{t("Which classes are filling up?")}</p>
                <div role="img" aria-label={`${t("Fill by class today")}: ${bars.map((b) => `${b.name} ${b.label} ${b.h}%`).join(", ")}`} style={{ flex: 1, minHeight: 96, display: "flex", alignItems: "flex-end", gap: 4 }}>
                  {bars.length === 0 && <p style={{ margin: 0, alignSelf: "center", fontSize: 13, lineHeight: "20px", color: c.faint }}>{t("No classes this day")}</p>}
                  {bars.map((b, i) => {
                    const hi = i === model.hi;
                    return (
                      <div key={i} style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                        <span style={{ fontSize: 11, lineHeight: "16px", fontWeight: 800, color: hi ? c.pDark : c.inkSoft, fontVariantNumeric: "tabular-nums" }}>{`${b.h}%`}</span>
                        <div data-bar title={`${b.name} · ${t("{n} of {cap} booked", { n: b.booked, cap: b.cap })}`} style={{ width: "100%", height: `${Math.max(4, b.h)}%`, borderRadius: "6px 6px 3px 3px", background: hi ? c.pDark : c.lav }} />
                        <span style={{ fontSize: 11, lineHeight: "16px", height: 16, color: c.faint, whiteSpace: "nowrap" }}>{b.label}</span>
                        <span style={{ maxWidth: "100%", minHeight: 28, fontSize: 11, lineHeight: "14px", color: c.inkSoft, fontWeight: 600, textAlign: "center", overflowWrap: "anywhere" }}>{b.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <TodayList
                c={c}
                label={t("Next up")}
                onSeeAll={onSeeAll}
                empty={t("No classes this day")}
                rows={model.next.map((r) => ({ key: r.id, Icon: CalendarDays, title: r.title, detail: r.detail, pill: r.pill, onClick: onOpenClass }))}
              />
            </div>
          </>
        )
      )}
    </section>
  );
}

/**
 * Today (Store): the three boxes; Orders to fulfil (truck or package tiles,
 * the status pill) beside Low stock (the "{n} left" figure 15/22 800), two
 * columns 24 apart, titles and details up to two lines; the dashed "No orders
 * yet" box before the first order.
 */
export function WebTodayStore({
  c,
  model,
  empty,
  onOrders,
  onOpenOrder,
  onProducts,
  style,
}: {
  c: DashPalette;
  model: StoreModel | null;
  empty: EmptyModel | null;
  onOrders: () => void;
  onOpenOrder: (id: string) => void;
  onProducts: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <section aria-label={t("Today")} data-today style={{ minWidth: 0, display: "flex", flexDirection: "column", ...style }}>
      <WebKLabel c={c} label={t("Today")} />
      {empty ? (
        <>
          {empty.boxes && <Boxes c={c} boxes={empty.boxes} />}
          <EmptyBox c={c} icon={Package} title={empty.title} body={empty.body} />
        </>
      ) : (
        model && (
          <>
            <Boxes c={c} boxes={model.boxes} />
            <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 24, marginTop: 14 }}>
              <TodayList
                c={c}
                label={t("Orders to fulfil")}
                onSeeAll={onOrders}
                wrap
                empty={t("Nothing to fulfil")}
                rows={model.orders.map((o) => ({ key: o.id, Icon: o.glyph === "truck" ? Truck : Package, title: o.title, detail: o.detail, pill: o.pill, onClick: () => onOpenOrder(o.id) }))}
              />
              <TodayList c={c} label={t("Low stock")} onSeeAll={onProducts} wrap empty={t("Nothing low on stock")} rows={model.low.map((p) => ({ key: p.id, Icon: Package, title: p.title, detail: p.detail, value: p.value, onClick: onProducts }))} />
            </div>
          </>
        )
      )}
    </section>
  );
}

// ---------------------------------------------------------------- schedule

// Round G (EH5): the strip's day names in the app's language (English keeps DAY_LONG / DAY_SHORT), as ScheduleBlock.
const dayName = (iso: string, i: number, style: "long" | "short") =>
  getLanguage() === "ar" ? new Date(`${iso}T00:00:00`).toLocaleDateString(ARABIC_LOCALE, { weekday: style === "short" ? "short" : "long" }) : style === "long" ? DAY_LONG[i] : DAY_SHORT[i];

/**
 * Schedule (Classes, web): the caps label with Calendar; the Monday-first week
 * strip (7 cells 8 apart, 76 tall, 72 on the rail, r16, the selected cell
 * #F0EDF9 with a lavender edge and its date filled); the day card (r24, 1.5
 * lavender edge) filling the rest of the column: the hero (padding 18 × 20,
 * chips 11, kicker 13, title 20/26, the booked bar, "With" and the day's count
 * 13/20, "Then" at its foot). The featured class, companions, "Then", the
 * expanded day and the events are ScheduleBlock's, unchanged.
 */
export function WebScheduleSection({
  c,
  dates,
  items,
  today,
  now,
  noClassesEver,
  rail,
  onCalendar,
  onCreateClass,
  style,
}: {
  c: DashPalette;
  dates: string[];
  items: DayItem[][];
  today: string;
  now: Date;
  noClassesEver: boolean;
  rail: boolean;
  onCalendar: () => void;
  onCreateClass: () => void;
  style?: React.CSSProperties;
}) {
  const todayIdx = Math.max(0, dates.indexOf(today));
  const [sel, setSel] = useState(todayIdx);
  const [open, setOpen] = useState(false);

  const TY = {
    cls: { bg: c.hero, outline: c.outline, accent: c.primary, accentInk: c.deep, accentBg: c.pale, typeInk: c.dark ? "rgb(var(--th-3f3272))" : "rgb(var(--th-5f5093))", label: t("Class") },
    ev: {
      bg: c.dark ? "linear-gradient(150deg, rgb(var(--th-a2c8c2) / 0.36), rgb(var(--th-a2c8c2) / 0.16))" : "linear-gradient(150deg, rgb(var(--th-4c7873)), rgb(var(--th-38615d)))",
      outline: c.dark ? "rgb(var(--th-a2c8c2) / 0.7)" : "rgb(var(--th-6f9993))",
      accent: c.dark ? "rgb(var(--th-a2c8c2))" : "rgb(var(--th-6f9993))",
      accentInk: c.dark ? "rgb(var(--th-b2d4cf))" : "rgb(var(--th-3e6b67))",
      accentBg: c.dark ? "rgb(var(--th-293339))" : "rgb(var(--th-eaf4f2))",
      typeInk: "rgb(var(--th-2f5d59))",
      label: t("Event"),
    },
  };

  const dayItems = items[sel] ?? [];
  const isToday = sel === todayIdx && dates[sel] === today;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const clsD = dayItems.filter((x) => !x.ev);
  const evsD = dayItems.filter((x) => x.ev);

  let featIdx = -1;
  if (isToday) {
    featIdx = dayItems.findIndex((x) => !x.ev && (minutesOfDay(x.end) ?? 0) > nowMin);
    if (featIdx < 0) featIdx = dayItems.findIndex((x) => (minutesOfDay(x.end) ?? 0) > nowMin);
    if (featIdx < 0 && dayItems.length) featIdx = dayItems.length - 1;
  }
  if (featIdx < 0 && dayItems.length) {
    featIdx = dayItems.findIndex((x) => !x.ev);
    if (featIdx < 0) featIdx = 0;
  }
  const featured = featIdx >= 0 ? dayItems[featIdx] : null;
  const companions = featured ? dayItems.filter((x, i) => i !== featIdx && x.time === featured.time) : [];
  const d = new Date(`${dates[sel]}T00:00:00`);
  const dayChip = isToday ? t("Today") : `${dayName(dates[sel], sel, "long")} ${d.getDate()}`;
  const countLine = () => {
    const b: string[] = [];
    if (clsD.length) b.push(tn(clsD.length, "{n} class", "{n} classes"));
    if (evsD.length) b.push(tn(evsD.length, "{n} event", "{n} events"));
    const line = b.join(" · ");
    return isToday && line ? t("{list} today", { list: line }) : line;
  };
  const kickerFor = (x: DayItem, isMain: boolean) => {
    if (companions.length && isMain) return t("{n} at {time}", { n: companions.length + 1, time: time12(x.time) });
    if (!isToday) return x.ev ? "" : t("First class");
    const start = minutesOfDay(x.time) ?? 0;
    const end = minutesOfDay(x.end) ?? 0;
    if (start <= nowMin && end > nowMin) return t("On now");
    if (end <= nowMin) return "";
    if (x.ev) return t("Next up");
    const mins = start - nowMin;
    return mins < 60 ? tn(mins, "Next class in {n} min", "Next class in {n} min") : t("Next up");
  };

  const later = featured ? dayItems.filter((x, i) => i !== featIdx && x.time > featured.time && !companions.includes(x)).sort((a, b) => a.time.localeCompare(b.time))[0] : null;
  const byTime: Record<string, DayItem[]> = {};
  dayItems.forEach((x, i) => {
    if (i === featIdx && companions.length === 0) return;
    (byTime[x.time] ??= []).push(x);
  });
  const restRows = Object.keys(byTime).sort();
  const canExpand = restRows.length > 0;
  const expanded = open && canExpand;
  const ty = featured ? (featured.ev ? TY.ev : TY.cls) : TY.cls;

  const chip = (label: string, typeInk: string) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", background: "rgba(255,255,255,0.92)", color: typeInk, borderRadius: 999, padding: "3px 8px", whiteSpace: "nowrap", flex: "none", lineHeight: 1.5 }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: typeInk }} />
      {label}
    </span>
  );
  const toggle = () => canExpand && setOpen(!open);

  return (
    <section aria-label={t("Schedule")} data-schedule style={{ minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", ...style }}>
      <WebKLabel c={c} label={t("Schedule")} margin="0 2px 10px" right={<button type="button" onClick={onCalendar} style={linkStyle(c)}>{t("Calendar")}</button>} />
      <div role="tablist" aria-label={t("This week")} style={{ flex: "none", display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 8, marginBottom: 10 }}>
        {dates.map((iso, i) => {
          const on = i === sel;
          const hasC = (items[i] ?? []).some((x) => !x.ev);
          const hasE = (items[i] ?? []).some((x) => x.ev);
          const dot = hasC ? TY.cls.accent : hasE ? TY.ev.accent : "transparent";
          const dd = new Date(`${iso}T00:00:00`);
          return (
            <button
              key={iso}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={`${dayName(iso, i, "long")} ${dd.getDate()}${hasC || hasE ? t(", {n} scheduled", { n: (items[i] ?? []).length }) : ""}`}
              data-week-cell={i}
              onClick={() => {
                setSel(i);
                setOpen(false);
              }}
              className="hover:!bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
              style={{ borderRadius: 16, border: `1.5px solid ${on ? c.primary : c.border}`, background: on ? c.pale : c.card, height: rail ? 72 : 76, boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", minWidth: 0, padding: 0 }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: on ? c.deep : c.faint, lineHeight: "12px" }}>{dayName(iso, i, "short")}</span>
              <span style={{ width: 28, height: 28, borderRadius: 999, background: on ? (c.dark ? c.fill : c.pDark) : "transparent", color: on ? (c.dark ? c.onFill : "#FFFFFF") : c.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14.5, fontWeight: 800 }}>{dd.getDate()}</span>
              <span style={{ display: "flex", gap: 3, height: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: 999, background: dot }} />
                {hasC && hasE && <span style={{ width: 5, height: 5, borderRadius: 999, background: TY.ev.accent }} />}
              </span>
            </button>
          );
        })}
      </div>

      <div data-today-card style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", borderRadius: 24, overflow: "hidden", border: `1.5px solid ${ty.outline}`, background: c.card }}>
        <div
          role={canExpand ? "button" : undefined}
          tabIndex={canExpand ? 0 : undefined}
          aria-expanded={canExpand ? expanded : undefined}
          onClick={toggle}
          onKeyDown={(e) => {
            if (canExpand && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              toggle();
            }
          }}
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#FFFFFF]"
          style={{ flex: expanded ? "none" : 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", background: ty.bg, color: "#FFFFFF", padding: "18px 20px", cursor: canExpand ? "pointer" : "default" }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", background: "rgba(255,255,255,0.18)", borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap", lineHeight: 1.5 }}>{dayChip}</span>
                {chip(featured ? ty.label : t("Class"), ty.typeInk)}
                {featured && kickerFor(featured, true) && <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)", whiteSpace: "nowrap", lineHeight: 1.5 }}>{kickerFor(featured, true)}</span>}
              </span>
              {canExpand && (
                <span aria-hidden style={{ width: 30, height: 30, borderRadius: 999, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)" }}>
                  <ChevronDown size={16} strokeWidth={2.4} />
                </span>
              )}
            </div>
            {featured ? (
              <>
                <p style={{ fontSize: 20, fontWeight: 800, lineHeight: "26px", margin: "10px 0 0" }}>{t("{title} at {time}", { title: featured.title, time: time12(featured.time) })}</p>
                {!featured.ev && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                    <div style={{ flex: 1, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.18)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${featured.cap ? Math.round((featured.b / featured.cap) * 100) : 0}%`, borderRadius: 999, background: "#FFFFFF" }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>{t("{n} of {cap} booked", { n: featured.b, cap: featured.cap })}</span>
                  </div>
                )}
                {featured.ev && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>
                    <Clock size={14} aria-hidden />
                    <span>{range12(featured.time, featured.end)}</span>
                    {featured.status && <span style={{ marginInlineStart: "auto", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", background: "rgba(255,255,255,0.92)", color: ty.typeInk, borderRadius: 999, padding: "2px 8px" }}>{featured.status}</span>}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 10, fontSize: 13, lineHeight: "20px", color: "rgba(255,255,255,0.82)" }}>
                  <span>{featured.ev ? featured.loc : featured.who ? t("With {name}", { name: featured.who }) : ""}</span>
                  <span style={{ textAlign: "end" }}>{countLine() + (isToday || featured.ev ? "" : ` · ${t("{n} booked", { n: clsD.reduce((a, k) => a + k.b, 0) })}`)}</span>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 20, fontWeight: 800, lineHeight: "26px", margin: "10px 0 0" }}>{noClassesEver ? t("No classes yet") : t("No classes this day")}</p>
                <div style={{ marginTop: 10, fontSize: 13, lineHeight: "20px", color: "rgba(255,255,255,0.82)" }}>{noClassesEver ? t("Create your first class and it shows here.") : t("Add one to fill the gap.")}</div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateClass();
                  }}
                  className="hover:!bg-[rgba(255,255,255,0.28)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFFFFF]"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, height: 36, padding: "0 14px", borderRadius: 12, background: "rgba(255,255,255,0.2)", fontSize: 15, fontWeight: 600, color: "#FFFFFF", border: 0, cursor: "pointer" }}
                >
                  <Plus size={16} aria-hidden />
                  {noClassesEver ? t("Create your first class") : t("Create class")}
                </button>
              </>
            )}
          </div>
          {featured && later && !expanded && (
            <div data-then style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.16)", fontSize: 13, lineHeight: "20px", color: "rgba(255,255,255,0.9)" }}>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.7)" }}>{t("Then")}</span>
              <span style={{ fontWeight: 700, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {`${t("{title} at {time}", { title: later.title, time: time12(later.time) })}${later.ev ? (later.loc ? ` · ${later.loc}` : "") : ` · ${t("{n} of {cap} booked", { n: later.b, cap: later.cap })}`}`}
              </span>
            </div>
          )}
        </div>
        {featured && companions.length > 0 && (
          <div style={{ flex: "none", background: companions[0].ev ? TY.ev.bg : TY.cls.bg, color: "#FFFFFF", padding: "12px 20px", display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid rgba(255,255,255,0.22)", boxShadow: "inset 0 10px 12px -10px rgba(0,0,0,0.45)" }}>
            {chip(companions[0].ev ? TY.ev.label : TY.cls.label, companions[0].ev ? TY.ev.typeInk : TY.cls.typeInk)}
            <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, lineHeight: "22px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{companions[0].title}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)", whiteSpace: "nowrap" }}>
              {companions[0].ev ? range12(companions[0].time, companions[0].end) : t("{n} of {cap} booked", { n: companions[0].b, cap: companions[0].cap })}
            </span>
          </div>
        )}
        {expanded && (
          <div data-day-rows style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 16px" }}>
            {restRows.map((tm, gi) => {
              const g = byTime[tm];
              const multi = g.length > 1;
              return (
                <div key={tm} style={{ display: "grid", gridTemplateColumns: "64px minmax(0,1fr)", gap: 10, padding: "12px 0", borderTop: gi ? `1px solid ${c.divider}` : "none" }}>
                  <div style={{ paddingTop: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, lineHeight: "20px", color: c.deep, margin: 0 }}>{time12(tm)}</p>
                    {multi && <p style={{ fontSize: 11, fontWeight: 700, lineHeight: "16px", color: c.faint, margin: "2px 0 0" }}>{t("{n} at once", { n: g.length })}</p>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0, paddingInlineStart: multi ? 10 : 0, borderInlineStart: multi ? `2px solid ${c.tert}` : "none" }}>
                    {g.map((x) => {
                      const tt = x.ev ? TY.ev : TY.cls;
                      const done = isToday && (minutesOfDay(x.end) ?? 0) <= nowMin;
                      const f = x.cap ? x.b / x.cap : 0;
                      return (
                        <div key={x.id} style={{ display: "grid", gridTemplateColumns: "3px minmax(0,1fr) auto", columnGap: 10, alignItems: "stretch", opacity: done ? 0.6 : 1 }}>
                          <span style={{ borderRadius: 999, background: tt.accent }} />
                          <div style={{ minWidth: 0 }}>
                            <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 700, lineHeight: "22px", minWidth: 0, margin: 0, color: c.ink }}>
                              <span style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.title}</span>
                              <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: tt.accentInk, background: tt.accentBg, borderRadius: 999, padding: "1px 6px", flex: "none" }}>{tt.label}</span>
                            </p>
                            <p style={{ fontSize: 13, lineHeight: "20px", color: c.faint, margin: 0 }}>{x.ev ? `${range12(x.time, x.end)}${x.loc ? ` · ${x.loc}` : ""}` : `${x.who}${done ? `${x.who ? " · " : ""}${t("ended")}` : ""}`}</p>
                            {!x.ev && (
                              <div style={{ height: 4, borderRadius: 999, background: c.track, marginTop: 6, overflow: "hidden" }}>
                                <div style={{ height: "100%", borderRadius: 999, width: `${Math.round(f * 100)}%`, background: f < 0.7 ? c.caution : c.primary }} />
                              </div>
                            )}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, textAlign: "end", color: x.ev ? tt.accentInk : f < 0.7 && !done ? c.caution : c.ink, alignSelf: "center" }}>{x.ev ? x.status : `${x.b}/${x.cap}`}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
