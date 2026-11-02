import type { BizKind } from "../../../components/business-more/kind";
import type { First90, GrowthWeek, InvitesFunnel, PeopleSummary, PeriodStats, PlanFigure } from "../../../services/business-analytics/model";
import { appLocale } from "../../../i18n/format";
import { t, tk, tn, tx } from "../../../i18n/core";

// The Members section's pages per type (AN4 frames for the drawn structure;
// OURS-AN4-gym-variant and OURS-AN4-classes-variant for the per-type set and
// vocabulary; AN4-045 for Store).
//
// WHERE THE NUMBERS COME FROM (B15, Database HANDOVER_API "Analytics"):
//   - Growth (gym): business_member_growth (weekly joins / ends / members at
//     the end of each week, once per person across both membership systems)
//     and business_period_stats members_joined / _ended / _net for the range.
//   - First 90 days (gym): business_first_90_days.
//   - Visits, Not seen in 14 days (gym), Engagement, At risk (classes):
//     business_people_summary (its own fixed windows: 4 weeks, 14 and 21 days).
//   - Plans: business_plan_figures (MB-04) for the range.
// What no reader gives stays "–" (never a guessed number): average
// membership length, "Visited this period", "Longest away", the classes
// lane's Growth and First 90 days (the readers count memberships, not class
// clients), and the second box of Engagement and At risk.

export type MembersPageKey = "growth" | "first90" | "engagement" | "atrisk" | "visits" | "notseen" | "plans";

export interface MembersPageDef {
  key: MembersPageKey;
  title: string;
  /** The number-box labels (head[0] is the index value). */
  boxes: [string, string];
  /** The line while no reader covers the page (or before its reader answers). */
  coming: string;
}

export interface MembersVocab {
  /** Section label, crumb and picker header ("Members sections"). */
  label: "Members" | "Clients" | "Customers";
  people: "members" | "clients" | "customers";
  one: "member" | "client" | "customer";
}

export function vocabOf(kind: BizKind): MembersVocab {
  if (kind === "classes") return { label: "Clients", people: "clients", one: "client" };
  if (kind === "store") return { label: "Customers", people: "customers", one: "customer" };
  return { label: "Members", people: "members", one: "member" };
}

/**
 * `hidePlans` (OURS-AN4-classes-variant row 7): a Classes business with no
 * plans and no members has no Plans row, so the index has 4 ("of 4").
 */
export function pagesOf(kind: BizKind, opts: { hidePlans?: boolean } = {}): MembersPageDef[] {
  if (kind === "store") return [];
  if (kind === "classes") {
    const all: MembersPageDef[] = [
      { key: "growth", title: tx("Growth", "members page"), boxes: [t("Active clients"), t("New clients")], coming: t("Coming soon: how many clients booked in this range, and how many were new.") },
      { key: "first90", title: t("First 90 days"), boxes: [t("New in the last 90 days"), t("Booked again in 2 weeks")], coming: t("Coming soon: how many new clients book again in their first weeks.") },
      { key: "engagement", title: t("Engagement"), boxes: [t("Bookings a week"), t("Booked this period")], coming: t("How often clients book, over the last 4 weeks.") },
      { key: "atrisk", title: t("At risk"), boxes: [t("Clients at risk"), t("Average drop vs their usual")], coming: t("Clients who have stopped booking.") },
      { key: "plans", title: t("Plans"), boxes: [t("Membership plans"), t("On the most popular plan")], coming: t("How clients on a plan split across your plans.") },
    ];
    return opts.hidePlans ? all.filter((p) => p.key !== "plans") : all;
  }
  return [
    { key: "growth", title: tx("Growth", "members page"), boxes: [t("Active members"), t("Average membership length")], coming: t("How many members joined and left in this range.") },
    { key: "first90", title: t("First 90 days"), boxes: [t("Joined in the last 90 days"), t("Still active")], coming: t("How many new members are still with you after 90 days.") },
    { key: "visits", title: t("Visits"), boxes: [t("Visits a week"), t("Visited this period")], coming: t("How often members check in at your front desk.") },
    { key: "notseen", title: t("Not seen in 14 days"), boxes: [t("Not seen in 14 days"), t("Longest away")], coming: t("Members with a current membership who have not checked in lately.") },
    { key: "plans", title: t("Plans"), boxes: [t("Membership plans"), t("On the most popular plan")], coming: t("How members split across your plans.") },
  ];
}

// ---- the B15 figures ----------------------------------------------------------------

export interface MembersFigures {
  /** null: not loaded, the reader is missing, or the caller may not read it. */
  summary: PeopleSummary | null;
  first90: First90 | null;
  plans: PlanFigure[] | null;
  stats: PeriodStats | null;
  /** The chart's weeks and the same number of weeks before (null: not read). */
  growth: { cur: GrowthWeek[]; prev: GrowthWeek[] | null } | null;
  /** business_invites_funnel over the days since the range began (Plans "Invite to active"). */
  funnel: InvitesFunnel | null;
}

export const NO_FIGURES: MembersFigures = { summary: null, first90: null, plans: null, stats: null, growth: null, funnel: null };

// ---- early data (AN4-024, AN4-044; B8_B16_REVIEW #19) -------------------------------------------
// The server's `early` flag decides (business_period_stats, per metric: the
// business is under 14 days old or the figure rests on fewer than 10
// records): members_joined for the members lanes, class_bookings for the
// Classes lane. Early hides every delta and shows the hint box. The drawn
// early leads say "your first members joined...", which is only true when the
// first member is inside the chart's weeks (`firstJoin`), so they are used
// only then; otherwise the page keeps its plain lead without deltas.

/** NEW STRING (aligned with the server's flag and the Dashboard's "Early days: not enough history yet"). */
export const EARLY_LINE = tk("Early days: not enough history yet. Some comparisons appear once there is more history.");

export function isEarly(vocab: MembersVocab, f: MembersFigures): boolean {
  if (vocab.label === "Clients") return !!f.stats?.class_bookings?.early;
  return !!f.stats?.members_joined?.early;
}

/**
 * The first member's week, when it is inside the chart (no one before it, in
 * the chart or in the weeks before): how many joined since, over how many
 * weeks (this week counts), and its index. Null when the first member is
 * older, or unknown.
 */
export function firstJoin(g: MembersFigures["growth"]): { n: number; weeks: number; index: number } | null {
  if (!g || g.cur.length === 0) return null;
  const fi = g.cur.findIndex((w) => w.active > 0 || w.joined > 0);
  if (fi < 0) return null;
  if (fi === 0 && !g.prev) return null;
  if (g.prev && g.prev.some((w) => w.active > 0 || w.joined > 0)) return null;
  // No one at the start of the first week.
  const w0 = g.cur[fi];
  if (w0.active - w0.joined + w0.ended > 0) return null;
  return { n: g.cur.slice(fi).reduce((a, w) => a + w.joined, 0), weeks: g.cur.length - fi, index: fi };
}

export interface Delta {
  t: string;
  tone: "good" | "high" | "faint";
}
export interface Box {
  label: string;
  value: string | null;
  delta?: Delta;
}
export interface PageView {
  boxes: [Box, Box];
  lead: string;
}

/** "this week" / "in the last 4 weeks" / "from 8 Sep to 5 Oct" (the range inside a sentence). */
export function inRange(key: string, words: string): string {
  if (key === "week") return t("this week");
  if (key === "custom") return t("from {words}", { words });
  return t("in {words}", { words });
}

const fmtN = (n: number) => n.toLocaleString(appLocale("en-US"));
const MINUS = "−";

/** AN4-005 row 16a: "+{n} vs prev" good, "−{n} vs prev" high, 0 "No change" faint; none while early or with compare off. */
function netDelta(stats: PeriodStats | null, compare: boolean): Delta | undefined {
  const n = stats?.members_net;
  if (!compare || !n || n.early || n.value === null) return undefined;
  if (n.value > 0) return { t: t("{delta} vs prev", { delta: `+${n.value}` }), tone: "good" };
  if (n.value < 0) return { t: t("{delta} vs prev", { delta: `${MINUS}${Math.abs(n.value)}` }), tone: "high" };
  return { t: t("No change"), tone: "faint" };
}

/**
 * One page's two boxes and lead from the B15 figures (AN4-005 rows 16-17 and
 * each section file). `range` words come from the shell (rangeWords).
 */
export function pageView(page: MembersPageDef, vocab: MembersVocab, f: MembersFigures, ctx: { planCount: number; rangeKey: string; rangeWords: string; compare: boolean }): PageView {
  const box = (i: 0 | 1, value: string | null, delta?: Delta, label?: string): Box => ({ label: label ?? page.boxes[i], value, delta });
  const coming: PageView = { boxes: [box(0, null), box(1, null)], lead: page.coming };
  const s = f.summary;
  const classes = vocab.label === "Clients";
  const early = isEarly(vocab, f);
  const fresh = early ? firstJoin(f.growth) : null;

  switch (page.key) {
    case "growth": {
      if (classes || !f.growth || !f.stats?.members_net) return coming;
      const active = f.growth.cur.at(-1)?.active ?? 0;
      const j = f.stats.members_joined?.value ?? 0;
      const e = f.stats.members_ended?.value ?? 0;
      const net = f.stats.members_net.value ?? j - e;
      const how = net > 0 ? t("you grew by {n}", { n: net }) : net < 0 ? t("you shrank by {n}", { n: Math.abs(net) }) : t("your count held steady");
      // AN4-024 rows 3-4: box 1 + "New", box 2 "–", no delta, the early lead.
      if (fresh)
        return {
          boxes: [box(0, active.toLocaleString(appLocale("en-US")), { t: t("New"), tone: "good" }), box(1, null)],
          lead:
            fresh.weeks === 1
              ? tn(fresh.n, "Your first member joined this week. Trends compare periods once you have 8 weeks of history.", "Your first {n} members joined this week. Trends compare periods once you have 8 weeks of history.", { n: fmtN(fresh.n) })
              : tn(fresh.n, "Your first member joined in the last {weeks} weeks. Trends compare periods once you have 8 weeks of history.", "Your first {n} members joined in the last {weeks} weeks. Trends compare periods once you have 8 weeks of history.", { n: fmtN(fresh.n), weeks: fresh.weeks }),
        };
      return {
        boxes: [box(0, active.toLocaleString(appLocale("en-US")), early ? undefined : netDelta(f.stats, ctx.compare)), box(1, null)],
        lead: tn(active, "{n} active member: {joined} joined and {left} left {when}, so {how}.", "{n} active members: {joined} joined and {left} left {when}, so {how}.", { n: fmtN(active), joined: j, left: e, when: inRange(ctx.rangeKey, ctx.rangeWords), how }),
      };
    }
    case "first90": {
      if (classes || !f.first90) return coming;
      const { joined, stillActive, bookedAClass } = f.first90;
      // AN4-044 row 13 early lead, only while it is true: the first members are recent and some booked.
      if (fresh && joined > 0 && bookedAClass > 0)
        return {
          boxes: [box(0, joined.toLocaleString(appLocale("en-US"))), box(1, t("{n} of {total}", { n: stillActive, total: joined }))],
          lead:
            bookedAClass === 1
              ? tn(joined, "Too early for 30, 60 and 90-day checks. 1 of your 1 new member has already booked a class.", "Too early for 30, 60 and 90-day checks. 1 of your {n} new members has already booked a class.", { n: fmtN(joined) })
              : tn(joined, "Too early for 30, 60 and 90-day checks. {booked} of your 1 new member have already booked a class.", "Too early for 30, 60 and 90-day checks. {booked} of your {n} new members have already booked a class.", { n: fmtN(joined), booked: bookedAClass }),
        };
      return {
        boxes: [box(0, joined.toLocaleString(appLocale("en-US"))), box(1, joined > 0 ? t("{n} of {total}", { n: stillActive, total: joined }) : null)],
        lead:
          joined > 0
            ? stillActive === 1
              ? tn(joined, "1 of the 1 member who joined in the last 90 days is still with you.", "1 of the {n} members who joined in the last 90 days is still with you.", { n: fmtN(joined) })
              : tn(joined, "{still} of the 1 member who joined in the last 90 days are still with you.", "{still} of the {n} members who joined in the last 90 days are still with you.", { n: fmtN(joined), still: stillActive })
            : t("No new members joined in the last 90 days."),
      };
    }
    case "visits": {
      const v = s?.visits_per_week_4w;
      if (v === undefined) return coming;
      return { boxes: [box(0, v.toFixed(1)), box(1, null)], lead: t("{n} check-ins a week on average over the last 4 weeks.", { n: v.toFixed(1) }) };
    }
    case "notseen": {
      const n = s?.members_not_seen_14d;
      if (n === undefined) return coming;
      const all = s?.members ?? 0;
      return {
        boxes: [box(0, n.toLocaleString(appLocale("en-US"))), box(1, null)],
        lead:
          all === 0
            ? t("No one has a current membership right now.")
            : n === 1
              ? tn(all, "1 of your 1 member with a current membership has not checked in for 14 days.", "1 of your {n} members with a current membership has not checked in for 14 days.", { n: fmtN(all) })
              : tn(all, "{count} of your 1 member with a current membership have not checked in for 14 days.", "{count} of your {n} members with a current membership have not checked in for 14 days.", { n: fmtN(all), count: n }),
      };
    }
    case "engagement": {
      const v = s?.bookings_per_week_4w;
      if (v === undefined) return coming;
      return { boxes: [box(0, v.toFixed(1)), box(1, null)], lead: t("Your clients made {n} bookings a week over the last 4 weeks.", { n: v.toFixed(1) }) };
    }
    case "atrisk": {
      const n = s?.class_clients_at_risk_21d;
      if (n === undefined) return coming;
      // AN4-031 D3 / AN4-011 O4 / AN4-044 O2: early with no one flagged reads the early lead ("0" in ink).
      if (early && n === 0) return { boxes: [box(0, "0"), box(1, null)], lead: t("We flag clients once they have 4 weeks of bookings to compare against.") };
      return {
        boxes: [box(0, n.toLocaleString(appLocale("en-US"))), box(1, null)],
        lead:
          n > 0
            ? tn(n, "1 client has booked in the last 4 months but not in the last 21 days.", "{n} clients have booked in the last 4 months but not in the last 21 days.", { n: fmtN(n) })
            : t("No one has stopped booking. Clients appear here after 21 days without a booking."),
      };
    }
    case "plans": {
      const count = box(0, ctx.planCount.toLocaleString(appLocale("en-US")));
      if (!f.plans) return { boxes: [count, box(1, null)], lead: page.coming };
      const total = f.plans.reduce((a, p) => a + p.activeNow, 0);
      const top = f.plans[0];
      if (!top || total === 0) return { boxes: [count, box(1, null)], lead: classes ? t("No clients are on a plan yet.") : t("No members are on a plan yet.") };
      // AN4-044 row 13: "{n} of your {m} members are on {plan}." (m: everyone with a current membership).
      if (early) {
        const all = Math.max(total, f.growth?.cur.at(-1)?.active ?? 0);
        return {
          boxes: [count, box(1, top.activeNow.toLocaleString(appLocale("en-US")), undefined, t("On {plan}", { plan: top.name }))],
          lead: classes
            ? top.activeNow === 1
              ? tn(all, "1 of your 1 client is on {plan}.", "1 of your {n} clients is on {plan}.", { n: fmtN(all), plan: top.name })
              : tn(all, "{count} of your 1 client are on {plan}.", "{count} of your {n} clients are on {plan}.", { n: fmtN(all), plan: top.name, count: top.activeNow })
            : top.activeNow === 1
              ? tn(all, "1 of your 1 member is on {plan}.", "1 of your {n} members is on {plan}.", { n: fmtN(all), plan: top.name })
              : tn(all, "{count} of your 1 member are on {plan}.", "{count} of your {n} members are on {plan}.", { n: fmtN(all), plan: top.name, count: top.activeNow }),
        };
      }
      return {
        boxes: [count, box(1, top.activeNow.toLocaleString(appLocale("en-US")), undefined, t("On {plan}, the most popular", { plan: top.name }))],
        lead: classes
          ? t("{plan} holds {pct}% of clients on a plan.", { plan: top.name, pct: Math.round((top.activeNow / total) * 100) })
          : t("{plan} holds {pct}% of members on a plan.", { plan: top.name, pct: Math.round((top.activeNow / total) * 100) }),
      };
    }
  }
}

/** The index row's value and delta: the page's first box (AN4-001 rows 14-15). */
export function indexValue(v: PageView): { value: string | null; delta?: Delta } {
  return { value: v.boxes[0].value, delta: v.boxes[0].delta };
}

/** The Plans page bars (AnMembersV6 `plans`, l.180-188): per plan with members, width = n / max. */
export function planBars(plans: PlanFigure[]): { key: string; t: string; n: number; w: string; sold: number }[] {
  const rows = plans.filter((p) => p.activeNow > 0);
  const max = Math.max(1, ...rows.map((p) => p.activeNow));
  return rows.map((p) => ({ key: p.planId, t: p.name, n: p.activeNow, w: `${Math.round((p.activeNow / max) * 100)}%`, sold: p.sold }));
}

// ---- the Growth chart (AN4-005 rows 18-33, AnMembersV6 l.339-376) --------------------------

export type SeriesKey = "active" | "joined" | "ended" | "prev";

const dm = (iso: string) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))).toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric" });
const sgn = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `${MINUS}${Math.abs(n)}` : "0");

/** The series a legend tap may still hide (AN4-021 row 5): never the last of Active / Joined / Ended ("Previous period" does not count). */
export function canHide(hide: Set<SeriesKey>, k: SeriesKey): boolean {
  if (hide.has(k) || k === "prev") return true;
  return (["active", "joined", "ended"] as SeriesKey[]).filter((x) => x !== k && !hide.has(x)).length > 0;
}

/**
 * AN4-005 row 34 "Joins and ends by week": one column per week of the range
 * (the chart's weeks from the range's first Monday to its end), joined bars
 * j / mx * 30 and ended e / mx * 30 px.
 */
export function joinsByWeek(cur: GrowthWeek[], from: string, to: string): { key: string; t: string; j: string; e: string; jh: number; eh: number; aria: string }[] {
  const startMonday = mondayIso(from);
  const weeks = cur.filter((w) => w.weekStart >= startMonday && w.weekStart <= to);
  const mx = Math.max(1, ...weeks.flatMap((w) => [w.joined, w.ended]));
  return weeks.map((w) => ({
    key: w.weekStart,
    t: dm(w.weekStart),
    j: w.joined ? `+${w.joined}` : "",
    e: w.ended ? `${MINUS}${w.ended}` : "",
    jh: (w.joined / mx) * 30,
    eh: (w.ended / mx) * 30,
    aria: t("Week of {date}: {joined} joined, {ended} ended", { date: dm(w.weekStart), joined: w.joined, ended: w.ended }),
  }));
}

const mondayIso = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

export function growthChart(cur: GrowthWeek[], prev: GrowthWeek[] | null, hide: Set<SeriesKey>, mi: number | null, endsThisWeek: boolean, early = false) {
  const n = Math.max(1, cur.length);
  const last = n - 1;
  const vis = (k: SeriesKey) => !hide.has(k);
  const ACT = cur.map((w) => w.active);
  const JN = cur.map((w) => w.joined);
  const EN = cur.map((w) => w.ended);
  // No previous line before anyone was a member then, nor while early (AN4-024 row 5).
  const GH = !early && prev && prev.length === cur.length && prev.some((w) => w.active > 0 || w.joined > 0) ? prev.map((w) => w.active) : null;
  // AN4-024 O2: the weeks before the first member ("No members yet").
  const first = cur.findIndex((w) => w.active > 0 || w.joined > 0 || w.ended > 0);
  const none = (i: number) => first < 0 || i < first;
  // AN4-024 row 5: early y range lo 0, hi max(active, 4).
  const lo = early ? 0 : Math.min(...ACT, ...(GH ?? ACT));
  const hi = Math.max(...ACT, ...(GH ?? ACT), lo + 4);
  const step = 286 / n;
  const xC = (i: number) => 28 + (i + 0.5) * step;
  const yL = (v: number) => 78 - ((v - lo) / (hi - lo)) * 64;
  const pth = (a: number[]) => a.map((v, i) => (i ? "L" : "M") + xC(i).toFixed(1) + "," + yL(v).toFixed(1)).join(" ");
  const bmax = Math.max(...JN, ...EN, 1);
  const bh = (v: number) => (v / bmax) * 24;
  const net = (i: number) => JN[i] - EN[i];
  return {
    step,
    cap: GH
      ? t("Active members each week (line) with joins above and ends below the baseline. Dashed: the same weeks last period.")
      : t("Weekly, since your first members joined. Active members as a line, joins and ends as bars."),
    ticks: [lo, Math.round((lo + hi) / 2), hi].map((v) => ({ y: yL(v), ty: yL(v) + 3, t: String(v) })),
    line: pth(ACT),
    area: `${pth(ACT)} L${xC(last).toFixed(1)},78 L${xC(0).toFixed(1)},78 Z`,
    ghost: GH ? pth(GH) : "",
    aOp: vis("active") ? 1 : 0,
    gOp: GH && vis("prev") ? 1 : 0,
    jOp: vis("joined") ? 1 : 0.35,
    eOp: vis("ended") ? 1 : 0.35,
    /** Whole-series opacity (AN4-021 row 3: a hidden series fades out over 200 ms). */
    jG: vis("joined") ? 1 : 0,
    eG: vis("ended") ? 1 : 0,
    dots: ACT.map((v, i) => ({ x: xC(i), y: yL(v), r: i === last ? 3.6 : 2.4, last: i === last })),
    bars: ACT.map((_, i) => ({
      cx: xC(i),
      jx: xC(i) - 9,
      ex: xC(i) + 1,
      jy: 128 - bh(JN[i]),
      jh: bh(JN[i]),
      eh: bh(EN[i]),
      // The scrub dimming; hiding is the series group's opacity (jG / eG).
      jo: mi !== null && mi !== i ? 0.4 : 0.9,
      eo: mi !== null && mi !== i ? 0.35 : 0.8,
      net: sgn(net(i)),
      n: net(i),
      no: vis("joined") || vis("ended") ? 1 : 0,
    })),
    xl: [
      { x: 28, a: "start" as const, t: cur[0] ? dm(cur[0].weekStart) : "" },
      { x: 171, a: "middle" as const, t: cur[Math.floor(n / 2)] ? dm(cur[Math.floor(n / 2)].weekStart) : "" },
      { x: 314, a: "end" as const, t: endsThisWeek ? t("This wk") : cur[last] ? dm(cur[last].weekStart) : "" },
    ],
    mk: mi === null ? null : { x: xC(mi), y: yL(ACT[mi]) },
    tip:
      mi === null || !cur[mi]
        ? null
        : {
            wk: t("Week of {date}", { date: dm(cur[mi].weekStart) }),
            x: `${((xC(mi) / 318) * 100).toFixed(1)}%`,
            none: none(mi),
            rows: (
              [
                { k: "active", l: tx("Active", "members chart"), v: String(ACT[mi]), n: 0 },
                { k: "joined", l: t("Joined"), v: String(JN[mi]), n: 0 },
                { k: "ended", l: t("Ended"), v: String(EN[mi]), n: 0 },
                { k: "net", l: t("Net change"), v: sgn(net(mi)), n: net(mi) },
              ] as { k: SeriesKey | "net"; l: string; v: string; n: number }[]
            ).filter((r) => r.k === "net" || vis(r.k)),
          },
    legend: (
      [
        { k: "active", t: tx("Active", "members chart"), w: 14, h: 3, r: "999px" },
        { k: "joined", t: t("Joined"), w: 8, h: 8, r: "2px" },
        { k: "ended", t: t("Ended"), w: 8, h: 8, r: "2px" },
        { k: "prev", t: t("Previous period"), w: 14, h: 0, r: "0" },
      ] as { k: SeriesKey; t: string; w: number; h: number; r: string }[]
    )
      .filter((x) => x.k !== "prev" || GH)
      .map((x) => ({ ...x, on: vis(x.k), locked: !canHide(hide, x.k) })),
    /** AN4-017 O2: the slider's aria-valuetext for the read week (the last while nothing is read). */
    valueText: (() => {
      const i = mi ?? last;
      const w = cur[i];
      if (!w) return "";
      if (none(i)) return t("Week of {date}: No members yet", { date: dm(w.weekStart) });
      return t("Week of {date}: Active {active}, Joined {joined}, Ended {ended}, Net change {net}", { date: dm(w.weekStart), active: ACT[i], joined: JN[i], ended: EN[i], net: sgn(JN[i] - EN[i]) });
    })(),
    srRows: cur.map((w) => t("Week of {date}: active {active}, joined {joined}, ended {ended}", { date: dm(w.weekStart), active: w.active, joined: w.joined, ended: w.ended })),
  };
}
