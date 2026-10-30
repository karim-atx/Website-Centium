import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { MailPlus, Plus, Users } from "lucide-react";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { useIsDark } from "../../../hooks/useIsDark";
import { fetchBusyTimes } from "../../../services/front-desk";
import { AnCard, AnEarlyHint, AnEmptyCard, AnHeaderRow, AnHint, AnLead, AnNumberBoxes, AnSection, AnSectionRows, type AnSectionRow } from "./anKit";
import { EARLY_LINE, inRange, joinsByWeek, planBars, type Delta, type MembersFigures, type MembersPageDef, type MembersVocab, type PageView } from "./membersModel";
import type { MembersData } from "./useMembersData";
import { useAnalytics } from "../analyticsContext";
import { isoOf, rangeWords } from "../analyticsRange";
import { RenewalsCard } from "./RenewalsCard";
import { GrowthChart } from "./GrowthChart";

// A Members section page (AN4-005 rows 10-17: back 44, crumb, the picker
// title (AN4-046 / -047: one navigation pattern, the picker), "{i} of {n}",
// the section card with its two number boxes and lead). The boxes and lead
// come from the B15 readers (membersModel pageView); a value no reader gives
// reads "–" (tert). Growth draws the weekly chart from business_member_growth
// (GrowthChart, AN4-005 rows 18-33) and the "Joins and ends by week"
// collapsible (row 34), or the empty chart frame (AN4-023 row 11) while it
// has no weeks; Plans draws the per-plan bars from business_plan_figures
// (AnMembersV6 l.180-188; one "No plan" row with no plans, AN4-013 O3) and the
// "Invite to active" collapsible (row 19, business_invites_funnel) with the
// member codes redeemed row (19a); the gym Visits page draws "Entries by day"
// (OURS-AN4-gym-variant row 13, venue_busy_times). Early data (AN4-024 /
// AN4-044) puts the hint box 12 above the card. Each page ends with its foot
// line (AnMembersV6 `foot`). With no member ever (B7 list_business_members
// total_count, `empty`), a section shows the AN4-023 empty card instead
// (Growth with its ghost chart), the same card as the index (AN4-043).

const BASE = "/app/business/analytics/members";

/** AN4-005 row 16a / AN4-001 row 15 delta inks: good, high, faint. */
export function DeltaText({ d }: { d: Delta }) {
  return <span className={d.tone === "good" ? "text-status-good" : d.tone === "high" ? "text-status-high" : "text-charcoal-faint"}>{d.t}</span>;
}

/**
 * The empty card (AN4-043; AN4-023 with the ghost chart on Growth). Classes:
 * OURS-AN4-classes-variant rows 15-16, "Create class" (plus 15) opens the Add
 * class sheet.
 */
export function MembersEmptyCard({ vocab, ghost, children }: { vocab: MembersVocab; ghost?: boolean; children?: ReactNode }) {
  const navigate = useNavigate();
  const classes = vocab.label === "Clients";
  return (
    <AnEmptyCard
      icon={Users}
      ghost={ghost}
      title={classes ? "No clients yet" : `No ${vocab.people} yet`}
      body={classes ? "Clients appear here after their first booking. Add a class to get started." : "Invite members with a code. Growth, first-90-day health, engagement and plans appear once people join."}
      button={
        classes
          ? { label: "Create class", icon: Plus, onClick: () => navigate("/app/business/classes?create=1") }
          : { label: "Invite members", icon: MailPlus, onClick: () => navigate(`${BASE}/codes?create=1`) }
      }
    >
      {children}
    </AnEmptyCard>
  );
}

// AnMembersV6 l.240-241: plan bar colours cycle primary, teal, caution.
const PLAN_L = ["#AEA1DC", "#14A08F", "#D9A441"];
const PLAN_D = ["#A991FE", "#4FD1C0", "#E0B360"];
// The source palette's good / high / axis / teal / primary / tert / pDark (L, D).
const GOOD: [string, string] = ["#3F9165", "#7FC79C"];
const HIGH: [string, string] = ["#C0392B", "#F09A8E"];
const AXIS: [string, string] = ["#A79E93", "#B8B3C7"];
const TEAL: [string, string] = ["#14A08F", "#4FD1C0"];
const PRIMARY: [string, string] = ["#AEA1DC", "#A991FE"];
const TERT: [string, string] = ["#A79E93", "#9F9CAC"];
const PDARK: [string, string] = ["#7D6BB5", "#C3B3FB"];

/** The foot line under each page (AnMembersV6 `foot`; AN4-025 D3: "Names follow member privacy settings." is dropped). */
function footOf(page: MembersPageDef, vocab: MembersVocab): string | null {
  const classes = vocab.label === "Clients";
  switch (page.key) {
    case "growth":
      return classes ? null : "Members with a current membership.";
    case "first90":
      return classes ? null : "Based on joins, ends and bookings in this period.";
    case "engagement":
      return "Based on booked spots in this period.";
    case "atrisk":
      return `Based on each ${vocab.one}'s bookings.`;
    case "plans":
      return "Based on current memberships and plans.";
    default:
      return null;
  }
}

export function MembersPage({
  page,
  pages,
  vocab,
  view,
  figures,
  data,
  empty = false,
  early = false,
}: {
  page: MembersPageDef;
  pages: MembersPageDef[];
  vocab: MembersVocab;
  view: PageView;
  figures: MembersFigures;
  data: MembersData;
  /** No member ever (AN4-023 O2): the section empty card. */
  empty?: boolean;
  /** The server's early flag for this lane (AN4-024 / AN4-044, B8_B16_REVIEW #19). */
  early?: boolean;
}) {
  const navigate = useNavigate();
  const dark = useIsDark();
  const k = dark ? 1 : 0;
  const { range } = useAnalytics();
  const [picker, setPicker] = useState<HTMLElement | null>(null);
  const i = pages.findIndex((p) => p.key === page.key);
  const gym = vocab.label === "Members";
  const growth = page.key === "growth" && gym ? figures.growth : null;
  const bars = page.key === "plans" && figures.plans ? planBars(figures.plans) : [];
  const activeNow = figures.growth?.cur.at(-1)?.active ?? null;
  const noPlans = page.key === "plans" && !data.plansLoading && data.plans.length === 0 && figures.plans !== null && activeNow !== null;
  const foot = footOf(page, vocab);

  return (
    <div>
      <AnHeaderRow
        crumb={vocab.label}
        backLabel={`Back to ${vocab.label}`}
        onBack={() => navigate(BASE)}
        title={page.title}
        position={`${i + 1} of ${pages.length}`}
        picker={{ open: !!picker, onToggle: (el) => setPicker((p) => (p ? null : el)) }}
      />
      <PopupMenu
        open={!!picker}
        onClose={() => setPicker(null)}
        anchor={picker}
        variant="field"
        width={224}
        align="left"
        heading={`${vocab.label} sections`}
        options={pages.map((p) => ({ value: p.key, label: p.title }))}
        selected={page.key}
        onSelect={(key) => {
          setPicker(null);
          navigate(`${BASE}/${key}`);
        }}
      />

      {empty ? (
        <MembersEmptyCard vocab={vocab} ghost={page.key === "growth"} />
      ) : (
        <>
          {early && <AnEarlyHint>{EARLY_LINE}</AnEarlyHint>}
          <AnCard label={page.title}>
            <AnNumberBoxes
              boxes={[
                { label: view.boxes[0].label, value: view.boxes[0].value, delta: view.boxes[0].delta ? <DeltaText d={view.boxes[0].delta} /> : undefined },
                { label: view.boxes[1].label, value: view.boxes[1].value, delta: view.boxes[1].delta ? <DeltaText d={view.boxes[1].delta} /> : undefined },
              ]}
            />
            <AnLead>{view.lead}</AnLead>
            {growth && growth.cur.length > 0 ? (
              <>
                <GrowthChart cur={growth.cur} prev={growth.prev} endsThisWeek /* business_member_growth always ends with this week */ early={early} resetKey={`${range.from}|${range.to}`} />
                <JoinsAndEnds figures={figures} early={early} />
              </>
            ) : (
              page.key === "growth" && (
                <div className="border-t border-charcoal/[0.06]" style={{ padding: "12px 16px 12px" }} aria-hidden>
                  <svg width="100%" height="96" viewBox="0 0 300 96" preserveAspectRatio="none" className="overflow-visible">
                    <line x1="0" x2="300" y1="14" y2="14" className="stroke-charcoal/[0.07]" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    <line x1="0" x2="300" y1="44" y2="44" className="stroke-charcoal/[0.07]" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    <line x1="0" x2="300" y1="74" y2="74" className="stroke-charcoal-tertiary" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>
              )
            )}
            {(bars.length > 0 || noPlans) && (
              <div data-plan-bars className="border-t border-charcoal/[0.06]" style={{ padding: "12px 16px 10px" }}>
                {bars.map((b, j) => (
                  <PlanBar key={b.key} t={b.t} n={b.n} w={b.w} color={(dark ? PLAN_D : PLAN_L)[j % 3]} track={dark ? "#262932" : "#F5F5F6"} aria={`${b.t}: ${b.n} ${b.n === 1 ? vocab.one : vocab.people}`} />
                ))}
                {/* AN4-013 O3: no plans → one "No plan" row with every active member. */}
                {noPlans && activeNow !== null && (
                  <>
                    <PlanBar t="No plan" n={activeNow} w={activeNow > 0 ? "100%" : "0%"} color={TERT[k]} track={dark ? "#262932" : "#F5F5F6"} aria={`No plan: ${activeNow} ${activeNow === 1 ? vocab.one : vocab.people}`} />
                    <p data-no-plan-line className="text-[11px] leading-[15px] text-charcoal-faint" style={{ marginTop: 4 }}>
                      Add a membership plan to see how members split.
                    </p>
                  </>
                )}
              </div>
            )}
            {page.key === "plans" && <InviteToActive figures={figures} data={data} dark={dark} />}
            {page.key === "visits" && gym && <EntriesByDay data={data} dark={dark} />}
          </AnCard>
        </>
      )}
      {/* OURS-AN4-gym-variant row 17 (B7 MB-05): the gym Plans page's Renewals block. */}
      {page.key === "plans" && gym && !empty && <RenewalsCard from={range.from} to={range.to} />}
      {!empty && foot && <AnHint>{foot}</AnHint>}
    </div>
  );
}

/** AnMembersV6 l.180-188: one plan row (grid 96 / 1fr / 30, h30, bar h8 r999). */
function PlanBar({ t, n, w, color, track, aria }: { t: string; n: number; w: string; color: string; track: string; aria: string }) {
  return (
    <div className="grid items-center" style={{ gridTemplateColumns: "96px minmax(0,1fr) 30px", gap: 10, height: 30 }} aria-label={aria}>
      <span className="text-charcoal" style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden" }}>
        {t}
      </span>
      <div style={{ height: 8, borderRadius: 999, background: track, overflow: "hidden" }}>
        <div style={{ height: "100%", width: w, borderRadius: 999, background: color }} />
      </div>
      <span className="text-charcoal" style={{ fontSize: 12, fontWeight: 800, textAlign: "end", fontVariantNumeric: "tabular-nums" }}>
        {n}
      </span>
    </div>
  );
}

/**
 * AN4-005 row 34 / S7 "Joins and ends by week" (AnMembersV6 l.249-251): one
 * column per week of the range, height 90, bars max-w 30, joined r6 6 2 2
 * #3F9165 · #7FC79C opacity 0.85 and ended r2 2 6 6 #C0392B · #F09A8E opacity
 * 0.75 (each up to 30 px), values 9.5/800, week labels 9.5 #A79E93 · #B8B3C7.
 */
function JoinsAndEnds({ figures, early }: { figures: MembersFigures; early: boolean }) {
  const { range } = useAnalytics();
  const dark = useIsDark();
  const k = dark ? 1 : 0;
  const cols = useMemo(() => joinsByWeek(figures.growth?.cur ?? [], range.from, range.to), [figures.growth, range.from, range.to]);
  if (cols.length === 0) return null;
  const j = figures.stats?.members_joined?.value ?? null;
  const e = figures.stats?.members_ended?.value ?? null;
  // The source's lines: early "9 joined, none left so far."; otherwise the range's joins and ends (NEW STRING).
  const line =
    j === null || e === null
      ? "New memberships and ended memberships in each week."
      : early && e === 0
        ? `${j} joined, none left so far.`
        : `${j} joined and ${e} left ${inRange(range.key, rangeWords(range, isoOf(new Date())))}.`;
  // UNSPECIFIED: more than 6 weeks would overlap the 9.5 labels; every n-th week is labelled.
  const every = Math.ceil(cols.length / 6);
  const grid = { display: "grid", gridTemplateColumns: `repeat(${cols.length},minmax(0,1fr))`, gap: 8 } as const;
  return (
    <AnSection title="Joins and ends by week" line={line} intro="New memberships accepted (green) and memberships ended (red) in each week of the period.">
      <div data-joins-bars style={{ ...grid, alignItems: "end", height: 90 }}>
        {cols.map((b) => (
          <div key={b.key} role="img" aria-label={b.aria} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", height: "100%", gap: 2 }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: GOOD[k], lineHeight: "normal" }}>{b.j}</span>
            <div data-joined style={{ width: "100%", maxWidth: 30, height: `${b.jh}px`, borderRadius: "6px 6px 2px 2px", background: GOOD[k], opacity: 0.85 }} />
            <div data-ended style={{ width: "100%", maxWidth: 30, height: `${b.eh}px`, borderRadius: "2px 2px 6px 6px", background: HIGH[k], opacity: 0.75 }} />
            <span style={{ fontSize: 9.5, fontWeight: 800, color: HIGH[k], lineHeight: "normal" }}>{b.e}</span>
          </div>
        ))}
      </div>
      <div aria-hidden style={{ ...grid, marginTop: 4 }}>
        {cols.map((b, i) => (
          <span key={b.key} style={{ fontSize: 9.5, textAlign: "center", color: AXIS[k], whiteSpace: "nowrap" }}>
            {i % every === 0 ? b.t : ""}
          </span>
        ))}
      </div>
    </AnSection>
  );
}

/**
 * AN4-013 row 19 / S1 "Invite to active" (AnMembersV6 l.299-301) from
 * business_invites_funnel (member codes created since the range began):
 * Active = codes whose redeemer is an accepted member, Pending = codes neither
 * used nor expired, Declined "–" (a code cannot be turned down, and direct
 * invitations have no reader), Ended = memberships ended in the range
 * (business_period_stats members_ended). Row 19a: member codes redeemed, the
 * fifth row (hidden at 0 codes).
 */
function InviteToActive({ figures, data, dark }: { figures: MembersFigures; data: MembersData; dark: boolean }) {
  const f = figures.funnel;
  const codes = data.codes ?? [];
  if (!f) return null;
  const act = f.becameMembers;
  const pending = Math.max(0, f.issued - f.redeemed - f.expiredUnused);
  const ended = figures.stats?.members_ended?.value ?? null;
  const pct = f.issued > 0 ? Math.round((act / f.issued) * 100) : null;
  const redeemed = codes.filter((c) => c.redeemed).length;
  const rows: AnSectionRow[] = [
    { key: "active", n: String(act), col: TEAL, t: "Active", s: pct === null ? undefined : `${pct}% of invites accepted.`, share: act },
    { key: "pending", n: String(pending), col: PRIMARY, t: "Pending", s: "Invited but not answered yet.", share: pending },
    { key: "declined", n: null, col: HIGH, t: "Declined", s: "Turned the invitation down." },
    { key: "ended", n: ended === null ? null : String(ended), col: TERT, t: "Ended", s: "Memberships that ended this period.", share: ended },
  ];
  if (codes.length > 0) rows.push({ key: "codes", n: `${redeemed}/${codes.length}`, col: PDARK, t: "Member codes redeemed", s: "Codes handed out at the desk and used to join." });
  return (
    <AnSection
      title="Invite to active"
      line={pct === null ? "No invites were sent this period." : `${pct}% of this period's invites became active members.`}
      intro="Invites sent this period and where each one is now. Ended counts memberships that ended in the period."
    >
      <div data-invite-rows>
        <AnSectionRows rows={rows} stack dark={dark} />
      </div>
    </AnSection>
  );
}

const DAY = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const fmtEntries = (v: number) => (v >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));

/**
 * OURS-AN4-gym-variant row 13 "Entries by day": venue_busy_times(gym, weeks)
 * (average entries per weekday-hour over the weeks asked) summed per weekday
 * across the business's gyms: 7 columns Monday first, bars max-w 30 r6 6 2 2
 * #AEA1DC · #A991FE, values 9.5/800, labels M T W T F S S 9.5 #A79E93.
 */
function EntriesByDay({ data, dark }: { data: MembersData; dark: boolean }) {
  const { range } = useAnalytics();
  const k = dark ? 1 : 0;
  const gyms = useMemo(() => data.venues.filter((v) => v.kind === "gym" && v.businessId === data.businessId).map((v) => v.gymId), [data.venues, data.businessId]);
  // The range in weeks (the reader takes 1 to 13).
  const weeks = Math.min(13, Math.max(1, Math.round((Date.parse(range.to) - Date.parse(range.from)) / (7 * 86_400_000))));
  const key = `${gyms.join(",")}|${weeks}`;
  const [state, setState] = useState<{ key: string; days: number[] | null } | null>(null);
  useEffect(() => {
    if (gyms.length === 0) return;
    let cancelled = false;
    void Promise.all(gyms.map((g) => fetchBusyTimes(g, weeks))).then((rs) => {
      if (cancelled) return;
      if (rs.some((r) => !r.ok)) return setState({ key, days: null });
      const days = Array<number>(7).fill(0);
      for (const r of rs) if (r.ok) r.value.forEach((row, d) => (days[d] += row.reduce((a, v) => a + v, 0)));
      setState({ key, days });
    });
    return () => {
      cancelled = true;
    };
  }, [gyms, weeks, key]);
  const days = state?.key === key ? state.days : null;
  if (gyms.length === 0 || !days) return null;
  const max = Math.max(...days);
  const top = days.indexOf(max);
  // NEW STRINGS (the line under the title; not drawn).
  const line = max <= 0 ? (weeks === 1 ? "No entries in the last week." : `No entries in the last ${weeks} weeks.`) : `${DAY[top]}s are busiest, with about ${fmtEntries(max)} entries.`;
  const grid = { display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 8 } as const;
  return (
    <AnSection title="Entries by day" line={line} intro="Which days are busiest?">
      <div data-entries-bars role="img" aria-label={`Average entries by day: ${days.map((v, d) => `${DAY[d]} ${fmtEntries(v)}`).join(", ")}`} style={{ ...grid, alignItems: "end", height: 90 }}>
        {days.map((v, d) => (
          <div key={DAY[d]} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", height: "100%", gap: 2 }}>
            <span className="text-charcoal" style={{ fontSize: 9.5, fontWeight: 800, lineHeight: "normal" }}>
              {v > 0 ? fmtEntries(v) : ""}
            </span>
            {/* UNSPECIFIED: bar height v / max × 60 px (the joins body's two 30 px halves). */}
            <div data-entry-bar style={{ width: "100%", maxWidth: 30, height: `${max > 0 ? (v / max) * 60 : 0}px`, borderRadius: "6px 6px 2px 2px", background: PRIMARY[k] }} />
          </div>
        ))}
      </div>
      <div aria-hidden style={{ ...grid, marginTop: 4 }}>
        {["M", "T", "W", "T", "F", "S", "S"].map((l, d) => (
          <span key={d} style={{ fontSize: 9.5, textAlign: "center", color: AXIS[k] }}>
            {l}
          </span>
        ))}
      </div>
    </AnSection>
  );
}
