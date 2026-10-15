import React, { useMemo, useState } from "react";
import { CalendarX2, ChevronRight, Clock3, Gauge, IdCard, Plus, Repeat, Star, UserPlus, UserRoundPlus, Wallet, type LucideIcon } from "lucide-react";
import { heroRangeLabel, type AnalyticsRange } from "../shell/range";
import { Avatar, Sk, Strip } from "./parts";
import { SeatDonut, type DonutSeat } from "./SeatDonut";
import { roleLabel, type Vocab } from "./vocab";
import type { TeamState } from "./useTeam";
import type { RatingsState } from "./useRatings";
import type { TeamPerson } from "./teamData";
import { errText, seatList, sentAgo } from "./helpers";

// AN5-001 (index, tinted bento tiles), AN5-003 (early data), AN5-005 (no
// instructors yet), AN5-011 (free seat), AN5-060 hero message, OURS join
// requests row, OURS loading / error / offline.

export type TileKey = "performance" | "repeat" | "load" | "coverage" | "ratings" | "pay";

const TILE_META: Record<TileKey, { title: string; icon: LucideIcon; acc: string }> = {
  performance: { title: "Instructor performance", icon: Gauge, acc: "var(--an-primary)" },
  repeat: { title: "Return rate", icon: Repeat, acc: "var(--an-teal)" },
  load: { title: "Teaching load", icon: Clock3, acc: "var(--an-primary)" },
  coverage: { title: "Schedule coverage", icon: CalendarX2, acc: "var(--an-high)" },
  ratings: { title: "Ratings", icon: Star, acc: "var(--an-gold)" },
  pay: { title: "Pay", icon: Wallet, acc: "var(--an-pdark)" },
};

/** AN5-060 O1: the hero line under the blocks while seats are on their way. */
const requestedLine = (n: number, live: boolean) =>
  live ? `${n === 1 ? "1 seat block" : `${n} seat blocks`} awaiting payment` : n === 1 ? "1 seat block requested" : `${n} seat blocks requested`;

const inRangePhrase = (r: AnalyticsRange) =>
  r.key === "week" ? "this week" : r.key === "4w" ? "in 4 weeks" : r.key === "12w" ? "in 12 weeks" : "in this range";

export function TeamIndex({
  state,
  ratings,
  range,
  vocab,
  onTile,
  onInvite,
  onAddSeats,
  onSeat,
  onRequests,
  onPlan,
  requestedBlocks,
  requestedLive = false,
  canAddSeats = true,
}: {
  state: TeamState;
  /** B14 instructor ratings for the Ratings tile (AN5-001 row 24). */
  ratings: RatingsState;
  range: AnalyticsRange;
  vocab: Vocab;
  onTile: (k: TileKey) => void;
  onInvite: (seat: number | null) => void;
  onAddSeats: () => void;
  onSeat: (p: TeamPerson) => void;
  onRequests: () => void;
  onPlan: () => void;
  requestedBlocks: number;
  /** B8 RV-06: requestedBlocks is a real order awaiting payment to Centium (else the email path's count). */
  requestedLive?: boolean;
  /** Add seats shows for the owner (RV-06 buying is the owner's); always on the email path. */
  canAddSeats?: boolean;
}) {
  const [sel, setSel] = useState(0);
  const seats = useMemo(() => seatList(state), [state]);
  const s = state.stats;
  const team = state.team;

  if (!team) {
    if (state.error) return <Strip offline={state.error === "offline"} text={errText(state.error, vocab)} onRetry={state.reload} />;
    return <IndexSkeleton />;
  }

  const seatsInfo = team.seats;
  const hasPeople = team.people.length > 0;
  const blocksLine = !seatsInfo.planActive
    ? "No Business plan yet"
    : seatsInfo.blocks > 0
      ? `${seatsInfo.capacity} seats · ${seatsInfo.blocks === 1 ? "1 seat block" : `${seatsInfo.blocks} seat blocks`} added`
      : `${seatsInfo.capacity} seats with your plan`;

  const strips = (
    <>
      {state.error && <Strip offline={state.error === "offline"} text={errText(state.error, vocab)} onRetry={state.reload} />}
      {state.error === "offline" && state.updatedAt && <p className="an5-updated">Updated {Math.max(1, Math.round((Date.now() - state.updatedAt) / 60000))} min ago</p>}
    </>
  );

  if (!hasPeople) {
    // AN5-005: no instructors yet; seats stay reachable under the card (row 6).
    return (
      <div>
        {strips}
        <div className="an-empty-card">
          <span className="an-empty-tile">
            <IdCard size={20} aria-hidden />
          </span>
          <p className="an-empty-title">{vocab.emptyTitle}</p>
          <p className="an-empty-body">
            {vocab.emptyBody}
            {!seatsInfo.planActive && " Each seat block adds 5 seats."}
          </p>
          {seatsInfo.planActive ? (
            <button type="button" className="tap mt-[6px] flex h-[44px] items-center gap-[6px] rounded-[14px] px-4 text-[13px] font-extrabold" style={{ background: "var(--an-fill)", color: "var(--an-on-fill)" }} onClick={() => onInvite(null)}>
              <UserPlus size={15} aria-hidden />
              Add an employee
            </button>
          ) : (
            <button type="button" className="tap mt-[6px] flex h-[44px] items-center gap-[6px] rounded-[14px] px-4 text-[13px] font-extrabold" style={{ background: "var(--an-fill)", color: "var(--an-on-fill)" }} onClick={onPlan}>
              See the Business plan
            </button>
          )}
        </div>
        {seatsInfo.planActive && (
          <div className="an5-blocks" style={{ marginTop: 12 }}>
            <span className="an5-blocks-t">{blocksLine}</span>
            {canAddSeats && (
              <button type="button" className="an5-addseats tap" onClick={onAddSeats}>
                <Plus size={14} strokeWidth={2.4} aria-hidden />
                Add seats
              </button>
            )}
          </div>
        )}
        {requestedBlocks > 0 && <p className="an5-new-msg is-faint">{requestedLine(requestedBlocks, requestedLive)}</p>}
        {team.requests > 0 && <RequestsRow n={team.requests} onClick={onRequests} standalone />}
      </div>
    );
  }

  const used = seats.filter((x) => x.kind === "used").length;
  const pending = seats.filter((x) => x.kind === "pending").length;
  const free = seats.filter((x) => x.kind === "free").length;
  const total = seats.length;
  const cur = seats[Math.min(sel, seats.length - 1)];
  const curIndex = Math.min(sel, seats.length - 1);

  const donutSeats: DonutSeat[] = seats.map((x, i) => ({
    kind: x.kind,
    aria:
      x.kind === "used"
        ? `Seat ${i + 1}: ${x.person?.name}`
        : x.kind === "pending"
          ? `Seat ${i + 1}: invited, pending`
          : `Seat ${i + 1}: free`,
  }));

  const delta = (now: number, before: number) => {
    if (!range.compare || state.early) return null;
    const d = now - before;
    return d > 0 ? { t: `+${d} vs last`, good: true } : d < 0 ? { t: `−${Math.abs(d)} vs last`, good: false } : { t: "No change", good: false };
  };
  const dInst = s ? delta(s.activeInstructors, s.prevActive) : null;
  const dCls = s ? delta(s.classesTaught, s.prevTaught) : null;

  const stats = cur?.person ? s?.perPerson.find((p) => p.person.id === cur.person?.id) : undefined;
  const types = stats ? [...new Set(stats.taught.map((c) => c.classType || c.title))].slice(0, 2) : [];

  return (
    <div>
      {strips}
      {state.early && (
        <p className="an5-note">
          Early data: your {vocab.plural} have taught fewer than 4 weeks. Comparisons appear at 20 bookings each.
        </p>
      )}
      <div className="an5-hero">
        <span className="an5-hero-hair" aria-hidden />
        <div className="an5-hero-head">
          <p className="an5-kicker">Your team</p>
          <span className="an5-hero-range">{heroRangeLabel(range)}</span>
        </div>
        <div className="an5-hero-grid">
          <div className="an5-side">
            <p className="an5-big">{s?.activeInstructors ?? 0}</p>
            <p className={`an5-delta ${dInst?.good ? "is-good" : "is-faint"}`}>{dInst?.t ?? ""}</p>
            <p className="an5-side-label">{vocab.activeLabel}</p>
          </div>
          <SeatDonut seats={donutSeats} perBlock={seatsInfo.perBlock || 5} selected={curIndex} onSelect={setSel}>
            <p className="an5-donut-used">
              <b>{used}</b>
              <span>/{total}</span>
            </p>
            <p className="an5-donut-cap">seats used</p>
            <p className={`an5-donut-left${free <= 1 ? " is-caution" : ""}`}>{free === 0 ? "No free seats" : `${free} left`}</p>
          </SeatDonut>
          <div className="an5-side">
            <p className="an5-big">{s?.classesTaught ?? 0}</p>
            <p className={`an5-delta ${state.early ? "is-faint" : dCls?.good ? "is-good" : "is-faint"}`}>{state.early ? "First weeks" : dCls?.t ?? ""}</p>
            <p className="an5-side-label">Classes taught</p>
          </div>
        </div>
        <ul className="an5-sr">
          {seats.map((x, i) => (
            <li key={i}>{donutSeats[i].aria}{x.person ? `, ${roleLabel(x.person.role)}` : ""}</li>
          ))}
        </ul>
        <div className="an5-legend">
          <span>
            <span className="an5-sw is-used" />
            Used
          </span>
          <span>
            <span className="an5-sw is-free" />
            Free
          </span>
          {pending > 0 && (
            <span>
              <span className="an5-sw is-pending" />
              Pending
            </span>
          )}
        </div>
        <div className="an5-blocks">
          <span className="an5-blocks-t">{blocksLine}</span>
          {canAddSeats && (
            <button type="button" className="an5-addseats tap" aria-label="Add seats" onClick={onAddSeats}>
              <Plus size={14} strokeWidth={2.4} aria-hidden />
              Add seats
            </button>
          )}
        </div>
        {requestedBlocks > 0 && <p className="an5-new-msg is-faint">{requestedLine(requestedBlocks, requestedLive)}</p>}

        {cur &&
          (cur.kind === "free" ? (
            <div className="an5-seat-row">
              <button type="button" className="an5-av is-free an5-av-btn tap" style={{ width: 30, height: 30 }} aria-label="Invite to this seat" onClick={() => onInvite(curIndex + 1)}>
                <Plus size={14} strokeWidth={2.4} aria-hidden />
              </button>
              <div className="min-w-0">
                <p className="an5-row-t">Seat {curIndex + 1} · free</p>
                <p className="an5-row-s">Tap + to invite a professional to this seat.</p>
              </div>
            </div>
          ) : (
            <button type="button" className="an5-seat-row has-chev tap" onClick={() => cur.person && onSeat(cur.person)}>
              {cur.kind === "pending" ? (
                <span className="an5-av is-pending" style={{ width: 30, height: 30, fontSize: 11 }} aria-hidden>
                  {(cur.person?.name ?? "?").slice(0, 1).toUpperCase()}
                </span>
              ) : (
                <Avatar name={cur.person?.name ?? ""} seat={cur.person?.seat ?? 1} />
              )}
              <span className="min-w-0">
                <span className="an5-row-t block">
                  Seat {curIndex + 1} · {cur.person?.name}
                  {cur.kind === "pending" ? " invited" : ""}
                </span>
                <span className="an5-row-s block">
                  {cur.kind === "pending"
                    ? `Invite sent ${sentAgo(cur.person?.createdAt ?? state.today, state.today)}. The seat fills when they accept.`
                    : [roleLabel(cur.person?.role ?? "staff"), ...types, `${stats?.sessions ?? 0} ${stats?.sessions === 1 ? "class" : "classes"} ${inRangePhrase(range)}`].join(" · ")}
                </span>
              </span>
              <ChevronRight size={15} style={{ color: "var(--an-tert)" }} aria-hidden />
            </button>
          ))}
        {team.requests > 0 && <RequestsRow n={team.requests} onClick={onRequests} />}
      </div>
      <p className="an5-hint">Tap a seat for who's in it.</p>

      <Tiles state={state} ratings={ratings} onTile={onTile} />
    </div>
  );
}

const RequestsRow: React.FC<{ n: number; onClick: () => void; standalone?: boolean }> = ({ n, onClick, standalone }) => (
  <button type="button" className="an5-seat-row an5-req-row tap" style={standalone ? { marginTop: 12 } : undefined} onClick={onClick}>
    <span className="an5-req-icon">
      <UserRoundPlus size={15} strokeWidth={2.2} aria-hidden />
    </span>
    <span className="min-w-0">
      <span className="an5-row-t block">{n === 1 ? "1 join request" : `${n} join requests`}</span>
      <span className="an5-row-s block">Professionals who entered your business ID</span>
    </span>
    <span className="flex items-center gap-[6px]">
      <span className="an5-pill">{n}</span>
      <ChevronRight size={15} style={{ color: "var(--an-tert)" }} aria-hidden />
    </span>
  </button>
);

function Tiles({ state, ratings, onTile }: { state: TeamState; ratings: RatingsState; onTile: (k: TileKey) => void }) {
  const s = state.stats;
  const perf =
    s && s.studioFill !== null && !state.early && s.totalBookings >= 20
      ? { v: `${s.studioFill}%`, s: `avg fill · ${s.onTarget} of ${s.withFill} on target` }
      : { v: "–", s: "Comparisons start at 20 bookings" };
  const teaching = s?.perPerson.filter((p) => p.sessions > 0).length ?? 0;
  const load =
    s && teaching > 0
      ? { v: `${s.hoursAvg.toFixed(1)} h`, s: s.overloaded > 0 ? `a week each · ${s.overloaded} overloaded` : "a week each" }
      : { v: "–", s: "No classes taught yet" };
  const n = state.issues.length;
  const values: Record<TileKey, { v: string; s: string }> = {
    performance: perf,
    repeat: { v: "–", s: "Needs 20 bookings each" },
    load,
    coverage: { v: String(n), s: n === 0 ? "No classes need attention" : n === 1 ? "class needs attention" : "classes need attention" },
    // AN5-001 row 24 "4.7" + "team average · 48 reviews"; OURS R4 at 0; under 3 the count only.
    ratings:
      ratings.team.avg !== null
        ? { v: ratings.team.avg.toFixed(1), s: `team average · ${ratings.team.count} reviews` }
        : ratings.team.count > 0
          ? { v: "–", s: `${ratings.team.count} ${ratings.team.count === 1 ? "review" : "reviews"} so far` }
          : { v: "–", s: "No reviews yet" },
    pay: { v: "–", s: "No pay data yet" },
  };
  return (
    <div className="an5-tiles">
      {(Object.keys(TILE_META) as TileKey[]).map((k) => {
        const m = TILE_META[k];
        const v = values[k];
        return (
          <button key={k} type="button" data-k={k} className="an5-tile tap" aria-label={`${m.title}: ${v.v === "–" ? "no figure yet" : v.v}, ${v.s}`} onClick={() => onTile(k)}>
            <span className="an5-tile-head">
              <m.icon size={15} strokeWidth={2.2} style={{ color: m.acc, flexShrink: 0 }} aria-hidden />
              <span className="an5-tile-title">{m.title}</span>
            </span>
            <span>
              <span className={`an5-tile-v block${v.v === "–" ? " is-dash" : ""}`}>{v.v}</span>
              <span className="an5-tile-s block">{v.s}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}


function IndexSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="an5-hero" style={{ minHeight: 330 }}>
        <div className="an5-hero-grid" style={{ marginTop: 26 }}>
          <div className="flex flex-col items-center gap-2">
            <Sk w={30} h={32} />
            <Sk w={50} h={10} />
          </div>
          <div className="flex items-center justify-center" style={{ height: 168 }}>
            <span className="an5-pulse block rounded-full" style={{ width: 148, height: 148, border: "20px solid var(--an-soft)" }} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <Sk w={30} h={32} />
            <Sk w={50} h={10} />
          </div>
        </div>
        <Sk w={160} h={13} style={{ margin: "14px auto 0" }} />
      </div>
      <div className="an5-tiles" style={{ marginTop: 39 }}>
        {(["performance", "repeat", "load", "coverage", "ratings", "pay"] as TileKey[]).map((k) => (
          <div key={k} data-k={k} className="an5-tile">
            <Sk w={34} h={12} />
          </div>
        ))}
      </div>
    </div>
  );
}
