import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, EllipsisVertical, UserRound } from "lucide-react";
import { ClassRosterSheet } from "../../../components/marketplace/ClassRosterSheet";
import { useMarkBookingPaid } from "../../../components/marketplace/useMarkBookingPaid";
import { PopupMenu, type PopupMenuOption } from "../../../components/ui/PopupMenu";
import { fetchClassRoster } from "../../../services/venues/console";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { useApp } from "../../../context/AppContext";
import { isMaskedLabel, splitRoster, type RosterEntry } from "../../../services/venues/consoleLogic";
import { repeatLine } from "../../../services/business-classes/scheduleRules";
import { MarketError, MarketOffline, MarketSkeleton } from "../../../components/market/MarketStates";
import { WebPageHeader } from "../../../components/web/WebPageHeader";
import { BizShareButton } from "../../../components/share/business/BizShareButton";
import { classData } from "../../../components/share/business/bizCardModel";
import { fetchClassCreatedAt } from "../../../services/share-links";
import { useSessionActions } from "./SessionActions";
import { useSchedule } from "./useSchedule";
import { dayWords, durationText, initialOf, isEnded, payMethodText, priceText, repeatsLine, todayIso, whenText } from "./scheduleModel";
import { NO_INSTRUCTOR } from "./instructorTeam";
import { t, tk, tn } from "../../../i18n/core";

// Website viewport v1 · WB-CS-SC.3 Class page · Bookings (WB-CS Session Web
// v2): the header with the square back, the "Schedule" kicker, share and ⋮;
// the when line; Bookings in 8 of 12 columns (12 of the roster in two
// columns of 6, rows 64, "Showing 12 of 15" and See all under them); the
// Booked and Price tiles, Class details and Cancel class in 4. The roster,
// Mark as paid, the menu, the sheets and every rule are the mobile
// SessionPage's, unchanged.

const SHOWN = 12;
const BORDER = "1px solid rgba(36,31,27,0.11)";
const DIV = "1px solid rgba(36,31,27,0.06)";
const CAPS: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8C8378" };
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]";

const Pill: React.FC<{ label: string; bg: string; ink: string }> = ({ label, bg, ink }) => (
  <span className="shrink-0 inline-flex items-center whitespace-nowrap" style={{ fontSize: 11, lineHeight: "16px", fontWeight: 800, borderRadius: 999, padding: "2px 8px", background: bg, color: ink }}>
    {label}
  </span>
);

const Avatar: React.FC<{ label: string }> = ({ label }) =>
  !isMaskedLabel(label) ? (
    <span aria-hidden className="shrink-0 flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 999, background: "#E4F0EE", color: "#2F5F58", fontSize: 13, fontWeight: 800 }}>
      {initialOf(label)}
    </span>
  ) : (
    <span aria-hidden className="shrink-0 flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 999, background: "#F5F5F6", color: "#8C8378" }}>
      <UserRound size={18} />
    </span>
  );

export default function SessionPageWeb() {
  const { id = "" } = useParams();
  const api = useSchedule();
  const navigate = useNavigate();
  const now = new Date();
  const today = todayIso(now);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [roster, setRoster] = useState<{ id: string; entries: RosterEntry[] } | null>(null);
  const [rosterError, setRosterError] = useState(false);
  const [tick, setTick] = useState(0);
  const [menuEl, setMenuEl] = useState<HTMLElement | null>(null);
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const { authUserId } = useApp();
  const access = useConsoleAccess();
  const [refused, setRefused] = useState<string | null>(null);
  const teachesIt = !!authUserId && api.sessions.find((x) => x.id === id)?.professionalId === authUserId;
  const rosterAllowed = ((access.ready && (access.meets("front_desk") || teachesIt)) || access.failed) && refused !== id;
  const rosterHidden = access.ready && !rosterAllowed;
  const actions = useSessionActions(api, {
    onDeleted: () => navigate("/app/business/classes", { replace: true }),
  });
  const pay = useMarkBookingPaid({
    onDone: () => {
      setTick((n) => n + 1);
      actions.show(t("Marked as paid."));
    },
  });

  const row = api.classes.find((x) => x.id === id) ?? null;
  const session = api.sessions.find((x) => x.id === id) ?? null;

  useEffect(() => {
    if (!id || !rosterAllowed) return;
    let alive = true;
    void fetchClassRoster(id).then((r) => {
      if (!alive) return;
      if (!r.ok) {
        if (r.code === "ATX03") setRefused(id);
        else setRosterError(true);
        return;
      }
      setRosterError(false);
      setRoster({ id, entries: r.value });
    });
    return () => {
      alive = false;
    };
  }, [id, tick, session?.booked, rosterAllowed]);

  const kicker = api.kind === "classes" ? t("Schedule") : t("Classes");
  const people = api.people;
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/app/business/classes"));
  const back = { to: "/app/business/classes", label: api.kind === "classes" ? tk("Back to Schedule") : tk("Back"), square: true, onClick: goBack };

  if (!row || !session) {
    return (
      <div>
        <div className="sticky top-0 z-30">
          <WebPageHeader title={api.loading ? "" : t("Class")} kicker={kicker} back={back} />
        </div>
        <div style={{ padding: 32 }}>
          <div className="max-w-[1600px]">
            {api.loading ? (
              <MarketSkeleton radius={20} rows={3} count={2} label={t("Loading this class")} />
            ) : api.error ? (
              <MarketError thing={tk("this class")} onRetry={api.reload} />
            ) : (
              <div className="bg-white" style={{ maxWidth: 560, borderRadius: 20, border: BORDER, padding: 16, fontSize: 15, lineHeight: "24px", color: "#5B5349" }}>{t("This class isn't on your schedule any more.")}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const ended = isEnded(session, now);
  const offline = !api.online;
  const cancelled = !!session.cancelled;
  const entries = roster && roster.id === id ? roster.entries : null;
  const { booked: bookedList, waitlist } = splitRoster(entries ?? []);
  const left = Math.max(0, session.maxCapacity - session.booked);
  const pct = session.maxCapacity ? Math.round((session.booked / session.maxCapacity) * 100) : 0;
  const series = api.seriesOf(session.seriesId);
  const instructorName = session.professionalId ? api.nameOf(session.professionalId) : "";
  const coverFor = session.professionalId ? api.coveringFor(session.id) : null;
  const next = session.professionalId
    ? api.sessions
        .filter((s) => s.id !== session.id && !s.cancelled && s.professionalId === session.professionalId && (s.date > today || (s.date === today && !isEnded(s, now))))
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))[0]
    : undefined;
  const capacityLine = cancelled
    ? null
    : ended
      ? t("This class has ended.")
      : left === 0
        ? entries
          ? t("Full. {n} on the waitlist.", { n: waitlist.length })
          : `${t("Full")}. `
        : entries && waitlist.length > 0
          ? tn(left, "{n} spot left. {waiting} on the waitlist: if someone cancels, the first person gets their spot.", "{n} spots left. {waiting} on the waitlist: if someone cancels, the first person gets their spot.", { waiting: waitlist.length })
          : tn(left, "{n} spot left.", "{n} spots left.");

  const msgReady = actions.canMessage && session.booked > 0;
  const menuOptions: PopupMenuOption<string>[] = cancelled
    ? []
    : ended
      ? msgReady
        ? [{ value: "msg", label: people === "clients" ? t("Message clients") : t("Message members"), disabled: offline }]
        : []
      : [
          { value: "edit", label: t("Edit class"), disabled: offline },
          ...(msgReady ? [{ value: "msg", label: people === "clients" ? t("Message clients") : t("Message members"), disabled: offline }] : []),
          { value: "sub", label: t("Request a substitute"), disabled: offline },
          ...(series ? [{ value: "end", label: t("Stop repeating"), disabled: offline }] : []),
          ...(session.booked === 0 ? [{ value: "delete", label: t("Delete class"), destructive: true, disabled: offline }] : []),
        ];

  const payTag = (e: RosterEntry) => {
    if (e.paymentStatus === "paid") return <Pill label={t("Paid")} bg="#E3F3E9" ink="#3F9165" />;
    if (e.paymentStatus === "pending") return <Pill label={t("Awaiting payment")} bg="#F6E9C9" ink="#B07D16" />;
    if (e.paymentStatus === "refunded") return <Pill label={t("Refunded")} bg="#F5F5F6" ink="#8C8378" />;
    return null;
  };

  const shown = bookedList.slice(0, SHOWN);
  // Two columns of up to 6 rows, filled down the first column, then the second.
  const rows = Math.min(6, Math.max(1, Math.ceil(shown.length / 2)));

  const details: { l: string; v: React.ReactNode }[] = [
    ...(capacityLine
      ? [
          {
            l: t("Spots"),
            v: (
              <span className="flex items-baseline flex-wrap" style={{ columnGap: 8 }}>
                <span>{capacityLine}</span>
                {entries && waitlist.length > 0 && rosterAllowed && (
                  <button type="button" onClick={() => setRosterOpen(true)} className={`hover:underline ${FOCUS}`} style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#7D6BB5", borderRadius: 6 }}>
                    {t("See waitlist")}
                  </button>
                )}
              </span>
            ),
          },
        ]
      : []),
    ...(row.notes ? [{ l: t("Notes for the instructor"), v: <span style={{ whiteSpace: "pre-wrap" }}>{row.notes}</span> }] : []),
    ...(series ? [{ l: t("Repeats"), v: repeatLine(series, series.startTime) }] : []),
  ];

  return (
    <div style={{ color: "#241F1B" }}>
      <div className="sticky top-0 z-30">
        <WebPageHeader
          title={session.title}
          kicker={kicker}
          back={back}
          actions={
            <>
              {!cancelled && !ended && (
                <BizShareButton
                  web
                  label={t("Share {name}", { name: session.title })}
                  emptyHint={row.listedOnExplore === false ? t("This class isn't on Explore, so it can't be shared.") : null}
                  getData={async () => ({
                    t: "class",
                    d: classData(session, {
                      about: row.about ?? null,
                      repeat: series ? repeatLine(series, series.startTime) : null,
                      createdAt: await fetchClassCreatedAt(session.id, session.seriesId ?? null),
                      now,
                    }),
                  })}
                />
              )}
              {menuOptions.length > 0 && (
                <button
                  ref={menuRef}
                  type="button"
                  aria-label={t("Actions for {name}", { name: session.title })}
                  title={t("Actions for {name}", { name: session.title })}
                  aria-haspopup="menu"
                  aria-expanded={!!menuEl}
                  onClick={() => setMenuEl(menuRef.current)}
                  className={`flex items-center justify-center hover:bg-[#F5F5F6] ${FOCUS}`}
                  style={{ width: 40, height: 40, borderRadius: 12, marginInlineEnd: -6, color: "#5B5349" }}
                >
                  <EllipsisVertical size={20} strokeWidth={2} aria-hidden />
                </button>
              )}
            </>
          }
        />
      </div>

      <div style={{ padding: 32 }}>
        <div className="max-w-[1600px] grid" style={{ gridTemplateColumns: "repeat(12,minmax(0,1fr))", gap: 24, alignItems: "start" }}>
          <div className="flex flex-col" style={{ gridColumn: "1 / -1", margin: "-8px 0 -8px", gap: 8 }}>
            {offline && api.loadedAt !== null && <MarketOffline loaded />}
            <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#5B5349" }}>
              {whenText(session.date, session.startTime)} · {durationText(session.startTime, session.endTime)} · {instructorName || t(NO_INSTRUCTOR)}
            </p>
            {cancelled && (
              <p className="flex items-center flex-wrap" style={{ margin: 0, gap: 8, fontSize: 13, lineHeight: "20px", color: "#C0392B", fontWeight: 600 }}>
                <Pill label={t("Cancelled")} bg="#FBE7E4" ink="#C0392B" />
                {row.cancelReason ? row.cancelReason : people === "clients" ? t("Booked clients were told.") : t("Booked members were told.")}
              </p>
            )}
          </div>

          <section aria-label={t("Bookings")} className="min-w-0 flex flex-col" style={{ gridColumn: "span 8", gap: 8 }}>
            <h2 style={CAPS}>{t("Bookings · {n}", { n: session.booked })}</h2>
            <div className="flex flex-col overflow-hidden bg-white" style={{ borderRadius: 24, border: BORDER }}>
              {rosterHidden ? (
                <p style={{ margin: 0, padding: "32px 24px", textAlign: "center", fontSize: 15, lineHeight: "24px", color: "#8C8378" }}>{t("Who booked is shown to staff with front desk access.")}</p>
              ) : rosterError && !entries ? (
                <div style={{ padding: 16 }}>
                  <MarketError thing={tk("who's booked")} onRetry={() => setTick((n) => n + 1)} notchBg="#FFFFFF" />
                </div>
              ) : !entries ? (
                <div role="status" aria-busy="true" aria-label={t("Loading who's booked")} className="grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
                  {[0, 1].map((i) => (
                    <div key={i} className="flex items-center" style={{ gap: 12, padding: "8px 20px", minHeight: 64, borderInlineStart: i ? DIV : 0 }}>
                      <span aria-hidden className="animate-skeleton-pulse" style={{ width: 40, height: 40, borderRadius: 999, background: "#F5F5F6" }} />
                      <span aria-hidden className="animate-skeleton-pulse" style={{ height: 12, width: "40%", borderRadius: 999, background: "#F5F5F6" }} />
                    </div>
                  ))}
                </div>
              ) : bookedList.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center" style={{ gap: 8, padding: "32px 24px" }}>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#8C8378" }}>{t("Nobody has booked yet.")}</p>
                </div>
              ) : (
                <>
                  <div className="grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", gridTemplateRows: `repeat(${rows},auto)`, gridAutoFlow: "column" }}>
                    {shown.map((e, i) => {
                      const markable = pay.can(e);
                      const method = payMethodText(e.paymentMethod, e.priceAgreed);
                      const inner = (
                        <>
                          <Avatar label={e.label} />
                          <span className="flex-1 min-w-0 flex flex-col" style={{ gap: 2 }}>
                            <span className="flex items-center min-w-0" style={{ gap: 8 }}>
                              <span className="truncate" title={e.label} style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>{e.label}</span>
                              {e.isMinor && <Pill label={t("Under 18")} bg="#F5F5F6" ink="#8C8378" />}
                              {payTag(e)}
                            </span>
                            {method && <span className="truncate" style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{method}</span>}
                          </span>
                        </>
                      );
                      const style: React.CSSProperties = {
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "8px 20px",
                        minHeight: 64,
                        boxSizing: "border-box",
                        width: "100%",
                        textAlign: "start",
                        borderTop: i % rows ? DIV : 0,
                        borderInlineStart: i >= rows ? DIV : 0,
                      };
                      return markable ? (
                        <button
                          key={`${e.label}-${e.at}-${i}`}
                          type="button"
                          onClick={(ev) => pay.open(e, ev.currentTarget)}
                          disabled={pay.busy}
                          aria-label={method ? t("{name}, awaiting payment, {method}. Actions", { name: e.label, method }) : t("{name}, awaiting payment. Actions", { name: e.label })}
                          className={`hover:bg-[#FAFAFB] ${FOCUS}`}
                          style={style}
                        >
                          {inner}
                        </button>
                      ) : (
                        <div key={`${e.label}-${e.at}-${i}`} style={style}>
                          {inner}
                        </div>
                      );
                    })}
                  </div>
                  {pay.error && (
                    <p role="alert" style={{ margin: 0, padding: "10px 20px", borderTop: DIV, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#C0392B" }}>
                      {pay.error}
                    </p>
                  )}
                  <div className="flex items-center justify-between" style={{ padding: "0 20px", minHeight: 48, borderTop: DIV, gap: 12 }}>
                    <span style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{t("Showing {shown} of {total}", { shown: shown.length, total: bookedList.length })}</span>
                    <button type="button" onClick={() => setRosterOpen(true)} className={`hover:underline ${FOCUS}`} style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#7D6BB5", borderRadius: 6 }}>
                      {t("See all {n}", { n: bookedList.length })}
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>

          <aside aria-label={t("Class details")} className="min-w-0 flex flex-col" style={{ gridColumn: "span 4", gap: 16 }}>
            <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12, paddingTop: 24 }}>
              <StatTile label={t("Booked")} value={`${session.booked}/${session.maxCapacity}`} sub={t("{n}% full", { n: pct })} />
              <StatTile label={t("Price")} value={priceText(row.price)} sub={repeatsLine(series)} />
            </div>
            <h2 style={{ ...CAPS, margin: "4px 0 -8px" }}>{t("Class details")}</h2>
            <div className="flex flex-col overflow-hidden bg-white" style={{ borderRadius: 20, border: BORDER }}>
              <button
                type="button"
                onClick={() => (session.professionalId ? navigate(`/app/business/employees/${session.professionalId}`) : !cancelled && !ended && actions.openSubstitute(id))}
                className={`w-full flex items-center text-start hover:bg-[#FAFAFB] ${FOCUS}`}
                style={{ gap: 12, padding: "12px 16px", minHeight: 72, boxSizing: "border-box" }}
              >
                {session.professionalId ? (
                  <span aria-hidden className="shrink-0 flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 999, background: "#E4F0EE", color: "#2F5F58", fontSize: 13, fontWeight: 800 }}>
                    {initialOf(instructorName)}
                  </span>
                ) : (
                  <span aria-hidden className="shrink-0" style={{ width: 40, height: 40, boxSizing: "border-box", borderRadius: 999, border: "1.5px dashed #AEA1DC", background: "#F5F5F6" }} />
                )}
                <span className="flex-1 min-w-0">
                  <span className="block" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#8C8378" }}>{t("Instructor")}</span>
                  <span className="block" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 700, color: session.professionalId ? "#241F1B" : "#5B5349" }}>{session.professionalId ? instructorName : t(NO_INSTRUCTOR)}</span>
                  <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                    {session.professionalId
                      ? coverFor
                        ? t("Covering for {name} {when}", { name: api.nameOf(coverFor), when: dayWords(session.date, today) })
                        : next
                          ? t("Also teaching {class} {when}", { class: next.title, when: dayWords(next.date, today) })
                          : t("No other classes coming up")
                      : cancelled || ended
                        ? t("Nobody was named")
                        : t("Click to choose who teaches it")}
                  </span>
                </span>
                <ChevronRight size={16} strokeWidth={2} className="shrink-0" style={{ color: "#8C8378" }} aria-hidden />
              </button>
              {details.map((d) => (
                <div key={d.l} className="flex flex-col justify-center" style={{ padding: "12px 16px", borderTop: DIV }}>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#8C8378" }}>{d.l}</p>
                  <div style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#5B5349", textWrap: "pretty" } as React.CSSProperties}>{d.v}</div>
                </div>
              ))}
            </div>
            {!cancelled && !ended && (
              <button
                type="button"
                onClick={() => actions.openCancel(id)}
                disabled={offline}
                className={`w-full flex items-center justify-center enabled:hover:brightness-[0.97] disabled:opacity-40 ${FOCUS}`}
                style={{ height: 44, borderRadius: 14, background: "#FBE7E4", color: "#C0392B", fontSize: 15, lineHeight: "24px", fontWeight: 600 }}
              >
                {t("Cancel class")}
              </button>
            )}
          </aside>
        </div>
      </div>

      <PopupMenu
        open={!!menuEl}
        onClose={() => setMenuEl(null)}
        anchor={menuEl}
        options={menuOptions}
        width={240}
        onSelect={(v) => {
          menuRef.current?.focus();
          setMenuEl(null);
          if (v === "edit") actions.openEdit(id);
          if (v === "msg") actions.openMessage(id);
          if (v === "sub") actions.openSubstitute(id);
          if (v === "end") actions.openEndSeries(id);
          if (v === "delete") actions.openDelete(id);
        }}
      />
      <ClassRosterSheet
        classId={rosterOpen && rosterAllowed ? id : null}
        title={session.title}
        session={{ date: session.date, startTime: session.startTime, endTime: session.endTime, maxCapacity: session.maxCapacity }}
        onClose={() => setRosterOpen(false)}
        onMarkedPaid={() => {
          setTick((n) => n + 1);
          actions.show(t("Marked as paid."));
        }}
      />
      {pay.element}
      {actions.elements}
    </div>
  );
}

/** Booked / Price: #F5F5F6 r18 padding 14 16; label 13/20 600, value 28/36 800, foot 13/20 (one line, ellipsis). */
function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0" style={{ borderRadius: 18, background: "#F5F5F6", padding: "14px 16px" }}>
      <div style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#8C8378" }}>{label}</div>
      <div className="tabular-nums" style={{ fontSize: 28, lineHeight: "36px", fontWeight: 800, color: "#241F1B" }}>{value}</div>
      <div title={sub} className="truncate" style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{sub}</div>
    </div>
  );
}
