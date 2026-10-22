import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Award, CalendarRange, ChevronDown, ChevronLeft, ChevronRight, EllipsisVertical, List, MessageCircle, Settings2, Ticket, TriangleAlert } from "lucide-react";
import { PopupMenu, type PopupMenuOption } from "../../../components/ui/PopupMenu";
import { startThread } from "../../../services/messaging";
import { time12, time12Split } from "../../../utils/time12";
import { linePx, textPx } from "../../../theme/textSize";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { useIsDark } from "../../../hooks/useIsDark";
import type { MarketPalette } from "../../../theme/marketTokens";
import { FOCUS_CSS, usePress } from "../../../components/market/usePress";
import { MarketEmptyCard, MarketError, MarketOffline, MarketSkeleton } from "../../../components/market/MarketStates";
import { StatLedger } from "../../../components/market/StatLedger";
import { PLANS_ROUTE } from "../plans";
import { BackHeader, Caps, Chip, OutlineButton, useMarketColours } from "./parts";
import { WeekGrid } from "./WeekGrid";
import { BizShareButton } from "../../../components/share/business/BizShareButton";
import { weekSchedule } from "../../../components/share/business/bizCardModel";
import { takeParkedDraft, useSessionActions } from "./SessionActions";
import { useSchedule } from "./useSchedule";
import { useCentium } from "./useCentium";
import {
  addDays,
  cardFlag,
  centiumLine,
  classesCount,
  dayCaps,
  durationText,
  figures,
  figuresLine,
  fillPct,
  fillText,
  findIssues,
  flagOf,
  isEnded,
  isLowSoon,
  issueText,
  mondayOf,
  priceText,
  seriesCards,
  signed,
  sortDay,
  todayIso,
  weekOf,
  weekStrip,
  weekdayLong,
  type Issue,
  type SeriesCard,
  type Session,
} from "./scheduleModel";

// Market + Share 3.0 · B-MA.6 Weekly schedule (Business Marketplace Screens
// `classesWeek`, markup lines 382–407, script `bizWeek` / `sessions`; HANDOVER
// §4 "B-MA.6 Classes (gyms)"). /app/business/classes: the Overview's Gym card
// opens it (back header "Gym" / "Classes"); for the Classes business type it
// is the Operations tab (title "Schedule", no back).
//
// Drawn, top to bottom (padding 0 16 32): the week strip (7 tiles, flex 1,
// gap 6, 62 tall radius 12, --soft / selected --segactive; "MON" 10 / 800
// 0.6px, "12" 15 / 800, "6 classes" 9.5 / 700), the caps "Friday, October 16"
// (month first, D-02) with "Add class" (margin-top 14), then the day's session
// cards (margin-top 10, gap 10): radius 20 --card 1px --border padding 12 14
// gap 12; a 52 time tile (--pale radius 12 padding 8 0: "7:00" 14 / 800, "AM"
// 9.5 / 700 --faint), name 14 / 800 and price 12 / 700, "{instructor} ·
// {duration}" 11.5 --faint, the 5 tall --soft bar with the --fill fill and
// "{n} of {cap}" / "Full" 11 / 700 --ink2 (margin-top 7).
//
// KEPT live features (PLAN §3.4, restyled in this chrome): the List / Week
// toggle (header, with the share button), the flags (No instructor /
// Double-booked / Under 40% / Cancelled, + the old Open spots' Almost full and
// Featured), the row menu (⋮ on each card: Edit, Message members, Request a
// substitute, Stop repeating, Promote, Cancel / Delete), the capacity hints
// (an Under 40% bar in --caution, ended / cancelled dimmed), Needs attention,
// the week figures, repeating classes, the Class rules page and the Plans
// link. The old Spots tab's per-class Centium line ("{n} open on Centium" /
// "Members only" / "Listing is off"), its Today / On Centium / From Centium
// figures and its week navigation sit on this page now; Spots on Centium and
// Show on Explore are fields of the Edit class sheet.

const VIEW_KEY = "centium-schedule-view";
const readView = (): "list" | "week" => {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "week" ? "week" : "list";
  } catch {
    return "list";
  }
};

export default function SchedulePage() {
  const m = useMarketColours();
  const api = useSchedule();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const reduced = useReducedMotion();
  const now = useNow();
  const today = todayIso(now);
  const [view, setView] = useState<"list" | "week">(readView);
  const [week, setWeek] = useState(() => mondayOf(today));
  const [day, setDay] = useState(today);
  const [naOpen, setNaOpen] = useState(false);
  const [newIds, setNewIds] = useState<string[]>([]);
  const [menuFor, setMenuFor] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const classesType = api.kind === "classes";
  // A Classes business has no Front desk, so its plans (/app/business/gym)
  // get an entry here (OURS, Release 2 gate), for whoever may open them.
  const access = useConsoleAccess();
  const showPlans = classesType && access.ready && access.meets("members");
  const people = api.people;
  const centium = useCentium(api.businessId, useMemo(() => api.classes.map((c) => c.id), [api.classes]));

  const actions = useSessionActions(api, {
    onCreated: (id) => {
      setNewIds((ids) => [id, ...ids]);
      const s = api.sessions.find((x) => x.id === id);
      if (s) {
        setWeek(mondayOf(s.date));
        setDay(s.date);
      }
      window.setTimeout(() => setNewIds((ids) => ids.filter((x) => x !== id)), 6000);
      window.setTimeout(() => document.getElementById(`session-${id}`)?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" }), 120);
    },
  });

  // ?create=1 (Analytics "Create your first class") and a draft parked while
  // adding an employee reopen the sheet.
  useEffect(() => {
    // Wait for the business row: the sheet saves under it.
    if (!api.businessId) return;
    const parked = takeParkedDraft();
    if (parked) actions.openCreate(parked);
    else if (params.get("create") === "1") actions.openCreate();
    if (params.has("create")) {
      params.delete("create");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api.businessId]);

  const setViewKept = (v: "list" | "week") => {
    setView(v);
    try {
      window.localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* private mode: the choice lasts this visit */
    }
  };

  // B9: the double-booked pairs are class_instructor_conflicts() when it answered.
  const issues = useMemo(() => findIssues(api.sessions, now, api.clashes), [api.sessions, now, api.clashes]);
  const fig = useMemo(() => figures(api.sessions, today), [api.sessions, today]);
  const strip = useMemo(() => weekStrip(api.sessions, week), [api.sessions, week]);
  const dayList = useMemo(() => sortDay(api.sessions.filter((s) => s.date === day), newIds), [api.sessions, day, newIds]);
  // B-SH.1: the Monday-to-Sunday week on the share card (cancelled sessions left out).
  const shareWeek = useMemo(() => weekSchedule(api.sessions, today), [api.sessions, today]);
  // AN3-055 rows 1-3: one card per repeating series, next session and the count to come.
  const series = useMemo(() => seriesCards(api.sessions, api.series, now), [api.sessions, api.series, now]);

  const noBusiness = !api.loading && !api.error && !api.businessId;
  const offline = !api.online;
  const firstLoad = api.loading && api.loadedAt === null;
  const rowOf = (id: string) => api.classes.find((x) => x.id === id) ?? null;

  const menuSession = menuFor ? api.sessions.find((s) => s.id === menuFor.id) ?? null : null;
  // OP1-088 (B7 MB-02): only for a seat that may message and see who booked, and a session someone booked.
  const msgOption: PopupMenuOption<string> | null =
    menuSession && actions.canMessage && menuSession.booked > 0
      ? { value: "msg", label: people === "clients" ? "Message clients" : "Message members", disabled: offline, note: offline ? "You're offline" : undefined }
      : null;
  const menuRow = menuSession ? rowOf(menuSession.id) : null;
  // The old Open spots' Promote (a class under 40% within 48 hours, on Explore).
  const promoteOption: PopupMenuOption<string> | null =
    menuSession && !classesType && isLowSoon(menuSession, now) && menuRow?.listedOnExplore !== false && centium.listingActive !== false ? { value: "promote", label: "Promote this class" } : null;
  // B9: a booked session offers Cancel session (OURS-AN3 C1); one nobody
  // booked keeps Delete class; a repeating one adds Stop repeating (OURS); a
  // cancelled one has no actions.
  const menuOptions: PopupMenuOption<string>[] = menuSession
    ? isEnded(menuSession, now)
      ? msgOption
        ? [msgOption]
        : []
      : [
          { value: "edit", label: "Edit" },
          ...(msgOption ? [msgOption] : []),
          { value: "sub", label: "Request a substitute" },
          ...(menuSession.seriesId ? [{ value: "end", label: "Stop repeating" }] : []),
          ...(promoteOption ? [promoteOption] : []),
          menuSession.booked > 0 ? { value: "cancel", label: "Cancel session", destructive: true } : { value: "delete", label: "Delete class", destructive: true },
        ]
    : [];

  const moveWeek = (n: number) => {
    const w = addDays(week, n * 7);
    setWeek(w);
    setDay(w <= today && today <= addDays(w, 6) ? today : w);
  };
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/app/business/marketplace"));

  const todayRows = api.classes.filter((x) => x.date === today && !x.cancelledAt);
  const todaysOpen = centium.listingActive === false ? 0 : todayRows.reduce((a, x) => {
    const s = api.sessions.find((y) => y.id === x.id);
    if (!s || isEnded(s, now)) return a;
    const line = centiumLine({ capacity: x.maxCapacity, booked: s.booked, centiumSpots: x.centiumSpots ?? null, listed: x.listedOnExplore !== false, listingActive: centium.listingActive, fromCentium: centium.fromCentium?.get(x.id) ?? null, ended: false, cancelled: false });
    return a + (line?.open ?? 0);
  }, 0);
  const todaysFromCentium = centium.fromCentium ? todayRows.reduce((a, x) => a + (centium.fromCentium?.get(x.id) ?? 0), 0) : null;

  const header = (
    <BackHeader
      m={m}
      eyebrow={classesType ? undefined : "Gym"}
      title={classesType ? "Schedule" : "Classes"}
      onBack={classesType ? null : goBack}
      right={
        !firstLoad && !api.error && !noBusiness ? (
          <>
            <ViewToggle m={m} view={view} onChange={setViewKept} />
            {/* Market + Share 3.0 B-SH.1: share this week's timetable (Weekly schedule card). */}
            <BizShareButton
              label="Share this week's schedule"
              emptyHint={shareWeek.count === 0 ? "Nothing to share yet. Add a class to share your schedule." : null}
              getData={() => ({ t: "schedule", d: shareWeek })}
            />
          </>
        ) : undefined
      }
    />
  );

  return (
    <div style={{ paddingBottom: 32, color: m.ink }}>
      <style>{FOCUS_CSS}</style>
      {header}
      {offline && api.loadedAt !== null && <MarketOffline loaded style={{ marginBottom: 12 }} />}

      {firstLoad ? (
        <div aria-busy="true" aria-label="Loading your schedule">
          <div className="flex" style={{ gap: 6 }}>
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} aria-hidden className="animate-skeleton-pulse" style={{ flex: 1, height: 62, borderRadius: 12, background: m.soft }} />
            ))}
          </div>
          <MarketSkeleton radius={20} rows={3} count={3} gap={10} label="Loading your classes" style={{ marginTop: 66 }} />
        </div>
      ) : api.error ? (
        <MarketError thing="your schedule" onRetry={api.reload} />
      ) : noBusiness ? (
        <>
          <MarketEmptyCard title="Save your business profile first" body="Classes are scheduled under it." />
          <div style={{ marginTop: 12 }}>
            <OutlineButton m={m} onClick={() => navigate("/app/business/profile")}>
              Set up business profile
            </OutlineButton>
          </div>
        </>
      ) : (
        <>
          <WeekStrip m={m} days={strip} selected={view === "list" ? day : null} today={today} onPick={(d) => {
            setDay(d);
            if (view === "week") setViewKept("list");
          }} />
          <div className="flex items-center justify-between" style={{ marginTop: 14, gap: 10 }}>
            <Caps m={m} as="h2">{view === "week" ? weekOf(week) : dayCaps(day)}</Caps>
            <OutlineButton
              m={m}
              disabled={!api.businessId || offline}
              onClick={() => actions.openCreate(undefined, view === "list" && day >= today ? day : undefined)}
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
              }
            >
              Add class
            </OutlineButton>
          </div>

          {view === "week" ? (
            <WeekGrid
              m={m}
              sessions={api.sessions}
              monday={week}
              today={today}
              now={now}
              issues={issues}
              onOpen={(id) => navigate(`/app/business/classes/${id}`)}
              onDay={(d) => {
                setDay(d);
                setViewKept("list");
              }}
            />
          ) : dayList.length === 0 ? (
            <MarketEmptyCard
              style={{ marginTop: 10 }}
              title={api.sessions.length === 0 ? "No classes scheduled yet" : `No classes on ${weekdayLong(day)}`}
              body={api.sessions.length === 0 ? `Create your first class and ${people} can book it on Explore.` : "Tap Add class to schedule one."}
            />
          ) : (
            <div className="flex flex-col" style={{ marginTop: 10, gap: 10 }}>
              {dayList.map((s) => {
                const row = rowOf(s.id);
                const ended = isEnded(s, now);
                return (
                  <SessionCard
                    key={s.id}
                    m={m}
                    s={s}
                    now={now}
                    price={priceText(row?.price)}
                    who={s.professionalId ? api.nameOf(s.professionalId) : ""}
                    flag={cardFlag(s, flagOf(s, issues), now)}
                    isNew={newIds.includes(s.id)}
                    featured={centium.featured.has(s.id)}
                    centium={centiumLine({
                      capacity: s.maxCapacity,
                      booked: s.booked,
                      centiumSpots: row?.centiumSpots ?? null,
                      listed: row?.listedOnExplore !== false,
                      listingActive: centium.listingActive,
                      fromCentium: centium.fromCentium ? centium.fromCentium.get(s.id) ?? 0 : null,
                      ended,
                      cancelled: !!s.cancelled,
                    })}
                    onOpen={() => navigate(`/app/business/classes/${s.id}`)}
                    onMenu={(anchor) => setMenuFor({ id: s.id, anchor })}
                    menuDisabled={offline}
                  />
                );
              })}
            </div>
          )}

          {/* The old Open spots week navigation (OURS placement: under the cards). */}
          <div className="flex items-center justify-between" style={{ marginTop: 12, marginLeft: -10, marginRight: -10 }}>
            <WeekArrow m={m} label="Previous week" onClick={() => moveWeek(-1)}>
              <ChevronLeft size={16} aria-hidden />
            </WeekArrow>
            <button
              type="button"
              onClick={() => {
                setWeek(mondayOf(today));
                setDay(today);
              }}
              disabled={week === mondayOf(today)}
              className="market-focus hit"
              aria-label={week === mondayOf(today) ? `${weekOf(week)}, this week` : `${weekOf(week)}. Back to this week`}
              style={{ fontSize: textPx(12), fontWeight: 800, color: m.ink, background: "transparent", border: 0, minHeight: 32, borderRadius: 10 }}
              aria-live="polite"
            >
              {weekOf(week)}
            </button>
            <WeekArrow m={m} label="Next week" onClick={() => moveWeek(1)}>
              <ChevronRight size={16} aria-hidden />
            </WeekArrow>
          </div>

          {issues.length > 0 && (
            <NeedsAttention
              m={m}
              open={naOpen}
              onToggle={() => setNaOpen((o) => !o)}
              issues={issues}
              nameOf={api.nameOf}
              people={people}
              reduced={reduced}
              onOpenSession={(id) => navigate(`/app/business/classes/${id}`)}
              onAssign={(id) => actions.openSubstitute(id)}
              onMessageMembers={actions.canMessage ? (id) => actions.openMessage(id) : null}
              onMessageInstructor={async (pid) => {
                const r = await startThread(pid);
                if (r.ok) navigate("/app/messages", { state: { threadId: r.threadId } });
                else actions.show("Couldn't open the chat. Try again.");
              }}
            />
          )}

          <Caps m={m} style={{ marginTop: 22, marginBottom: 8 }}>
            Next 7 days
          </Caps>
          <StatLedger
            rows={[
              { label: "Sessions this week", value: String(fig.sessions), delta: !fig.early && !fig.empty ? signed(fig.sessionsDelta) : "–" },
              { label: "Spots booked", value: fig.bookedPct === null ? "–" : `${fig.bookedPct}%`, delta: !fig.early && !fig.empty && fig.pctDelta !== null ? signed(fig.pctDelta, " pts") : "–" },
              { label: "Classes today", value: String(todayRows.length), delta: null },
              { label: "Open on Centium today", value: centium.listingActive === null && !centium.fromCentium ? "–" : String(todaysOpen), delta: null },
              { label: "Booked from Centium today", value: todaysFromCentium === null ? "–" : String(todaysFromCentium), delta: null },
            ]}
          />
          <p style={{ margin: "8px 4px 0", fontSize: textPx(12), lineHeight: linePx(17), color: m.ink2 }}>{figuresLine(fig, api.sessions, issues, today, now)}</p>

          {series.length > 0 && (
            <section aria-label="Repeating classes">
              <Caps m={m} style={{ marginTop: 22, marginBottom: 8 }}>
                Repeating classes
              </Caps>
              <div className="flex flex-col" style={{ gap: 10 }}>
                {series.map((card) => {
                  const row = rowOf(card.next.id);
                  return (
                    <SeriesCardView
                      key={card.seriesId}
                      m={m}
                      card={card}
                      who={card.next.professionalId ? api.nameOf(card.next.professionalId) : ""}
                      price={row ? priceText(row.price) : null}
                      onOpen={() => navigate(`/app/business/classes/${card.next.id}`)}
                    />
                  );
                })}
              </div>
            </section>
          )}

          <Caps m={m} style={{ marginTop: 22, marginBottom: 8 }}>
            Settings
          </Caps>
          <div style={{ borderRadius: 20, background: m.card, border: `1px solid ${m.border}`, overflow: "hidden" }}>
            <LinkRow m={m} icon={<Settings2 size={17} aria-hidden />} title="Class rules" sub="Waitlist and late cancels" onClick={() => navigate("/app/business/classes/rules")} />
            {showPlans && <LinkRow m={m} icon={<Ticket size={17} aria-hidden />} title="Plans" sub="Memberships and class packs" onClick={() => navigate(PLANS_ROUTE)} divider />}
          </div>
        </>
      )}

      <PopupMenu
        open={!!menuFor && !!menuSession}
        onClose={() => setMenuFor(null)}
        anchor={menuFor?.anchor ?? null}
        options={menuOptions}
        onSelect={(v) => {
          const id = menuFor?.id;
          setMenuFor(null);
          if (!id) return;
          if (v === "edit") actions.openEdit(id);
          if (v === "sub") actions.openSubstitute(id);
          if (v === "msg") actions.openMessage(id);
          if (v === "delete") actions.openDelete(id);
          if (v === "cancel") actions.openCancel(id);
          if (v === "end") actions.openEndSeries(id);
          if (v === "promote") navigate(`/app/business/marketplace?tab=offers&promote=${encodeURIComponent(id)}`);
        }}
        width={210}
      />
      {actions.elements}
    </div>
  );
}

/** The clock the cards read; ticks each minute so "ended" and "within 48 h" stay true. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** The kept List / Week toggle (OP1-074 rows 8-9), in the header: the board's segmented track (--segtrack, radius 12, padding 2), active --segactive. */
function ViewToggle({ m, view, onChange }: { m: MarketPalette; view: "list" | "week"; onChange: (v: "list" | "week") => void }) {
  return (
    <div role="tablist" aria-label="Schedule view" className="flex" style={{ gap: 2, padding: 2, borderRadius: 12, background: m.segtrack }}>
      {(
        [
          ["list", "List", <List key="i" size={16} strokeWidth={2.2} aria-hidden />],
          ["week", "Week", <CalendarRange key="i" size={16} strokeWidth={2.2} aria-hidden />],
        ] as const
      ).map(([k, label, icon]) => {
        const on = view === k;
        return (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={on}
            aria-label={`${label} view`}
            title={`${label} view`}
            onClick={() => onChange(k)}
            className="market-focus flex items-center justify-center"
            style={{ width: 40, height: 40, borderRadius: 10, background: on ? m.segactive : "transparent", color: on ? m.onfill : m.segink, border: 0 }}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}

/** bizWeek (lines 385–391): 7 tiles, flex 1, gap 6, 62 tall, radius 12; selected --segactive with --onfill ink. */
function WeekStrip({ m, days, selected, today, onPick }: { m: MarketPalette; days: ReturnType<typeof weekStrip>; selected: string | null; today: string; onPick: (day: string) => void }) {
  return (
    <div role="group" aria-label="Days of the week" className="flex" style={{ gap: 6 }}>
      {days.map((d) => {
        const on = d.day === selected;
        const ink = on ? m.onfill : m.ink;
        const dayInk = on ? m.onfill : m.faint;
        return (
          <button
            key={d.day}
            type="button"
            aria-pressed={on}
            aria-current={d.day === today ? "date" : undefined}
            aria-label={`${weekdayLong(d.day)} ${d.n}, ${classesCount(d.count)}`}
            onClick={() => onPick(d.day)}
            className="market-focus flex flex-col items-center justify-center min-w-0"
            style={{ flex: 1, minHeight: 62, borderRadius: 12, background: on ? m.segactive : m.soft, border: 0, padding: 0, lineHeight: "normal" }}
          >
            <span style={{ fontSize: textPx(10), fontWeight: 800, letterSpacing: "0.6px", color: dayInk }}>{d.w}</span>
            <span style={{ fontSize: textPx(15), fontWeight: 800, color: ink }}>{d.n}</span>
            <span className="whitespace-nowrap" style={{ fontSize: textPx(9.5), fontWeight: 700, color: dayInk }}>{classesCount(d.count)}</span>
          </button>
        );
      })}
    </div>
  );
}

function WeekArrow({ m, label, onClick, children }: { m: MarketPalette; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="market-focus flex items-center justify-center" style={{ width: 44, height: 44, background: "transparent", border: 0, borderRadius: 12 }}>
      <span style={{ width: 32, height: 32, borderRadius: 999, background: m.soft, color: m.ink2, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</span>
    </button>
  );
}

const TONES = (m: MarketPalette) => ({
  high: [m.highbg, m.high],
  caution: [m.cautionbg, m.caution],
  good: [m.goodbg, m.good],
});

/** The drawn session card (`sessions`, lines 398–406), the whole card opening the class's Bookings page; the kept ⋮ menu at its end. */
function SessionCard({
  m,
  s,
  now,
  price,
  who,
  flag,
  isNew,
  featured,
  centium,
  onOpen,
  onMenu,
  menuDisabled,
}: {
  m: MarketPalette;
  s: Session;
  now: Date;
  price: string;
  who: string;
  flag: ReturnType<typeof cardFlag>;
  isNew: boolean;
  featured: boolean;
  centium: ReturnType<typeof centiumLine>;
  onOpen: () => void;
  onMenu: (anchor: HTMLElement) => void;
  menuDisabled: boolean;
}) {
  const press = usePress();
  const dark = useIsDark();
  const ended = isEnded(s, now);
  const cancelled = !!s.cancelled;
  const low = isLowSoon(s, now);
  const t = time12Split(s.startTime);
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const tone = flag ? TONES(m)[flag.tone] : null;
  const whoText = who || "No instructor named";
  return (
    <div
      id={`session-${s.id}`}
      className="flex"
      style={{
        position: "relative",
        borderRadius: 20,
        background: m.card,
        border: `1px solid ${isNew ? m.teal : m.border}`,
        padding: "12px 14px",
        gap: 12,
        opacity: cancelled ? 0.75 : ended ? 0.6 : 1,
        lineHeight: "normal",
        ...press.style,
      }}
    >
      {/* The whole card opens the Bookings page; the ⋮ sits above it. */}
      <button
        type="button"
        onClick={onOpen}
        {...press.handlers}
        aria-label={`${s.title}, ${time12(s.startTime)}, ${durationText(s.startTime, s.endTime)}, ${cancelled ? "cancelled" : `${s.booked} of ${s.maxCapacity} booked`}${flag && !cancelled ? `, ${flag.label}` : ""}. Bookings`}
        className="market-focus absolute inset-0 w-full"
        style={{ zIndex: 0, borderRadius: 20, background: "transparent", border: 0 }}
      />
      <div aria-hidden className="shrink-0 text-center" style={{ width: 52, alignSelf: "center", borderRadius: 12, background: m.pale, padding: "8px 0", position: "relative", pointerEvents: "none" }}>
        <div className="tabular-nums" style={{ fontSize: textPx(14), fontWeight: 800, color: m.ink }}>{t?.time ?? s.startTime}</div>
        <div style={{ fontSize: textPx(9.5), fontWeight: 700, color: m.faint }}>{t?.meridiem ?? ""}</div>
      </div>
      <div className="flex-1 min-w-0" style={{ position: "relative", pointerEvents: "none" }}>
        <div className="flex justify-between" style={{ gap: 8 }}>
          <span className="flex items-center min-w-0" style={{ gap: 6 }}>
            <span className="truncate" style={{ fontSize: textPx(14), fontWeight: 800, color: m.ink, textDecoration: cancelled ? "line-through" : "none" }}>{s.title}</span>
            {flag && tone && <Chip label={flag.label} bg={tone[0]} ink={tone[1]} />}
            {!flag && isNew && <Chip label="New" bg={m.tealbg} ink={m.tealink} />}
          </span>
          <span className="shrink-0" style={{ fontSize: textPx(12), fontWeight: 700, color: m.ink }}>{price}</span>
        </div>
        <div style={{ fontSize: textPx(11.5), color: m.faint }}>
          {whoText} · {durationText(s.startTime, s.endTime)}
        </div>
        {!cancelled && (
          <div className="flex items-center" style={{ marginTop: 7, gap: 8 }}>
            <div className="flex-1 overflow-hidden" style={{ height: 5, borderRadius: 999, background: m.soft, outline: dark ? `1px solid ${m.border}` : undefined }}>
              <div style={{ height: "100%", width: `${fillPct(s)}%`, background: low ? m.caution : m.fill, borderRadius: 999 }} />
            </div>
            <span className="tabular-nums whitespace-nowrap" style={{ fontSize: textPx(11), fontWeight: 700, color: low ? m.caution : m.ink2 }}>{fillText(s)}</span>
          </div>
        )}
        {(centium || featured) && (
          <div className="flex items-center flex-wrap" style={{ marginTop: 6, gap: 6 }}>
            {centium && <span style={{ fontSize: textPx(11), fontWeight: 700, color: centium.tone === "teal" ? m.tealink : m.faint }}>{centium.text}</span>}
            {featured && <Chip label="Featured" bg={m.pale} ink={m.pdark} icon={<Award size={10} strokeWidth={2.6} aria-hidden />} />}
          </div>
        )}
      </div>
      {!cancelled && (
        <button
          ref={menuRef}
          type="button"
          aria-label={`Actions for ${s.title} at ${time12(s.startTime)}`}
          disabled={menuDisabled}
          onClick={() => menuRef.current && onMenu(menuRef.current)}
          className="market-focus hit shrink-0 flex items-center justify-center disabled:opacity-40"
          style={{ width: 24, alignSelf: "center", height: 32, margin: "0 -6px 0 -4px", color: m.faint, position: "relative", zIndex: 1, background: "transparent", border: 0, borderRadius: 8 }}
        >
          <EllipsisVertical size={17} aria-hidden />
        </button>
      )}
    </div>
  );
}

/** A repeating series (AN3-055), in the board's card chrome: radius 20, --card, 1px --border, padding 12 14. */
function SeriesCardView({ m, card, who, price, onOpen }: { m: MarketPalette; card: SeriesCard; who: string; price: string | null; onOpen: () => void }) {
  const press = usePress();
  const s = card.next;
  return (
    <button
      type="button"
      onClick={onOpen}
      {...press.handlers}
      className="market-focus w-full text-left block"
      style={{ background: m.card, borderRadius: 20, border: `1px solid ${m.border}`, padding: "12px 14px", lineHeight: "normal", ...press.style }}
    >
      <span className="flex justify-between" style={{ gap: 8 }}>
        <span className="truncate" style={{ fontSize: textPx(14), fontWeight: 800, color: m.ink }}>{s.title}</span>
        {price && <span className="shrink-0" style={{ fontSize: textPx(12), fontWeight: 700, color: m.ink }}>{price}</span>}
      </span>
      <span className="block" style={{ fontSize: textPx(12), fontWeight: 600, lineHeight: linePx(17), color: m.pdark }}>{card.typeLine}</span>
      <span className="block" style={{ fontSize: textPx(11.5), lineHeight: linePx(16), color: m.faint }}>{card.whenLine}</span>
      <span className="block" style={{ fontSize: textPx(11.5), lineHeight: linePx(16), color: m.faint }}>{`Max ${s.maxCapacity}${who ? ` · ${who}` : ""}`}</span>
    </button>
  );
}

function LinkRow({ m, icon, title, sub, onClick, divider }: { m: MarketPalette; icon: React.ReactNode; title: string; sub: string; onClick: () => void; divider?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="market-focus w-full flex items-center text-left"
      style={{ gap: 12, padding: "14px 16px", minHeight: 56, borderTop: divider ? `0.5px solid ${m.div}` : 0, background: "transparent", lineHeight: "normal" }}
    >
      <span className="shrink-0 flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 10, background: m.pale, color: m.pdark }}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block" style={{ fontSize: textPx(14), fontWeight: 700, color: m.ink }}>{title}</span>
        <span className="block" style={{ fontSize: textPx(11.5), color: m.faint }}>{sub}</span>
      </span>
      <ChevronRight size={16} strokeWidth={2} style={{ color: m.faint }} aria-hidden />
    </button>
  );
}

function NeedsAttention({
  m,
  open,
  onToggle,
  issues,
  nameOf,
  people,
  reduced,
  onOpenSession,
  onAssign,
  onMessageInstructor,
  onMessageMembers,
}: {
  m: MarketPalette;
  open: boolean;
  onToggle: () => void;
  issues: Issue[];
  nameOf: (id: string | null) => string;
  people: string;
  reduced: boolean;
  onOpenSession: (id: string) => void;
  onAssign: (id: string) => void;
  onMessageInstructor: (professionalId: string) => void;
  /** OP1-088: null when this seat can't message the booked people. */
  onMessageMembers: ((sessionId: string) => void) | null;
}) {
  const count = new Set(issues.flatMap((i) => i.sessions.map((s) => s.id))).size;
  return (
    <div style={{ marginTop: 12, borderRadius: 20, border: `1px solid ${m.border}`, overflow: "hidden", background: m.card, lineHeight: "normal" }}>
      <button type="button" aria-expanded={open} onClick={onToggle} className="market-focus w-full flex items-center text-left" style={{ gap: 10, padding: "12px 14px", minHeight: 56, background: m.highbg, border: 0 }}>
        <TriangleAlert size={17} strokeWidth={2.2} style={{ color: m.high }} className="shrink-0" aria-hidden />
        <span className="flex-1 min-w-0">
          <span className="block" style={{ fontSize: textPx(14), fontWeight: 800, color: m.ink }}>Needs attention</span>
          <span className="block" style={{ fontSize: textPx(11.5), color: m.ink2 }}>
            {count} {count === 1 ? "session" : "sessions"} in the next 7 days
          </span>
        </span>
        <ChevronDown size={18} strokeWidth={2.2} aria-hidden className="shrink-0" style={{ color: m.high, transform: open ? "rotate(180deg)" : "none", transition: reduced ? "none" : "transform .25s cubic-bezier(0.22,1,0.36,1)" }} />
      </button>
      {open &&
        issues.map((is) => {
          const t = issueText(is, nameOf, people);
          const s = is.sessions[0];
          const col = is.kind === "low" ? m.caution : m.high;
          const instructorMsg = is.kind === "double" && !!s.professionalId;
          const membersMsg = !instructorMsg && !!onMessageMembers && s.booked > 0;
          const msgOn = instructorMsg || membersMsg;
          const msgAria = instructorMsg ? `Message ${nameOf(s.professionalId)}` : `Message the ${s.booked} booked ${people}`;
          return (
            <div key={is.kind} className="grid" style={{ gridTemplateColumns: "3px 28px minmax(0,1fr)", columnGap: 10, padding: "12px 14px", borderTop: `0.5px solid ${m.div}` }}>
              <span aria-hidden style={{ borderRadius: 999, background: col }} />
              <span className="tabular-nums" style={{ fontSize: textPx(20), fontWeight: 800, color: col }}>{is.sessions.length}</span>
              <div className="min-w-0">
                <p style={{ margin: 0, fontSize: textPx(13), fontWeight: 800, color: m.ink }}>{t.title}</p>
                <p style={{ margin: "2px 0 0", fontSize: textPx(12), lineHeight: linePx(17), color: m.ink2 }}>{t.body}</p>
                <div className="flex items-center flex-wrap" style={{ gap: 6, marginTop: 8 }}>
                  <button type="button" onClick={() => onOpenSession(s.id)} className="market-focus hit inline-flex items-center min-w-0" style={{ minHeight: 36, padding: "0 10px", borderRadius: 10, border: `1px solid ${m.border}`, fontSize: textPx(11.5), fontWeight: 800, color: m.ink, maxWidth: "100%", background: "transparent" }}>
                    <span className="truncate">{t.chip}</span>
                  </button>
                  {is.kind !== "low" && (
                    <button type="button" onClick={() => (is.kind === "noinst" ? onAssign(s.id) : onOpenSession(s.id))} className="market-focus hit inline-flex items-center" style={{ minHeight: 36, padding: "0 12px", borderRadius: 10, background: m.fill, color: m.onfill, fontSize: textPx(11.5), fontWeight: 800, whiteSpace: "nowrap", border: 0 }}>
                      {is.kind === "noinst" ? "Assign" : "Fix"}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={msgOn ? msgAria : `${msgAria}: needs messages access`}
                    title={msgOn ? msgAria : `${msgAria}: needs messages access`}
                    disabled={!msgOn}
                    onClick={() => {
                      if (instructorMsg && s.professionalId) onMessageInstructor(s.professionalId);
                      else if (membersMsg) onMessageMembers?.(s.id);
                    }}
                    className="market-focus flex items-center justify-center shrink-0 disabled:opacity-40"
                    style={{ marginLeft: "auto", width: 44, height: 44, borderRadius: 12, background: m.soft, color: m.pdark, border: 0 }}
                  >
                    <MessageCircle size={17} strokeWidth={2} aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}
