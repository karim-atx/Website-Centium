import { useState } from "react";
import { ChevronDown, Clock, Plus } from "lucide-react";
import type { DashPalette } from "./palette";
import { DashLabel } from "./parts";
import { DAY_LONG, DAY_SHORT, type DayItem } from "./dashboardModel";
import { minutesOfDay, range12, time12 } from "../../utils/time12";
import { linePx, textPx } from "../../theme/textSize";
import { getLanguage, t, tn } from "../../i18n/core";
import { ARABIC_LOCALE } from "../../i18n/format";

// Round G (EH5): the strip's day names in the app's language (English keeps DAY_LONG / DAY_SHORT).
const dayName = (iso: string, i: number, style: "long" | "short") =>
  getLanguage() === "ar" ? new Date(`${iso}T00:00:00`).toLocaleDateString(ARABIC_LOCALE, { weekday: style === "short" ? "short" : "long" }) : style === "long" ? DAY_LONG[i] : DAY_SHORT[i];

// DA1-015 #21-#28 · Schedule: the Monday-first week strip and the day card
// (BizSummaryV27). Times 12-hour (D5); overlap style "stack" (#28).

interface Props {
  c: DashPalette;
  dates: string[];
  items: DayItem[][];
  today: string;
  now: Date;
  /** No class ever scheduled (DA2 empty: "No classes yet"). */
  noClassesEver: boolean;
  classBased: boolean;
  onCalendar: () => void;
  onCreateClass: () => void;
}

export function ScheduleBlock({ c, dates, items, today, now, noClassesEver, classBased, onCalendar, onCreateClass }: Props) {
  const todayIdx = Math.max(0, dates.indexOf(today));
  const [sel, setSel] = useState(todayIdx);
  const [open, setOpen] = useState(false);

  const TY = {
    cls: { bg: c.hero, outline: c.outline, accent: c.primary, accentInk: c.deep, accentBg: c.pale, typeInk: c.dark ? "rgb(var(--th-3f3272))" : "rgb(var(--th-5f5093))", label: t("Class") },
    ev: {
      bg: c.dark ? `linear-gradient(150deg, ${"rgb(var(--th-a2c8c2) / 0.36)"}, ${"rgb(var(--th-a2c8c2) / 0.16)"})` : `linear-gradient(150deg, ${"rgb(var(--th-4c7873))"}, ${"rgb(var(--th-38615d))"})`,
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

  // The featured item: today, the next class not yet over; otherwise the first class, else the first item.
  let featIdx = -1;
  if (isToday) {
    featIdx = dayItems.findIndex((x) => !x.ev && (minutesOfDay(x.end) ?? 0) > nowMin);
    if (featIdx < 0) featIdx = dayItems.findIndex((x) => (minutesOfDay(x.end) ?? 0) > nowMin);
    // Everything today is over: the day's last item, so the card reads as the day's end.
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
    return mins < 60 ? t("Next class in {n} min", { n: mins }) : t("Next up");
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
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: textPx(10),
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        background: "rgba(255,255,255,0.92)",
        color: typeInk,
        borderRadius: 999,
        padding: "3px 8px",
        whiteSpace: "nowrap",
        flexShrink: 0,
        alignSelf: "flex-start",
        lineHeight: 1.5,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: typeInk }} />
      {label}
    </span>
  );

  return (
    <section aria-label={t("Schedule")}>
      <DashLabel c={c} label={t("Schedule")} link={t("Calendar")} onLink={onCalendar} mb={10} />
      <div role="tablist" aria-label={t("This week")} style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 5, marginBottom: 10 }}>
        {dates.map((iso, i) => {
          const on = i === sel;
          const isTodayCell = iso === today;
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
              style={{
                borderRadius: 16,
                border: `1.5px solid ${on ? c.primary : c.border}`,
                background: on ? c.pale : c.card,
                height: 72,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                cursor: "pointer",
                minWidth: 0,
                padding: 0,
              }}
            >
              <span style={{ fontSize: textPx(10), fontWeight: 700, color: on ? c.deep : c.faint, lineHeight: linePx(12) }}>{dayName(iso, i, "short")}</span>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  background: isTodayCell ? (c.dark ? c.fill : c.pDark) : "transparent",
                  color: isTodayCell ? (c.dark ? c.onFill : "#FFFFFF") : c.ink,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: textPx(14.5),
                  fontWeight: 800,
                }}
              >
                {dd.getDate()}
              </span>
              <span style={{ display: "flex", gap: 3, height: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: 999, background: dot }} />
                {hasC && hasE && <span style={{ width: 5, height: 5, borderRadius: 999, background: TY.ev.accent }} />}
              </span>
            </button>
          );
        })}
      </div>

      <div data-today-card style={{ marginBottom: 20, borderRadius: 24, overflow: "hidden", border: `1.5px solid ${ty.outline}`, background: c.card }}>
        <div
          role={canExpand ? "button" : undefined}
          tabIndex={canExpand ? 0 : undefined}
          aria-expanded={canExpand ? expanded : undefined}
          onClick={() => canExpand && setOpen(!open)}
          onKeyDown={(e) => {
            if (canExpand && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              setOpen(!open);
            }
          }}
          style={{ background: ty.bg, color: "#FFFFFF", padding: "18px 20px", cursor: canExpand ? "pointer" : "default" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flexWrap: "wrap" }}>
              <span style={{ fontSize: textPx(10.5), fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", background: "rgba(255,255,255,0.18)", borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap", lineHeight: 1.5 }}>{dayChip}</span>
              {chip(featured ? ty.label : classBased ? t("Class") : t("Schedule"), ty.typeInk)}
              {featured && kickerFor(featured, true) && <span style={{ fontSize: textPx(11), fontWeight: 600, color: "rgba(255,255,255,0.8)", whiteSpace: "nowrap", lineHeight: 1.5 }}>{kickerFor(featured, true)}</span>}
            </span>
            {canExpand && (
              <span aria-hidden style={{ width: 30, height: 30, borderRadius: 999, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)" }}>
                <ChevronDown size={16} strokeWidth={2.4} />
              </span>
            )}
          </div>
          {featured ? (
            <>
              <p style={{ fontSize: textPx(20), fontWeight: 800, lineHeight: linePx(26), marginTop: 10, marginBottom: 0 }}>{t("{title} at {time}", { title: featured.title, time: time12(featured.time) })}</p>
              {!featured.ev && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.18)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${featured.cap ? Math.round((featured.b / featured.cap) * 100) : 0}%`, borderRadius: 999, background: "#FFFFFF" }} />
                  </div>
                  <span style={{ fontSize: textPx(12), fontWeight: 700, whiteSpace: "nowrap" }}>{t("{n} of {cap} booked", { n: featured.b, cap: featured.cap })}</span>
                </div>
              )}
              {featured.ev && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: textPx(12), fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>
                  <Clock size={13} aria-hidden />
                  <span>{range12(featured.time, featured.end)}</span>
                  {featured.status && (
                    <span style={{ marginInlineStart: "auto", fontSize: textPx(10), fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", background: "rgba(255,255,255,0.92)", color: ty.typeInk, borderRadius: 999, padding: "2px 8px" }}>{featured.status}</span>
                  )}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 10, fontSize: textPx(12), lineHeight: linePx(16), color: "rgba(255,255,255,0.82)" }}>
                <span>{featured.ev ? featured.loc : featured.who ? t("With {name}", { name: featured.who }) : ""}</span>
                <span style={{ textAlign: "end" }}>{countLine() + (isToday || featured.ev ? "" : ` · ${t("{n} booked", { n: clsD.reduce((a, k) => a + k.b, 0) })}`)}</span>
              </div>
              {later && !expanded && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.16)", fontSize: textPx(11.5), lineHeight: linePx(15), color: "rgba(255,255,255,0.9)" }}>
                  <span style={{ fontSize: textPx(9.5), fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.7)" }}>{t("Then")}</span>
                  <span style={{ fontWeight: 700, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {`${t("{title} at {time}", { title: later.title, time: time12(later.time) })}${later.ev ? (later.loc ? ` · ${later.loc}` : "") : ` · ${t("{n} of {cap} booked", { n: later.b, cap: later.cap })}`}`}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <p style={{ fontSize: textPx(20), fontWeight: 800, lineHeight: linePx(26), marginTop: 10, marginBottom: 0 }}>{noClassesEver && classBased ? t("No classes yet") : classBased ? t("No classes this day") : t("Nothing scheduled")}</p>
              <div style={{ marginTop: 10, fontSize: textPx(12), lineHeight: linePx(16), color: "rgba(255,255,255,0.82)" }}>
                {noClassesEver && classBased ? t("Create your first class and it shows here.") : classBased ? t("Add one to fill the gap.") : t("Calendar events show here.")}
              </div>
              {classBased && (
                <button
                  type="button"
                  className="tap"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateClass();
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, height: 34, padding: "0 14px", borderRadius: 12, background: "rgba(255,255,255,0.2)", fontSize: textPx(12), fontWeight: 700, color: "#FFFFFF", border: 0 }}
                >
                  <Plus size={14} aria-hidden />
                  {noClassesEver ? t("Create your first class") : t("Create class")}
                </button>
              )}
            </>
          )}
        </div>
        {featured && companions.length > 0 && (
          <div
            style={{
              background: companions[0].ev ? TY.ev.bg : TY.cls.bg,
              color: "#FFFFFF",
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              borderTop: "1px solid rgba(255,255,255,0.22)",
              boxShadow: "inset 0 10px 12px -10px rgba(0,0,0,0.45)",
            }}
          >
            {chip(companions[0].ev ? TY.ev.label : TY.cls.label, companions[0].ev ? TY.ev.typeInk : TY.cls.typeInk)}
            <span style={{ flex: 1, minWidth: 0, fontSize: textPx(13), fontWeight: 700, lineHeight: linePx(17), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{companions[0].title}</span>
            <span style={{ fontSize: textPx(11), fontWeight: 600, color: "rgba(255,255,255,0.88)", whiteSpace: "nowrap" }}>
              {companions[0].ev ? range12(companions[0].time, companions[0].end) : t("{n} of {cap} booked", { n: companions[0].b, cap: companions[0].cap })}
            </span>
            <span style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "#FFFFFF" }} />
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.45)" }} />
            </span>
          </div>
        )}
        <div style={{ maxHeight: expanded ? 520 : 0, overflow: expanded ? "auto" : "hidden", transition: "max-height 0.35s cubic-bezier(0.22,1,0.36,1)" }} aria-hidden={!expanded}>
          <div style={{ padding: "0 16px" }}>
            {restRows.map((tm, gi) => {
              const g = byTime[tm];
              const multi = g.length > 1;
              return (
                <div key={tm} style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr)", gap: 10, padding: "11px 0", borderTop: gi ? `1px solid ${c.divider}` : "none" }}>
                  <div style={{ paddingTop: 1 }}>
                    <p style={{ fontSize: textPx(12), fontWeight: 800, lineHeight: linePx(16), color: c.deep, margin: 0 }}>{time12(tm)}</p>
                    {multi && <p style={{ fontSize: textPx(9.5), fontWeight: 700, lineHeight: linePx(13), color: c.faint, marginTop: 2, marginBottom: 0 }}>{t("{n} at once", { n: g.length })}</p>}
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
                            <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: textPx(13), fontWeight: 700, lineHeight: linePx(17), minWidth: 0, margin: 0, color: c.ink }}>
                              <span style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.title}</span>
                              <span style={{ fontSize: textPx(9), fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: tt.accentInk, background: tt.accentBg, borderRadius: 999, padding: "1px 6px", flexShrink: 0 }}>{tt.label}</span>
                            </p>
                            <p style={{ fontSize: textPx(11), lineHeight: linePx(15), color: c.faint, margin: 0 }}>
                              {x.ev ? `${range12(x.time, x.end)}${x.loc ? ` · ${x.loc}` : ""}` : `${x.who}${done ? `${x.who ? " · " : ""}${t("ended")}` : ""}`}
                            </p>
                            {!x.ev && (
                              <div style={{ height: 4, borderRadius: 999, background: c.track, marginTop: 6, overflow: "hidden" }}>
                                <div style={{ height: "100%", borderRadius: 999, width: `${Math.round(f * 100)}%`, background: f < 0.7 ? c.caution : c.primary }} />
                              </div>
                            )}
                          </div>
                          <span style={{ fontSize: textPx(12), fontWeight: 700, textAlign: "end", color: x.ev ? tt.accentInk : f < 0.7 && !done ? c.caution : c.ink, alignSelf: "center" }}>
                            {x.ev ? x.status : `${x.b}/${x.cap}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
