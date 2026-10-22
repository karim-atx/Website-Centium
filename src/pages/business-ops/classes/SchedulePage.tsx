import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarPlus, CalendarRange, ChevronDown, Clock, EllipsisVertical, List, MessageCircle, Settings2, Ticket, TriangleAlert, Users } from "lucide-react";
import { PopupMenu, type PopupMenuOption } from "../../../components/ui/PopupMenu";
import { startThread } from "../../../services/messaging";
import { time12 } from "../../../utils/time12";
import { linePx, textPx } from "../../../theme/textSize";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { PLANS_ROUTE } from "../plans";
import { useOps, type OpsColors } from "./opsTheme";
import { BackRow, Bone, ErrorCard, FiguresCard, FixedCta, OpsCard, Tag } from "./parts";
import { WeekGrid } from "./WeekGrid";
import { BizShareButton } from "../../../components/share/business/BizShareButton";
import { weekSchedule } from "../../../components/share/business/bizCardModel";
import { takeParkedDraft, useSessionActions } from "./SessionActions";
import { useSchedule } from "./useSchedule";
import {
  addDays,
  dayHeading,
  figures,
  figuresLine,
  findIssues,
  flagOf,
  isEnded,
  isFull,
  isLowSoon,
  issueText,
  seriesCards,
  signed,
  sortDay,
  todayIso,
  type Issue,
  type SeriesCard,
  type Session,
} from "./scheduleModel";

// Schedule (OP1-074 / 078 / 079 / 080 / 140 / 142 / 155): the Classes type's
// Operations tab, and the Classes page a gym that runs classes opens.
// OpsTabsV4 tab=classes, with the per-type title and no Gym / Employees /
// Classes tabs (O1).

const VIEW_KEY = "centium-schedule-view";
const readView = (): "list" | "week" => {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "week" ? "week" : "list";
  } catch {
    return "list";
  }
};

export default function SchedulePage() {
  const c = useOps();
  const api = useSchedule();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const reduced = useReducedMotion();
  const now = useNow();
  const today = todayIso(now);
  const [view, setView] = useState<"list" | "week">(readView);
  const [seeAll, setSeeAll] = useState(false);
  const [naOpen, setNaOpen] = useState(false);
  const [newIds, setNewIds] = useState<string[]>([]);
  const [menuFor, setMenuFor] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const classesType = api.kind === "classes";
  // A Classes business has no Front desk, so its plans (/app/business/gym)
  // get an entry here (OURS, Release 2 gate), for whoever may open them.
  const access = useConsoleAccess();
  const showPlans = classesType && access.ready && access.meets("members");
  const people = api.people;

  const actions = useSessionActions(api, {
    onCreated: (id) => {
      setNewIds((ids) => [id, ...ids]);
      setSeeAll(true);
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
  const week = useMemo(() => api.sessions.filter((s) => s.date >= today && s.date <= addDays(today, 6)), [api.sessions, today]);
  const days = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of week) map.set(s.date, [...(map.get(s.date) ?? []), s]);
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, list]) => ({ day, list: sortDay(list, newIds) }));
  }, [week, newIds]);
  const shownDays = seeAll ? days : days.slice(0, 2);
  // B-SH.1: the Monday-to-Sunday week on the share card (cancelled sessions left out).
  const shareWeek = useMemo(() => weekSchedule(api.sessions, today), [api.sessions, today]);
  // AN3-055 rows 1-3: one card per repeating series, next session and the count to come.
  const series = useMemo(() => seriesCards(api.sessions, api.series, now), [api.sessions, api.series, now]);
  const later = useMemo(() => api.sessions.filter((s) => s.date > addDays(today, 6)).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))[0], [api.sessions, today]);

  const noBusiness = !api.loading && !api.error && !api.businessId;
  const offline = !api.online;
  const firstLoad = api.loading && api.loadedAt === null;

  const menuSession = menuFor ? api.sessions.find((s) => s.id === menuFor.id) ?? null : null;
  // OP1-088 (B7 MB-02): only for a seat that may message and see who booked, and a session someone booked.
  const msgOption: PopupMenuOption<string> | null =
    menuSession && actions.canMessage && menuSession.booked > 0
      ? { value: "msg", label: people === "clients" ? "Message clients" : "Message members", disabled: offline, note: offline ? "You're offline" : undefined }
      : null;
  // B9: a booked session offers Cancel session (OURS-AN3 C1, OpsTabsV4 l.447);
  // one nobody booked keeps Delete class; a repeating one adds Stop repeating
  // (OURS); a cancelled one has no actions (its ⋮ is not drawn).
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
          menuSession.booked > 0 ? { value: "cancel", label: "Cancel session", destructive: true } : { value: "delete", label: "Delete class", destructive: true },
        ]
    : [];

  const title = classesType ? "Schedule" : "Classes";
  const loadedTime = api.loadedAt ? time12(`${new Date(api.loadedAt).getHours()}:${new Date(api.loadedAt).getMinutes()}`) : "";

  return (
    <div style={{ marginTop: -2, paddingBottom: 64 }}>
      {!classesType && api.kind !== "unknown" && <BackRow c={c} label="Front desk" to="/app/business/operations" />}
      <div className="flex items-start justify-between" style={{ gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: textPx(27), fontWeight: 800, letterSpacing: "-0.022em", lineHeight: linePx(34), color: c.ink }}>{title}</h1>
        {/* Market + Share 3.0 B-SH.1: share this week's timetable (Weekly schedule card). */}
        {!firstLoad && !api.error && !noBusiness && (
          <BizShareButton
            label="Share this week's schedule"
            style={{ margin: "-5px -5px -5px 0" }}
            emptyHint={shareWeek.count === 0 ? "Nothing to share yet. Add a class to share your schedule." : null}
            getData={() => ({ t: "schedule", d: shareWeek })}
          />
        )}
      </div>
      <p style={{ margin: "4px 0 0", fontSize: textPx(13), fontWeight: 500, color: c.faint }}>Your schedule for the next 7 days</p>
      {offline && api.loadedAt !== null && (
        <p style={{ margin: "4px 0 0", fontSize: textPx(11.5), color: c.faint }}>Offline. Showing your schedule from {loadedTime}.</p>
      )}

      {firstLoad ? (
        <FiguresCard
          c={c}
          boxes={[
            { label: "Sessions this week", value: "–", dash: true },
            { label: "Spots booked", value: "–", dash: true },
          ]}
        />
      ) : api.error ? null : (
        <FiguresCard
          c={c}
          boxes={[
            {
              label: "Sessions this week",
              value: String(fig.sessions),
              delta: !fig.early && !fig.empty && fig.sessionsDelta !== 0 ? signed(fig.sessionsDelta) : undefined,
              deltaInk: fig.sessionsDelta > 0 ? c.good : c.faint,
            },
            {
              label: "Spots booked",
              value: fig.bookedPct === null ? "–" : `${fig.bookedPct}%`,
              dash: fig.bookedPct === null,
              delta: !fig.early && !fig.empty && fig.pctDelta ? signed(fig.pctDelta, " pts") : undefined,
              deltaInk: (fig.pctDelta ?? 0) > 0 ? c.good : c.faint,
            },
          ]}
          line={noBusiness ? undefined : figuresLine(fig, api.sessions, issues, today, now)}
        />
      )}

      {issues.length > 0 && !api.error && (
        <NeedsAttention
          c={c}
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

      {/* List / Week + rules (OP1-074 rows 8-9) */}
      <div className="flex items-center" style={{ gap: 10, marginTop: 18 }}>
        <div role="tablist" aria-label="Schedule view" className="flex flex-1" style={{ gap: 4, background: c.segTrack, borderRadius: 14, padding: 4 }}>
          {(
            [
              ["list", "List", <List key="i" size={14} strokeWidth={2.2} />],
              ["week", "Week", <CalendarRange key="i" size={14} strokeWidth={2.2} />],
            ] as const
          ).map(([k, label, icon]) => {
            const on = view === k;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setViewKept(k)}
                className="flex-1 flex items-center justify-center"
                style={{ height: 36, borderRadius: 10, gap: 5, fontSize: textPx(12.5), fontWeight: 800, background: on ? c.segOn : "transparent", color: on ? c.segOnInk : c.dark ? "#B7ABDE" : "rgb(var(--th-6d50d3))" }}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </div>
        {showPlans && (
          <button
            type="button"
            aria-label="Plans"
            onClick={() => navigate(PLANS_ROUTE)}
            className="tap flex items-center justify-center shrink-0"
            style={{ width: 44, height: 44, borderRadius: 14, border: `1px solid ${c.border}`, color: c.inkSoft }}
          >
            <Ticket size={17} />
          </button>
        )}
        <button
          type="button"
          aria-label="Waitlist and late cancels"
          onClick={() => navigate("/app/business/classes/rules")}
          className="tap flex items-center justify-center shrink-0"
          style={{ width: 44, height: 44, borderRadius: 14, border: `1px solid ${c.border}`, color: c.inkSoft }}
        >
          <Settings2 size={17} />
        </button>
      </div>

      {firstLoad ? (
        <SkeletonDay c={c} />
      ) : api.error ? (
        <ErrorCard c={c} message="Couldn't load your schedule. Check your connection and try again." onRetry={api.reload} disabled={offline} />
      ) : noBusiness ? (
        <EmptyCard c={c} title="Save your business profile first" body="Classes are scheduled under it." action={{ label: "Set up business profile", onClick: () => navigate("/app/business/profile") }} />
      ) : view === "week" ? (
        api.sessions.length === 0 ? (
          <EmptyCard c={c} title="No classes scheduled yet" body={`Create your first class and ${people} can book it on Explore.`} />
        ) : (
          <WeekGrid c={c} sessions={api.sessions} today={today} now={now} issues={issues} onOpen={(id) => navigate(`/app/business/classes/${id}`)} onDay={(d) => {
            setViewKept("list");
            setSeeAll(true);
            window.setTimeout(() => document.getElementById(`day-${d}`)?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" }), 60);
          }} />
        )
      ) : days.length === 0 ? (
        later ? (
          <OpsCard c={c} radius={20} style={{ marginTop: 14 }}>
            <button type="button" className="tap w-full text-left" style={{ padding: 16 }} onClick={() => navigate(`/app/business/classes/${later.id}`)}>
              <p style={{ margin: 0, fontSize: textPx(14), fontWeight: 800, color: c.ink }}>Nothing in the next 7 days</p>
              <p style={{ margin: "4px 0 0", fontSize: textPx(12.5), lineHeight: linePx(18), color: c.inkSoft }}>
                Your next class is {later.title} on {dayHeading(later.date, today)} at {time12(later.startTime)}.
              </p>
            </button>
          </OpsCard>
        ) : (
          <EmptyCard c={c} title="No classes scheduled yet" body={`Create your first class and ${people} can book it on Explore.`} />
        )
      ) : (
        <>
          {shownDays.map(({ day, list }) => {
            const cls = list;
            return (
              <section key={day} id={`day-${day}`} aria-label={dayHeading(day, today)} style={{ scrollMarginTop: 16 }}>
                <div className="flex items-baseline justify-between flex-wrap" style={{ margin: "16px 4px 8px", columnGap: 10 }}>
                  <p style={{ margin: 0, fontSize: textPx(10.5), fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: day === today ? c.pDark : c.faint }}>
                    {dayHeading(day, today)}
                  </p>
                  <p style={{ margin: 0, fontSize: textPx(11), color: c.faint }}>
                    {cls.length} {cls.length === 1 ? "class" : "classes"} · {cls.reduce((a, s) => a + s.booked, 0)} booked
                  </p>
                </div>
                <OpsCard c={c} radius={20}>
                  {list.map((s, i) => (
                    <SessionRow
                      key={s.id}
                      c={c}
                      s={s}
                      first={i === 0}
                      now={now}
                      flag={flagOf(s, issues)}
                      isNew={newIds.includes(s.id)}
                      who={s.professionalId ? api.nameOf(s.professionalId) : ""}
                      people={people}
                      onOpen={() => navigate(`/app/business/classes/${s.id}`)}
                      onMenu={(anchor) => setMenuFor({ id: s.id, anchor })}
                      menuDisabled={offline}
                    />
                  ))}
                </OpsCard>
              </section>
            );
          })}
          {days.length > 2 || seeAll ? (
            <button
              type="button"
              onClick={() => setSeeAll((v) => !v)}
              className="tap block w-full text-center"
              style={{ marginTop: 12, minHeight: 32, fontSize: textPx(12.5), fontWeight: 800, color: c.pDark }}
            >
              {seeAll ? "Show less" : `See all ${week.length} sessions this week`}
            </button>
          ) : null}
        </>
      )}

      {view === "list" && !firstLoad && !api.error && !noBusiness && series.length > 0 && (
        <section aria-label="Repeating classes">
          <div className="flex items-baseline justify-between flex-wrap" style={{ margin: "16px 4px 8px", columnGap: 10 }}>
            <p style={{ margin: 0, fontSize: textPx(10.5), fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: c.faint }}>Repeating classes</p>
          </div>
          {series.map((card, i) => {
            const row = api.classes.find((x) => x.id === card.next.id);
            return (
              <SeriesCardView
                key={card.seriesId}
                c={c}
                card={card}
                first={i === 0}
                who={card.next.professionalId ? api.nameOf(card.next.professionalId) : ""}
                price={row ? (row.price ? `${row.price} · ${row.paymentType || "Cash"}` : "Free") : null}
                onOpen={() => navigate(`/app/business/classes/${card.next.id}`)}
              />
            );
          })}
        </section>
      )}

      <FixedCta
        c={c}
        label="Create class"
        icon={<CalendarPlus size={17} strokeWidth={2.4} />}
        onClick={() => actions.openCreate()}
        disabled={!api.businessId || offline}
      />

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
        }}
        width={200}
      />
      {actions.elements}
    </div>
  );
}

/** The clock the rows read; ticks each minute so "ended" and "within 48 h" stay true. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

const TIME_COL = "calc(56px + 4 * var(--text-boost, 0px))";

function SessionRow({
  c,
  s,
  first,
  now,
  flag,
  isNew,
  who,
  people,
  onOpen,
  onMenu,
  menuDisabled,
}: {
  c: OpsColors;
  s: Session;
  first: boolean;
  now: Date;
  flag: ReturnType<typeof flagOf>;
  isNew: boolean;
  who: string;
  people: "clients" | "members";
  onOpen: () => void;
  onMenu: (anchor: HTMLElement) => void;
  menuDisabled: boolean;
}) {
  const ended = isEnded(s, now);
  const full = isFull(s);
  const low = isLowSoon(s, now);
  // OP1-087 row 3 / OURS-AN3 C10 (OpsTabsV4 sesRow l.441-447): a cancelled
  // session stays as a record: struck title, "Cancelled" pill highBg / high,
  // "Cancelled · {who} · {people} notified", no fill bar, opacity 0.75.
  const cancelled = !!s.cancelled;
  const flagT = cancelled ? "" : flag === "noinst" ? "No instructor" : flag === "double" ? "Double-booked" : flag === "low" ? "Under 40%" : "";
  const st = flagT || (isNew ? "New" : cancelled ? "Cancelled" : full ? "Full" : "");
  const tagBg = flagT || cancelled ? c.highBg : isNew ? c.tealPale : c.pale;
  const tagInk = flagT || cancelled ? c.high : isNew ? c.tealInk : c.pDark;
  const pct = s.maxCapacity ? Math.min(100, Math.round((s.booked / s.maxCapacity) * 100)) : 0;
  const whoText = cancelled
    ? `Cancelled · ${who || "No instructor"} · ${people} notified`
    : who
      ? `With ${who}${ended ? " · ended" : ""}`
      : "No instructor yet";
  const menuRef = useRef<HTMLButtonElement | null>(null);
  return (
    <div
      id={`session-${s.id}`}
      className="grid items-center"
      style={{
        gridTemplateColumns: `${TIME_COL} 3px minmax(0,1fr) 44px`,
        columnGap: 10,
        padding: "10px 6px 10px 12px",
        borderTop: first ? "none" : `1px solid ${c.divider}`,
        opacity: cancelled ? 0.75 : ended ? 0.6 : 1,
        boxShadow: isNew ? `inset 0 0 0 2px ${c.teal}` : "none",
        transition: "box-shadow .3s ease",
        position: "relative",
      }}
    >
      {/* The whole row opens the session (OP1-074 row 12); the ⋮ sits above it. */}
      <button type="button" onClick={onOpen} aria-label={`${s.title}, ${time12(s.startTime)} to ${time12(s.endTime)}, ${cancelled ? "cancelled" : `${s.booked} of ${s.maxCapacity} booked`}`} className="absolute inset-0 w-full" style={{ zIndex: 0 }} />
      <div style={{ position: "relative", pointerEvents: "none" }}>
        <p className="tabular-nums whitespace-nowrap" style={{ margin: 0, fontSize: textPx(12.5), fontWeight: 800, color: c.deep }}>
          {time12(s.startTime)}
        </p>
        <p className="tabular-nums whitespace-nowrap" style={{ margin: 0, fontSize: textPx(10.5), color: c.faint }}>
          {time12(s.endTime)}
        </p>
      </div>
      <span aria-hidden className="self-stretch" style={{ borderRadius: 999, background: c.primary, position: "relative", pointerEvents: "none", outline: c.hc ? `1px solid ${c.primary}` : undefined }} />
      <div className="min-w-0" style={{ position: "relative", pointerEvents: "none" }}>
        <p className="flex items-center flex-wrap min-w-0" style={{ margin: 0, gap: 6, rowGap: 2 }}>
          <span className="min-w-0 truncate" style={{ fontSize: textPx(13.5), fontWeight: 800, lineHeight: linePx(17), color: c.ink, maxWidth: "100%", textDecoration: cancelled ? "line-through" : "none" }}>
            {s.title}
          </span>
          {st && <Tag label={st} bg={tagBg} ink={tagInk} />}
        </p>
        <p style={{ margin: "1px 0 0", fontSize: textPx(11.5), lineHeight: linePx(15), color: who || cancelled ? c.faint : c.high }}>{whoText}</p>
        {!cancelled && <div className="flex items-center" style={{ gap: 8, marginTop: 5 }}>
          <div className="flex-1 overflow-hidden" style={{ height: 5, borderRadius: 999, background: c.track, border: c.hc ? `1px solid ${c.border}` : undefined }}>
            <div style={{ height: "100%", borderRadius: 999, width: `${pct}%`, background: low ? c.caution : c.primary }} />
          </div>
          <span className="tabular-nums whitespace-nowrap" style={{ fontSize: textPx(11), fontWeight: 800, color: low ? c.caution : c.ink }}>
            {s.booked}/{s.maxCapacity}
          </span>
        </div>}
      </div>
      {cancelled ? (
        <span aria-hidden style={{ width: 44, height: 44 }} />
      ) : (
        <button
          ref={menuRef}
          type="button"
          aria-label={`Actions for ${s.title} at ${time12(s.startTime)}`}
          disabled={menuDisabled}
          onClick={() => menuRef.current && onMenu(menuRef.current)}
          className="tap flex items-center justify-center disabled:opacity-45"
          style={{ width: 44, height: 44, color: c.faint, position: "relative", zIndex: 1 }}
        >
          <EllipsisVertical size={17} />
        </button>
      )}
    </div>
  );
}

/**
 * AN3-055 / AN3-053 card (ClassFlowsV7 oneClass l.33-45, series branch l.221):
 * r 24, card fill, 1px border, padding 20; title 14/600/20; type line
 * 12/500/16 pDark; when line clock 11, gap 4, 12/18 faint, margin-top 4, the
 * clock kept on the first line when it wraps (O4); capacity users 11 and
 * price 12/600, margin-top 2. No QR tile (AN3-053 row 4: the Schedule keeps
 * the app rule) and no trash (O8: a series stops from its session menu). The
 * card opens the next session.
 */
function SeriesCardView({ c, card, first, who, price, onOpen }: { c: OpsColors; card: SeriesCard; first: boolean; who: string; price: string | null; onOpen: () => void }) {
  const s = card.next;
  const line = { display: "flex", alignItems: "flex-start", gap: 4, fontSize: textPx(12), lineHeight: linePx(18), color: c.faint } as const;
  const icon = { flexShrink: 0, marginTop: `calc((${linePx(18)} - 11px) / 2)` } as const;
  return (
    <button
      type="button"
      id={`series-${card.seriesId}`}
      onClick={onOpen}
      className="tap w-full text-left block"
      style={{ marginTop: first ? 0 : 10, background: c.card, borderRadius: 24, border: `1px solid ${c.border}`, padding: 20 }}
    >
      <p style={{ margin: 0, fontSize: textPx(14), fontWeight: 600, lineHeight: linePx(20), color: c.ink }}>{s.title}</p>
      <p style={{ margin: 0, fontSize: textPx(12), fontWeight: 500, lineHeight: linePx(16), color: c.pDark }}>{card.typeLine}</p>
      <p style={{ ...line, margin: "4px 0 0" }}>
        <Clock size={11} aria-hidden style={icon} />
        <span className="min-w-0">{card.whenLine}</span>
      </p>
      <p style={{ ...line, margin: "2px 0 0" }}>
        <Users size={11} aria-hidden style={icon} />
        <span className="min-w-0">{`Max ${s.maxCapacity}${who ? ` · ${who}` : ""}`}</span>
      </p>
      {price && <p style={{ margin: "2px 0 0", fontSize: textPx(12), fontWeight: 600, lineHeight: linePx(18), color: c.ink }}>{price}</p>}
    </button>
  );
}

function NeedsAttention({
  c,
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
  c: OpsColors;
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
  const [tip, setTip] = useState<number | null>(null);
  const press = useRef<number | null>(null);
  // OP1-144 S1: a release after a long-press shows the tooltip only; it never opens the chat.
  const longPressed = useRef(false);
  useEffect(() => {
    if (tip === null) return;
    const hide = () => setTip(null);
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [tip]);
  return (
    <div style={{ marginTop: 14, borderRadius: 22, border: `1px solid ${open ? c.naBd : c.naBg}`, overflow: "hidden", background: open ? c.card : c.naBg }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="w-full flex items-center text-left"
        style={{ gap: 10, padding: "13px 14px 13px 16px", minHeight: 52, background: c.naBg }}
      >
        <TriangleAlert size={17} strokeWidth={2.2} style={{ color: c.naInk }} className="shrink-0" aria-hidden />
        <span className="flex-1 min-w-0">
          <span className="block" style={{ fontSize: textPx(14), fontWeight: 800, lineHeight: linePx(18), color: c.naTitle }}>
            Needs attention
          </span>
          <span className="block" style={{ fontSize: textPx(11.5), lineHeight: linePx(15), color: c.inkSoft }}>
            {count} {count === 1 ? "session" : "sessions"} in the next 7 days
          </span>
        </span>
        <span
          className="shrink-0 flex items-center justify-center tabular-nums"
          style={{ minWidth: 24, height: 24, padding: "0 7px", borderRadius: 999, background: c.naInk, color: c.dark && c.hc ? "#121317" : "#FFFFFF", fontSize: textPx(12), fontWeight: 800 }}
        >
          {count}
        </span>
        <ChevronDown
          size={18}
          strokeWidth={2.2}
          aria-hidden
          className="shrink-0"
          style={{ color: c.naInk, transform: open ? "rotate(180deg)" : "none", transition: reduced ? "none" : "transform .25s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </button>
      <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: reduced ? "none" : "grid-template-rows .22s cubic-bezier(0.22,1,0.36,1), opacity .22s cubic-bezier(0.22,1,0.36,1)", opacity: open ? 1 : 0 }}>
        <div style={{ minHeight: 0, overflow: "hidden" }} aria-hidden={!open}>
          {issues.map((is, idx) => {
            const t = issueText(is, nameOf, people);
            const s = is.sessions[0];
            const col = is.kind === "low" ? c.caution : c.high;
            const instructorMsg = is.kind === "double" && !!s.professionalId;
            const membersMsg = !instructorMsg && !!onMessageMembers && s.booked > 0;
            const msgOn = instructorMsg || membersMsg;
            const msgAria = instructorMsg ? `Message ${nameOf(s.professionalId)}` : `Message the ${s.booked} booked ${people}`;
            return (
              <div key={is.kind} className="grid" style={{ gridTemplateColumns: "3px 30px minmax(0,1fr)", columnGap: 10, padding: "12px 14px 12px 16px", borderTop: `1px solid ${c.divider}` }}>
                <span aria-hidden style={{ borderRadius: 999, background: col }} />
                <span className="tabular-nums" style={{ fontSize: textPx(22), fontWeight: 800, lineHeight: linePx(24), color: col }}>
                  {is.sessions.length}
                </span>
                <div className="min-w-0">
                  <p style={{ margin: 0, fontSize: textPx(13), fontWeight: 800, lineHeight: linePx(17), color: c.ink }}>{t.title}</p>
                  <p style={{ margin: "2px 0 0", fontSize: textPx(12), lineHeight: linePx(17), color: c.inkSoft, textWrap: "pretty" }}>{t.body}</p>
                  <div className="flex items-center flex-wrap" style={{ gap: 6, marginTop: 8 }}>
                    <button
                      type="button"
                      tabIndex={open ? 0 : -1}
                      onClick={() => onOpenSession(s.id)}
                      className="tap inline-flex items-center min-w-0"
                      style={{ minHeight: 36, padding: "0 10px", borderRadius: 10, border: `1px solid ${c.border}`, fontSize: textPx(11.5), fontWeight: 800, color: c.ink, maxWidth: "100%" }}
                    >
                      <span className="truncate">{t.chip}</span>
                    </button>
                    {is.kind !== "low" && (
                      <button
                        type="button"
                        tabIndex={open ? 0 : -1}
                        onClick={() => (is.kind === "noinst" ? onAssign(s.id) : onOpenSession(s.id))}
                        className="tap inline-flex items-center"
                        style={{ minHeight: 36, padding: "0 12px", borderRadius: 10, background: c.fill, color: c.onFill, fontSize: textPx(11.5), fontWeight: 800, whiteSpace: "nowrap" }}
                      >
                        {is.kind === "noinst" ? "Assign" : "Fix"}
                      </button>
                    )}
                    <button
                      type="button"
                      tabIndex={open ? 0 : -1}
                      aria-label={msgAria}
                      title={msgAria}
                      disabled={!msgOn}
                      aria-disabled={!msgOn || undefined}
                      onClick={() => {
                        if (longPressed.current) {
                          longPressed.current = false;
                          return;
                        }
                        if (instructorMsg && s.professionalId) onMessageInstructor(s.professionalId);
                        else if (membersMsg) onMessageMembers?.(s.id);
                      }}
                      onPointerDown={() => {
                        longPressed.current = false;
                        press.current = window.setTimeout(() => {
                          longPressed.current = true;
                          setTip(idx);
                        }, 500);
                      }}
                      onPointerUp={() => {
                        if (press.current) window.clearTimeout(press.current);
                        if (tip === idx) window.setTimeout(() => setTip(null), 1500);
                      }}
                      onPointerLeave={() => press.current && window.clearTimeout(press.current)}
                      className="tap flex items-center justify-center shrink-0"
                      style={{ marginLeft: "auto", width: 44, height: 44, borderRadius: 12, background: c.soft, color: c.pDark, opacity: msgOn ? 1 : 0.45 }}
                    >
                      <MessageCircle size={17} strokeWidth={2} />
                    </button>
                  </div>
                  {tip === idx && (
                    <p
                      role="tooltip"
                      aria-hidden
                      style={{ margin: "6px 0 0 auto", width: "max-content", maxWidth: 260, background: c.dark ? "#F5F3FA" : "#241F1B", color: c.dark ? "#121317" : "#FFFFFF", fontSize: textPx(11.5), fontWeight: 700, padding: "5px 9px", borderRadius: 8 }}
                    >
                      {msgOn ? msgAria : `${msgAria}: needs messages access`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmptyCard({ c, title, body, action }: { c: OpsColors; title: string; body: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="text-center" style={{ marginTop: 14, background: c.card, borderRadius: 22, border: `1px dashed ${c.hc ? c.border : c.tert}`, padding: "28px 20px" }}>
      <span className="inline-flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 16, background: c.pale, color: c.pDark }}>
        <CalendarPlus size={22} />
      </span>
      <p style={{ margin: "10px 0 0", fontSize: textPx(15), fontWeight: 800, color: c.ink }}>{title}</p>
      <p style={{ margin: "4px 0 0", fontSize: textPx(12.5), lineHeight: linePx(18), color: c.inkSoft }}>{body}</p>
      {action && (
        <button type="button" onClick={action.onClick} className="tap" style={{ marginTop: 12, minHeight: 40, padding: "0 14px", borderRadius: 12, border: `1px solid ${c.border}`, fontSize: textPx(12.5), fontWeight: 800, color: c.pDark }}>
          {action.label}
        </button>
      )}
    </div>
  );
}

function SkeletonDay({ c }: { c: OpsColors }) {
  return (
    <div aria-busy="true" aria-label="Loading your schedule">
      <div style={{ margin: "16px 4px 8px" }}>
        <Bone c={c} w={120} h={10} />
      </div>
      <OpsCard c={c} radius={20}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid items-center" style={{ gridTemplateColumns: `${TIME_COL} 3px minmax(0,1fr) 44px`, columnGap: 10, padding: "10px 6px 10px 12px", minHeight: 73.5, borderTop: i ? `1px solid ${c.divider}` : "none" }}>
            <Bone c={c} w={44} h={24} />
            <Bone c={c} w={3} h={50} r={999} />
            <div>
              <Bone c={c} w="60%" h={12} />
              <Bone c={c} w="40%" h={10} style={{ marginTop: 8 }} />
            </div>
            <span />
          </div>
        ))}
      </OpsCard>
    </div>
  );
}

