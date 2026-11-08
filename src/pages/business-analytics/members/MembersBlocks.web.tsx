import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MailPlus, Plus, Users } from "lucide-react";
import { useAnalytics } from "../analyticsContext";
import { isoOf, rangeWords } from "../analyticsRange";
import { EARLY_LINE, inRange, joinsByWeek, planBars, type MembersFigures, type MembersPageDef, type MembersVocab, type PageView } from "./membersModel";
import type { MembersData } from "./useMembersData";
import { dayName, fmtEntries, footOf, useEntriesByDay, useRenewals } from "./membersReaders";
import { renewalRateLabel } from "../../../services/front-desk/frontDeskLogic";
import { isRtl, t, tn, tx } from "../../../i18n/core";
import { appLocale } from "../../../i18n/format";

// Website viewport v1 · WB-AN.3.1–3.5 (WB-AN Analytics Web v5, `members()`):
// the detail card's body as the board's block grid, 6 columns, gap 12, inside
// the body padding 20 × 24 (16 × 20 on the rail) with the foot line under it.
// Blocks (radius 16, padding 14 × 16 / 12 × 14, gap 8):
//   lead  #F7F6FC, 1px rgba(143,104,246,0.12), the page's lead 17/24 600;
//   stat  #FAFAFB, 1px rgba(36,31,27,0.06), caps label 13/20 700 .08em, value 32/40 800;
//   sections (#FFFFFF, 1px rgba(36,31,27,0.11)) with the head (title 15/22 800,
//   right 13/20, line 13/20 #5B5349 at −6): the line chart, columns, bars and rows.
// Growth: lead 4 + stat 2, "Active members by week" and "Joins and ends by
// week" each across (side by side, 3 + 3, on the rail), the rows auto / 1fr /
// 1fr so the two charts share the card's height. First 90 days and Not seen
// in 14 days: lead 3 + stat 3. Visits: lead 4 + stat 2 over "Entries by day"
// (7 columns). Plans: "Membership plans" bars 3 | "Invite to active" rows 3,
// "Renewals" across in two columns. The Classes pages (Engagement, At risk)
// are not drawn on the board and take the Visits layout without a chart. No
// member ever: the ghost chart (0.55fr) over the dashed empty block (1fr) on
// Growth, the empty block alone on the other pages. Early data: the early
// line as a tip block across the top (not drawn; UNSPECIFIED placement).
// Figures and readers are the mobile page's (MembersPage, RenewalsCard).

type Block = {
  k: string;
  gc: string;
  kind: "lead" | "stat" | "sect" | "empty" | "ghost" | "tip";
  node?: React.ReactNode;
};

const INK = "#241F1B";
const FAINT = "#71685E";
const TERT = "#776E64";
const SOFT_INK = "#5B5349";

const pad = (rail: boolean) => (rail ? "12px 14px" : "14px 16px");

function frame(kind: Block["kind"], rail: boolean): React.CSSProperties {
  const base: React.CSSProperties = { minWidth: 0, minHeight: 0, boxSizing: "border-box", borderRadius: 16, padding: pad(rail), display: "flex", flexDirection: "column", gap: 8 };
  if (kind === "lead") return { ...base, background: "#F7F6FC", border: "1px solid rgba(143,104,246,0.12)", justifyContent: "center" };
  if (kind === "stat" || kind === "tip") return { ...base, background: "#FAFAFB", border: "1px solid rgba(36,31,27,0.06)", justifyContent: "center" };
  if (kind === "empty") return { ...base, background: "#FFFFFF", border: "1.5px dashed #AEA1DC", justifyContent: "flex-start" };
  return { ...base, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.11)", justifyContent: "flex-start" };
}

const Head: React.FC<{ title: string; right?: React.ReactNode; line?: string | null }> = ({ title, right, line }) => (
  <>
    <div style={{ flex: "none", display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", columnGap: 12, rowGap: 2 }}>
      <h3 style={{ flex: "none", margin: 0, fontSize: 15, lineHeight: "22px", fontWeight: 800, color: INK, whiteSpace: "nowrap" }}>{title}</h3>
      {right}
    </div>
    {line && <p style={{ flex: "none", margin: "-6px 0 0", fontSize: 13, lineHeight: "20px", color: SOFT_INK, textWrap: "pretty" } as React.CSSProperties}>{line}</p>}
  </>
);

const Right: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={{ flex: "none", fontSize: 13, lineHeight: "20px", color: FAINT, whiteSpace: "nowrap" }}>{children}</span>;

const Lead: React.FC<{ text: string; button?: React.ReactNode }> = ({ text, button }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
    <p data-an-lead style={{ flex: 1, minWidth: 0, margin: 0, fontSize: button ? 15 : 17, lineHeight: button ? "22px" : "24px", fontWeight: 600, color: INK, textWrap: "pretty" } as React.CSSProperties}>
      {text}
    </p>
    {button}
  </div>
);

const Stat: React.FC<{ label: string; value: string | null }> = ({ label, value }) => (
  <>
    <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: FAINT }}>{label}</p>
    <p data-an-stat style={{ margin: 0, fontSize: 32, lineHeight: "40px", fontWeight: 800, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", color: value === null ? TERT : INK }}>
      {value ?? "–"}
    </p>
  </>
);

/** The line chart: this period solid with its area and dots, the previous period dashed (board `isChart`). */
const LineChart: React.FC<{ cur: number[]; prev: number[] | null; labels: string[]; rail: boolean }> = ({ cur, prev, labels, rail }) => {
  const n = cur.length;
  const all = [...cur, ...(prev ?? [])];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  // The board pads the value range by a quarter of its span (372–420 around 380–412); UNSPECIFIED for a flat line: ±1.
  const padV = hi > lo ? (hi - lo) / 4 : 1;
  const mn = lo - padV;
  const mx = hi + padV;
  const xs = cur.map((_, i) => ((i + 0.5) / n) * 100);
  const y = (v: number) => 30 + (1 - (v - mn) / (mx - mn)) * 64;
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${xs[i].toFixed(2)} ${y(v).toFixed(2)}`).join(" ");
  // UNSPECIFIED: the board draws 4 weeks with every value and label; past 6 weeks every n-th from the last one.
  const every = Math.ceil(n / 6);
  const shown = (i: number) => (n - 1 - i) % every === 0;
  const rtl = isRtl();
  return (
    <div style={{ flex: 1, minHeight: rail ? 64 : 72, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ position: "relative", flex: 1, minHeight: 0, transform: rtl ? "scaleX(-1)" : undefined }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible", display: "block" }} aria-hidden>
          <path d="M0 10H100M0 50H100M0 90H100" stroke="rgba(36,31,27,0.07)" strokeWidth="1" vectorEffect="non-scaling-stroke" fill="none" />
          {n > 1 && <path d={`${path(cur)} L${xs[n - 1].toFixed(2)} 100 L${xs[0].toFixed(2)} 100 Z`} fill="rgba(174,161,220,0.16)" stroke="none" />}
          {prev && <path data-an-prev d={path(prev)} fill="none" stroke="#B9B2A8" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
          <path data-an-cur d={path(cur)} fill="none" stroke="#7D6BB5" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {cur.map((v, i) => (
          <React.Fragment key={i}>
            <span style={{ position: "absolute", left: `${xs[i]}%`, top: `${y(v)}%`, width: i === n - 1 ? 10 : 7, height: i === n - 1 ? 10 : 7, transform: "translate(-50%,-50%)", borderRadius: 999, background: "#7D6BB5", boxShadow: "0 0 0 2px #FFFFFF" }} />
            {shown(i) && (
              <span
                style={{ position: "absolute", left: `${xs[i]}%`, top: `${y(v)}%`, transform: `translate(-50%,-150%)${rtl ? " scaleX(-1)" : ""}`, marginTop: -6, fontSize: 12, lineHeight: "16px", fontWeight: 800, color: INK, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
              >
                {v.toLocaleString(appLocale("en-US"))}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
      <div aria-hidden style={{ flex: "none", display: "grid", gridTemplateColumns: `repeat(${n},minmax(0,1fr))` }}>
        {labels.map((l, i) => (
          <span key={i} style={{ textAlign: "center", fontSize: 11, lineHeight: "16px", color: TERT, whiteSpace: "nowrap" }}>
            {shown(i) ? l : ""}
          </span>
        ))}
      </div>
    </div>
  );
};

type Col = { l: string; v1: string; h1: number; c1: string; v2?: string; h2?: number; c2?: string; aria?: string };

/** Value columns (board `isCols`): one bar, or a joined bar over an ended bar, per column. */
const Cols: React.FC<{ cols: Col[]; rail: boolean; label?: string }> = ({ cols, rail, label }) => {
  const every = Math.ceil(cols.length / 7);
  return (
    <div role={label ? "img" : undefined} aria-label={label} style={{ flex: 1, minHeight: rail ? 64 : 72, display: "grid", gridTemplateColumns: `repeat(${cols.length},minmax(0,1fr))`, gap: 10, alignItems: "stretch" }}>
      {cols.map((c, i) => (
        <div key={i} role={c.aria ? "img" : undefined} aria-label={c.aria} style={{ minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ flex: 1, minHeight: 0, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
            <span style={{ flex: "none", fontSize: 12, lineHeight: "16px", fontWeight: 800, color: c.c1 }}>{c.v1}</span>
            <span data-an-col style={{ flex: "none", width: "100%", maxWidth: 40, height: `${c.h1}%`, minHeight: 3, borderRadius: "6px 6px 2px 2px", background: c.c1, opacity: 0.85 }} />
            {c.c2 && <span style={{ flex: "none", width: "100%", maxWidth: 40, height: `${c.h2}%`, minHeight: 3, borderRadius: "2px 2px 6px 6px", background: c.c2, opacity: 0.75 }} />}
          </div>
          {c.c2 && <span style={{ flex: "none", fontSize: 12, lineHeight: "16px", fontWeight: 800, color: c.c2 }}>{c.v2}</span>}
          <span aria-hidden style={{ flex: "none", marginTop: 2, fontSize: 11, lineHeight: "16px", color: TERT, whiteSpace: "nowrap" }}>
            {i % every === 0 || i === cols.length - 1 ? c.l : ""}
          </span>
        </div>
      ))}
    </div>
  );
};

/** Plan bars (board `isBars`): grid 96 / 1fr / 40, rows at least 30, bar 8 on #F5F5F6. */
const Bars: React.FC<{ bars: { key: string; t: string; n: number; w: string; col: string; aria: string }[] }> = ({ bars }) => (
  <div data-plan-bars style={{ flex: "none", display: "flex", flexDirection: "column", gap: 6 }}>
    {bars.map((r) => (
      <div key={r.key} aria-label={r.aria} style={{ display: "grid", gridTemplateColumns: "96px minmax(0,1fr) 40px", gap: 10, alignItems: "center", minHeight: 30 }}>
        <span title={r.t} style={{ fontSize: 13, lineHeight: "18px", fontWeight: 600, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {r.t}
        </span>
        <span style={{ height: 8, borderRadius: 999, background: "#F5F5F6", overflow: "hidden", display: "block" }}>
          <span style={{ display: "block", height: "100%", width: r.w, borderRadius: 999, background: r.col }} />
        </span>
        <span style={{ fontSize: 13, lineHeight: "18px", fontWeight: 800, textAlign: "end", fontVariantNumeric: "tabular-nums", color: INK }}>{r.n.toLocaleString(appLocale("en-US"))}</span>
      </div>
    ))}
  </div>
);

type RowItem = { key: string; n: string | null; col: string; t: string; s: string };

/** Figure rows (board `isRows`): a 3px edge, the number 18/22 800, then "title · line" inline or stacked. */
const Rows: React.FC<{ rows: RowItem[]; cols: number; nW: number; inline: boolean }> = ({ rows, cols, nW, inline }) => (
  <div style={{ flex: "none", display: "grid", gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`, alignContent: "start", gap: "10px 16px" }}>
    {rows.map((r) => (
      <div key={r.key} data-an-rowitem={r.key} style={{ display: "grid", gridTemplateColumns: `3px ${nW}px minmax(0,1fr)`, columnGap: 10, alignItems: "center", minHeight: 30 }}>
        <span aria-hidden style={{ alignSelf: "stretch", borderRadius: 999, background: r.col }} />
        <span style={{ fontSize: 18, lineHeight: "22px", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: r.n === null || r.n === "–" ? TERT : INK }}>{r.n ?? "–"}</span>
        {inline ? (
          <span style={{ minWidth: 0, fontSize: 13, lineHeight: "18px", color: FAINT, textWrap: "pretty" } as React.CSSProperties}>
            <b style={{ fontWeight: 700, color: INK }}>{r.t}</b>
            {r.s ? ` · ${r.s}` : ""}
          </span>
        ) : (
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 13, lineHeight: "18px", fontWeight: 700, color: INK }}>{r.t}</span>
            <span style={{ display: "block", fontSize: 13, lineHeight: "20px", color: FAINT, textWrap: "pretty" } as React.CSSProperties}>{r.s}</span>
          </span>
        )}
      </div>
    ))}
  </div>
);

const Ghost: React.FC = () => (
  <svg viewBox="0 0 300 96" preserveAspectRatio="none" width="100%" height="100%" style={{ flex: 1, minHeight: 64, display: "block", overflow: "visible" }} aria-hidden>
    <line x1="0" x2="300" y1="14" y2="14" stroke="rgba(36,31,27,0.07)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    <line x1="0" x2="300" y1="48" y2="48" stroke="rgba(36,31,27,0.07)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    <line x1="0" x2="300" y1="82" y2="82" stroke={TERT} strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
  </svg>
);

/** Visits · "Entries by day" (venue_busy_times summed per weekday, the mobile page's reader): 7 columns, bars v / max × 82%. */
const EntriesBody: React.FC<{ data: MembersData; rail: boolean }> = ({ data, rail }) => {
  const { days, weeks } = useEntriesByDay(data);
  if (!days)
    return (
      <>
        <Head title={t("Entries by day")} />
        <Ghost />
      </>
    );
  const max = Math.max(...days);
  const top = days.indexOf(max);
  const line =
    max <= 0
      ? weeks === 1
        ? t("No entries in the last week.")
        : t("No entries in the last {n} weeks.", { n: weeks })
      : t("{day}s are busiest, with about {n} entries.", { day: dayName(top), n: fmtEntries(max) });
  return (
    <>
      <Head title={t("Entries by day")} line={line} />
      <Cols
        rail={rail}
        label={t("Average entries by day: {list}", { list: days.map((v, d) => `${dayName(d)} ${fmtEntries(v)}`).join(t(", ")) })}
        cols={days.map((v, d) => ({ l: dayName(d, "narrow"), v1: v > 0 ? fmtEntries(v) : "", h1: max > 0 ? Math.round((v / max) * 82) : 0, c1: "#AEA1DC" }))}
      />
    </>
  );
};

/** Plans · "Renewals" (the mobile RenewalsCard's readers): four rows in two columns. */
const RenewalsBody: React.FC = () => {
  const { range } = useAnalytics();
  const { data: d, error } = useRenewals(range.from, range.to);
  const rate = renewalRateLabel(d?.stats ?? null);
  return (
    <>
      <Head
        title={t("Renewals")}
        line={error ? t("Couldn't load renewals. Check your connection and try again.") : !d ? t("Loading renewals…") : tn(d.ending, "1 membership ends in the next 7 days.", "{n} memberships end in the next 7 days.")}
      />
      <Rows
        cols={2}
        nW={44}
        inline={false}
        rows={[
          { key: "due", n: d ? String(d.toChase) : null, col: "#D9A441", t: t("Due in 7 days"), s: t("Not renewed yet and not ending.") },
          { key: "rate", n: d ? rate.value : null, col: "#7D6BB5", t: t("Renewal rate"), s: rate.note ? t(rate.note) : t("Renewed out of those due this period.") },
          { key: "lapsed", n: d ? String(d.stats.lapsed) : null, col: "#C0392B", t: t("Lapsed"), s: t("Ended this period without a renewal.") },
          { key: "choice", n: d ? String(d.stats.cancelled) : null, col: TERT, t: t("Ended by choice"), s: t("Ended by the member or by you this period.") },
        ]}
      />
    </>
  );
};

const PLAN_COLS = ["#AEA1DC", "#14A08F", "#D9A441"];

export const MembersBlocksWeb: React.FC<{
  page: MembersPageDef;
  vocab: MembersVocab;
  view: PageView;
  figures: MembersFigures;
  data: MembersData;
  empty: boolean;
  early: boolean;
  rail: boolean;
}> = ({ page, vocab, view, figures, data, empty, early, rail }) => {
  const navigate = useNavigate();
  const { range } = useAnalytics();
  const gym = vocab.label === "Members";
  const classes = vocab.label === "Clients";

  // The range's weeks (as "Joins and ends by week" on mobile) for the line chart and the columns.
  const weeks = useMemo(() => joinsByWeek(figures.growth?.cur ?? [], range.from, range.to), [figures.growth, range.from, range.to]);

  const blocks: Block[] = [];
  let rows = "auto";

  if (empty) {
    const button = classes
      ? { label: t("Create class"), Icon: Plus, to: "/app/business/classes?create=1" }
      : { label: t("Invite members"), Icon: MailPlus, to: "/app/business/analytics/members/codes?create=1" };
    const emptyNode = (
      <div data-an-empty style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 6 }}>
        <span aria-hidden style={{ width: 52, height: 52, borderRadius: 16, background: "#F0EDF9", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6, color: "#7D6BB5" }}>
          <Users size={24} />
        </span>
        <p style={{ margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 800, color: INK, whiteSpace: "nowrap" }}>{classes ? t("No clients yet") : t("No members yet")}</p>
        <p style={{ margin: 0, maxWidth: 440, fontSize: 15, lineHeight: "24px", color: SOFT_INK, textWrap: "pretty" } as React.CSSProperties}>
          {classes ? t("Clients appear here after their first booking. Add a class to get started.") : t("Invite members with a code. Growth, first-90-day health, engagement and plans appear once people join.")}
        </p>
        <button
          type="button"
          onClick={() => navigate(button.to)}
          className="hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AEA1DC]"
          style={{ marginTop: 12, height: 44, padding: "0 20px", borderRadius: 14, background: "#9A8CD6", color: "#FFFFFF", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, border: 0, cursor: "pointer" }}
        >
          <button.Icon size={18} />
          {button.label}
        </button>
      </div>
    );
    if (page.key === "growth") {
      blocks.push({ k: "ghost", gc: "1 / -1", kind: "ghost", node: <Ghost /> });
      rows = "minmax(0,0.55fr) minmax(0,1fr)";
    } else rows = "minmax(0,1fr)";
    blocks.push({ k: "empty", gc: "1 / -1", kind: "empty", node: emptyNode });
  } else {
    const leadStat = (lead: string, stat: string) => {
      blocks.push({ k: "lead", gc: lead, kind: "lead", node: <Lead text={view.lead} /> });
      blocks.push({ k: "stat", gc: stat, kind: "stat", node: <Stat label={view.boxes[1].label} value={view.boxes[1].value} /> });
    };
    if (early) blocks.push({ k: "early", gc: "1 / -1", kind: "tip", node: <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: SOFT_INK, textWrap: "pretty" } as React.CSSProperties}>{t(EARLY_LINE)}</p> });

    if (page.key === "growth") {
      leadStat("1 / span 4", "5 / span 2");
      const g = figures.growth;
      if (gym && g && weeks.length > 0) {
        const idx = weeks.map((w) => g.cur.findIndex((c) => c.weekStart === w.key));
        const cur = idx.map((i) => g.cur[i].active);
        const prev = !early && range.compare && g.prev && g.prev.length === g.cur.length ? idx.map((i) => g.prev![i].active) : null;
        blocks.push({
          k: "chart",
          gc: rail ? "1 / span 3" : "1 / -1",
          kind: "sect",
          node: (
            <>
              <Head
                title={t("Active members by week")}
                right={
                  <span aria-hidden style={{ flex: "none", display: "flex", gap: 14, fontSize: 11, lineHeight: "16px", fontWeight: 600, color: FAINT, whiteSpace: "nowrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 14, height: 2.5, borderRadius: 2, background: "#7D6BB5" }} />
                      {t("This period")}
                    </span>
                    {prev && (
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 14, borderTop: "1.5px dashed #B9B2A8" }} />
                        {t("Previous period")}
                      </span>
                    )}
                  </span>
                }
              />
              <div role="img" aria-label={t("Active members by week: {list}", { list: weeks.map((w, i) => `${w.t} ${cur[i]}`).join(t(", ")) })} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <LineChart cur={cur} prev={prev} labels={weeks.map((w) => w.t)} rail={rail} />
              </div>
            </>
          ),
        });
        const wk = idx.map((i) => g.cur[i]);
        // UNSPECIFIED: the board scales both bars by 16 for joins up to 10 and ends up to 4; here by (largest join + largest end) × 1.15.
        const den = Math.max(1, Math.max(...wk.map((w) => w.joined)) + Math.max(...wk.map((w) => w.ended))) * 1.15;
        const j = figures.stats?.members_joined?.value ?? null;
        const e = figures.stats?.members_ended?.value ?? null;
        const line =
          j === null || e === null
            ? t("New memberships and ended memberships in each week.")
            : early && e === 0
              ? t("{n} joined, none left so far.", { n: j })
              : t("{joined} joined and {left} left {when}.", { joined: j, left: e, when: inRange(range.key, rangeWords(range, isoOf(new Date()))) });
        blocks.push({
          k: "joins",
          gc: rail ? "4 / span 3" : "1 / -1",
          kind: "sect",
          node: (
            <>
              <Head title={t("Joins and ends by week")} line={line} />
              <Cols
                rail={rail}
                cols={weeks.map((w, i) => ({
                  l: w.t,
                  v1: wk[i].joined ? String(wk[i].joined) : "",
                  h1: Math.round((wk[i].joined / den) * 100),
                  c1: "#1D744A",
                  v2: wk[i].ended ? String(wk[i].ended) : "",
                  h2: Math.round((wk[i].ended / den) * 100),
                  c2: "#C0392B",
                  aria: w.aria,
                }))}
              />
            </>
          ),
        });
        rows = rail ? "auto minmax(0,1fr)" : "auto minmax(0,1fr) minmax(0,1fr)";
      } else if (gym) {
        blocks.push({ k: "ghost", gc: "1 / -1", kind: "ghost", node: <Ghost /> });
        rows = "auto minmax(0,1fr)";
      }
    } else if (page.key === "first90" || page.key === "notseen") {
      leadStat("1 / span 3", "4 / span 3");
    } else if (page.key === "visits") {
      leadStat("1 / span 4", "5 / span 2");
      if (gym && data.venues.some((v) => v.kind === "gym" && v.businessId === data.businessId)) {
        blocks.push({ k: "entries", gc: "1 / -1", kind: "sect", node: <EntriesBody data={data} rail={rail} /> });
        rows = "auto minmax(0,1fr)";
      }
    } else if (page.key === "plans") {
      const bars = figures.plans ? planBars(figures.plans) : [];
      const activeNow = figures.growth?.cur.at(-1)?.active ?? null;
      const noPlans = !data.plansLoading && data.plans.length === 0 && figures.plans !== null && activeNow !== null;
      const f = figures.funnel;
      if (bars.length > 0 || noPlans) {
        const list = noPlans
          ? [{ key: "none", t: t("No plan"), n: activeNow ?? 0, w: (activeNow ?? 0) > 0 ? "100%" : "0%", col: TERT, aria: classes ? tn(activeNow ?? 0, "No plan: 1 client", "No plan: {n} clients") : tn(activeNow ?? 0, "No plan: 1 member", "No plan: {n} members") }]
          : bars.map((b, j) => ({ ...b, col: PLAN_COLS[j % 3], aria: classes ? tn(b.n, "{plan}: 1 client", "{plan}: {n} clients", { plan: b.t }) : tn(b.n, "{plan}: 1 member", "{plan}: {n} members", { plan: b.t }) }));
        const top = view.boxes[1].value;
        blocks.push({
          k: "plans",
          gc: f ? "1 / span 3" : "1 / -1",
          kind: "sect",
          node: (
            <>
              <Head title={t("Membership plans")} line={view.lead} right={top !== null && !noPlans ? <Right>{t("{n} on the most popular plan", { n: top })}</Right> : undefined} />
              <Bars bars={list} />
              {noPlans && <p data-no-plan-line style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: FAINT }}>{t("Add a membership plan to see how members split.")}</p>}
            </>
          ),
        });
      } else {
        leadStat("1 / span 4", "5 / span 2");
      }
      if (f) {
        const codes = data.codes ?? [];
        const act = f.becameMembers;
        const pending = Math.max(0, f.issued - f.redeemed - f.expiredUnused);
        const ended = figures.stats?.members_ended?.value ?? null;
        const pct = f.issued > 0 ? Math.round((act / f.issued) * 100) : null;
        const redeemed = codes.filter((c) => c.uses > 0).length;
        const items: RowItem[] = [
          { key: "active", n: String(act), col: "#14A08F", t: tx("Active", "members chart"), s: pct === null ? "" : t("{pct}% of invites accepted.", { pct }) },
          { key: "pending", n: String(pending), col: "#AEA1DC", t: t("Pending"), s: t("Invited but not answered yet.") },
          { key: "declined", n: null, col: "#C0392B", t: t("Declined"), s: t("Turned the invitation down.") },
          { key: "ended", n: ended === null ? null : String(ended), col: TERT, t: t("Ended"), s: t("Memberships that ended this period.") },
        ];
        if (codes.length > 0) items.push({ key: "codes", n: `${redeemed}/${codes.length}`, col: "#7D6BB5", t: t("Member codes redeemed"), s: t("Codes handed out at the desk and used to join.") });
        blocks.push({
          k: "invites",
          gc: bars.length > 0 || noPlans ? "4 / span 3" : "1 / -1",
          kind: "sect",
          node: (
            <>
              <Head title={t("Invite to active")} line={pct === null ? t("No invites were sent this period.") : t("{pct}% of this period's invites became active members.", { pct })} />
              <Rows rows={items} cols={1} nW={48} inline />
            </>
          ),
        });
      }
      if (gym) blocks.push({ k: "renewals", gc: "1 / -1", kind: "sect", node: <RenewalsBody /> });
      rows = "auto auto";
    } else {
      // Classes: Engagement, At risk (not on the board).
      leadStat("1 / span 4", "5 / span 2");
    }
    if (early) rows = `auto ${rows}`;
  }

  const fill = /fr/.test(rows);
  const foot = empty ? null : footOf(page, vocab);
  return (
    <>
      <div data-an="blocks" style={{ flex: fill ? "1 1 auto" : "1 0 auto", minHeight: fill ? 0 : "auto", display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gridTemplateRows: rows, alignContent: "start", gap: 12 }}>
        {blocks.map((b) => (
          <div key={b.k} data-block={b.k} style={{ ...frame(b.kind, rail), gridColumn: b.gc }}>
            {b.node}
          </div>
        ))}
      </div>
      {foot && <p style={{ flex: "none", margin: 0, fontSize: 13, lineHeight: "20px", color: FAINT, textAlign: "center" }}>{foot}</p>}
    </>
  );
};
