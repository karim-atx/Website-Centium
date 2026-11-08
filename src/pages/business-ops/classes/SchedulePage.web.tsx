import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Award, CalendarRange, ChevronDown, ChevronLeft, ChevronRight, EllipsisVertical, List, MessageCircle, Plus, Settings2, Ticket, TriangleAlert } from "lucide-react";
import { PopupMenu, type PopupMenuOption } from "../../../components/ui/PopupMenu";
import { startThread } from "../../../services/messaging";
import { time12, time12Split } from "../../../utils/time12";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { MarketEmptyCard, MarketError, MarketOffline, MarketSkeleton } from "../../../components/market/MarketStates";
import { BizShareButton } from "../../../components/share/business/BizShareButton";
import { weekSchedule } from "../../../components/share/business/bizCardModel";
import { WebPageHeader } from "../../../components/web/WebPageHeader";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { PLANS_ROUTE } from "../plans";
import { NO_INSTRUCTOR } from "./instructorTeam";
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
  hourLabel,
  isEnded,
  isLowSoon,
  issueText,
  mondayOf,
  overlaps,
  priceText,
  seriesCards,
  shortDate,
  signed,
  sortDay,
  todayIso,
  weekHours,
  weekOf,
  weekStrip,
  weekdayLong,
  type Issue,
  type SeriesCard,
  type Session,
} from "./scheduleModel";
import { t, tk, tn } from "../../../i18n/core";

// Website viewport v1 · WB-CS-SC Schedule · List and WB-CS-SC.1 · Week
// (WB-CS Schedule Web v2), with the card ⋮ menu (.4), Needs attention
// expanded (.5) and the Cancel class popup (.6, CancelClassDialog's web
// branch). At 1440 a 12-column grid: the day (or week) in 8 columns, Needs
// attention, Next 7 days and Repeating classes in 4. At 1024 one column, the
// side panels below in two columns. The data, the rules, the menu options and
// the sheets are the mobile SchedulePage's (useSchedule, useSessionActions),
// unchanged; the sheets open as the 440 side sheets and the menus anchor
// under their trigger.

const VIEW_KEY = "centium-schedule-view";
const readView = (): "list" | "week" => {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "week" ? "week" : "list";
  } catch {
    return "list";
  }
};

const BORDER = "1px solid rgba(36,31,27,0.11)";
const CAPS: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#71685E" };
const TONE = { high: ["#FBE7E4", "#C0392B"], caution: ["#F6E9C9", "#B07D16"], good: ["#E3F3E9", "#1D744A"] } as const;
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]";

/** The clock the cards read; ticks each minute so "ended" and "within 48 h" stay true (as on mobile). */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export default function SchedulePageWeb() {
  const api = useSchedule();
  const navigate = useNavigate();
  const { rail } = useWebLayout();
  const wide = !rail;
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

  // ?create=1 and a parked draft reopen the sheet (as on mobile).
  useEffect(() => {
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

  const issues = useMemo(() => findIssues(api.sessions, now, api.clashes), [api.sessions, now, api.clashes]);
  const fig = useMemo(() => figures(api.sessions, today), [api.sessions, today]);
  const strip = useMemo(() => weekStrip(api.sessions, week), [api.sessions, week]);
  const dayList = useMemo(() => sortDay(api.sessions.filter((s) => s.date === day), newIds), [api.sessions, day, newIds]);
  const shareWeek = useMemo(() => weekSchedule(api.sessions, today), [api.sessions, today]);
  const series = useMemo(() => seriesCards(api.sessions, api.series, now), [api.sessions, api.series, now]);

  const noBusiness = !api.loading && !api.error && !api.businessId;
  const offline = !api.online;
  const firstLoad = api.loading && api.loadedAt === null;
  const rowOf = (id: string) => api.classes.find((x) => x.id === id) ?? null;
  const none = api.sessions.length === 0;

  const menuSession = menuFor ? api.sessions.find((s) => s.id === menuFor.id) ?? null : null;
  const msgOption: PopupMenuOption<string> | null =
    menuSession && actions.canMessage && menuSession.booked > 0
      ? { value: "msg", label: people === "clients" ? t("Message clients") : t("Message members"), disabled: offline, note: offline ? t("You're offline") : undefined }
      : null;
  const menuRow = menuSession ? rowOf(menuSession.id) : null;
  const promoteOption: PopupMenuOption<string> | null =
    menuSession && !classesType && isLowSoon(menuSession, now) && menuRow?.listedOnExplore !== false && centium.listingActive !== false ? { value: "promote", label: t("Promote this class") } : null;
  const menuOptions: PopupMenuOption<string>[] = menuSession
    ? isEnded(menuSession, now)
      ? msgOption
        ? [msgOption]
        : []
      : [
          { value: "edit", label: t("Edit") },
          ...(msgOption ? [msgOption] : []),
          { value: "sub", label: t("Request a substitute") },
          ...(menuSession.seriesId ? [{ value: "end", label: t("Stop repeating") }] : []),
          ...(promoteOption ? [promoteOption] : []),
          menuSession.booked > 0 ? { value: "cancel", label: t("Cancel session"), destructive: true } : { value: "delete", label: t("Delete class"), destructive: true },
        ]
    : [];

  const moveWeek = (n: number) => {
    const w = addDays(week, n * 7);
    setWeek(w);
    setDay(w <= today && today <= addDays(w, 6) ? today : w);
  };
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/app/business/marketplace"));

  const todayRows = api.classes.filter((x) => x.date === today && !x.cancelledAt);
  const todaysOpen =
    centium.listingActive === false
      ? 0
      : todayRows.reduce((a, x) => {
          const s = api.sessions.find((y) => y.id === x.id);
          if (!s || isEnded(s, now)) return a;
          const line = centiumLine({ capacity: x.maxCapacity, booked: s.booked, centiumSpots: x.centiumSpots ?? null, listed: x.listedOnExplore !== false, listingActive: centium.listingActive, fromCentium: centium.fromCentium?.get(x.id) ?? null, ended: false, cancelled: false });
          return a + (line?.open ?? 0);
        }, 0);
  const todaysFromCentium = centium.fromCentium ? todayRows.reduce((a, x) => a + (centium.fromCentium?.get(x.id) ?? 0), 0) : null;

  const ready = !firstLoad && !api.error && !noBusiness;
  const addClass = () => actions.openCreate(undefined, view === "list" && day >= today ? day : undefined);
  const addDisabled = !api.businessId || offline;

  const ledger = [
    { label: t("Sessions this week"), value: String(fig.sessions), delta: !fig.early && !fig.empty ? signed(fig.sessionsDelta) : "–" },
    { label: t("Spots booked"), value: fig.bookedPct === null ? "–" : `${fig.bookedPct}%`, delta: !fig.early && !fig.empty && fig.pctDelta !== null ? signed(fig.pctDelta, ` ${t("pts")}`) : "–" },
    { label: t("Classes today"), value: String(todayRows.length), delta: "–" },
    { label: t("Open on Centium today"), value: centium.listingActive === null && !centium.fromCentium ? "–" : String(todaysOpen), delta: "–" },
    { label: t("Booked from Centium today"), value: todaysFromCentium === null ? "–" : String(todaysFromCentium), delta: "–" },
  ];

  const settingsRows = [
    { key: "rules", icon: Settings2, title: t("Class rules"), sub: t("Waitlist and late cancels"), to: "/app/business/classes/rules" },
    ...(showPlans ? [{ key: "plans", icon: Ticket, title: t("Plans"), sub: t("Memberships and class packs"), to: PLANS_ROUTE }] : []),
  ];
  // Empty at 1440: Settings moves to the side column (stacked rows); otherwise under the day, side by side.
  const settingsInSide = none && wide;
  const settings = (stacked: boolean) => (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <h2 style={CAPS}>{t("Settings")}</h2>
      <div className="overflow-hidden bg-white" style={{ borderRadius: 20, border: BORDER, display: stacked ? "flex" : "grid", flexDirection: "column", gridTemplateColumns: stacked ? undefined : `repeat(${settingsRows.length},minmax(0,1fr))` }}>
        {settingsRows.map((r, i) => (
          <button
            key={r.key}
            type="button"
            onClick={() => navigate(r.to)}
            className={`w-full flex items-center text-start hover:bg-[#FAFAFB] ${FOCUS}`}
            style={{
              gap: 12,
              padding: "14px 16px",
              minHeight: 72,
              boxSizing: "border-box",
              borderTop: stacked && i > 0 ? "1px solid rgba(36,31,27,0.06)" : undefined,
              borderInlineStart: !stacked && i > 0 ? "1px solid rgba(36,31,27,0.06)" : undefined,
            }}
          >
            <span className="shrink-0 flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 12, background: "#F0EDF9" }}>
              <r.icon size={20} strokeWidth={2} style={{ color: "#7D6BB5" }} aria-hidden />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>{r.title}</span>
              <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{r.sub}</span>
            </span>
            <ChevronRight size={16} strokeWidth={2} className="shrink-0" style={{ color: "#71685E" }} aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );

  const header = (
    <WebPageHeader
      title={classesType ? t("Schedule") : t("Classes")}
      kicker={classesType ? undefined : t("Gym")}
      back={classesType ? undefined : { to: "/app/business/marketplace", label: tk("Back"), onClick: goBack }}
      actions={
        ready ? (
          <>
            <ViewToggle view={view} onChange={setViewKept} />
            <BizShareButton
              web
              label={t("Share this week's schedule")}
              emptyHint={shareWeek.count === 0 ? t("Nothing to share yet. Add a class to share your schedule.") : null}
              getData={() => ({ t: "schedule", d: shareWeek })}
            />
          </>
        ) : undefined
      }
    />
  );

  const addButton = (
    <button
      type="button"
      onClick={addClass}
      disabled={addDisabled}
      className={`shrink-0 inline-flex items-center whitespace-nowrap bg-white hover:bg-[#F0EDF9] disabled:opacity-40 ${FOCUS}`}
      style={{ height: 40, boxSizing: "border-box", borderRadius: 12, border: BORDER, gap: 8, padding: "0 16px", fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#7D6BB5" }}
    >
      <Plus size={20} strokeWidth={2.4} aria-hidden />
      {t("Add class")}
    </button>
  );

  return (
    <div style={{ color: "#241F1B" }}>
      <div className="sticky top-0 z-30">{header}</div>
      <div style={{ padding: 32 }}>
        <div className="max-w-[1600px] flex flex-col" style={{ gap: 24 }}>
          {offline && api.loadedAt !== null && <MarketOffline loaded />}
          {firstLoad ? (
            <div role="status" aria-busy="true" aria-label={t("Loading your schedule")} className="flex flex-col" style={{ gap: 24 }}>
              <div className="flex" style={{ gap: 12 }}>
                {Array.from({ length: 7 }, (_, i) => (
                  <span key={i} aria-hidden className="animate-skeleton-pulse" style={{ flex: 1, height: wide ? 84 : 76, borderRadius: 12, background: "#F5F5F6" }} />
                ))}
              </div>
              <MarketSkeleton radius={20} rows={3} count={3} gap={12} label={t("Loading your classes")} />
            </div>
          ) : api.error ? (
            <MarketError thing={tk("your schedule")} onRetry={api.reload} />
          ) : noBusiness ? (
            <div className="max-w-[560px] flex flex-col" style={{ gap: 12 }}>
              <MarketEmptyCard title={t("Save your business profile first")} body={t("Classes are scheduled under it.")} />
              <div>
                <button type="button" onClick={() => navigate("/app/business/profile")} className={`inline-flex items-center bg-white hover:bg-[#F0EDF9] ${FOCUS}`} style={{ height: 40, borderRadius: 12, border: BORDER, padding: "0 16px", fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#7D6BB5" }}>
                  {t("Set up business profile")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <WeekStrip
                days={strip}
                height={wide ? 84 : 76}
                selected={view === "list" ? day : null}
                today={today}
                onPick={(d) => {
                  setDay(d);
                  if (view === "week") setViewKept("list");
                }}
              />
              <div className="grid" style={{ gridTemplateColumns: wide ? "repeat(12,minmax(0,1fr))" : "minmax(0,1fr)", gap: 24, alignItems: "start" }}>
                <div className="min-w-0 flex flex-col" style={{ gridColumn: wide ? "span 8" : "1 / -1", gap: 12 }}>
                  <div className="flex items-center justify-between" style={{ gap: 12, minHeight: 44 }}>
                    <h2 style={CAPS}>{view === "week" ? weekOf(week) : dayCaps(day)}</h2>
                    {!(view === "list" && none) && addButton}
                  </div>

                  {view === "week" ? (
                    <WeekGridWeb
                      sessions={api.sessions}
                      monday={week}
                      today={today}
                      now={now}
                      issues={issues}
                      wide={wide}
                      onOpen={(id) => navigate(`/app/business/classes/${id}`)}
                      onDay={(d) => {
                        setDay(d);
                        setViewKept("list");
                      }}
                    />
                  ) : dayList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center bg-white" style={{ minHeight: 3 * 124 + 2 * 12, boxSizing: "border-box", borderRadius: 20, border: BORDER, padding: 24, gap: 8 }}>
                      <div style={{ fontSize: 17, lineHeight: "24px", fontWeight: 800 }}>{none ? t("No classes scheduled yet") : t("No classes on {day}", { day: weekdayLong(day) })}</div>
                      <div style={{ fontSize: 15, lineHeight: "24px", color: "#5B5349", maxWidth: "44ch" }}>
                        {none ? (people === "clients" ? t("Create your first class and clients can book it on Explore.") : t("Create your first class and members can book it on Explore.")) : t("Click Add class to schedule one.")}
                      </div>
                      {none && <div style={{ marginTop: 12 }}>{addButton}</div>}
                    </div>
                  ) : (
                    <div className="grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", gridAutoRows: "124px", gap: 12 }}>
                      {dayList.map((s) => {
                        const row = rowOf(s.id);
                        const ended = isEnded(s, now);
                        return (
                          <SessionCardWeb
                            key={s.id}
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
                            menuOpen={menuFor?.id === s.id}
                            onOpen={() => navigate(`/app/business/classes/${s.id}`)}
                            onMenu={(anchor) => setMenuFor({ id: s.id, anchor })}
                            menuDisabled={offline}
                          />
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between" style={{ height: 44 }}>
                    <WeekArrow label={t("Previous week")} onClick={() => moveWeek(-1)}>
                      <ChevronLeft size={16} strokeWidth={2} aria-hidden />
                    </WeekArrow>
                    <button
                      type="button"
                      onClick={() => {
                        setWeek(mondayOf(today));
                        setDay(today);
                      }}
                      disabled={week === mondayOf(today)}
                      aria-label={week === mondayOf(today) ? t("{week}, this week", { week: weekOf(week) }) : t("{week}. Back to this week", { week: weekOf(week) })}
                      aria-live="polite"
                      className={`enabled:hover:bg-[#F5F5F6] ${FOCUS}`}
                      style={{ fontSize: 15, lineHeight: "24px", fontWeight: 800, color: "#241F1B", minHeight: 36, padding: "0 10px", borderRadius: 10 }}
                    >
                      {weekOf(week)}
                    </button>
                    <WeekArrow label={t("Next week")} onClick={() => moveWeek(1)}>
                      <ChevronRight size={16} strokeWidth={2} aria-hidden />
                    </WeekArrow>
                  </div>

                  {!settingsInSide && settings(false)}
                </div>

                <div
                  className="min-w-0 grid"
                  style={{ gridColumn: wide ? "span 4" : "1 / -1", gridTemplateColumns: wide || none ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: 16, alignItems: "start" }}
                >
                  <div className="min-w-0 flex flex-col" style={{ gap: 16 }}>
                    {issues.length > 0 && (
                      <NeedsAttentionWeb
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
                          else actions.show(t("Couldn't open the chat. Try again."));
                        }}
                      />
                    )}
                    <div className="flex flex-col" style={{ gap: 8 }}>
                      <h2 style={CAPS}>{t("Next 7 days")}</h2>
                      <div className="flex flex-col bg-white" style={{ borderRadius: 20, border: BORDER, padding: "0 16px" }}>
                        {ledger.map((r, i) => (
                          <div key={r.label} className="flex items-center" style={{ gap: 12, padding: naOpen ? "8px 0" : "10px 0", borderTop: i ? "1.5px dashed rgba(36,31,27,0.11)" : 0 }}>
                            <span className="flex-1 min-w-0" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#5B5349" }}>{r.label}</span>
                            <span className="tabular-nums" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 800, color: "#241F1B" }}>{r.value}</span>
                            <span
                              className="tabular-nums text-end"
                              style={{ minWidth: 52, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: r.delta === "–" ? "#71685E" : /^[−-]/.test(r.delta) ? "#C0392B" : "#1D744A" }}
                            >
                              {r.delta}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p style={{ margin: "0 4px", fontSize: 13, lineHeight: "20px", color: "#5B5349", textWrap: "pretty" } as React.CSSProperties}>{figuresLine(fig, api.sessions, issues, today, now)}</p>
                    </div>
                    {settingsInSide && settings(true)}
                  </div>
                  {series.length > 0 && (
                    <section aria-label={t("Repeating classes")} className="min-w-0 flex flex-col" style={{ gap: 8 }}>
                      <h2 style={CAPS}>{t("Repeating classes")}</h2>
                      <div className="flex flex-col" style={{ gap: 12 }}>
                        {series.map((card) => {
                          const row = rowOf(card.next.id);
                          return (
                            <SeriesCardWeb
                              key={card.seriesId}
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
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <PopupMenu
        open={!!menuFor && !!menuSession}
        onClose={() => setMenuFor(null)}
        anchor={menuFor?.anchor ?? null}
        options={menuOptions}
        onSelect={(v) => {
          const id = menuFor?.id;
          // Focus goes back to the ⋮ first, so the sheet or popup it opens returns focus there on close.
          menuFor?.anchor.focus();
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
        width={240}
      />
      {actions.elements}
    </div>
  );
}

/** The List / Week toggle: track #F3F3FD padding 4 r12, tabs 40 × 32 r9, the selected one #A79AD5 with a white glyph. */
function ViewToggle({ view, onChange }: { view: "list" | "week"; onChange: (v: "list" | "week") => void }) {
  return (
    <div role="tablist" aria-label={t("Schedule view")} className="flex" style={{ gap: 2, padding: 4, borderRadius: 12, background: "#F3F3FD" }}>
      {(
        [
          ["list", tk("List view"), List],
          ["week", tk("Week view"), CalendarRange],
        ] as const
      ).map(([k, label, Icon]) => {
        const on = view === k;
        return (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={on}
            aria-label={t(label)}
            title={t(label)}
            onClick={() => onChange(k)}
            className={`flex items-center justify-center ${on ? "" : "hover:bg-[#E9E7FA]"} ${FOCUS}`}
            style={{ width: 40, height: 32, borderRadius: 9, background: on ? "#A79AD5" : "transparent", color: on ? "#FFFFFF" : "#6D50D3" }}
          >
            <Icon size={20} strokeWidth={2.2} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

/** Seven equal tiles, gap 12, 84 tall (76 at the rail), r12; the selected day #7B6AB6 with white ink. */
function WeekStrip({ days, height, selected, today, onPick }: { days: ReturnType<typeof weekStrip>; height: number; selected: string | null; today: string; onPick: (day: string) => void }) {
  return (
    <div role="group" aria-label={t("Days of the week")} className="flex" style={{ gap: 12 }}>
      {days.map((d) => {
        const on = d.day === selected;
        const ink = on ? "#FFFFFF" : "#241F1B";
        const dayInk = on ? "#FFFFFF" : "#71685E";
        return (
          <button
            key={d.day}
            type="button"
            aria-pressed={on}
            aria-current={d.day === today ? "date" : undefined}
            aria-label={t("{day} {date}, {count}", { day: weekdayLong(d.day), date: d.n, count: classesCount(d.count) })}
            onClick={() => onPick(d.day)}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center hover:brightness-[0.98] ${FOCUS}`}
            style={{ height, borderRadius: 12, background: on ? "#7B6AB6" : "#F5F5F6" }}
          >
            <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 800, letterSpacing: "0.08em", color: dayInk }}>{d.w}</span>
            <span className="tabular-nums" style={{ fontSize: 22, lineHeight: "30px", fontWeight: 800, color: ink }}>{d.n}</span>
            <span className="whitespace-nowrap" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: dayInk }}>{classesCount(d.count)}</span>
          </button>
        );
      })}
    </div>
  );
}

function WeekArrow({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={`group flex items-center justify-center ${FOCUS}`} style={{ width: 44, height: 44, borderRadius: 12 }}>
      <span className="flex items-center justify-center group-hover:bg-[#ECECEE]" style={{ width: 36, height: 36, borderRadius: 999, background: "#F5F5F6", color: "#5B5349" }}>
        {children}
      </span>
    </button>
  );
}

/** A session card: r20, padding 14 12, the 52 time tile, title 17/24, the 6 bar, the flag and Centium line; the ⋮ (32 × 36) at its end. */
function SessionCardWeb({
  s,
  now,
  price,
  who,
  flag,
  isNew,
  featured,
  centium,
  menuOpen,
  onOpen,
  onMenu,
  menuDisabled,
}: {
  s: Session;
  now: Date;
  price: string;
  who: string;
  flag: ReturnType<typeof cardFlag>;
  isNew: boolean;
  featured: boolean;
  centium: ReturnType<typeof centiumLine>;
  menuOpen: boolean;
  onOpen: () => void;
  onMenu: (anchor: HTMLElement) => void;
  menuDisabled: boolean;
}) {
  const ended = isEnded(s, now);
  const cancelled = !!s.cancelled;
  const low = isLowSoon(s, now);
  const clock = time12Split(s.startTime);
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const tone = flag ? TONE[flag.tone] : null;
  const whoText = who || t(NO_INSTRUCTOR);
  return (
    <div
      id={`session-${s.id}`}
      className="relative min-w-0 flex items-center bg-white hover:shadow-[0_4px_16px_rgba(36,31,27,0.06)]"
      style={{ borderRadius: 20, border: `1px solid ${isNew ? "#7FB5AC" : "rgba(36,31,27,0.11)"}`, padding: "14px 12px", gap: 10, opacity: cancelled ? 0.75 : ended ? 0.6 : 1, boxSizing: "border-box" }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={t("{class}, {time}, {length}, {state}. Bookings", {
          class: s.title,
          time: time12(s.startTime),
          length: durationText(s.startTime, s.endTime),
          state: `${cancelled ? t("cancelled") : t("{booked} of {cap} booked", { booked: s.booked, cap: s.maxCapacity })}${flag && !cancelled ? `, ${flag.label}` : ""}`,
        })}
        className={`absolute inset-0 w-full ${FOCUS}`}
        style={{ zIndex: 0, borderRadius: 20 }}
      />
      <div aria-hidden className="relative shrink-0 text-center pointer-events-none" style={{ width: 52, borderRadius: 12, background: "#F0EDF9", padding: "10px 0" }}>
        <div className="tabular-nums" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 800, color: "#241F1B" }}>{clock?.time ?? s.startTime}</div>
        <div style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#71685E" }}>{clock?.meridiem ? t(clock.meridiem) : ""}</div>
      </div>
      <div className="relative flex-1 min-w-0 flex flex-col pointer-events-none" style={{ gap: 4 }}>
        <div className="flex justify-between items-center" style={{ gap: 8 }}>
          <span className="flex items-center min-w-0" style={{ gap: 8 }}>
            <span title={s.title} className="truncate" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 800, color: "#241F1B", textDecoration: cancelled ? "line-through" : "none" }}>
              {s.title}
            </span>
            {featured && (
              <span className="shrink-0 inline-flex items-center whitespace-nowrap" style={{ gap: 4, fontSize: 11, lineHeight: "16px", fontWeight: 800, borderRadius: 999, padding: "2px 8px", background: "#F0EDF9", color: "#7D6BB5" }}>
                <Award size={12} strokeWidth={2.6} aria-hidden />
                {t("Featured")}
              </span>
            )}
          </span>
          <span className="shrink-0" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>{price}</span>
        </div>
        <div className="truncate" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
          {whoText} · {durationText(s.startTime, s.endTime)}
        </div>
        {!cancelled && (
          <div className="flex items-center" style={{ gap: 10 }}>
            <div className="flex-1 overflow-hidden" style={{ height: 6, borderRadius: 999, background: "#F5F5F6" }}>
              <div style={{ height: "100%", width: `${fillPct(s)}%`, background: low ? "#B07D16" : "#AEA1DC", borderRadius: 999 }} />
            </div>
            <span className="tabular-nums whitespace-nowrap" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: low ? "#B07D16" : "#5B5349" }}>{fillText(s)}</span>
          </div>
        )}
        {(flag || isNew || centium) && (
          <div className="flex items-center whitespace-nowrap overflow-hidden" style={{ gap: 8, minHeight: 20 }}>
            {flag && tone && <Pill label={flag.label} bg={tone[0]} ink={tone[1]} />}
            {!flag && isNew && <Pill label={t("New")} bg="#E3F1EE" ink="#2F5F58" />}
            {centium && <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: centium.tone === "teal" ? "#2F5F58" : "#71685E" }}>{centium.text}</span>}
          </div>
        )}
      </div>
      {!cancelled && (
        <button
          ref={menuRef}
          type="button"
          aria-label={t("Actions for {class} at {time}", { class: s.title, time: time12(s.startTime) })}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title={t("Actions")}
          disabled={menuDisabled}
          onClick={() => menuRef.current && onMenu(menuRef.current)}
          className={`relative shrink-0 flex items-center justify-center hover:bg-[#F5F5F6] disabled:opacity-40 ${FOCUS}`}
          style={{ zIndex: 1, width: 32, height: 36, marginInlineEnd: -6, borderRadius: 8, color: "#71685E" }}
        >
          <EllipsisVertical size={20} strokeWidth={2} aria-hidden />
        </button>
      )}
    </div>
  );
}

const Pill: React.FC<{ label: string; bg: string; ink: string }> = ({ label, bg, ink }) => (
  <span className="shrink-0 inline-flex items-center whitespace-nowrap" style={{ fontSize: 11, lineHeight: "16px", fontWeight: 800, borderRadius: 999, padding: "2px 8px", background: bg, color: ink }}>
    {label}
  </span>
);

/** The week grid: 52 gutter + 7 day columns (gap 6), 336 tall (300 at the rail), every hour labelled with its gridline (every other hour at the rail). */
function WeekGridWeb({
  sessions,
  monday,
  today,
  now,
  issues,
  wide,
  onOpen,
  onDay,
}: {
  sessions: Session[];
  monday: string;
  today: string;
  now: Date;
  issues: Issue[];
  wide: boolean;
  onOpen: (id: string) => void;
  onDay: (day: string) => void;
}) {
  const days = weekStrip(sessions, monday);
  const inWeek = sessions.filter((s) => s.date >= days[0].day && s.date <= days[6].day);
  const { h0, h1 } = weekHours(inWeek);
  const gridH = wide ? 336 : 300;
  const px = gridH / (h1 - h0);
  const hours: number[] = [];
  for (let h = h0; h <= h1; h++) if (wide || (h - h0) % 2 === 0) hours.push(h);
  const mins = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h + (m || 0) / 60;
  };
  const cols = "52px repeat(7,minmax(0,1fr))";
  return (
    <div className="flex flex-col bg-white" style={{ borderRadius: 20, border: BORDER, paddingBlock: "12px 14px", paddingInline: "8px 16px" }}>
      <div className="grid" style={{ gridTemplateColumns: cols, columnGap: 6 }}>
        <span />
        {days.map((d) => (
          <button
            key={d.day}
            type="button"
            onClick={() => onDay(d.day)}
            aria-label={t("{date}: show this day as a list", { date: shortDate(d.day) })}
            className={`text-center hover:bg-[#FAF8FE] ${FOCUS}`}
            style={{ paddingBottom: 8, borderRadius: 10, color: d.day === today ? "#7D6BB5" : "#71685E" }}
          >
            <span className="block" style={{ fontSize: 12, lineHeight: "16px", fontWeight: 800 }}>{d.w}</span>
            <span className="block tabular-nums" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 800 }}>{d.n}</span>
          </button>
        ))}
      </div>
      <div className="relative grid" style={{ gridTemplateColumns: cols, columnGap: 6, height: gridH }}>
        <div className="relative">
          {hours.map((h) => (
            <span key={h} className="absolute whitespace-nowrap tabular-nums" style={{ insetInlineEnd: 6, top: (h - h0) * px, transform: "translateY(-50%)", fontSize: 11, lineHeight: "16px", fontWeight: 700, color: "#71685E" }}>
              {hourLabel(h)}
            </span>
          ))}
        </div>
        {days.map((d) => {
          const items = inWeek.filter((s) => s.date === d.day);
          return (
            <div key={d.day} className="relative" style={{ background: d.day === today ? "#F0EDF9" : "#F5F5F6", borderRadius: 8 }}>
              {hours.map((h) => (
                <span key={h} aria-hidden className="absolute inset-x-0" style={{ top: (h - h0) * px, height: 1, background: "rgba(36,31,27,0.05)" }} />
              ))}
              {items.map((s) => {
                const ov = items.filter((o) => overlaps(o, s));
                const idx = ov.findIndex((o) => o.id === s.id);
                const n = ov.length;
                const fill = s.maxCapacity ? Math.min(100, Math.round((s.booked / s.maxCapacity) * 100)) : 0;
                const flagged = !!flagOf(s, issues);
                const ended = isEnded(s, now);
                const tip = `${s.title} · ${time12(s.startTime)} · ${s.cancelled ? t("Cancelled") : t("{booked} of {cap} booked", { booked: s.booked, cap: s.maxCapacity })}`;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onOpen(s.id)}
                    title={tip}
                    aria-label={`${s.title}, ${shortDate(d.day)} ${time12(s.startTime)}, ${s.cancelled ? t("cancelled") : t("{booked} of {cap} booked", { booked: s.booked, cap: s.maxCapacity })}`}
                    className={`absolute overflow-hidden ${FOCUS}`}
                    style={{
                      top: (mins(s.startTime) - h0) * px,
                      height: Math.max(10, (mins(s.endTime) - mins(s.startTime)) * px - 2),
                      insetInlineStart: `${(idx * 100) / n}%`,
                      width: `calc(${100 / n}% - ${n > 1 ? 2 : 0}px)`,
                      borderRadius: 6,
                      boxSizing: "border-box",
                      background: s.cancelled ? "#FBE7E4" : "#F0EDF9",
                      borderInlineStart: `3px solid ${s.cancelled ? "#C0392B" : "#AEA1DC"}`,
                      opacity: s.cancelled ? 0.75 : ended ? 0.6 : 1,
                    }}
                  >
                    {!s.cancelled && <span aria-hidden className="absolute start-0 bottom-0 w-full" style={{ height: `${fill}%`, background: "#AEA1DC", opacity: 0.45 }} />}
                    {flagged && <span aria-hidden className="absolute" style={{ top: 3, insetInlineEnd: 3, width: 7, height: 7, borderRadius: 999, background: "#C0392B" }} />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap" style={{ gap: 20, paddingTop: 12, paddingInlineStart: 58, paddingInlineEnd: 8, fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
        <span className="flex items-center" style={{ gap: 6 }}>
          <span aria-hidden style={{ width: 12, height: 12, borderRadius: 3, background: "#AEA1DC" }} />
          {t("Class")}
        </span>
        <span className="flex items-center" style={{ gap: 6 }}>
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: "#C0392B" }} />
          {t("Needs attention")}
        </span>
        <span>{t("Shading is spots booked")}</span>
      </div>
    </div>
  );
}

/** A repeating series card: r20, padding 12 16, title 17/24, the type line in purple, the when and max lines 13/20. */
function SeriesCardWeb({ card, who, price, onOpen }: { card: SeriesCard; who: string; price: string | null; onOpen: () => void }) {
  const s = card.next;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full text-start flex flex-col justify-center bg-white hover:shadow-[0_4px_16px_rgba(36,31,27,0.06)] ${FOCUS}`}
      style={{ borderRadius: 20, border: BORDER, padding: "12px 16px" }}
    >
      <span className="flex justify-between w-full" style={{ gap: 8 }}>
        <span className="truncate" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 800, color: "#241F1B" }}>{s.title}</span>
        {price && <span className="shrink-0" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>{price}</span>}
      </span>
      <span className="block" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#7D6BB5" }}>{card.typeLine}</span>
      <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{card.whenLine}</span>
      <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{`${t("Max {n}", { n: s.maxCapacity })}${who ? ` · ${who}` : ""}`}</span>
    </button>
  );
}

/** Needs attention: the #FBE7E4 head (padding 14 16), and when open a row per issue (3 bar, 32 count 22/30, the action row under the count). */
function NeedsAttentionWeb({
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
  open: boolean;
  onToggle: () => void;
  issues: Issue[];
  nameOf: (id: string | null) => string;
  people: string;
  reduced: boolean;
  onOpenSession: (id: string) => void;
  onAssign: (id: string) => void;
  onMessageInstructor: (professionalId: string) => void;
  onMessageMembers: ((sessionId: string) => void) | null;
}) {
  const count = new Set(issues.flatMap((i) => i.sessions.map((s) => s.id))).size;
  return (
    <div className="overflow-hidden bg-white" style={{ borderRadius: 20, border: BORDER }}>
      <button type="button" aria-expanded={open} onClick={onToggle} className={`w-full flex items-center text-start hover:brightness-[0.99] ${FOCUS}`} style={{ gap: 12, padding: "14px 16px", background: "#FBE7E4" }}>
        <TriangleAlert size={20} strokeWidth={2.2} className="shrink-0" style={{ color: "#C0392B" }} aria-hidden />
        <span className="flex-1 min-w-0">
          <span className="block" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 800, color: "#241F1B" }}>{t("Needs attention")}</span>
          <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>{tn(count, "{n} session in the next 7 days", "{n} sessions in the next 7 days")}</span>
        </span>
        <ChevronDown size={20} strokeWidth={2.2} aria-hidden className="shrink-0" style={{ color: "#C0392B", transform: open ? "rotate(180deg)" : "none", transition: reduced ? "none" : "transform .25s cubic-bezier(0.22,1,0.36,1)" }} />
      </button>
      {open &&
        issues.map((is) => {
          const text = issueText(is, nameOf, people);
          const s = is.sessions[0];
          const col = is.kind === "low" ? "#B07D16" : "#C0392B";
          const instructorMsg = is.kind === "double" && !!s.professionalId;
          const membersMsg = !instructorMsg && !!onMessageMembers && s.booked > 0;
          const msgOn = instructorMsg || membersMsg;
          const msgAria = instructorMsg
            ? t("Message {name}", { name: nameOf(s.professionalId) })
            : people === "clients"
              ? tn(s.booked, "Message the {n} booked client", "Message the {n} booked clients")
              : tn(s.booked, "Message the {n} booked member", "Message the {n} booked members");
          const msgLabel = msgOn ? msgAria : t("{action}: needs messages access", { action: msgAria });
          return (
            <div key={is.kind} className="grid" style={{ gridTemplateColumns: "3px 32px minmax(0,1fr)", columnGap: 12, padding: "14px 16px", borderTop: "0.5px solid rgba(36,31,27,0.06)" }}>
              <span aria-hidden style={{ gridRow: "span 2", borderRadius: 999, background: col }} />
              <span className="tabular-nums" style={{ fontSize: 22, lineHeight: "30px", fontWeight: 800, color: col }}>{is.sessions.length}</span>
              <div className="min-w-0">
                <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", fontWeight: 800, color: "#241F1B" }}>{text.title}</p>
                <p style={{ margin: "2px 0 0", fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>{text.body}</p>
              </div>
              <div className="min-w-0 flex items-center" style={{ gridColumn: "2 / -1", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => onOpenSession(s.id)}
                  title={text.chip}
                  className={`min-w-0 inline-flex items-center hover:bg-[#FAF8FE] ${FOCUS}`}
                  style={{ maxWidth: "100%", minHeight: 36, boxSizing: "border-box", padding: "0 12px", borderRadius: 10, border: BORDER, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}
                >
                  <span className="truncate">{text.chip}</span>
                </button>
                {is.kind !== "low" && (
                  <button
                    type="button"
                    onClick={() => (is.kind === "noinst" ? onAssign(s.id) : onOpenSession(s.id))}
                    className={`shrink-0 inline-flex items-center whitespace-nowrap hover:brightness-95 ${FOCUS}`}
                    style={{ minHeight: 36, padding: "0 12px", borderRadius: 10, background: "#AEA1DC", color: "#FFFFFF", fontSize: 15, lineHeight: "24px", fontWeight: 600 }}
                  >
                    {is.kind === "noinst" ? t("Assign") : t("Fix")}
                  </button>
                )}
                <button
                  type="button"
                  aria-label={msgLabel}
                  title={msgLabel}
                  disabled={!msgOn}
                  onClick={() => {
                    if (instructorMsg && s.professionalId) onMessageInstructor(s.professionalId);
                    else if (membersMsg) onMessageMembers?.(s.id);
                  }}
                  className={`shrink-0 flex items-center justify-center enabled:hover:bg-[#F0EDF9] disabled:opacity-40 ${FOCUS}`}
                  style={{ marginInlineStart: "auto", width: 40, height: 40, borderRadius: 12, background: "#F5F5F6", color: "#7D6BB5" }}
                >
                  <MessageCircle size={20} strokeWidth={2} aria-hidden />
                </button>
              </div>
            </div>
          );
        })}
    </div>
  );
}
