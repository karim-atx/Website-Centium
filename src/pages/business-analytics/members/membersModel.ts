import type { BizKind } from "../../../components/business-more/kind";
import type { First90, GrowthWeek, PeopleSummary, PeriodStats, PlanFigure } from "../../../services/business-analytics/model";

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

export function pagesOf(kind: BizKind): MembersPageDef[] {
  if (kind === "store") return [];
  if (kind === "classes")
    return [
      { key: "growth", title: "Growth", boxes: ["Active clients", "New clients"], coming: "Coming soon: how many clients booked in this range, and how many were new." },
      { key: "first90", title: "First 90 days", boxes: ["New in the last 90 days", "Booked again in 2 weeks"], coming: "Coming soon: how many new clients book again in their first weeks." },
      { key: "engagement", title: "Engagement", boxes: ["Bookings a week", "Booked this period"], coming: "How often clients book, over the last 4 weeks." },
      { key: "atrisk", title: "At risk", boxes: ["Clients at risk", "Average drop vs their usual"], coming: "Clients who have stopped booking." },
      { key: "plans", title: "Plans", boxes: ["Membership plans", "On the most popular plan"], coming: "How clients on a plan split across your plans." },
    ];
  return [
    { key: "growth", title: "Growth", boxes: ["Active members", "Average membership length"], coming: "How many members joined and left in this range." },
    { key: "first90", title: "First 90 days", boxes: ["Joined in the last 90 days", "Still active"], coming: "How many new members are still with you after 90 days." },
    { key: "visits", title: "Visits", boxes: ["Visits a week", "Visited this period"], coming: "How often members check in at your front desk." },
    { key: "notseen", title: "Not seen in 14 days", boxes: ["Not seen in 14 days", "Longest away"], coming: "Members with a current membership who have not checked in lately." },
    { key: "plans", title: "Plans", boxes: ["Membership plans", "On the most popular plan"], coming: "How members split across your plans." },
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
}

export const NO_FIGURES: MembersFigures = { summary: null, first90: null, plans: null, stats: null, growth: null };

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
  if (key === "week") return "this week";
  if (key === "custom") return `from ${words}`;
  return `in ${words}`;
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
const MINUS = "−";

/** AN4-005 row 16a: "+{n} vs prev" good, "−{n} vs prev" high, 0 "No change" faint; none while early or with compare off. */
function netDelta(stats: PeriodStats | null, compare: boolean): Delta | undefined {
  const n = stats?.members_net;
  if (!compare || !n || n.early || n.value === null) return undefined;
  if (n.value > 0) return { t: `+${n.value} vs prev`, tone: "good" };
  if (n.value < 0) return { t: `${MINUS}${Math.abs(n.value)} vs prev`, tone: "high" };
  return { t: "No change", tone: "faint" };
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

  switch (page.key) {
    case "growth": {
      if (classes || !f.growth || !f.stats?.members_net) return coming;
      const active = f.growth.cur.at(-1)?.active ?? 0;
      const j = f.stats.members_joined?.value ?? 0;
      const e = f.stats.members_ended?.value ?? 0;
      const net = f.stats.members_net.value ?? j - e;
      const how = net > 0 ? `you grew by ${net}` : net < 0 ? `you shrank by ${Math.abs(net)}` : "your count held steady";
      return {
        boxes: [box(0, active.toLocaleString("en-US"), netDelta(f.stats, ctx.compare)), box(1, null)],
        lead: `${plural(active, `active ${vocab.one}`, `active ${vocab.people}`)}: ${j} joined and ${e} left ${inRange(ctx.rangeKey, ctx.rangeWords)}, so ${how}.`,
      };
    }
    case "first90": {
      if (classes || !f.first90) return coming;
      const { joined, stillActive } = f.first90;
      return {
        boxes: [box(0, joined.toLocaleString("en-US")), box(1, joined > 0 ? `${stillActive} of ${joined}` : null)],
        lead:
          joined > 0
            ? `${stillActive} of the ${plural(joined, vocab.one, vocab.people)} who joined in the last 90 days ${stillActive === 1 ? "is" : "are"} still with you.`
            : `No new ${vocab.people} joined in the last 90 days.`,
      };
    }
    case "visits": {
      const v = s?.visits_per_week_4w;
      if (v === undefined) return coming;
      return { boxes: [box(0, v.toFixed(1)), box(1, null)], lead: `${v.toFixed(1)} check-ins a week on average over the last 4 weeks.` };
    }
    case "notseen": {
      const n = s?.members_not_seen_14d;
      if (n === undefined) return coming;
      const all = s?.members ?? 0;
      return {
        boxes: [box(0, n.toLocaleString("en-US")), box(1, null)],
        lead: all === 0 ? `No one has a current membership right now.` : `${n} of your ${plural(all, `${vocab.one} with a current membership`, `${vocab.people} with a current membership`)} ${n === 1 ? "has" : "have"} not checked in for 14 days.`,
      };
    }
    case "engagement": {
      const v = s?.bookings_per_week_4w;
      if (v === undefined) return coming;
      return { boxes: [box(0, v.toFixed(1)), box(1, null)], lead: `Your ${vocab.people} made ${v.toFixed(1)} bookings a week over the last 4 weeks.` };
    }
    case "atrisk": {
      const n = s?.class_clients_at_risk_21d;
      if (n === undefined) return coming;
      return {
        boxes: [box(0, n.toLocaleString("en-US")), box(1, null)],
        lead:
          n > 0
            ? `${plural(n, `${vocab.one} has`, `${vocab.people} have`)} booked in the last 4 months but not in the last 21 days.`
            : `No one has stopped booking. ${vocab.people[0].toUpperCase()}${vocab.people.slice(1)} appear here after 21 days without a booking.`,
      };
    }
    case "plans": {
      const count = box(0, ctx.planCount.toLocaleString("en-US"));
      if (!f.plans) return { boxes: [count, box(1, null)], lead: page.coming };
      const total = f.plans.reduce((a, p) => a + p.activeNow, 0);
      const top = f.plans[0];
      if (!top || total === 0) return { boxes: [count, box(1, null)], lead: `No ${vocab.people} are on a plan yet.` };
      return {
        boxes: [count, box(1, top.activeNow.toLocaleString("en-US"), undefined, `On ${top.name}, the most popular`)],
        lead: `${top.name} holds ${Math.round((top.activeNow / total) * 100)}% of ${vocab.people} on a plan.`,
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

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dm = (iso: string) => `${Number(iso.slice(8, 10))} ${MON[Number(iso.slice(5, 7)) - 1]}`;
const sgn = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `${MINUS}${Math.abs(n)}` : "0");

export function growthChart(cur: GrowthWeek[], prev: GrowthWeek[] | null, hide: Set<SeriesKey>, mi: number | null, endsThisWeek: boolean) {
  const n = Math.max(1, cur.length);
  const last = n - 1;
  const vis = (k: SeriesKey) => !hide.has(k);
  const ACT = cur.map((w) => w.active);
  const JN = cur.map((w) => w.joined);
  const EN = cur.map((w) => w.ended);
  // No previous line before anyone was a member then (the source's early state).
  const GH = prev && prev.length === cur.length && prev.some((w) => w.active > 0 || w.joined > 0) ? prev.map((w) => w.active) : null;
  const lo = Math.min(...ACT, ...(GH ?? ACT));
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
      ? "Active members each week (line) with joins above and ends below the baseline. Dashed: the same weeks last period."
      : "Weekly, since your first members joined. Active members as a line, joins and ends as bars.",
    ticks: [lo, Math.round((lo + hi) / 2), hi].map((v) => ({ y: yL(v), ty: yL(v) + 3, t: String(v) })),
    line: pth(ACT),
    area: `${pth(ACT)} L${xC(last).toFixed(1)},78 L${xC(0).toFixed(1)},78 Z`,
    ghost: GH ? pth(GH) : "",
    aOp: vis("active") ? 1 : 0,
    gOp: GH && vis("prev") ? 1 : 0,
    jOp: vis("joined") ? 1 : 0.35,
    eOp: vis("ended") ? 1 : 0.35,
    dots: ACT.map((v, i) => ({ x: xC(i), y: yL(v), r: i === last ? 3.6 : 2.4, last: i === last })),
    bars: ACT.map((_, i) => ({
      cx: xC(i),
      jx: xC(i) - 9,
      ex: xC(i) + 1,
      jy: 128 - bh(JN[i]),
      jh: bh(JN[i]),
      eh: bh(EN[i]),
      jo: vis("joined") ? (mi !== null && mi !== i ? 0.4 : 0.9) : 0,
      eo: vis("ended") ? (mi !== null && mi !== i ? 0.35 : 0.8) : 0,
      net: sgn(net(i)),
      n: net(i),
      no: vis("joined") || vis("ended") ? 1 : 0,
    })),
    xl: [
      { x: 28, a: "start" as const, t: cur[0] ? dm(cur[0].weekStart) : "" },
      { x: 171, a: "middle" as const, t: cur[Math.floor(n / 2)] ? dm(cur[Math.floor(n / 2)].weekStart) : "" },
      { x: 314, a: "end" as const, t: endsThisWeek ? "This wk" : cur[last] ? dm(cur[last].weekStart) : "" },
    ],
    mk: mi === null ? null : { x: xC(mi), y: yL(ACT[mi]) },
    tip:
      mi === null || !cur[mi]
        ? null
        : {
            wk: `Week of ${dm(cur[mi].weekStart)}`,
            x: `${((xC(mi) / 318) * 100).toFixed(1)}%`,
            rows: (
              [
                { k: "active", l: "Active", v: String(ACT[mi]), n: 0 },
                { k: "joined", l: "Joined", v: String(JN[mi]), n: 0 },
                { k: "ended", l: "Ended", v: String(EN[mi]), n: 0 },
                { k: "net", l: "Net change", v: sgn(net(mi)), n: net(mi) },
              ] as { k: SeriesKey | "net"; l: string; v: string; n: number }[]
            ).filter((r) => r.k === "net" || vis(r.k)),
          },
    legend: (
      [
        { k: "active", t: "Active", w: 14, h: 3, r: "999px" },
        { k: "joined", t: "Joined", w: 8, h: 8, r: "2px" },
        { k: "ended", t: "Ended", w: 8, h: 8, r: "2px" },
        { k: "prev", t: "Previous period", w: 14, h: 0, r: "0" },
      ] as { k: SeriesKey; t: string; w: number; h: number; r: string }[]
    )
      .filter((x) => x.k !== "prev" || GH)
      .map((x) => ({ ...x, on: vis(x.k) })),
    srRows: cur.map((w) => `Week of ${dm(w.weekStart)}: active ${w.active}, joined ${w.joined}, ended ${w.ended}`),
  };
}
